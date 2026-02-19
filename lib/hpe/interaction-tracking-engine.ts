// HPE Phase II - Strike 4: Interaction Tracking Engine (Visibility Layer)
// The cockpit's eyes - complete visibility into every client touchpoint

import Airtable from "airtable";
import { logInteractionEvent } from "./compliance-helpers";
import { emitSignal } from "@/lib/uoi/signals";
import { pushHistory } from "@/lib/hse/history-store";
import { emitStateUpdate } from "@/lib/hse/signals";

/**
 * Interaction Type
 */
export type InteractionType =
  | "call"
  | "email"
  | "text"
  | "meeting"
  | "note"
  | "automation"
  | "reminder"
  | "notification"
  | "task_update"
  | "billing_alert";

/**
 * Interaction Direction
 */
export type InteractionDirection = "inbound" | "outbound" | "internal";

/**
 * Interaction Source
 */
export type InteractionSource = "UI" | "automation" | "Airtable" | "API" | "external" | "system";

/**
 * Interaction Outcome
 */
export type InteractionOutcome =
  | "resolved"
  | "pending"
  | "escalated"
  | "closed"
  | "no_response"
  | "positive"
  | "negative"
  | "neutral";

/**
 * Unified Interaction Model
 * Every interaction - regardless of source - normalized into this structure
 */
export interface Interaction {
  // Core identifiers
  id?: string; // Airtable record ID (generated on save)
  timestamp: string; // ISO timestamp
  
  // Participants
  clientId: string;
  agentId?: string;
  stage?: string; // Pipeline stage at time of interaction
  
  // Interaction details
  type: InteractionType;
  direction: InteractionDirection;
  source: InteractionSource;
  
  // Content
  subject?: string;
  content: string;
  notes?: string;
  
  // Outcome
  outcome?: InteractionOutcome;
  
  // Metadata
  metadata?: Record<string, any>;
  
  // External references
  externalId?: string; // ID from external system (email ID, call ID, etc.)
  externalLink?: string; // Link to external record
  
  // Pipeline intelligence
  pipelineIntelligence?: {
    interactionVolume?: number; // Total interactions for this client
    lastInteractionDate?: string;
    interactionFrequency?: number; // Interactions per week
    sentiment?: "positive" | "negative" | "neutral";
  };
}

/**
 * Interaction Log Result
 */
export interface InteractionLogResult {
  success: boolean;
  interactionId?: string;
  error?: string;
  airtableRecordId?: string;
}

/**
 * Get Airtable base instance
 */
function getAirtableBase() {
  if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_USHA_BASE_ID) {
    throw new Error("Airtable configuration missing");
  }
  return new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
    .base(process.env.AIRTABLE_USHA_BASE_ID);
}

/**
 * Link interaction to pipeline
 * Fetches client stage and agent from Clients table
 */
async function linkInteractionToPipeline(interaction: Interaction): Promise<Interaction> {
  try {
    const base = getAirtableBase();
    const client = await base("Clients").find(interaction.clientId);
    const clientFields = client.fields as any;
    
    // Link stage
    if (!interaction.stage && clientFields.Status) {
      interaction.stage = clientFields.Status;
    }
    
    // Link agent
    if (!interaction.agentId && (clientFields["Agent"] || clientFields["Assigned To"])) {
      const agent = clientFields["Agent"] || clientFields["Assigned To"];
      interaction.agentId = Array.isArray(agent) ? agent[0] : agent;
    }
    
    return interaction;
  } catch (error) {
    console.error("[Interaction Tracking] Failed to link to pipeline:", error);
    return interaction;
  }
}

/**
 * Calculate pipeline intelligence from interactions
 */
async function calculatePipelineIntelligence(
  clientId: string,
  currentInteraction: Interaction
): Promise<Interaction["pipelineIntelligence"]> {
  try {
    const base = getAirtableBase();
    
    // Get all interactions for this client
    const records = await base("Interactions")
      .select({
        filterByFormula: `{Client} = '${clientId}'`,
        sort: [{ field: "Date", direction: "desc" }],
        maxRecords: 100
      })
      .all();
    
    const interactionVolume = records.length;
    const lastInteractionDate = records.length > 0 
      ? (records[0].fields as any).Date 
      : undefined;
    
    // Calculate frequency (interactions per week)
    if (records.length > 1) {
      const firstDate = new Date((records[records.length - 1].fields as any).Date);
      const lastDate = new Date((records[0].fields as any).Date);
      const weeks = (lastDate.getTime() - firstDate.getTime()) / (7 * 24 * 60 * 60 * 1000);
      const interactionFrequency = weeks > 0 ? interactionVolume / weeks : interactionVolume;
      
      return {
        interactionVolume,
        lastInteractionDate,
        interactionFrequency,
        sentiment: "neutral" // Could be enhanced with sentiment analysis
      };
    }
    
    return {
      interactionVolume,
      lastInteractionDate,
      interactionFrequency: interactionVolume,
      sentiment: "neutral"
    };
  } catch (error) {
    console.error("[Interaction Tracking] Failed to calculate pipeline intelligence:", error);
    return undefined;
  }
}

/**
 * Log interaction to memory (the core function)
 */
export async function logInteraction(
  interaction: Omit<Interaction, "id" | "pipelineIntelligence">
): Promise<InteractionLogResult> {
  const startTime = Date.now();
  
  try {
    // Ensure timestamp
    const timestamp = interaction.timestamp || new Date().toISOString();
    
    // Link to pipeline
    let linkedInteraction = await linkInteractionToPipeline({
      ...interaction,
      timestamp
    });
    
    // Calculate pipeline intelligence
    const pipelineIntelligence = await calculatePipelineIntelligence(
      linkedInteraction.clientId,
      linkedInteraction
    );
    
    linkedInteraction.pipelineIntelligence = pipelineIntelligence;
    
    // Save to Airtable
    const base = getAirtableBase();
    
    // Map interaction type to Airtable channel
    const channelMap: Record<InteractionType, string> = {
      call: "Call",
      email: "Email",
      text: "SMS",
      meeting: "Meeting",
      note: "Note",
      automation: "Automation",
      reminder: "Reminder",
      notification: "Notification",
      task_update: "Task Update",
      billing_alert: "Billing Alert"
    };
    
    // Map interaction type to Airtable type
    const typeMap: Record<InteractionType, string> = {
      call: interaction.direction === "inbound" ? "Support" : "Follow-up",
      email: interaction.direction === "inbound" ? "Inquiry" : "Follow-up",
      text: interaction.direction === "inbound" ? "Support" : "Follow-up",
      meeting: "Sales",
      note: "Inquiry",
      automation: "Support",
      reminder: "Follow-up",
      notification: "Support",
      task_update: "Support",
      billing_alert: "Support"
    };
    
    const record = await base("Interactions").create([{
      fields: {
        "Client": [linkedInteraction.clientId],
        "Date": timestamp,
        "Channel": channelMap[linkedInteraction.type] || "Email",
        "Type": typeMap[linkedInteraction.type] || "Inquiry",
        "Notes": linkedInteraction.content + (linkedInteraction.notes ? `\n\n${linkedInteraction.notes}` : ""),
        "Outcome": linkedInteraction.outcome || "Pending",
        "Subject": linkedInteraction.subject,
        "Agent": linkedInteraction.agentId ? [linkedInteraction.agentId] : undefined,
        "Stage": linkedInteraction.stage,
        "Source": linkedInteraction.source,
        "Direction": linkedInteraction.direction,
        "External ID": linkedInteraction.externalId,
        "External Link": linkedInteraction.externalLink,
        "Metadata": JSON.stringify(linkedInteraction.metadata || {}),
        "Pipeline Intelligence": JSON.stringify(linkedInteraction.pipelineIntelligence || {})
      }
    }]);
    
    const airtableRecordId = record[0].id;
    linkedInteraction.id = airtableRecordId;
    
    // Update client's Last Contact date
    try {
      await base("Clients").update([{
        id: linkedInteraction.clientId,
        fields: {
          "Last Contact": timestamp
        }
      }]);
    } catch (error) {
      console.error("[Interaction Tracking] Failed to update Last Contact:", error);
    }
    
    // Log to compliance
    try {
      await logInteractionEvent(
        interaction.type === "call" ? "call_logged" :
        interaction.type === "email" ? "email_logged" :
        interaction.type === "text" ? "text_logged" :
        interaction.type === "meeting" ? "meeting_logged" :
        "note_added",
        {
          clientId: linkedInteraction.clientId,
          agentId: linkedInteraction.agentId,
          stage: linkedInteraction.stage,
          description: `${interaction.type} logged: ${interaction.content.substring(0, 100)}`,
          metadata: {
            direction: interaction.direction,
            source: interaction.source,
            outcome: interaction.outcome,
            externalId: interaction.externalId,
            ...interaction.metadata
          },
          source: interaction.source === "UI" ? "UI" : "automation"
        }
      );
    } catch (complianceError) {
      console.error("[Interaction Tracking] Compliance logging failed:", complianceError);
    }
    
    // Emit UOI signal
    try {
      emitSignal({
        source: "hpe-interaction-tracking",
        type: getUOISignalType(linkedInteraction.type, linkedInteraction.direction),
        payload: {
          interactionId: airtableRecordId,
          type: linkedInteraction.type,
          direction: linkedInteraction.direction,
          clientId: linkedInteraction.clientId,
          agentId: linkedInteraction.agentId,
          stage: linkedInteraction.stage,
          outcome: linkedInteraction.outcome,
          pipelineIntelligence: linkedInteraction.pipelineIntelligence
        },
        priority: getInteractionPriority(linkedInteraction)
      });
    } catch (uoiError) {
      console.error("[Interaction Tracking] UOI signal failed:", uoiError);
    }
    
    // Update HSE state
    pushHistory({
      timestamp: Date.now(),
      subsystem: "hpe",
      type: "interaction_logged",
      value: 1
    });
    
    // Determine HSE state based on interaction patterns
    const hseSignals: string[] = ["hpe_interaction_logged"];
    
    if (linkedInteraction.pipelineIntelligence) {
      if (linkedInteraction.pipelineIntelligence.interactionVolume && linkedInteraction.pipelineIntelligence.interactionVolume > 10) {
        hseSignals.push("high_interaction_volume");
      }
      if (linkedInteraction.pipelineIntelligence.interactionFrequency && linkedInteraction.pipelineIntelligence.interactionFrequency > 5) {
        hseSignals.push("elevated_communication_load");
      }
      if (linkedInteraction.outcome === "negative") {
        hseSignals.push("negative_interaction_detected");
      }
      if (linkedInteraction.outcome === "no_response") {
        hseSignals.push("no_response_interaction");
      }
    }
    
    emitStateUpdate(hseSignals);
    
    console.log(`[Interaction Tracking] ✅ Interaction logged: ${linkedInteraction.type} (${Date.now() - startTime}ms)`);
    
    return {
      success: true,
      interactionId: airtableRecordId,
      airtableRecordId
    };
  } catch (error: any) {
    console.error("[Interaction Tracking] ❌ Failed to log interaction:", error);
    
    // Emit error signal
    try {
      emitSignal({
        source: "hpe-interaction-tracking",
        type: "interaction_logging_error",
        payload: {
          error: error.message,
          interaction: interaction
        },
        priority: "high"
      });
    } catch (signalError) {
      console.error("[Interaction Tracking] Failed to emit error signal:", signalError);
    }
    
    return {
      success: false,
      error: error.message || "Failed to log interaction"
    };
  }
}

/**
 * Get UOI signal type for interaction
 */
function getUOISignalType(type: InteractionType, direction: InteractionDirection): string {
  if (type === "call") return direction === "inbound" ? "client_replied" : "call_logged";
  if (type === "email") return direction === "inbound" ? "client_replied" : "email_sent";
  if (type === "text") return direction === "inbound" ? "client_replied" : "text_sent";
  if (type === "meeting") return "meeting_scheduled";
  return "interaction_event";
}

/**
 * Get interaction priority for UOI signal
 */
function getInteractionPriority(interaction: Interaction): "low" | "medium" | "high" | "critical" {
  // Negative outcomes are high priority
  if (interaction.outcome === "negative" || interaction.outcome === "escalated") {
    return "high";
  }
  
  // Inbound interactions are medium-high
  if (interaction.direction === "inbound") {
    return "medium";
  }
  
  // Meetings are high priority
  if (interaction.type === "meeting") {
    return "high";
  }
  
  // Everything else is medium
  return "medium";
}

/**
 * Batch log interactions
 */
export async function batchLogInteractions(
  interactions: Array<Omit<Interaction, "id" | "pipelineIntelligence">>
): Promise<{
  success: boolean;
  logged: number;
  failed: number;
  results: InteractionLogResult[];
}> {
  const results: InteractionLogResult[] = [];
  let logged = 0;
  let failed = 0;
  
  for (const interaction of interactions) {
    const result = await logInteraction(interaction);
    results.push(result);
    
    if (result.success) {
      logged++;
    } else {
      failed++;
    }
  }
  
  return {
    success: failed === 0,
    logged,
    failed,
    results
  };
}
