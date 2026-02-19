// Broadcast Engine - Agent Workflow: Action Module
// Agents can reply to comments, reply to DMs, send follow-ups, schedule calls, update pipeline, log interactions

import { LeadObject } from "../funnel-modules/lead-intake";
import { RoutingDecision } from "../funnel-modules/routing";
import { Task } from "../funnel-modules/task";
import { AgentScript } from "./script";

export type AgentActionType = 
  | "reply_comment"
  | "reply_dm"
  | "send_followup"
  | "schedule_call"
  | "update_pipeline"
  | "log_interaction"
  | "close_lead";

export interface AgentAction {
  id: string;
  agentId: string;
  actionType: AgentActionType;
  leadId: string;
  clientId: string;
  taskId: string;
  platform: string;
  content: string;
  metadata: {
    script?: AgentScript;
    routing?: RoutingDecision;
    timestamp: string;
  };
}

/**
 * Reply to comment
 */
export async function replyToComment(
  agentId: string,
  lead: LeadObject,
  routing: RoutingDecision,
  task: Task,
  script: AgentScript
): Promise<AgentAction> {
  const action: AgentAction = {
    id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    agentId,
    actionType: "reply_comment",
    leadId: lead.id,
    clientId: task.clientId,
    taskId: task.id,
    platform: lead.platform,
    content: script.script,
    metadata: {
      script,
      routing,
      timestamp: new Date().toISOString()
    }
  };
  
  // In production, post comment via platform API
  // For now, emit signal
  const { emitSignal } = await import("@/lib/uoi/signals");
  emitSignal({
    source: "broadcast_engine",
    type: "agent_action_taken",
    payload: {
      actionId: action.id,
      agentId,
      actionType: action.actionType,
      leadId: lead.id,
      clientId: task.clientId,
      taskId: task.id,
      platform: lead.platform,
      content: action.content
    },
    priority: routing.urgency === "high" ? "high" : "medium"
  });
  
  return action;
}

/**
 * Reply to DM
 */
export async function replyToDM(
  agentId: string,
  lead: LeadObject,
  routing: RoutingDecision,
  task: Task,
  script: AgentScript
): Promise<AgentAction> {
  const action: AgentAction = {
    id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    agentId,
    actionType: "reply_dm",
    leadId: lead.id,
    clientId: task.clientId,
    taskId: task.id,
    platform: lead.platform,
    content: script.script,
    metadata: {
      script,
      routing,
      timestamp: new Date().toISOString()
    }
  };
  
  // In production, send DM via platform API
  // For now, emit signal
  const { emitSignal } = await import("@/lib/uoi/signals");
  emitSignal({
    source: "broadcast_engine",
    type: "agent_action_taken",
    payload: {
      actionId: action.id,
      agentId,
      actionType: action.actionType,
      leadId: lead.id,
      clientId: task.clientId,
      taskId: task.id,
      platform: lead.platform,
      content: action.content
    },
    priority: routing.urgency === "high" ? "high" : "medium"
  });
  
  return action;
}

/**
 * Send follow-up
 */
export async function sendFollowup(
  agentId: string,
  lead: LeadObject,
  routing: RoutingDecision,
  task: Task,
  script: AgentScript
): Promise<AgentAction> {
  const action: AgentAction = {
    id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    agentId,
    actionType: "send_followup",
    leadId: lead.id,
    clientId: task.clientId,
    taskId: task.id,
    platform: lead.platform,
    content: script.script,
    metadata: {
      script,
      routing,
      timestamp: new Date().toISOString()
    }
  };
  
  // In production, send follow-up via platform API or email
  // For now, emit signal
  const { emitSignal } = await import("@/lib/uoi/signals");
  emitSignal({
    source: "broadcast_engine",
    type: "agent_action_taken",
    payload: {
      actionId: action.id,
      agentId,
      actionType: action.actionType,
      leadId: lead.id,
      clientId: task.clientId,
      taskId: task.id,
      platform: lead.platform,
      content: action.content
    },
    priority: "medium"
  });
  
  return action;
}

/**
 * Schedule call
 */
export async function scheduleCall(
  agentId: string,
  lead: LeadObject,
  routing: RoutingDecision,
  task: Task,
  scheduledTime: string // ISO date string
): Promise<AgentAction> {
  const action: AgentAction = {
    id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    agentId,
    actionType: "schedule_call",
    leadId: lead.id,
    clientId: task.clientId,
    taskId: task.id,
    platform: lead.platform,
    content: `Call scheduled for ${scheduledTime}`,
    metadata: {
      routing,
      timestamp: new Date().toISOString()
    }
  };
  
  // In production, create calendar event
  // For now, emit signal
  const { emitSignal } = await import("@/lib/uoi/signals");
  emitSignal({
    source: "broadcast_engine",
    type: "agent_action_taken",
    payload: {
      actionId: action.id,
      agentId,
      actionType: action.actionType,
      leadId: lead.id,
      clientId: task.clientId,
      taskId: task.id,
      scheduledTime
    },
    priority: routing.urgency === "high" ? "high" : "medium"
  });
  
  return action;
}

/**
 * Update pipeline
 */
export async function updatePipeline(
  agentId: string,
  clientId: string,
  currentStage: string,
  newStage: string,
  metadata?: any
): Promise<AgentAction> {
  const action: AgentAction = {
    id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    agentId,
    actionType: "update_pipeline",
    leadId: "",
    clientId,
    taskId: "",
    platform: "",
    content: `Pipeline updated: ${currentStage} → ${newStage}`,
    metadata: {
      timestamp: new Date().toISOString()
    }
  };
  
  // Use HPE stage transition
  const { movePipelineStage } = await import("../funnel-modules/pipeline");
  await movePipelineStage(clientId, currentStage, newStage, {
    ...metadata,
    agentId,
    source: "agent_workflow"
  });
  
  return action;
}

/**
 * Log interaction
 */
export async function logInteraction(
  agentId: string,
  clientId: string,
  channel: string,
  notes: string,
  outcome?: string
): Promise<AgentAction> {
  const action: AgentAction = {
    id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    agentId,
    actionType: "log_interaction",
    leadId: "",
    clientId,
    taskId: "",
    platform: channel,
    content: notes,
    metadata: {
      timestamp: new Date().toISOString()
    }
  };
  
  // In production, log to Airtable or HPE
  // For now, emit signal
  const { emitSignal } = await import("@/lib/uoi/signals");
  emitSignal({
    source: "broadcast_engine",
    type: "interaction_logged",
    payload: {
      actionId: action.id,
      agentId,
      clientId,
      channel,
      notes,
      outcome
    },
    priority: "low"
  });
  
  return action;
}

/**
 * Close lead
 */
export async function closeLead(
  agentId: string,
  lead: LeadObject,
  task: Task,
  outcome: "converted" | "not_interested" | "no_response" | "other",
  revenue?: number
): Promise<AgentAction> {
  const action: AgentAction = {
    id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    agentId,
    actionType: "close_lead",
    leadId: lead.id,
    clientId: task.clientId,
    taskId: task.id,
    platform: lead.platform,
    content: `Lead closed: ${outcome}${revenue ? ` (Revenue: $${revenue})` : ""}`,
    metadata: {
      timestamp: new Date().toISOString()
    }
  };
  
  // Emit conversion feedback signal
  const { emitConversionFeedbackSignal } = await import("../funnel-modules/hyperstate-uoi");
  const { routeLead } = await import("../funnel-modules/routing");
  const routing = routeLead(lead);
  
  await emitConversionFeedbackSignal(lead, routing, {
    converted: outcome === "converted",
    revenue,
    platform: lead.platform
  });
  
  return action;
}
