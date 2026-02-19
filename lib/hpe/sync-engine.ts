// HPE Sync Engine
// Pulls pipeline data from Airtable, transforms it, assigns to clients,
// updates statuses, logs transitions, and triggers automations

import Airtable from "airtable";
import {
  PipelineClient,
  PipelineStage,
  StageTransition,
  DEFAULT_PIPELINE_CONFIG
} from "./schema";
import {
  mapAirtableClientToPipeline,
  mapPipelineToAirtable,
  AirtableClientRecord,
  AirtableTaskRecord,
  AirtableComplianceRecord,
  AirtableBillingRecord,
  AirtableInteractionRecord
} from "./mapper";
import { emitSignal } from "../uoi/signals";
import { emitStateUpdate } from "../hse/signals";

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY || "MISSING_AIRTABLE_API_KEY" })
  .base(process.env.AIRTABLE_USHA_BASE_ID || "");

export interface SyncOptions {
  tenant?: string;
  stage?: PipelineStage;
  clientId?: string;
  fullSync?: boolean;
}

export interface SyncResult {
  success: boolean;
  clientsSynced: number;
  transitionsLogged: number;
  automationsTriggered: number;
  errors: string[];
  timestamp: string;
}

/**
 * Main sync function - pulls from Airtable and syncs to EXOM3
 */
export async function syncPipeline(options: SyncOptions = {}): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    clientsSynced: 0,
    transitionsLogged: 0,
    automationsTriggered: 0,
    errors: [],
    timestamp: new Date().toISOString()
  };

  try {
    // Step 1: Fetch clients from Airtable
    const clients = await fetchClientsFromAirtable(options);
    
    // Step 2: Fetch related data (tasks, compliance, billing, interactions)
    const relatedData = await fetchRelatedData(clients);
    
    // Step 3: Transform to pipeline clients
    const pipelineClients = clients.map((client, index) => {
      try {
        return mapAirtableClientToPipeline(client, options.tenant || "default", {
          tasks: relatedData.tasks[index] || [],
          complianceLogs: relatedData.complianceLogs[index] || [],
          billingEvents: relatedData.billingEvents[index] || [],
          interactions: relatedData.interactions[index] || []
        });
      } catch (error: any) {
        result.errors.push(`Failed to map client ${client.id}: ${error.message}`);
        return null;
      }
    }).filter((c): c is PipelineClient => c !== null);
    
    // Step 4: Detect stage transitions and log them
    for (const client of pipelineClients) {
      try {
        const transitions = await detectAndLogTransitions(client, options.tenant);
        result.transitionsLogged += transitions.length;
        
        // Step 5: Trigger automations for stage changes
        for (const transition of transitions) {
          if (transition.automationTriggered) {
            result.automationsTriggered++;
          }
        }
      } catch (error: any) {
        result.errors.push(`Failed to process transitions for ${client.id}: ${error.message}`);
      }
    }
    
    result.clientsSynced = pipelineClients.length;
    
    // Step 6: Emit UOI signal for sync completion
    emitSignal({
      source: "hpe-sync-engine",
      type: "pipeline_sync",
      severity: "low",
      payload: {
        clientsSynced: result.clientsSynced,
        transitionsLogged: result.transitionsLogged,
        automationsTriggered: result.automationsTriggered,
        tenant: options.tenant
      }
    });
    
    // Step 7: Emit HSE state update
    emitStateUpdate(["hpe_pipeline_sync", `clients_${result.clientsSynced}`, `transitions_${result.transitionsLogged}`]);
    
    return result;
  } catch (error: any) {
    result.success = false;
    result.errors.push(`Sync failed: ${error.message}`);
    return result;
  }
}

/**
 * Fetch clients from Airtable
 */
async function fetchClientsFromAirtable(options: SyncOptions): Promise<AirtableClientRecord[]> {
  const conditions: string[] = [];
  if (options.stage) conditions.push(`{Status} = '${options.stage}'`);
  if (options.clientId) conditions.push(`RECORD_ID() = '${options.clientId}'`);
  if (options.tenant) conditions.push(`{Tenant} = '${options.tenant}'`);

  const records = await base("Clients")
    .select({
      view: "Grid view",
      ...(conditions.length > 0 ? { filterByFormula: `AND(${conditions.join(", ")})` } : {}),
    })
    .all();
  
  return records.map((r: any) => ({
    id: r.id,
    fields: r.fields
  })) as AirtableClientRecord[];
}

/**
 * Fetch related data for all clients
 */
async function fetchRelatedData(clients: AirtableClientRecord[]): Promise<{
  tasks: AirtableTaskRecord[][];
  complianceLogs: AirtableComplianceRecord[][];
  billingEvents: AirtableBillingRecord[][];
  interactions: AirtableInteractionRecord[][];
}> {
  const clientIds = clients.map(c => c.id);
  
  // Fetch all related records in parallel
  const [tasks, complianceLogs, billingEvents, interactions] = await Promise.all([
    fetchTasksForClients(clientIds),
    fetchComplianceLogsForClients(clientIds),
    fetchBillingEventsForClients(clientIds),
    fetchInteractionsForClients(clientIds)
  ]);
  
  // Group by client
  const tasksByClient: AirtableTaskRecord[][] = clientIds.map(id => 
    tasks.filter(t => t.fields.Client?.includes(id))
  );
  
  const complianceByClient: AirtableComplianceRecord[][] = clientIds.map(id =>
    complianceLogs.filter(c => c.fields.Client?.includes(id))
  );
  
  const billingByClient: AirtableBillingRecord[][] = clientIds.map(id =>
    billingEvents.filter(b => b.fields.Client?.includes(id))
  );
  
  const interactionsByClient: AirtableInteractionRecord[][] = clientIds.map(id =>
    interactions.filter(i => i.fields.Client?.includes(id))
  );
  
  return {
    tasks: tasksByClient,
    complianceLogs: complianceByClient,
    billingEvents: billingByClient,
    interactions: interactionsByClient
  };
}

async function fetchTasksForClients(clientIds: string[]): Promise<AirtableTaskRecord[]> {
  if (clientIds.length === 0) return [];
  
  const formula = `OR(${clientIds.map(id => `FIND('${id}', {Client})`).join(', ')})`;
  const records = await base("Tasks")
    .select({ filterByFormula: formula })
    .all();
  
  return records.map((r: any) => ({
    id: r.id,
    fields: r.fields
  })) as AirtableTaskRecord[];
}

async function fetchComplianceLogsForClients(clientIds: string[]): Promise<AirtableComplianceRecord[]> {
  if (clientIds.length === 0) return [];
  
  const formula = `OR(${clientIds.map(id => `FIND('${id}', {Client})`).join(', ')})`;
  const records = await base("Compliance Logs")
    .select({ filterByFormula: formula })
    .all();
  
  return records.map((r: any) => ({
    id: r.id,
    fields: r.fields
  })) as AirtableComplianceRecord[];
}

async function fetchBillingEventsForClients(clientIds: string[]): Promise<AirtableBillingRecord[]> {
  if (clientIds.length === 0) return [];
  
  const formula = `OR(${clientIds.map(id => `FIND('${id}', {Client})`).join(', ')})`;
  const records = await base("Billing")
    .select({ filterByFormula: formula })
    .all();
  
  return records.map((r: any) => ({
    id: r.id,
    fields: r.fields
  })) as AirtableBillingRecord[];
}

async function fetchInteractionsForClients(clientIds: string[]): Promise<AirtableInteractionRecord[]> {
  if (clientIds.length === 0) return [];
  
  const formula = `OR(${clientIds.map(id => `FIND('${id}', {Client})`).join(', ')})`;
  const records = await base("Interactions")
    .select({ filterByFormula: formula })
    .all();
  
  return records.map((r: any) => ({
    id: r.id,
    fields: r.fields
  })) as AirtableInteractionRecord[];
}

/**
 * Detect stage transitions by checking audit logs
 */
async function detectAndLogTransitions(
  client: PipelineClient,
  tenant?: string
): Promise<StageTransition[]> {
  const transitions: StageTransition[] = [];
  
  // Fetch audit logs for this client
  try {
    const auditRecords = await base("Audit Logs")
      .select({
        filterByFormula: `AND({Entity} = 'client', {Entity ID} = '${client.airtableId}')`,
        sort: [{ field: "Timestamp", direction: "desc" }]
      })
      .all();
    
    // Parse audit logs to find stage transitions
    for (const record of auditRecords) {
      const details = record.fields.Details as string;
      if (details && details.includes("Stage Transition")) {
        try {
          const parsed = JSON.parse(details);
          if (parsed.oldStage && parsed.newStage) {
            transitions.push({
              id: `transition-${record.id}`,
              fromStage: parsed.oldStage as PipelineStage,
              toStage: parsed.newStage as PipelineStage,
              timestamp: record.fields.Timestamp as string || new Date().toISOString(),
              userId: record.fields.User as string,
              reason: parsed.reason,
              metadata: parsed.metadata,
              auditLogged: true,
              complianceLogged: parsed.complianceLogged || false,
              automationTriggered: parsed.automationTriggered || false
            });
          }
        } catch {
          // Skip invalid JSON
        }
      }
    }
  } catch (error) {
    console.error(`Failed to fetch audit logs for client ${client.id}:`, error);
  }
  
  // Update client's stage history
  client.stageHistory = transitions;
  
  return transitions;
}

/**
 * Update client stage in Airtable
 */
export async function updateClientStage(
  clientId: string,
  newStage: PipelineStage,
  oldStage: PipelineStage,
  userId?: string,
  metadata?: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  try {
    // Update in Airtable
    await base("Clients").update([
      {
        id: clientId,
        fields: { Status: newStage }
      }
    ]);
    
    // Log audit trail
    await base("Audit Logs").create([
      {
        fields: {
          Action: "Stage Transition",
          Entity: "client",
          "Entity ID": clientId,
          User: userId || "system",
          Timestamp: new Date().toISOString(),
          Details: JSON.stringify({
            oldStage,
            newStage,
            transitionType: "manual",
            timestamp: new Date().toISOString(),
            ...metadata
          })
        }
      }
    ]);
    
    // Emit UOI signal
    emitSignal({
      source: "hpe-sync-engine",
      type: "stage_transition",
      severity: "low",
      payload: {
        clientId,
        oldStage,
        newStage,
        userId,
        metadata
      }
    });
    
    // Emit HSE state update
    emitStateUpdate([
      "hpe_stage_transition",
      `client_${clientId}`,
      `from_${oldStage}`,
      `to_${newStage}`
    ]);
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Trigger automations for stage transitions
 * Now uses the full automation engine
 */
export async function triggerStageAutomations(
  clientId: string,
  oldStage: PipelineStage,
  newStage: PipelineStage,
  client: PipelineClient
): Promise<{ triggered: boolean; automationIds: string[] }> {
  try {
    const { executeStageAutomations } = await import("./automation-engine");
    const result = await executeStageAutomations({
      client,
      oldStage,
      newStage,
      tenant: client.tenant,
      metadata: {
        source: "sync-engine",
        timestamp: new Date().toISOString()
      }
    });

    return {
      triggered: result.success && (result.workflowsTriggered > 0 || result.emailsSent > 0),
      automationIds: result.workflowsTriggered > 0 ? ["automation-executed"] : []
    };
  } catch (error) {
    console.error("Failed to trigger automations:", error);
    return { triggered: false, automationIds: [] };
  }
}
