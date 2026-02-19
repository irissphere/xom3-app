// Broadcast Engine - Multi-Agent Collaboration Layer
// The crew core that ensures multiple agents work in synchrony

import { assignAgentsWithMatrix, AssignmentMatrix, batchAssignWithMatrix, checkForCollisions } from "./collaboration/assignment-matrix";
import { lockTask, isTaskAvailable, preventDuplicateActions, coordinateSequentialHandoff, coordinateAssistMode, TaskSync } from "./collaboration/task-sync";
import { escalateLead, EscalationEvent } from "./collaboration/escalation-engine";
import { createCollaborationThread, sendCollaborationMessage, CollaborationThread, CollaborationMessage } from "./collaboration/collaboration-chat";
import { trackAgentAction, trackConversion, generatePerformanceReport, getTeamPerformanceSummary, AgentPerformanceLog } from "./collaboration/performance-tracker";
import { LeadObject } from "./funnel-modules/lead-intake";
import { RoutingDecision } from "./funnel-modules/routing";
import { AgentAction } from "./agent-workflow/action";
import { Task } from "./funnel-modules/task";
import { ConversionData } from "./agent-workflow/close";

export interface CollaborationContext {
  leadId: string;
  assignmentMatrix: AssignmentMatrix;
  taskSyncs: TaskSync[];
  collaborationThread?: CollaborationThread;
  escalationEvents: EscalationEvent[];
  performanceLogs: AgentPerformanceLog[];
}

/**
 * Initialize collaboration context for a lead
 */
export async function initializeCollaboration(
  lead: LeadObject,
  routing: RoutingDecision
): Promise<CollaborationContext> {
  // Create assignment matrix
  const assignmentMatrix = await assignAgentsWithMatrix(lead, routing);
  
  // Create collaboration thread if multiple agents
  let collaborationThread: CollaborationThread | undefined;
  if (assignmentMatrix.assignments.length > 1) {
    collaborationThread = createCollaborationThread(
      lead.id,
      assignmentMatrix.assignments.map(a => a.agentId)
    );
  }
  
  return {
    leadId: lead.id,
    assignmentMatrix,
    taskSyncs: [],
    collaborationThread,
    escalationEvents: [],
    performanceLogs: []
  };
}

/**
 * Agent takes action with collaboration checks
 */
export async function agentTakesActionWithCollaboration(
  agentId: string,
  action: AgentAction,
  context: CollaborationContext,
  existingActions: AgentAction[]
): Promise<{
  allowed: boolean;
  reason?: string;
  taskSync?: TaskSync;
  collaborationMessage?: CollaborationMessage;
}> {
  // Check for duplicate actions
  const duplicateCheck = preventDuplicateActions(action, existingActions, context.taskSyncs);
  
  if (!duplicateCheck.allowed) {
    return {
      allowed: false,
      reason: duplicateCheck.reason
    };
  }
  
  // Lock task
  const taskSync = lockTask(action.taskId, agentId, action.actionType);
  context.taskSyncs.push(taskSync);
  
  // Send collaboration message if assist mode
  let collaborationMessage: CollaborationMessage | undefined;
  if (context.assignmentMatrix.mode === "assist" && context.collaborationThread) {
    const secondaryAgents = context.assignmentMatrix.assignments
      .filter(a => a.role === "secondary" && a.agentId !== agentId)
      .map(a => a.agentId);
    
    if (secondaryAgents.length > 0) {
      context.collaborationThread = sendCollaborationMessage(
        context.collaborationThread,
        agentId,
        `Action taken: ${action.actionType}`,
        "update",
        secondaryAgents,
        {
          taskId: action.taskId,
          actionType: action.actionType,
          urgency: "medium"
        }
      );
      
      collaborationMessage = context.collaborationThread.messages[context.collaborationThread.messages.length - 1];
    }
  }
  
  // Track action
  context.performanceLogs = trackAgentAction(action, context.performanceLogs);
  
  return {
    allowed: true,
    taskSync,
    collaborationMessage
  };
}

/**
 * Coordinate sequential handoff
 */
export async function coordinateHandoff(
  fromAgentId: string,
  toAgentId: string,
  task: Task,
  context: CollaborationContext
): Promise<{
  handoffAllowed: boolean;
  reason?: string;
  updatedContext?: CollaborationContext;
}> {
  const handoff = coordinateSequentialHandoff(
    fromAgentId,
    toAgentId,
    task,
    context.taskSyncs
  );
  
  if (!handoff.handoffAllowed) {
    return {
      handoffAllowed: false,
      reason: "Handoff not allowed"
    };
  }
  
  // Update context
  if (handoff.currentSync && handoff.nextSync) {
    context.taskSyncs = context.taskSyncs.map(sync =>
      sync.taskId === handoff.currentSync!.taskId && sync.agentId === fromAgentId
        ? handoff.currentSync!
        : sync
    );
    context.taskSyncs.push(handoff.nextSync);
    
    // Send handoff message
    if (context.collaborationThread) {
      context.collaborationThread = sendCollaborationMessage(
        context.collaborationThread,
        fromAgentId,
        `Handoff to ${toAgentId}: Task ${task.id}`,
        "handoff",
        [toAgentId]
      );
    }
  }
  
  return {
    handoffAllowed: true,
    updatedContext: context
  };
}

/**
 * Check and escalate if needed
 */
export async function checkAndEscalate(
  lead: LeadObject,
  routing: RoutingDecision,
  context: CollaborationContext,
  currentAgentId?: string
): Promise<{
  escalated: boolean;
  escalationEvent?: EscalationEvent;
  updatedContext?: CollaborationContext;
}> {
  const escalation = await escalateLead(lead, routing, currentAgentId);
  
  if (!escalation) {
    return { escalated: false };
  }
  
  context.escalationEvents.push(escalation);
  
  // Update assignment matrix
  context.assignmentMatrix.assignments.push({
    agentId: escalation.toAgentId,
    leadId: lead.id,
    mode: "escalation",
    role: "escalation",
    reasoning: escalation.reason,
    confidence: 0.9,
    assignedAt: escalation.escalatedAt
  });
  
  // Send escalation message
  if (context.collaborationThread) {
    context.collaborationThread = sendCollaborationMessage(
      context.collaborationThread,
      escalation.fromAgentId || "system",
      `Lead escalated: ${escalation.reason}`,
      "update",
      [escalation.toAgentId],
      {
        urgency: escalation.urgency === "critical" ? "high" : escalation.urgency
      }
    );
  }
  
  return {
    escalated: true,
    escalationEvent: escalation,
    updatedContext: context
  };
}

/**
 * Record conversion with collaboration tracking
 */
export function recordConversionWithCollaboration(
  conversion: ConversionData,
  context: CollaborationContext
): CollaborationContext {
  // Track conversion
  context.performanceLogs = trackConversion(conversion, context.performanceLogs);
  
  // Complete task syncs
  context.taskSyncs = context.taskSyncs.map(sync =>
    sync.leadId === conversion.leadId
      ? { ...sync, status: "completed", completedBy: conversion.agentId, completedAt: conversion.timestamp }
      : sync
  );
  
  return context;
}

/**
 * Get collaboration summary
 */
export function getCollaborationSummary(
  context: CollaborationContext
): {
  mode: AssignmentMatrix["mode"];
  agents: string[];
  actions: number;
  escalations: number;
  collaborationMessages: number;
  performance: {
    avgEffectiveness: number;
    avgCollaborationScore: number;
  };
} {
  const agents = context.assignmentMatrix.assignments.map(a => a.agentId);
  const actions = context.performanceLogs.reduce((sum, log) => sum + log.metrics.totalActions, 0);
  const escalations = context.escalationEvents.length;
  const collaborationMessages = context.collaborationThread?.messages.length || 0;
  
  const avgEffectiveness = context.performanceLogs.length > 0
    ? context.performanceLogs.reduce((sum, log) => sum + log.metrics.effectiveness, 0) / context.performanceLogs.length
    : 0;
  
  const avgCollaborationScore = context.performanceLogs.length > 0
    ? context.performanceLogs.reduce((sum, log) => sum + log.metrics.collaborationScore, 0) / context.performanceLogs.length
    : 0;
  
  return {
    mode: context.assignmentMatrix.mode,
    agents,
    actions,
    escalations,
    collaborationMessages,
    performance: {
      avgEffectiveness,
      avgCollaborationScore
    }
  };
}
