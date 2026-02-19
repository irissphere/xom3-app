// Broadcast Engine - Funnel Integration Engine
// Pushes leads into EXOM3 pipeline

import { DetectedLead, LeadSignal, FunnelIntegration } from "./types";
import { integrateLeadIntoHPE, batchIntegrateLeadsIntoHPE } from "./hpe-integration";
import { executeStageTransition } from "@/lib/hpe/stage-transition-service";
import { emitSignal } from "@/lib/uoi/signals";
import { emitStateUpdate } from "@/lib/hse/signals";
import Airtable from "airtable";

/**
 * Create client record in Airtable
 */
async function createClientInAirtable(lead: DetectedLead): Promise<string | null> {
  if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
    console.warn("[Broadcast] Airtable not configured");
    return null;
  }
  
  try {
    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);
    
    const fields: Record<string, any> = {
      "Name": lead.name || lead.leadSignal.username || "Unknown",
      "Email": lead.email || "",
      "Phone": lead.phone || "",
      "Onboarding Status": "New",
      "Created Date": new Date().toISOString(),
      "Notes": `Lead detected from ${lead.leadSignal.platform}: ${lead.leadSignal.content.substring(0, 200)}`
    };
    
    const [record] = await base("Clients").create([{ fields }]);
    return record.id;
  } catch (error: any) {
    console.error("[Broadcast] Failed to create client in Airtable:", error);
    return null;
  }
}

/**
 * Create interaction record in Airtable
 */
async function createInteractionInAirtable(
  clientId: string,
  lead: DetectedLead
): Promise<void> {
  if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
    return;
  }
  
  try {
    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);
    
    const channel = lead.leadSignal.source === "dm" ? "SMS" :
                   lead.leadSignal.source === "comment" ? "Social" :
                   "Email";
    
    const fields: Record<string, any> = {
      "Client": [clientId],
      "Date": new Date().toISOString(),
      "Channel": channel,
      "Type": "Inquiry",
      "Notes": `Social media lead from ${lead.leadSignal.platform}. ${lead.leadSignal.content}`,
      "Outcome": "Pending"
    };
    
    await base("Interactions").create([{ fields }]);
  } catch (error: any) {
    console.error("[Broadcast] Failed to create interaction in Airtable:", error);
  }
}

/**
 * Assign agent to lead
 */
async function assignAgent(lead: DetectedLead): Promise<string | null> {
  // Placeholder - implement agent assignment logic
  // Could be round-robin, based on workload, based on expertise, etc.
  return null;
}

/**
 * Create task for agent
 */
async function createTask(
  clientId: string,
  agentId: string | null,
  lead: DetectedLead
): Promise<string | null> {
  // Placeholder - integrate with task system
  // This would create a task in your task management system
  console.log(`[Broadcast] Creating task for client ${clientId} from lead ${lead.id}`);
  return `task_${Date.now()}`;
}

/**
 * Integrate lead into funnel (uses HPE integration)
 */
export async function integrateLeadIntoFunnel(
  lead: DetectedLead,
  options?: {
    autoAssign?: boolean;
    skipAirtable?: boolean;
  }
): Promise<FunnelIntegration> {
  // Use HPE integration module for proper pipeline injection
  const hpeResult = await integrateLeadIntoHPE(lead, options);
  
  const integration: FunnelIntegration = {
    leadId: lead.id,
    clientId: hpeResult.clientId,
    agentId: hpeResult.agentId,
    taskId: hpeResult.taskId,
    hpeStage: hpeResult.stage,
    hseState: hpeResult.hseState,
    uoiSignalEmitted: hpeResult.uoiSignalEmitted,
    airtableSynced: !!hpeResult.airtableId,
    createdAt: new Date().toISOString()
  };
  
  if (!hpeResult.success) {
    throw new Error(hpeResult.error || "HPE integration failed");
  }
  
  return integration;
}

/**
 * Batch integrate leads (uses HPE integration)
 */
export async function batchIntegrateLeads(
  leads: DetectedLead[],
  options?: {
    autoAssign?: boolean;
    skipAirtable?: boolean;
  }
): Promise<FunnelIntegration[]> {
  // Use HPE batch integration
  const hpeResults = await batchIntegrateLeadsIntoHPE(leads, options);
  
  return hpeResults.map((hpeResult, index) => ({
    leadId: leads[index].id,
    clientId: hpeResult.clientId,
    agentId: hpeResult.agentId,
    taskId: hpeResult.taskId,
    hpeStage: hpeResult.stage,
    hseState: hpeResult.hseState,
    uoiSignalEmitted: hpeResult.uoiSignalEmitted,
    airtableSynced: !!hpeResult.airtableId,
    createdAt: new Date().toISOString()
  }));
}
