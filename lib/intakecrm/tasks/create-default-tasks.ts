import type { Lead } from "../intakecrm-types";
import { appendTimelineEvent } from "../store/intakecrm-store";
import { emitIntakecrmSignal } from "../intakecrm-signal-emitter";
import { createTask } from "./intakecrm-task-store";
import type { Task } from "./intakecrm-task-types";

function minutesFromNowIso(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

export function createDefaultTasksForLead(input: { tenantId: string; lead: Lead }): Task[] {
  const call = createTask(input.tenantId, {
    leadId: input.lead.leadId,
    type: "call",
    status: "pending",
    priority: "high",
    assignedTo: input.lead.assignedTo,
    dueAt: minutesFromNowIso(5),
  });

  const followup = createTask(input.tenantId, {
    leadId: input.lead.leadId,
    type: "text",
    status: "pending",
    priority: "normal",
    assignedTo: input.lead.assignedTo,
    dueAt: minutesFromNowIso(10),
  });

  // Timeline + Signals
  for (const t of [call, followup]) {
    appendTimelineEvent(input.tenantId, input.lead.leadId, {
      type: "intakecrm.task.created",
      payload: { taskId: t.taskId, taskType: t.type, dueAt: t.dueAt, priority: t.priority },
    });
  }

  emitIntakecrmSignal({
    tenantId: input.tenantId,
    type: "intakecrm.task.created",
    priority: "low",
    payload: { leadId: input.lead.leadId, taskIds: [call.taskId, followup.taskId] },
  });

  return [call, followup];
}
