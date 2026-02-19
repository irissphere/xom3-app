// HPE Phase II - Strike 4: Interaction Capture Service
// Automatic capture of interactions from various sources

import { logInteraction, Interaction, InteractionType, InteractionDirection, InteractionSource } from "./interaction-tracking-engine";

/**
 * Capture agent-initiated interaction
 */
export async function captureAgentInteraction(
  params: {
    clientId: string;
    agentId: string;
    type: "call" | "email" | "text" | "meeting" | "note";
    direction: InteractionDirection;
    content: string;
    subject?: string;
    notes?: string;
    outcome?: Interaction["outcome"];
    metadata?: Record<string, any>;
  }
) {
  return logInteraction({
    clientId: params.clientId,
    agentId: params.agentId,
    type: params.type,
    direction: params.direction,
    source: "UI",
    content: params.content,
    subject: params.subject,
    notes: params.notes,
    outcome: params.outcome,
    metadata: params.metadata,
    timestamp: new Date().toISOString()
  });
}

/**
 * Capture system-initiated interaction (automation)
 */
export async function captureAutomationInteraction(
  params: {
    clientId: string;
    type: "automation" | "reminder" | "notification" | "task_update" | "billing_alert";
    content: string;
    subject?: string;
    metadata?: Record<string, any>;
  }
) {
  return logInteraction({
    clientId: params.clientId,
    type: params.type,
    direction: "outbound",
    source: "automation",
    content: params.content,
    subject: params.subject,
    metadata: params.metadata,
    timestamp: new Date().toISOString()
  });
}

/**
 * Capture external-initiated interaction (client replies, inbound)
 */
export async function captureExternalInteraction(
  params: {
    clientId: string;
    type: "call" | "email" | "text";
    content: string;
    subject?: string;
    externalId?: string;
    externalLink?: string;
    metadata?: Record<string, any>;
  }
) {
  return logInteraction({
    clientId: params.clientId,
    type: params.type,
    direction: "inbound",
    source: "external",
    content: params.content,
    subject: params.subject,
    externalId: params.externalId,
    externalLink: params.externalLink,
    metadata: params.metadata,
    timestamp: new Date().toISOString()
  });
}

/**
 * Capture call interaction
 */
export async function captureCall(
  clientId: string,
  agentId: string,
  direction: InteractionDirection,
  content: string,
  outcome?: Interaction["outcome"],
  metadata?: Record<string, any>
) {
  return captureAgentInteraction({
    clientId,
    agentId,
    type: "call",
    direction,
    content,
    outcome,
    metadata
  });
}

/**
 * Capture email interaction
 */
export async function captureEmail(
  clientId: string,
  agentId: string,
  direction: InteractionDirection,
  subject: string,
  content: string,
  outcome?: Interaction["outcome"],
  externalId?: string,
  metadata?: Record<string, any>
) {
  if (direction === "inbound") {
    return captureExternalInteraction({
      clientId,
      type: "email",
      content,
      subject,
      externalId,
      metadata
    });
  }
  
  return captureAgentInteraction({
    clientId,
    agentId,
    type: "email",
    direction,
    content,
    subject,
    outcome,
    metadata
  });
}

/**
 * Capture text/SMS interaction
 */
export async function captureText(
  clientId: string,
  agentId: string,
  direction: InteractionDirection,
  content: string,
  outcome?: Interaction["outcome"],
  externalId?: string,
  metadata?: Record<string, any>
) {
  if (direction === "inbound") {
    return captureExternalInteraction({
      clientId,
      type: "text",
      content,
      externalId,
      metadata
    });
  }
  
  return captureAgentInteraction({
    clientId,
    agentId,
    type: "text",
    direction,
    content,
    outcome,
    metadata
  });
}

/**
 * Capture meeting interaction
 */
export async function captureMeeting(
  clientId: string,
  agentId: string,
  subject: string,
  content: string,
  outcome?: Interaction["outcome"],
  metadata?: Record<string, any>
) {
  return captureAgentInteraction({
    clientId,
    agentId,
    type: "meeting",
    direction: "outbound",
    content,
    subject,
    outcome,
    metadata
  });
}

/**
 * Capture note interaction
 */
export async function captureNote(
  clientId: string,
  agentId: string,
  content: string,
  metadata?: Record<string, any>
) {
  return captureAgentInteraction({
    clientId,
    agentId,
    type: "note",
    direction: "internal",
    content,
    metadata
  });
}
