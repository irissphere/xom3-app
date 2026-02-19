// Broadcast Engine - Agent Workflow Integration
// The bridge between automation and human execution

import { DetectedLead } from "./types";
import { normalizeDetectedLead, LeadObject } from "./funnel-modules/lead-intake";
import { routeLead, RoutingDecision } from "./funnel-modules/routing";
import { assignAgentToLead, AgentAssignment } from "./funnel-modules/agent-assignment";
import { createTask, Task } from "./funnel-modules/task";
import { notifyNewLead, AgentNotification } from "./agent-workflow/notification";
import { getScriptForLead, AgentScript } from "./agent-workflow/script";
import { calculateTaskPriority, TaskPriority } from "./agent-workflow/priority";
import { replyToComment, replyToDM, sendFollowup, scheduleCall, updatePipeline, logInteraction, closeLead, AgentAction } from "./agent-workflow/action";
import { recordConversion, ConversionData } from "./agent-workflow/close";

export interface AgentWorkflowResult {
  success: boolean;
  leadId: string;
  clientId: string;
  agentId?: string;
  taskId?: string;
  notificationId?: string;
  scriptId?: string;
  priority?: number;
  error?: string;
}

/**
 * Integrate lead into agent workflow
 */
export async function integrateLeadIntoAgentWorkflow(
  lead: DetectedLead,
  agentId?: string
): Promise<AgentWorkflowResult> {
  const result: AgentWorkflowResult = {
    success: false,
    leadId: lead.id,
    clientId: ""
  };
  
  try {
    // Step 1: Normalize lead
    const leadObject = normalizeDetectedLead(lead);
    
    // Step 2: Route lead
    const routing = routeLead(leadObject);
    result.clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`; // In production, get from HPE
    
    // Step 3: Assign agent (if not provided)
    let finalAgentId = agentId;
    if (!finalAgentId) {
      const assignment = await assignAgentToLead(leadObject, routing);
      if (assignment) {
        finalAgentId = assignment.agentId;
        result.agentId = finalAgentId;
      }
    } else {
      result.agentId = finalAgentId;
    }
    
    if (!finalAgentId) {
      throw new Error("No agent available for assignment");
    }
    
    // Step 4: Create task
    const task = createTask(leadObject, routing, result.clientId, finalAgentId);
    result.taskId = task.id;
    
    // Step 5: Notify agent
    const notification = await notifyNewLead(
      finalAgentId,
      leadObject,
      routing,
      ["cockpit", "slack"]
    );
    result.notificationId = notification.id;
    
    // Step 6: Generate script
    const script = getScriptForLead(leadObject, routing);
    result.scriptId = script.id;
    
    // Step 7: Calculate priority
    const timeSinceSignal = (Date.now() - new Date(leadObject.firstSeenAt).getTime()) / (1000 * 60); // Minutes
    const priority = calculateTaskPriority(task, leadObject, routing, timeSinceSignal);
    result.priority = priority.priority;
    
    result.success = true;
    return result;
  } catch (error: any) {
    console.error("[Agent Workflow] Integration failed:", error);
    result.error = error.message;
    return result;
  }
}

/**
 * Get agent tasks with context
 */
export async function getAgentTasks(
  agentId: string,
  limit: number = 20
): Promise<Array<{
  task: Task;
  lead: LeadObject;
  routing: RoutingDecision;
  script: AgentScript;
  priority: TaskPriority;
}>> {
  // In production, fetch from database
  // For now, return empty array
  return [];
}

/**
 * Agent takes action
 */
export async function agentTakesAction(
  agentId: string,
  actionType: AgentAction["actionType"],
  taskId: string,
  leadId: string,
  clientId: string,
  content?: string,
  metadata?: any
): Promise<AgentAction> {
  // In production, fetch task, lead, routing from database
  // For now, create minimal objects
  const lead: LeadObject = {
    id: leadId,
    platform: "instagram",
    leadScore: 0,
    leadTier: "cold",
    leadType: "unknown",
    urgency: "low",
    content: content || "",
    firstSeenAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
    metadata: {}
  };
  
  const routing: RoutingDecision = {
    pipelineStage: "Prospect",
    entryPoint: "high_engagement",
    taskDescription: "",
    taskPriority: "low",
    urgency: "low",
    hseStates: [],
    uoiSignalType: "agent_action_taken",
    reasoning: ""
  };
  
  const task: Task = {
    id: taskId,
    clientId,
    leadId,
    title: "",
    description: "",
    priority: "low",
    status: "in_progress",
    taskType: "other",
    metadata: {
      platform: "instagram",
      entryPoint: "high_engagement",
      leadScore: 0,
      leadTier: "cold",
      createdAt: new Date().toISOString()
    }
  };
  
  const script = getScriptForLead(lead, routing);
  
  switch (actionType) {
    case "reply_comment":
      return await replyToComment(agentId, lead, routing, task, script);
    case "reply_dm":
      return await replyToDM(agentId, lead, routing, task, script);
    case "send_followup":
      return await sendFollowup(agentId, lead, routing, task, script);
    case "schedule_call":
      return await scheduleCall(agentId, lead, routing, task, metadata?.scheduledTime || new Date().toISOString());
    case "update_pipeline":
      return await updatePipeline(agentId, clientId, metadata?.currentStage || "Prospect", metadata?.newStage || "Intake", metadata);
    case "log_interaction":
      return await logInteraction(agentId, clientId, metadata?.channel || "unknown", content || "", metadata?.outcome);
    case "close_lead":
      return await closeLead(agentId, lead, task, metadata?.outcome || "other", metadata?.revenue);
    default:
      throw new Error(`Unknown action type: ${actionType}`);
  }
}

/**
 * Record conversion and send feedback
 */
export async function recordConversionAndFeedback(
  leadId: string,
  clientId: string,
  taskId: string,
  agentId: string,
  converted: boolean,
  revenue?: number,
  conversionTime?: number
): Promise<ConversionData> {
  // In production, fetch lead, routing, task from database
  // For now, create minimal objects
  const lead: LeadObject = {
    id: leadId,
    platform: "instagram",
    leadScore: 0,
    leadTier: "cold",
    leadType: "unknown",
    urgency: "low",
    content: "",
    firstSeenAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
    metadata: {}
  };
  
  const routing: RoutingDecision = {
    pipelineStage: "Prospect",
    entryPoint: "high_engagement",
    taskDescription: "",
    taskPriority: "low",
    urgency: "low",
    hseStates: [],
    uoiSignalType: "conversion_recorded",
    reasoning: ""
  };
  
  const task: Task = {
    id: taskId,
    clientId,
    leadId,
    title: "",
    description: "",
    priority: "low",
    status: "completed",
    taskType: "other",
    metadata: {
      platform: "instagram",
      entryPoint: "high_engagement",
      leadScore: 0,
      leadTier: "cold",
      createdAt: new Date().toISOString()
    }
  };
  
  return await recordConversion(lead, routing, task, agentId, converted, revenue, conversionTime);
}
