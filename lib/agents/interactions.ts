// Agent Interaction Tools
// Call, log note, send email, send text, request documents, schedule meeting, move stage

import { AgentIdentity } from "./identity";
import { logComplianceEvent } from "../hpe/compliance-engine";
import { emitStateUpdate } from "../hse/signals";

async function getBase() {
  // Dynamic import to avoid build-time initialization
  const Airtable = (await import("airtable")).default;
  
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_USHA_BASE_ID;
  
  if (!apiKey || !baseId) {
    throw new Error("Airtable configuration missing");
  }
  
  return new Airtable({ apiKey }).base(baseId);
}

export interface InteractionLog {
  clientId: string;
  channel: "Call" | "Email" | "SMS" | "Meeting" | "Note" | "LinkedIn" | "Slack";
  type: "Inquiry" | "Support" | "Sales" | "Follow-up" | "Onboarding";
  notes: string;
  outcome?: "Resolved" | "Pending" | "Escalated" | "Closed";
  agentId: string;
  timestamp: string;
}

/**
 * Log interaction
 */
export async function logInteraction(
  interaction: InteractionLog
): Promise<{ success: boolean; interactionId?: string; error?: string }> {
  try {
    const base = await getBase();
    const record = await base("Interactions").create([
      {
        fields: {
          Client: [interaction.clientId],
          Date: interaction.timestamp,
          Channel: interaction.channel,
          Type: interaction.type,
          Notes: interaction.notes,
          Outcome: interaction.outcome || "Pending",
          "Created By": interaction.agentId,
        },
      },
    ]);

    // Update client's Last Contact
    const base2 = await getBase();
    await base2("Clients").update([
      {
        id: interaction.clientId,
        fields: {
          "Last Contact": interaction.timestamp,
        },
      },
    ]);

    // Emit HSE signal
    emitStateUpdate(["agent_interaction", interaction.channel.toLowerCase(), interaction.type.toLowerCase()]);

    return { success: true, interactionId: record[0].id };
  } catch (error: any) {
    console.error("Error logging interaction:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Log a note
 */
export async function logNote(
  clientId: string,
  note: string,
  agent: AgentIdentity
): Promise<{ success: boolean; interactionId?: string }> {
  return logInteraction({
    clientId,
    channel: "Note",
    type: "Follow-up",
    notes: note,
    agentId: agent.id,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Log a call
 */
export async function logCall(
  clientId: string,
  notes: string,
  outcome: InteractionLog["outcome"],
  agent: AgentIdentity
): Promise<{ success: boolean; interactionId?: string }> {
  return logInteraction({
    clientId,
    channel: "Call",
    type: "Support",
    notes,
    outcome,
    agentId: agent.id,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Request documents from client
 */
export async function requestDocuments(
  clientId: string,
  documents: string[],
  agent: AgentIdentity,
  notes?: string
): Promise<{ success: boolean; interactionId?: string }> {
  const documentList = documents.join(", ");
  const noteText = notes 
    ? `Requested documents: ${documentList}. ${notes}`
    : `Requested documents: ${documentList}`;

  // Log as interaction
  const interaction = await logInteraction({
    clientId,
    channel: "Email",
    type: "Follow-up",
    notes: noteText,
    outcome: "Pending",
    agentId: agent.id,
    timestamp: new Date().toISOString(),
  });

  // Log compliance event
  await logComplianceEvent({
    clientId,
    eventType: "Review",
    description: `Document request: ${documentList}`,
    status: "Pending",
    userId: agent.id,
    metadata: {
      requestedDocuments: documents,
    },
  });

  return interaction;
}

/**
 * Move client to stage (with guardrails)
 */
export async function moveClientToStage(
  clientId: string,
  newStage: string,
  agent: AgentIdentity,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Import guardrails
    const { enforceStageTransition } = await import("./guardrails");
    const { success, check } = await enforceStageTransition(clientId, newStage, agent);

    if (!success) {
      return { success: false, error: check.reason || "Stage transition not allowed" };
    }

    // Get current stage
    const base = await getBase();
    const client = await base("Clients").find(clientId);
    const currentStage = (client.fields as any).Status;

    // Update stage
    await base("Clients").update([
      {
        id: clientId,
        fields: {
          Status: newStage,
        },
      },
    ]);

    // Log interaction
    await logInteraction({
      clientId,
      channel: "Note",
      type: "Follow-up",
      notes: notes || `Stage moved from ${currentStage} to ${newStage}`,
      agentId: agent.id,
      timestamp: new Date().toISOString(),
    });

    // Log compliance event
    await logComplianceEvent({
      clientId,
      eventType: "Review",
      description: `Stage transition: ${currentStage} → ${newStage}`,
      status: "Approved",
      userId: agent.id,
      stage: newStage,
      metadata: {
        previousStage: currentStage,
        newStage,
        notes,
      },
    });

    // Emit HSE signal
    emitStateUpdate(["stage_transition", newStage.toLowerCase()]);

    return { success: true };
  } catch (error: any) {
    console.error("Error moving client to stage:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Schedule meeting (placeholder - would integrate with calendar)
 */
export async function scheduleMeeting(
  clientId: string,
  meetingDate: string,
  notes: string,
  agent: AgentIdentity
): Promise<{ success: boolean; interactionId?: string }> {
  const noteText = `Meeting scheduled for ${new Date(meetingDate).toLocaleString()}. ${notes}`;

  return logInteraction({
    clientId,
    channel: "Meeting",
    type: "Sales",
    notes: noteText,
    outcome: "Pending",
    agentId: agent.id,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Send email (placeholder - would integrate with email service)
 */
export async function sendEmail(
  clientId: string,
  subject: string,
  body: string,
  agent: AgentIdentity
): Promise<{ success: boolean; interactionId?: string }> {
  const noteText = `Email sent - Subject: ${subject}\n\n${body}`;

  return logInteraction({
    clientId,
    channel: "Email",
    type: "Follow-up",
    notes: noteText,
    outcome: "Pending",
    agentId: agent.id,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Send SMS (placeholder - would integrate with SMS service)
 */
export async function sendSMS(
  clientId: string,
  message: string,
  agent: AgentIdentity
): Promise<{ success: boolean; interactionId?: string }> {
  return logInteraction({
    clientId,
    channel: "SMS",
    type: "Follow-up",
    notes: message,
    outcome: "Pending",
    agentId: agent.id,
    timestamp: new Date().toISOString(),
  });
}
