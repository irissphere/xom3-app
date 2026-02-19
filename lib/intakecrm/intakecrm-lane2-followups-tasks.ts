import { emitSignal } from "@/lib/uoi/signals";
import type { IntakeCrmActor } from "./intakecrm-tenant-boundary";
import type { IntakeCrmLead, IntakeCrmTask } from "./types";
import { createIntakecrmTask, listIntakecrmTasks, patchIntakecrmTask } from "./intakecrm-store";

function minutesFromNowIso(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

export function createDefaultTasksForNewLead(input: {
  tenant: string;
  lead: IntakeCrmLead;
  actor: IntakeCrmActor;
}): IntakeCrmTask[] {
  const { tenant, lead } = input;

  const call = createIntakecrmTask({
    tenant,
    leadId: lead.leadId,
    type: "call",
    dueAt: minutesFromNowIso(5),
    assignedTo: lead.assignedTo,
    notes: "Call lead (5m SLA)",
  });

  const intro = createIntakecrmTask({
    tenant,
    leadId: lead.leadId,
    type: "text",
    dueAt: minutesFromNowIso(10),
    assignedTo: lead.assignedTo,
    notes: "Send intro text/email (10m SLA)",
  });

  emitSignal({
    source: "intakecrm",
    type: "intakecrm.task.created",
    priority: "low",
    payload: { tenant, leadId: lead.leadId, taskIds: [call.taskId, intro.taskId] },
  });

  return [call, intro];
}

export async function evaluateIntakecrmTasks(input: { tenant: string; actor: IntakeCrmActor }): Promise<{
  evaluatedAt: string;
  overdue: IntakeCrmTask[];
  total: number;
}> {
  const { tenant } = input;
  const now = Date.now();
  const nowIso = new Date(now).toISOString();

  const tasks = await listIntakecrmTasks(tenant);
  const overdue: IntakeCrmTask[] = [];

  for (const t of tasks) {
    if (t.status === "completed") continue;
    const due = new Date(t.dueAt).getTime();
    if (!Number.isFinite(due)) continue;
    if (due > now) continue;

    const next = patchIntakecrmTask(tenant, t.taskId, {
      status: "overdue",
      overdueAt: t.overdueAt || nowIso,
    });
    if (!next) continue;

    const shouldSignal = !next.overdueSignalAt;
    if (shouldSignal) {
      const signaled = patchIntakecrmTask(tenant, t.taskId, { overdueSignalAt: nowIso }) || next;
      overdue.push(signaled);

      emitSignal({
        source: "intakecrm",
        type: "intakecrm.task.overdue",
        priority: "high",
        payload: {
          tenant,
          leadId: signaled.leadId,
          taskId: signaled.taskId,
          taskType: signaled.type,
          dueAt: signaled.dueAt,
          assignedTo: signaled.assignedTo,
        },
      });
    }
  }

  if (overdue.length) {
    emitSignal({
      source: "intakecrm",
      type: "intakecrm.sla.breach",
      priority: "high",
      payload: { tenant, overdueCount: overdue.length, evaluatedAt: nowIso },
    });
  }

  return { evaluatedAt: nowIso, overdue, total: tasks.length };
}
