// HPE Phase II - Strike 4: Interaction Query Service
// Query service for Interaction Timeline UI (foundation for Strike 5)

import Airtable from "airtable";
import { Interaction, InteractionType, InteractionDirection, InteractionSource } from "./interaction-tracking-engine";

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
 * Normalize interaction from Airtable
 */
function normalizeInteraction(record: any): Interaction {
  const fields = record.fields || {};
  
  // Map Airtable channel back to interaction type
  const channelMap: Record<string, InteractionType> = {
    "Call": "call",
    "Email": "email",
    "SMS": "text",
    "Meeting": "meeting",
    "Note": "note",
    "Automation": "automation",
    "Reminder": "reminder",
    "Notification": "notification",
    "Task Update": "task_update",
    "Billing Alert": "billing_alert"
  };
  
  const channel = fields.Channel || "Email";
  const type = channelMap[channel] || "note";
  
  return {
    id: record.id,
    timestamp: fields.Date || fields["Created Date"] || new Date().toISOString(),
    clientId: Array.isArray(fields.Client) ? fields.Client[0] : fields.Client,
    agentId: Array.isArray(fields.Agent) ? fields.Agent[0] : fields.Agent,
    stage: fields.Stage || fields["Pipeline Stage"],
    type,
    direction: (fields.Direction || "outbound") as InteractionDirection,
    source: (fields.Source || "UI") as InteractionSource,
    subject: fields.Subject,
    content: fields.Notes || fields.Content || "",
    notes: fields.Notes,
    outcome: fields.Outcome as Interaction["outcome"],
    metadata: fields.Metadata ? (typeof fields.Metadata === "string" ? JSON.parse(fields.Metadata) : fields.Metadata) : {},
    externalId: fields["External ID"] || fields.ExternalId,
    externalLink: fields["External Link"] || fields.ExternalLink,
    pipelineIntelligence: fields["Pipeline Intelligence"] 
      ? (typeof fields["Pipeline Intelligence"] === "string" 
          ? JSON.parse(fields["Pipeline Intelligence"]) 
          : fields["Pipeline Intelligence"])
      : undefined
  };
}

/**
 * Get interactions for a client (timeline)
 */
export async function getClientInteractions(
  clientId: string,
  options: {
    limit?: number;
    startDate?: string;
    endDate?: string;
    type?: InteractionType;
    direction?: InteractionDirection;
    source?: InteractionSource;
  } = {}
): Promise<Interaction[]> {
  const { limit = 100, startDate, endDate, type, direction, source } = options;
  
  try {
    const base = getAirtableBase();
    
    // Build filter formula
    const conditions: string[] = [`{Client} = '${clientId}'`];
    
    if (startDate) {
      conditions.push(`IS_AFTER({Date}, "${startDate}")`);
    }
    if (endDate) {
      conditions.push(`IS_BEFORE({Date}, "${endDate}")`);
    }
    if (type) {
      // Map type back to channel
      const typeToChannel: Record<InteractionType, string> = {
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
      conditions.push(`{Channel} = "${typeToChannel[type]}"`);
    }
    if (direction) {
      conditions.push(`{Direction} = "${direction}"`);
    }
    if (source) {
      conditions.push(`{Source} = "${source}"`);
    }
    
    const formula = conditions.length > 0 ? `AND(${conditions.join(", ")})` : "";
    
    const records = await base("Interactions")
      .select({
        filterByFormula: formula || undefined,
        sort: [{ field: "Date", direction: "desc" }],
        maxRecords: limit
      })
      .all();
    
    return records.map(r => normalizeInteraction(r));
  } catch (error: any) {
    console.error("[Interaction Query] Failed to get client interactions:", error);
    return [];
  }
}

/**
 * Get interactions for an agent
 */
export async function getAgentInteractions(
  agentId: string,
  options: {
    limit?: number;
    startDate?: string;
    endDate?: string;
  } = {}
): Promise<Interaction[]> {
  const { limit = 100, startDate, endDate } = options;
  
  try {
    // First, get all clients for this agent
    const base = getAirtableBase();
    const clients = await base("Clients")
      .select({
        filterByFormula: `OR({Agent} = '${agentId}', {Assigned To} = '${agentId}')`,
        maxRecords: 1000
      })
      .all();
    
    const clientIds = clients.map(c => c.id);
    if (clientIds.length === 0) return [];
    
    // Build filter formula
    const conditions: string[] = [
      `OR(${clientIds.map(id => `{Client} = '${id}'`).join(", ")})`
    ];
    
    if (startDate) {
      conditions.push(`IS_AFTER({Date}, "${startDate}")`);
    }
    if (endDate) {
      conditions.push(`IS_BEFORE({Date}, "${endDate}")`);
    }
    
    const formula = `AND(${conditions.join(", ")})`;
    
    const records = await base("Interactions")
      .select({
        filterByFormula: formula,
        sort: [{ field: "Date", direction: "desc" }],
        maxRecords: limit
      })
      .all();
    
    return records.map(r => normalizeInteraction(r));
  } catch (error: any) {
    console.error("[Interaction Query] Failed to get agent interactions:", error);
    return [];
  }
}

/**
 * Get interactions for a stage
 */
export async function getStageInteractions(
  stage: string,
  options: {
    limit?: number;
    startDate?: string;
    endDate?: string;
  } = {}
): Promise<Interaction[]> {
  const { limit = 100, startDate, endDate } = options;
  
  try {
    // First, get all clients in this stage
    const base = getAirtableBase();
    const clients = await base("Clients")
      .select({
        filterByFormula: `{Status} = '${stage}'`,
        maxRecords: 1000
      })
      .all();
    
    const clientIds = clients.map(c => c.id);
    if (clientIds.length === 0) return [];
    
    // Build filter formula
    const conditions: string[] = [
      `OR(${clientIds.map(id => `{Client} = '${id}'`).join(", ")})`
    ];
    
    if (startDate) {
      conditions.push(`IS_AFTER({Date}, "${startDate}")`);
    }
    if (endDate) {
      conditions.push(`IS_BEFORE({Date}, "${endDate}")`);
    }
    
    const formula = `AND(${conditions.join(", ")})`;
    
    const records = await base("Interactions")
      .select({
        filterByFormula: formula,
        sort: [{ field: "Date", direction: "desc" }],
        maxRecords: limit
      })
      .all();
    
    return records.map(r => normalizeInteraction(r));
  } catch (error: any) {
    console.error("[Interaction Query] Failed to get stage interactions:", error);
    return [];
  }
}

/**
 * Get interaction statistics
 */
export async function getInteractionStatistics(
  filters: {
    clientId?: string;
    agentId?: string;
    stage?: string;
    startDate?: string;
    endDate?: string;
  } = {}
): Promise<{
  total: number;
  byType: Record<InteractionType, number>;
  byDirection: Record<InteractionDirection, number>;
  bySource: Record<InteractionSource, number>;
  byOutcome: Record<string, number>;
  automationCount: number;
  manualCount: number;
  recentActivity: number; // Last 7 days
}> {
  try {
    let interactions: Interaction[] = [];
    
    if (filters.clientId) {
      interactions = await getClientInteractions(filters.clientId, {
        startDate: filters.startDate,
        endDate: filters.endDate,
        limit: 1000
      });
    } else if (filters.agentId) {
      interactions = await getAgentInteractions(filters.agentId, {
        startDate: filters.startDate,
        endDate: filters.endDate,
        limit: 1000
      });
    } else if (filters.stage) {
      interactions = await getStageInteractions(filters.stage, {
        startDate: filters.startDate,
        endDate: filters.endDate,
        limit: 1000
      });
    }
    
    const stats = {
      total: interactions.length,
      byType: {} as Record<InteractionType, number>,
      byDirection: {} as Record<InteractionDirection, number>,
      bySource: {} as Record<InteractionSource, number>,
      byOutcome: {} as Record<string, number>,
      automationCount: 0,
      manualCount: 0,
      recentActivity: 0
    };
    
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    interactions.forEach(interaction => {
      // Count by type
      stats.byType[interaction.type] = (stats.byType[interaction.type] || 0) + 1;
      
      // Count by direction
      stats.byDirection[interaction.direction] = (stats.byDirection[interaction.direction] || 0) + 1;
      
      // Count by source
      stats.bySource[interaction.source] = (stats.bySource[interaction.source] || 0) + 1;
      
      // Count by outcome
      if (interaction.outcome) {
        stats.byOutcome[interaction.outcome] = (stats.byOutcome[interaction.outcome] || 0) + 1;
      }
      
      // Count automation vs manual
      if (interaction.source === "automation" || interaction.type === "automation") {
        stats.automationCount++;
      } else {
        stats.manualCount++;
      }
      
      // Count recent activity
      const interactionDate = new Date(interaction.timestamp);
      if (interactionDate > sevenDaysAgo) {
        stats.recentActivity++;
      }
    });
    
    return stats;
  } catch (error: any) {
    console.error("[Interaction Query] Failed to get statistics:", error);
    return {
      total: 0,
      byType: {} as Record<InteractionType, number>,
      byDirection: {} as Record<InteractionDirection, number>,
      bySource: {} as Record<InteractionSource, number>,
      byOutcome: {},
      automationCount: 0,
      manualCount: 0,
      recentActivity: 0
    };
  }
}
