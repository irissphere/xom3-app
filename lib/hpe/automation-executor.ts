// HPE Phase II - Strike 1: Automation Execution Engine
// Unified engine to execute all automation actions

import { AutomationAction, StageTransitionContext } from "./stage-automation-rules";
import { emitSignal } from "@/lib/uoi/signals";
import { pushHistory } from "@/lib/hse/history-store";
import { emitStateUpdate } from "@/lib/hse/signals";
import { logTaskEvent, logAutomationEvent, logSystemEvent } from "./compliance-helpers";
import Airtable from "airtable";

export interface AutomationExecutionResult {
  actionType: string;
  success: boolean;
  error?: string;
  result?: any;
  executionTime: number;
}

export interface AutomationExecutionReport {
  totalActions: number;
  successful: number;
  failed: number;
  results: AutomationExecutionResult[];
  executionTime: number;
}

/**
 * Execute a single automation action
 */
async function executeAction(
  action: AutomationAction,
  context: StageTransitionContext
): Promise<AutomationExecutionResult> {
  const startTime = Date.now();
  const actionType = action.type;
  
  try {
    let result: any = null;
    
    switch (action.type) {
      case "assign_task":
        result = await executeAssignTask(action, context);
        break;
      
      case "close_task":
        result = await executeCloseTask(action, context);
        break;
      
      case "send_notification":
        result = await executeSendNotification(action, context);
        break;
      
      case "sync_airtable":
        result = await executeSyncAirtable(action, context);
        break;
      
      case "log_compliance":
        result = await executeLogCompliance(action, context);
        break;
      
      case "trigger_workflow":
        result = await executeTriggerWorkflow(action, context);
        break;
      
      case "emit_uoi_signal":
        result = await executeEmitUOISignal(action, context);
        break;
      
      case "update_hse_state":
        result = await executeUpdateHSEState(action, context);
        break;
      
      case "update_billing":
        result = await executeUpdateBilling(action, context);
        break;
      
      case "update_commission":
        result = await executeUpdateCommission(action, context);
        break;
      
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
    
    return {
      actionType,
      success: true,
      result,
      executionTime: Date.now() - startTime
    };
  } catch (error: any) {
    console.error(`[Automation Executor] Failed to execute ${actionType}:`, error);
    
    // Log automation failure
    await logSystemEvent("automation_failure", {
      clientId: context.clientId,
      agentId: context.userId,
      stage: context.newStage,
      description: `Automation action failed: ${actionType}`,
      metadata: {
        actionType,
        error: error.message,
        context: {
          oldStage: context.oldStage,
          newStage: context.newStage
        }
      },
      source: "automation"
    });
    
    return {
      actionType,
      success: false,
      error: error.message || "Unknown error",
      executionTime: Date.now() - startTime
    };
  }
}

/**
 * Assign a task
 */
async function executeAssignTask(
  action: AutomationAction,
  context: StageTransitionContext
): Promise<any> {
  const { taskName, taskDescription, assignee } = action.config;
  
  if (!taskName) {
    throw new Error("Task name is required");
  }
  
  // Create task in Airtable
  if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_USHA_BASE_ID) {
    throw new Error("Airtable configuration missing");
  }
  
  const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
    .base(process.env.AIRTABLE_USHA_BASE_ID);
  
  const taskRecord = await base("Tasks").create([{
    fields: {
      "Name": taskName,
      "Description": taskDescription || "",
      "Client": [context.clientId],
      "Status": "Not Started",
      "Priority": action.priority || 5,
      "Created Date": new Date().toISOString(),
      "Due Date": new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      "Assigned To": assignee === "agent" ? context.userId || "system" : assignee || "system"
    }
  }]);
  
  console.log(`[Automation] Task assigned: ${taskName} for client ${context.clientId}`);
  
  // Log task event
  await logTaskEvent("task_created", {
    clientId: context.clientId,
    agentId: context.userId,
    stage: context.newStage,
    taskId: taskRecord[0].id,
    taskName,
    description: `Task "${taskName}" assigned via automation`,
    source: "automation"
  });
  
  return {
    taskId: taskRecord[0].id,
    taskName,
    assigned: true
  };
}

/**
 * Close a task
 */
async function executeCloseTask(
  action: AutomationAction,
  context: StageTransitionContext
): Promise<any> {
  const { taskPattern } = action.config;
  
  if (!taskPattern) {
    throw new Error("Task pattern is required");
  }
  
  if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_USHA_BASE_ID) {
    throw new Error("Airtable configuration missing");
  }
  
  const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
    .base(process.env.AIRTABLE_USHA_BASE_ID);
  
  // Find tasks matching the pattern
  const tasks = await base("Tasks").select({
    filterByFormula: `AND({Client} = "${context.clientId}", FIND("${taskPattern}", {Name}) > 0, {Status} != "Completed")`,
    maxRecords: 10
  }).all();
  
  if (tasks.length === 0) {
    console.log(`[Automation] No tasks found matching pattern: ${taskPattern}`);
    return { closed: 0 };
  }
  
  // Close all matching tasks
  const updates = tasks.map(task => ({
    id: task.id,
    fields: {
      "Status": "Completed",
      "Completed Date": new Date().toISOString()
    }
  }));
  
  await base("Tasks").update(updates);
  
  console.log(`[Automation] Closed ${tasks.length} task(s) matching pattern: ${taskPattern}`);
  
  // Log task events
  for (const task of tasks) {
    await logTaskEvent("task_completed", {
      clientId: context.clientId,
      agentId: context.userId,
      stage: context.newStage,
      taskId: task.id,
      description: `Task closed via automation (pattern: ${taskPattern})`,
      source: "automation"
    });
  }
  
  return {
    closed: tasks.length,
    taskIds: tasks.map(t => t.id)
  };
}

/**
 * Send a notification
 */
async function executeSendNotification(
  action: AutomationAction,
  context: StageTransitionContext
): Promise<any> {
  const { notificationType, notificationTemplate, recipients } = action.config;
  
  // Call notification API
  const response = await fetch("/api/usha/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: `Stage transition: ${context.oldStage} → ${context.newStage}`,
      details: {
        clientId: context.clientId,
        clientName: context.clientName,
        oldStage: context.oldStage,
        newStage: context.newStage,
        template: notificationTemplate,
        timestamp: context.timestamp
      },
      channels: notificationType ? [notificationType] : ["email"],
      recipients: recipients || ["agent"]
    })
  });
  
  if (!response.ok) {
    throw new Error("Failed to send notification");
  }
  
  console.log(`[Automation] Notification sent via ${notificationType}`);
  
  return {
    sent: true,
    channel: notificationType
  };
}

/**
 * Sync Airtable
 */
async function executeSyncAirtable(
  action: AutomationAction,
  context: StageTransitionContext
): Promise<any> {
  const { airtableTable, airtableFields } = action.config;
  
  if (!airtableTable || !airtableFields) {
    throw new Error("Airtable table and fields are required");
  }
  
  if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_USHA_BASE_ID) {
    throw new Error("Airtable configuration missing");
  }
  
  const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
    .base(process.env.AIRTABLE_USHA_BASE_ID);
  
  // Replace template variables
  const processedFields: Record<string, any> = {};
  for (const [key, value] of Object.entries(airtableFields)) {
    if (typeof value === "string" && value.includes("{{timestamp}}")) {
      processedFields[key] = value.replace("{{timestamp}}", context.timestamp);
    } else {
      processedFields[key] = value;
    }
  }
  
  await base(airtableTable).update([{
    id: context.clientId,
    fields: processedFields
  }]);
  
  console.log(`[Automation] Airtable synced: ${airtableTable}`);
  
  return {
    synced: true,
    table: airtableTable
  };
}

/**
 * Log compliance event
 */
async function executeLogCompliance(
  action: AutomationAction,
  context: StageTransitionContext
): Promise<any> {
  const { complianceType, complianceNotes } = action.config;
  
  const response = await fetch("/api/usha/compliance/auto-log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clientId: context.clientId,
      oldStatus: context.oldStage,
      newStatus: context.newStage,
      type: complianceType || "Stage Transition",
      notes: complianceNotes || `Client moved from "${context.oldStage}" to "${context.newStage}"`,
      metadata: {
        timestamp: context.timestamp,
        userId: context.userId,
        ...context.metadata
      }
    })
  });
  
  if (!response.ok) {
    throw new Error("Failed to log compliance event");
  }
  
  console.log(`[Automation] Compliance logged: ${complianceType}`);
  
  return {
    logged: true,
    type: complianceType
  };
}

/**
 * Trigger a workflow
 */
async function executeTriggerWorkflow(
  action: AutomationAction,
  context: StageTransitionContext
): Promise<any> {
  const { workflowId, workflowParams } = action.config;
  
  if (!workflowId) {
    throw new Error("Workflow ID is required");
  }
  
  // Trigger workflow via webhook or n8n
  // This is a placeholder - implement based on your workflow system
  console.log(`[Automation] Workflow triggered: ${workflowId}`);
  
  return {
    triggered: true,
    workflowId
  };
}

/**
 * Emit UOI signal
 */
async function executeEmitUOISignal(
  action: AutomationAction,
  context: StageTransitionContext
): Promise<any> {
  const { uoiSignalType, uoiSignalPayload } = action.config;
  
  if (!uoiSignalType) {
    throw new Error("UOI signal type is required");
  }
  
  emitSignal({
    source: "hpe-stage-automation",
    type: uoiSignalType,
    payload: {
      clientId: context.clientId,
      oldStage: context.oldStage,
      newStage: context.newStage,
      timestamp: context.timestamp,
      ...uoiSignalPayload
    },
    priority: action.priority && action.priority >= 7 ? "high" : "medium"
  });
  
  console.log(`[Automation] UOI signal emitted: ${uoiSignalType}`);
  
  return {
    emitted: true,
    signalType: uoiSignalType
  };
}

/**
 * Update HSE state
 */
async function executeUpdateHSEState(
  action: AutomationAction,
  context: StageTransitionContext
): Promise<any> {
  const { hseSubsystem, hseMetric, hseValue } = action.config;
  
  if (!hseSubsystem || !hseMetric) {
    throw new Error("HSE subsystem and metric are required");
  }
  
  // Push to HSE history
  pushHistory({
    timestamp: Date.now(),
    subsystem: hseSubsystem,
    type: hseMetric,
    value: hseValue || 1
  });
  
  // Emit state update
  emitStateUpdate([`${hseSubsystem}_${hseMetric}_updated`]);
  
  console.log(`[Automation] HSE state updated: ${hseSubsystem}.${hseMetric}`);
  
  return {
    updated: true,
    subsystem: hseSubsystem,
    metric: hseMetric
  };
}

/**
 * Update billing
 */
async function executeUpdateBilling(
  action: AutomationAction,
  context: StageTransitionContext
): Promise<any> {
  const { billingAction } = action.config;
  
  if (!billingAction) {
    throw new Error("Billing action is required");
  }
  
  // Placeholder for billing integration
  // This would integrate with Stripe, billing system, etc.
  console.log(`[Automation] Billing action: ${billingAction} for client ${context.clientId}`);
  
  return {
    action: billingAction,
    executed: true
  };
}

/**
 * Update commission
 */
async function executeUpdateCommission(
  action: AutomationAction,
  context: StageTransitionContext
): Promise<any> {
  const { commissionAction } = action.config;
  
  if (!commissionAction) {
    throw new Error("Commission action is required");
  }
  
  // Placeholder for commission calculation
  console.log(`[Automation] Commission action: ${commissionAction} for client ${context.clientId}`);
  
  return {
    action: commissionAction,
    executed: true
  };
}

/**
 * Execute all automation actions for a stage transition
 */
export async function executeAutomationActions(
  actions: AutomationAction[],
  context: StageTransitionContext
): Promise<AutomationExecutionReport> {
  const startTime = Date.now();
  const results: AutomationExecutionResult[] = [];
  
  // Log automation triggered
  await logAutomationEvent("automation_triggered", {
    clientId: context.clientId,
    agentId: context.userId,
    stage: context.newStage,
    description: `Automation triggered for transition: ${context.oldStage} → ${context.newStage}`,
    metadata: {
      oldStage: context.oldStage,
      newStage: context.newStage,
      actionCount: actions.length
    },
    source: "automation"
  });
  
  // Execute actions in sequence (can be parallelized later if needed)
  for (const action of actions) {
    const result = await executeAction(action, context);
    results.push(result);
    
    // Log result
    if (result.success) {
      console.log(`[Automation] ✅ ${result.actionType} completed in ${result.executionTime}ms`);
    } else {
      console.error(`[Automation] ❌ ${result.actionType} failed: ${result.error}`);
    }
  }
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  // Log automation completion
  if (failed === 0) {
    await logAutomationEvent("automation_completed", {
      clientId: context.clientId,
      agentId: context.userId,
      stage: context.newStage,
      description: `Automation completed successfully: ${successful}/${actions.length} actions`,
      metadata: {
        totalActions: actions.length,
        successful,
        failed
      },
      source: "automation"
    });
  } else {
    await logAutomationEvent("automation_failed", {
      clientId: context.clientId,
      agentId: context.userId,
      stage: context.newStage,
      description: `Automation partially failed: ${successful}/${actions.length} actions succeeded`,
      metadata: {
        totalActions: actions.length,
        successful,
        failed,
        errors: results.filter(r => !r.success).map(r => ({ type: r.actionType, error: r.error }))
      },
      source: "automation"
    });
  }
  
  return {
    totalActions: actions.length,
    successful,
    failed,
    results,
    executionTime: Date.now() - startTime
  };
}
