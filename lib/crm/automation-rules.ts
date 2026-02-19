// Workflow Automation Builder - No-Code Rules Engine
// Self-automating CRM system

export type TriggerType = 
  | "stage_change"
  | "renewal_due"
  | "document_uploaded"
  | "task_created"
  | "appointment_scheduled"
  | "client_created"
  | "field_updated"
  | "time_based";

export type ActionType =
  | "create_task"
  | "send_email"
  | "change_stage"
  | "send_notification"
  | "trigger_webhook"
  | "create_reminder"
  | "update_field"
  | "assign_agent";

export interface TriggerCondition {
  field: string;
  operator: "equals" | "not_equals" | "contains" | "greater_than" | "less_than" | "is_empty" | "is_not_empty";
  value?: string | number;
}

export interface AutomationRule {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  trigger: {
    type: TriggerType;
    conditions?: TriggerCondition[];
    schedule?: string; // Cron expression for time_based
  };
  actions: Array<{
    type: ActionType;
    config: Record<string, any>;
  }>;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  executionCount: number;
  lastExecuted?: string;
}

/**
 * Evaluate trigger conditions
 */
export function evaluateConditions(
  conditions: TriggerCondition[],
  context: Record<string, any>
): boolean {
  for (const condition of conditions) {
    const fieldValue = context[condition.field];
    let result = false;

    switch (condition.operator) {
      case "equals":
        result = String(fieldValue) === String(condition.value);
        break;
      case "not_equals":
        result = String(fieldValue) !== String(condition.value);
        break;
      case "contains":
        result = String(fieldValue || "").toLowerCase().includes(String(condition.value || "").toLowerCase());
        break;
      case "greater_than":
        result = Number(fieldValue) > Number(condition.value);
        break;
      case "less_than":
        result = Number(fieldValue) < Number(condition.value);
        break;
      case "is_empty":
        result = !fieldValue || String(fieldValue).trim() === "";
        break;
      case "is_not_empty":
        result = !!fieldValue && String(fieldValue).trim() !== "";
        break;
    }

    if (!result) {
      return false; // All conditions must be true
    }
  }

  return true;
}

/**
 * Execute automation rule actions
 */
export async function executeRuleActions(
  rule: AutomationRule,
  context: Record<string, any>
): Promise<Array<{ action: ActionType; success: boolean; error?: string }>> {
  const results: Array<{ action: ActionType; success: boolean; error?: string }> = [];

  for (const action of rule.actions) {
    try {
      switch (action.type) {
        case "create_task":
          await executeCreateTask(action.config, context);
          results.push({ action: action.type, success: true });
          break;

        case "send_email":
          await executeSendEmail(action.config, context);
          results.push({ action: action.type, success: true });
          break;

        case "change_stage":
          await executeChangeStage(action.config, context);
          results.push({ action: action.type, success: true });
          break;

        case "send_notification":
          await executeSendNotification(action.config, context);
          results.push({ action: action.type, success: true });
          break;

        case "trigger_webhook":
          await executeTriggerWebhook(action.config, context);
          results.push({ action: action.type, success: true });
          break;

        case "create_reminder":
          await executeCreateReminder(action.config, context);
          results.push({ action: action.type, success: true });
          break;

        case "update_field":
          await executeUpdateField(action.config, context);
          results.push({ action: action.type, success: true });
          break;

        case "assign_agent":
          await executeAssignAgent(action.config, context);
          results.push({ action: action.type, success: true });
          break;

        default:
          results.push({ action: action.type, success: false, error: "Unknown action type" });
      }
    } catch (error: any) {
      results.push({ action: action.type, success: false, error: error.message });
    }
  }

  return results;
}

// Action executors
async function executeCreateTask(config: Record<string, any>, context: Record<string, any>) {
  const taskData = {
    title: interpolate(config.title || "Task", context),
    description: interpolate(config.description || "", context),
    assignedTo: config.assignedTo || context.agentAssigned,
    dueDate: config.dueDate ? new Date(config.dueDate).toISOString() : undefined,
    clientId: context.clientId,
  };

  await fetch("/api/usha/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(taskData),
  });
}

async function executeSendEmail(config: Record<string, any>, context: Record<string, any>) {
  const emailData = {
    to: config.to || context.email,
    subject: interpolate(config.subject || "Notification", context),
    body: interpolate(config.body || "", context),
    template: config.template,
  };

  await fetch("/api/usha/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...emailData, channels: ["email"] }),
  });
}

async function executeChangeStage(config: Record<string, any>, context: Record<string, any>) {
  const newStage = config.stage || config.newStage;
  if (!newStage || !context.clientId) return;

  await fetch(`/api/usha/client/${context.clientId}/stage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stage: newStage }),
  });
}

async function executeSendNotification(config: Record<string, any>, context: Record<string, any>) {
  const notificationData = {
    message: interpolate(config.message || "Notification", context),
    channels: config.channels || ["slack"],
    details: context,
  };

  await fetch("/api/usha/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(notificationData),
  });
}

async function executeTriggerWebhook(config: Record<string, any>, context: Record<string, any>) {
  const webhookData = {
    url: config.url,
    payload: { ...context, ...config.payload },
    headers: config.headers,
  };

  await fetch("/api/webhooks/trigger", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(webhookData),
  });
}

async function executeCreateReminder(config: Record<string, any>, context: Record<string, any>) {
  // Similar to create_task but with reminder flag
  await executeCreateTask({ ...config, reminder: true }, context);
}

async function executeUpdateField(config: Record<string, any>, context: Record<string, any>) {
  if (!context.clientId || !config.field) return;

  await fetch(`/api/usha/client/${context.clientId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      [config.field]: interpolate(config.value || "", context),
    }),
  });
}

async function executeAssignAgent(config: Record<string, any>, context: Record<string, any>) {
  if (!context.clientId || !config.agentId) return;

  await fetch(`/api/usha/client/${context.clientId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      agentAssigned: config.agentId,
    }),
  });
}

/**
 * Interpolate template strings with context variables
 */
function interpolate(template: string, context: Record<string, any>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return context[key] || match;
  });
}
