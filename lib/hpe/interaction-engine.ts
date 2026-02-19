// HPE Interaction Tracking Engine
// Auto-logs calls, emails, texts, meetings, notes

import Airtable from "airtable";
import { emitSignal } from "../uoi/signals";
import { emitStateUpdate } from "../hse/signals";

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY || "MISSING_AIRTABLE_API_KEY" })
  .base(process.env.AIRTABLE_USHA_BASE_ID || "");

export interface Interaction {
  clientId: string;
  date: string;
  channel: InteractionChannel;
  type: InteractionType;
  notes: string;
  outcome: InteractionOutcome;
  createdBy?: string;
  duration?: number; // in minutes
  metadata?: Record<string, any>;
}

export type InteractionChannel = 
  | "Slack"
  | "Email"
  | "Call"
  | "Meeting"
  | "SMS"
  | "LinkedIn";

export type InteractionType = 
  | "Inquiry"
  | "Support"
  | "Sales"
  | "Follow-up"
  | "Onboarding";

export type InteractionOutcome = 
  | "Resolved"
  | "Pending"
  | "Escalated"
  | "Closed";

export interface InteractionLogResult {
  success: boolean;
  interactionId?: string;
  error?: string;
}

/**
 * Log interaction with full context
 */
export async function logInteraction(
  interaction: Interaction
): Promise<InteractionLogResult> {
  try {
    // Get client stage for context
    let clientStage = "Unknown";
    try {
      const client = await base("Clients").find(interaction.clientId);
      clientStage = (client.fields as any).Status || "Unknown";
    } catch {
      // Continue without stage
    }

    // Create interaction record
    const record = await base("Interactions").create([
      {
        fields: {
          Client: [interaction.clientId],
          Date: interaction.date || new Date().toISOString(),
          Channel: interaction.channel,
          Type: interaction.type,
          Notes: interaction.notes + (interaction.metadata ? `\n\nMetadata: ${JSON.stringify(interaction.metadata)}` : ""),
          Outcome: interaction.outcome,
          "Created By": interaction.createdBy || "system"
        }
      }
    ]);

    const interactionId = record[0].id;

    // Update client's Last Contact date
    try {
      await base("Clients").update([
        {
          id: interaction.clientId,
          fields: {
            "Last Contact": interaction.date || new Date().toISOString()
          }
        }
      ]);
    } catch (updateError) {
      console.error("Failed to update Last Contact:", updateError);
      // Continue even if update fails
    }

    // Log to audit trail
    try {
      await base("Audit Logs").create([
        {
          fields: {
            Action: "Interaction Logged",
            Entity: "interaction",
            "Entity ID": interactionId,
            User: interaction.createdBy || "system",
            Timestamp: new Date().toISOString(),
            Details: JSON.stringify({
              clientId: interaction.clientId,
              channel: interaction.channel,
              type: interaction.type,
              outcome: interaction.outcome,
              stage: clientStage,
              duration: interaction.duration,
              ...interaction.metadata
            })
          }
        }
      ]);
    } catch (auditError) {
      console.error("Failed to log interaction to audit trail:", auditError);
    }

    // Emit UOI signal
    emitSignal({
      source: "hpe-interaction-engine",
      type: "interaction_logged",
      severity: "low",
      payload: {
        clientId: interaction.clientId,
        channel: interaction.channel,
        type: interaction.type,
        outcome: interaction.outcome,
        stage: clientStage
      }
    });

    // Emit HSE state update
    emitStateUpdate([
      "hpe_interaction_logged",
      `client_${interaction.clientId}`,
      `channel_${interaction.channel}`,
      `type_${interaction.type}`
    ]);

    return { success: true, interactionId };
  } catch (error: any) {
    console.error("Failed to log interaction:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get interactions for a client
 */
export async function getClientInteractions(
  clientId: string,
  limit: number = 50
): Promise<any[]> {
  try {
    const records = await base("Interactions")
      .select({
        filterByFormula: `{Client} = '${clientId}'`,
        sort: [{ field: "Date", direction: "desc" }],
        maxRecords: limit
      })
      .all();

    return records.map(r => ({
      id: r.id,
      ...r.fields
    }));
  } catch (error: any) {
    console.error("Failed to get interactions:", error);
    return [];
  }
}

/**
 * Get interaction summary for a client
 */
export async function getClientInteractionSummary(clientId: string): Promise<{
  total: number;
  byChannel: Record<string, number>;
  byType: Record<string, number>;
  byOutcome: Record<string, number>;
  lastInteraction?: string;
}> {
  try {
    const records = await base("Interactions")
      .select({
        filterByFormula: `{Client} = '${clientId}'`
      })
      .all();

    const summary = {
      total: records.length,
      byChannel: {} as Record<string, number>,
      byType: {} as Record<string, number>,
      byOutcome: {} as Record<string, number>,
      lastInteraction: undefined as string | undefined
    };

    let latestDate: Date | null = null;

    records.forEach(record => {
      const fields = record.fields as any;
      const channel = fields.Channel || "Unknown";
      const type = fields.Type || "Unknown";
      const outcome = fields.Outcome || "Unknown";
      const date = fields.Date;

      summary.byChannel[channel] = (summary.byChannel[channel] || 0) + 1;
      summary.byType[type] = (summary.byType[type] || 0) + 1;
      summary.byOutcome[outcome] = (summary.byOutcome[outcome] || 0) + 1;

      if (date) {
        const interactionDate = new Date(date);
        if (!latestDate || interactionDate > latestDate) {
          latestDate = interactionDate;
          summary.lastInteraction = date;
        }
      }
    });

    return summary;
  } catch (error: any) {
    console.error("Failed to get interaction summary:", error);
    return {
      total: 0,
      byChannel: {},
      byType: {},
      byOutcome: {}
    };
  }
}

/**
 * Auto-log email interaction (called from email webhooks)
 */
export async function autoLogEmail(
  clientId: string,
  subject: string,
  body: string,
  direction: "sent" | "received",
  createdBy?: string
): Promise<InteractionLogResult> {
  return logInteraction({
    clientId,
    date: new Date().toISOString(),
    channel: "Email",
    type: direction === "sent" ? "Follow-up" : "Inquiry",
    notes: `Email ${direction}: ${subject}\n\n${body.substring(0, 500)}`,
    outcome: "Pending",
    createdBy,
    metadata: {
      direction,
      subject,
      autoLogged: true
    }
  });
}

/**
 * Auto-log call interaction (called from phone system webhooks)
 */
export async function autoLogCall(
  clientId: string,
  duration: number,
  direction: "inbound" | "outbound",
  notes?: string,
  createdBy?: string
): Promise<InteractionLogResult> {
  return logInteraction({
    clientId,
    date: new Date().toISOString(),
    channel: "Call",
    type: direction === "inbound" ? "Inquiry" : "Follow-up",
    notes: notes || `Phone call (${direction}, ${duration} minutes)`,
    outcome: "Pending",
    createdBy,
    duration,
    metadata: {
      direction,
      autoLogged: true
    }
  });
}
