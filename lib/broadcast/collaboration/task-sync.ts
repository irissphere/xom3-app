// Broadcast Engine - Multi-Agent Collaboration: Task Sync Engine
// Ensures no duplicate actions, coordinates task execution

import { AgentAction } from "../agent-workflow/action";
import { AssignmentMatrix } from "./assignment-matrix";
import { Task } from "../funnel-modules/task";

export interface TaskSync {
  taskId: string;
  leadId: string;
  agentId: string;
  actionType: AgentAction["actionType"];
  status: "pending" | "in_progress" | "completed" | "cancelled";
  lockedBy?: string; // Agent ID who locked the task
  lockedAt?: string;
  completedBy?: string;
  completedAt?: string;
  metadata: {
    assignmentMode: AssignmentMatrix["mode"];
    role: "primary" | "secondary" | "escalation" | "coordinator";
  };
}

/**
 * Lock task for agent action
 */
export function lockTask(
  taskId: string,
  agentId: string,
  actionType: AgentAction["actionType"]
): TaskSync {
  return {
    taskId,
    leadId: "", // Will be populated from task
    agentId,
    actionType,
    status: "in_progress",
    lockedBy: agentId,
    lockedAt: new Date().toISOString(),
    metadata: {
      assignmentMode: "parallel",
      role: "primary"
    }
  };
}

/**
 * Check if task is available for action
 */
export function isTaskAvailable(
  taskId: string,
  agentId: string,
  existingSyncs: TaskSync[]
): {
  available: boolean;
  reason?: string;
  lockedBy?: string;
} {
  const existing = existingSyncs.find(s => s.taskId === taskId);
  
  if (!existing) {
    return { available: true };
  }
  
  if (existing.status === "completed") {
    return { 
      available: false, 
      reason: "Task already completed",
      lockedBy: existing.completedBy
    };
  }
  
  if (existing.status === "in_progress" && existing.lockedBy !== agentId) {
    return { 
      available: false, 
      reason: "Task locked by another agent",
      lockedBy: existing.lockedBy
    };
  }
  
  if (existing.status === "cancelled") {
    return { 
      available: false, 
      reason: "Task cancelled"
    };
  }
  
  return { available: true };
}

/**
 * Complete task sync
 */
export function completeTaskSync(
  sync: TaskSync,
  agentId: string
): TaskSync {
  return {
    ...sync,
    status: "completed",
    completedBy: agentId,
    completedAt: new Date().toISOString()
  };
}

/**
 * Cancel task sync
 */
export function cancelTaskSync(
  sync: TaskSync,
  reason: string
): TaskSync {
  return {
    ...sync,
    status: "cancelled",
    metadata: {
      ...sync.metadata,
      // Store cancellation reason in metadata
    }
  };
}

/**
 * Prevent duplicate actions
 */
export function preventDuplicateActions(
  action: AgentAction,
  existingActions: AgentAction[],
  existingSyncs: TaskSync[]
): {
  allowed: boolean;
  reason?: string;
  duplicateActionId?: string;
} {
  // Check if same action type on same lead by same agent
  const duplicate = existingActions.find(a =>
    a.agentId === action.agentId &&
    a.leadId === action.leadId &&
    a.actionType === action.actionType &&
    a.id !== action.id
  );
  
  if (duplicate) {
    return {
      allowed: false,
      reason: "Duplicate action detected",
      duplicateActionId: duplicate.id
    };
  }
  
  // Check if task is locked by another agent
  const sync = existingSyncs.find(s => s.taskId === action.taskId);
  if (sync && sync.lockedBy && sync.lockedBy !== action.agentId) {
    return {
      allowed: false,
      reason: `Task locked by agent ${sync.lockedBy}`
    };
  }
  
  return { allowed: true };
}

/**
 * Coordinate sequential handoff
 */
export function coordinateSequentialHandoff(
  currentAgentId: string,
  nextAgentId: string,
  task: Task,
  syncs: TaskSync[]
): {
  handoffAllowed: boolean;
  currentSync?: TaskSync;
  nextSync?: TaskSync;
  reason?: string;
} {
  // Find current agent's sync
  const currentSync = syncs.find(s => 
    s.taskId === task.id && 
    s.agentId === currentAgentId &&
    s.status === "in_progress"
  );
  
  if (!currentSync) {
    return { handoffAllowed: false };
  }
  
  // Check if next agent is available
  const nextSync = syncs.find(s => 
    s.taskId === task.id && 
    s.agentId === nextAgentId
  );
  
  if (nextSync && nextSync.status === "in_progress") {
    return { 
      handoffAllowed: false,
      reason: "Next agent already has task in progress"
    };
  }
  
  // Complete current sync
  const completedCurrent = completeTaskSync(currentSync, currentAgentId);
  
  // Create next sync
  const newNextSync: TaskSync = {
    taskId: task.id,
    leadId: task.leadId || "",
    agentId: nextAgentId,
    actionType: "send_followup", // Default for sequential
    status: "pending",
    metadata: {
      assignmentMode: "sequential",
      role: "primary"
    }
  };
  
  return {
    handoffAllowed: true,
    currentSync: completedCurrent,
    nextSync: newNextSync
  };
}

/**
 * Coordinate assist mode
 */
export function coordinateAssistMode(
  primaryAgentId: string,
  secondaryAgentId: string,
  task: Task,
  syncs: TaskSync[]
): {
  assistAllowed: boolean;
  primarySync?: TaskSync;
  secondarySync?: TaskSync;
} {
  // Check if primary agent has task
  const primarySync = syncs.find(s => 
    s.taskId === task.id && 
    s.agentId === primaryAgentId
  );
  
  if (!primarySync || primarySync.status !== "in_progress") {
    return { assistAllowed: false };
  }
  
  // Check if secondary agent is already assigned
  const secondarySync = syncs.find(s => 
    s.taskId === task.id && 
    s.agentId === secondaryAgentId
  );
  
  if (secondarySync && secondarySync.status === "in_progress") {
    return { assistAllowed: false };
  }
  
  // Create secondary sync
  const newSecondarySync: TaskSync = {
    taskId: task.id,
    leadId: task.leadId || "",
    agentId: secondaryAgentId,
    actionType: "send_followup",
    status: "pending",
    metadata: {
      assignmentMode: "assist",
      role: "secondary"
    }
  };
  
  return {
    assistAllowed: true,
    primarySync,
    secondarySync: newSecondarySync
  };
}
