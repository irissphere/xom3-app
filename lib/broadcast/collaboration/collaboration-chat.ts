// Broadcast Engine - Multi-Agent Collaboration: Collaboration Chat
// Agents coordinate inside cockpit

import { Agent } from "../funnel-modules/agent-assignment";
import { LeadObject } from "../funnel-modules/lead-intake";

export interface CollaborationMessage {
  id: string;
  fromAgentId: string;
  toAgentIds: string[]; // Empty array = broadcast to all agents on lead
  leadId: string;
  message: string;
  type: "coordination" | "question" | "update" | "handoff" | "assist_request";
  metadata?: {
    taskId?: string;
    actionType?: string;
    urgency?: "low" | "medium" | "high";
  };
  timestamp: string;
}

export interface CollaborationThread {
  id: string;
  leadId: string;
  agentIds: string[];
  messages: CollaborationMessage[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Create collaboration thread
 */
export function createCollaborationThread(
  leadId: string,
  agentIds: string[]
): CollaborationThread {
  return {
    id: `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    leadId,
    agentIds,
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

/**
 * Send collaboration message
 */
export function sendCollaborationMessage(
  thread: CollaborationThread,
  fromAgentId: string,
  message: string,
  type: CollaborationMessage["type"],
  toAgentIds?: string[],
  metadata?: CollaborationMessage["metadata"]
): CollaborationThread {
  const collaborationMessage: CollaborationMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    fromAgentId,
    toAgentIds: toAgentIds || [], // Empty = broadcast to all agents in thread
    leadId: thread.leadId,
    message,
    type,
    metadata,
    timestamp: new Date().toISOString()
  };
  
  return {
    ...thread,
    messages: [...thread.messages, collaborationMessage],
    updatedAt: new Date().toISOString()
  };
}

/**
 * Request assist from another agent
 */
export function requestAssist(
  thread: CollaborationThread,
  fromAgentId: string,
  toAgentId: string,
  reason: string
): CollaborationThread {
  return sendCollaborationMessage(
    thread,
    fromAgentId,
    `Assist requested: ${reason}`,
    "assist_request",
    [toAgentId],
    {
      urgency: "high"
    }
  );
}

/**
 * Coordinate handoff
 */
export function coordinateHandoff(
  thread: CollaborationThread,
  fromAgentId: string,
  toAgentId: string,
  context: string
): CollaborationThread {
  return sendCollaborationMessage(
    thread,
    fromAgentId,
    `Handoff: ${context}`,
    "handoff",
    [toAgentId],
    {
      urgency: "medium"
    }
  );
}

/**
 * Broadcast update to all agents
 */
export function broadcastUpdate(
  thread: CollaborationThread,
  fromAgentId: string,
  update: string
): CollaborationThread {
  return sendCollaborationMessage(
    thread,
    fromAgentId,
    update,
    "update",
    [], // Empty = broadcast to all
    {
      urgency: "low"
    }
  );
}

/**
 * Get unread messages for agent
 */
export function getUnreadMessages(
  thread: CollaborationThread,
  agentId: string,
  lastReadTimestamp?: string
): CollaborationMessage[] {
  if (!lastReadTimestamp) {
    return thread.messages.filter(m => 
      m.toAgentIds.length === 0 || // Broadcast
      m.toAgentIds.includes(agentId) // Direct message
    );
  }
  
  return thread.messages.filter(m => 
    new Date(m.timestamp) > new Date(lastReadTimestamp) &&
    (m.toAgentIds.length === 0 || m.toAgentIds.includes(agentId))
  );
}

/**
 * Emit collaboration message signal
 */
export async function emitCollaborationSignal(
  message: CollaborationMessage,
  thread: CollaborationThread
): Promise<void> {
  const { emitSignal } = await import("@/lib/uoi/signals");
  
  // Emit to all agents in thread
  for (const agentId of message.toAgentIds.length > 0 
    ? message.toAgentIds 
    : thread.agentIds) {
    emitSignal({
      source: "broadcast_engine",
      type: "collaboration_message",
      payload: {
        messageId: message.id,
        fromAgentId: message.fromAgentId,
        toAgentId: agentId,
        leadId: message.leadId,
        message: message.message,
        type: message.type,
        metadata: message.metadata
      },
      priority: message.metadata?.urgency === "high" ? "high" : "medium"
    });
  }
}
