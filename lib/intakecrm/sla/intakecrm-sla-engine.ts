import { subscribe } from "@/lib/sovereigns/event-bus";
import { emitIntakecrmSignal } from "../intakecrm-signal-emitter";
import { appendTimelineEvent } from "../store/intakecrm-store";
import { getTasksByTenant, listTenantIdsFromTasks, updateTask } from "../tasks/intakecrm-task-store";

type GlobalGuard = {
  __xom3_intakecrm_sla_armed__?: boolean;
  __xom3_intakecrm_sla_unsub__?: (() => void) | null;
  __xom3_intakecrm_sla_last_run__?: number;
};

function g(): GlobalGuard {
  return globalThis as any;
}

const MIN_INTERVAL_MS = 30_000;
const ESCALATE_AFTER_MS = 20 * 60_000;

export function evaluateTenantSla(tenantId: string) {
  const now = Date.now();
  const nowIso = new Date(now).toISOString();

  const tasks = getTasksByTenant(tenantId);
  let overdueCount = 0;
  let escalatedCount = 0;

  for (const t of tasks) {
    if (t.status === "completed") continue;
    const due = new Date(t.dueAt).getTime();
    if (!Number.isFinite(due)) continue;
    if (due > now) continue;

    // Overdue transition
    if (t.status !== "overdue") {
      const next = updateTask(tenantId, t.taskId, { status: "overdue" });
      if (next) {
        overdueCount += 1;
        appendTimelineEvent(tenantId, next.leadId, {
          type: "intakecrm.task.overdue",
          payload: { taskId: next.taskId, taskType: next.type, dueAt: next.dueAt },
        });
        emitIntakecrmSignal({
          tenantId,
          type: "intakecrm.task.overdue",
          priority: "high",
          payload: { leadId: next.leadId, taskId: next.taskId, taskType: next.type, dueAt: next.dueAt, assignedTo: next.assignedTo },
        });
      }
    }

    // Escalation
    const overdueFor = now - due;
    if (overdueFor >= ESCALATE_AFTER_MS && !t.escalated) {
      const next = updateTask(tenantId, t.taskId, { escalated: true });
      if (next) {
        escalatedCount += 1;
        appendTimelineEvent(tenantId, next.leadId, {
          type: "intakecrm.task.escalated",
          payload: { taskId: next.taskId, taskType: next.type, dueAt: next.dueAt, overdueForMs: overdueFor },
        });
        emitIntakecrmSignal({
          tenantId,
          type: "intakecrm.task.escalated",
          priority: "critical",
          payload: { leadId: next.leadId, taskId: next.taskId, taskType: next.type, dueAt: next.dueAt, overdueForMs: overdueFor },
        });
      }
    }
  }

  return { evaluatedAt: nowIso, overdueCount, escalatedCount, total: tasks.length };
}

export function evaluateAllTenantsSla() {
  const tenants = listTenantIdsFromTasks();
  const results = tenants.map((tenantId) => ({ tenantId, ...evaluateTenantSla(tenantId) }));
  return { tenants: results };
}

export function ensureIntakecrmSlaEngineArmed() {
  const gg = g();
  if (gg.__xom3_intakecrm_sla_armed__) return;
  gg.__xom3_intakecrm_sla_armed__ = true;

  gg.__xom3_intakecrm_sla_unsub__ = subscribe((event) => {
    if (event.type !== "sync.pulse") return;
    const last = gg.__xom3_intakecrm_sla_last_run__ || 0;
    const now = Date.now();
    if (now - last < MIN_INTERVAL_MS) return;
    gg.__xom3_intakecrm_sla_last_run__ = now;
    try {
      evaluateAllTenantsSla();
    } catch {
      // passive lane
    }
  });
}
