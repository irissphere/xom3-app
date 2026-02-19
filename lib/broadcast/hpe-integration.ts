// Broadcast Engine - HPE Integration Module
// Wires social signals directly into the Healthcare Pipeline Engine

import { DetectedLead, LeadSignal } from "./types";
import { executeStageTransition } from "@/lib/hpe/stage-transition-service";
import { emitSignal } from "@/lib/uoi/signals";
import { emitStateUpdate } from "@/lib/hse/signals";
import Airtable from "airtable";

export type PipelineEntryPoint = 
  | "comment_intent"      // "I need help" → New Lead
  | "dm_intent"           // Direct message → Warm Lead
  | "link_click"          // Link click → Interested Lead
  | "high_engagement"     // 80%+ watch, save/share → Cold Lead
  | "trend_spike";        // Trend spike → Auto-Campaign

export interface HPEIntegrationResult {
  success: boolean;
  clientId: string;
  airtableId?: string;
  stage: "Prospect" | "Intake" | "Active" | "Compliance" | "Closed";
  taskId?: string;
  agentId?: string;
  transitionId?: string;
  hseState?: string;
  hseStateUpdated?: boolean;
  uoiSignalEmitted: boolean;
  error?: string;
}

export async function processLeadForHPE(
  leadSignal: LeadSignal,
  leadDetails?: { name?: string; email?: string; phone?: string; source?: string; initialStage?: string }
): Promise<HPEIntegrationResult> {
  const now = new Date().toISOString();
  const lead: DetectedLead = {
    id: leadSignal.id || `lead_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    leadSignal: {
      ...leadSignal,
      detectedAt: leadSignal.detectedAt || now,
      metadata: leadSignal.metadata || {},
    },
    name: leadDetails?.name,
    email: leadDetails?.email,
    phone: leadDetails?.phone,
    funnelStage: "New Lead",
    createdAt: now,
    updatedAt: now,
  };

  return integrateLeadIntoHPE(lead);
}

/**
 * Determine pipeline entry point from lead signal (uses classification)
 */
export function determineEntryPoint(lead: LeadSignal): PipelineEntryPoint {
  // Use classification from lead metadata if available
  const classification = lead.metadata?.classification;
  
  if (classification) {
    // Map classification pipeline entry point to entry point
    switch (classification.pipelineEntryPoint) {
      case "warm_lead":
        return lead.source === "dm" ? "dm_intent" : "comment_intent";
      case "interested":
        return "link_click";
      case "cold_lead":
        return "high_engagement";
      case "none":
      case "ignore":
        return "high_engagement"; // Fallback
    }
  }
  
  // Fallback to original logic
  if (lead.source === "comment" && lead.intent === "high_intent") {
    return "comment_intent";
  }
  
  if (lead.source === "dm") {
    return "dm_intent";
  }
  
  if (lead.source === "link_click") {
    return "link_click";
  }
  
  if (lead.source === "high_engagement" || lead.source === "repeat_viewer") {
    return "high_engagement";
  }
  
  if (lead.score >= 70) {
    return "comment_intent";
  }
  
  return "high_engagement";
}

/**
 * Map entry point to HPE stage
 */
export function mapEntryPointToStage(entryPoint: PipelineEntryPoint): HPEIntegrationResult["stage"] {
  const mapping: Record<PipelineEntryPoint, HPEIntegrationResult["stage"]> = {
    comment_intent: "Prospect",      // New Lead
    dm_intent: "Prospect",           // Warm Lead (starts as Prospect, moves to Intake quickly)
    link_click: "Prospect",          // Interested Lead
    high_engagement: "Prospect",     // Cold Lead
    trend_spike: "Prospect"           // Auto-Campaign (starts as Prospect)
  };
  
  return mapping[entryPoint] || "Prospect";
}

/**
 * Map entry point to task description
 */
export function mapEntryPointToTask(entryPoint: PipelineEntryPoint, lead: LeadSignal): string {
  const tasks: Record<PipelineEntryPoint, string> = {
    comment_intent: `Respond to comment: "${lead.content.substring(0, 100)}"`,
    dm_intent: `Respond to DM from ${lead.username || "user"}`,
    link_click: `Follow up on link click from ${lead.username || "user"}`,
    high_engagement: `Warm up lead: ${lead.username || "user"} (${lead.score} score)`,
    trend_spike: `Capitalize on trend spike: ${lead.content.substring(0, 50)}`
  };
  
  return tasks[entryPoint];
}

/**
 * Map entry point to HSE state
 */
export function mapEntryPointToHSEState(entryPoint: PipelineEntryPoint): string[] {
  const states: Record<PipelineEntryPoint, string[]> = {
    comment_intent: ["lead_created", "lead_comment", "elevated"],
    dm_intent: ["lead_created", "lead_dm", "elevated"],
    link_click: ["lead_created", "lead_click", "nominal"],
    high_engagement: ["lead_created", "lead_engaged", "nominal"],
    trend_spike: ["trend_detected", "trend_campaign", "elevated"]
  };
  
  return states[entryPoint] || ["lead_created"];
}

/**
 * Map entry point to UOI signal type
 */
export function mapEntryPointToUOISignal(entryPoint: PipelineEntryPoint): string {
  const signals: Record<PipelineEntryPoint, string> = {
    comment_intent: "lead_created",
    dm_intent: "lead_dm",
    link_click: "lead_click",
    high_engagement: "lead_engaged",
    trend_spike: "trend_detected"
  };
  
  return signals[entryPoint] || "lead_created";
}

/**
 * Create client in Airtable
 */
async function createClientInAirtable(
  lead: DetectedLead,
  entryPoint: PipelineEntryPoint
): Promise<{ clientId: string; airtableId: string } | null> {
  if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
    console.warn("[Broadcast HPE] Airtable not configured");
    return null;
  }
  
  try {
    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
      .base(process.env.AIRTABLE_BASE_ID);
    
    const fields: Record<string, any> = {
      "Name": lead.name || lead.leadSignal.username || "Unknown",
      "Email": lead.email || "",
      "Phone": lead.phone || "",
      "Onboarding Status": "New",
      "Created Date": new Date().toISOString(),
      "Notes": `Lead from ${lead.leadSignal.platform} (${entryPoint}): ${lead.leadSignal.content.substring(0, 200)}`
    };
    
    // Add pipeline stage if Airtable has Status field
    // Note: This depends on your Airtable schema
    const [record] = await base("Clients").create([{ fields }]);
    
    return {
      clientId: `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      airtableId: record.id
    };
  } catch (error: any) {
    console.error("[Broadcast HPE] Failed to create client in Airtable:", error);
    return null;
  }
}

/**
 * Create interaction in Airtable
 */
async function createInteractionInAirtable(
  airtableClientId: string,
  lead: DetectedLead,
  entryPoint: PipelineEntryPoint
): Promise<void> {
  if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
    return;
  }
  
  try {
    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
      .base(process.env.AIRTABLE_BASE_ID);
    
    const channel = entryPoint === "dm_intent" ? "SMS" :
                   entryPoint === "link_click" ? "Social" :
                   "Social";
    
    const fields: Record<string, any> = {
      "Client": [airtableClientId],
      "Date": new Date().toISOString(),
      "Channel": channel,
      "Type": "Inquiry",
      "Notes": `Social media lead from ${lead.leadSignal.platform} (${entryPoint}). ${lead.leadSignal.content}`,
      "Outcome": "Pending"
    };
    
    await base("Interactions").create([{ fields }]);
  } catch (error: any) {
    console.error("[Broadcast HPE] Failed to create interaction in Airtable:", error);
  }
}

/**
 * Assign agent to lead
 */
async function assignAgentToLead(
  clientId: string,
  lead: DetectedLead,
  entryPoint: PipelineEntryPoint
): Promise<{ agentId: string; taskId: string } | null> {
  try {
    // In production, implement intelligent agent selection:
    // - Round-robin
    // - Based on workload
    // - Based on expertise
    // - Based on availability
    
    // For now, return null - agent assignment happens in HPE automation
    // The HPE stage transition automation can handle agent assignment
    
    // Emit signal for agent assignment request
    const { emitSignal } = await import("@/lib/uoi/signals");
    emitSignal({
      source: "broadcast_engine",
      type: "agent_assignment_requested",
      payload: {
        clientId,
        entryPoint,
        leadId: lead.id,
        leadScore: lead.leadSignal.score,
        urgency: lead.leadSignal.urgency
      },
      priority: lead.leadSignal.urgency === "high" ? "high" : "medium"
    });
    
    return null; // Agent assignment handled by HPE automation
  } catch (error: any) {
    console.error("[Broadcast HPE] Agent assignment failed:", error);
    return null;
  }
}

/**
 * Create task via HPE
 */
async function createTaskViaHPE(
  clientId: string,
  taskDescription: string,
  entryPoint: PipelineEntryPoint
): Promise<string | null> {
  try {
    // In production, integrate with your task management system
    // For now, generate task ID and emit signal
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Emit UOI signal for task creation
    const { emitSignal } = await import("@/lib/uoi/signals");
    emitSignal({
      source: "broadcast_engine",
      type: "task_created",
      payload: {
        taskId,
        clientId,
        title: taskDescription,
        description: `Lead from Broadcast Engine (${entryPoint})`,
        priority: entryPoint === "comment_intent" || entryPoint === "dm_intent" ? "High" : "Medium",
        source: "broadcast_engine",
        metadata: { entryPoint }
      },
      priority: entryPoint === "comment_intent" || entryPoint === "dm_intent" ? "high" : "medium"
    });
    
    return taskId;
  } catch (error: any) {
    console.error("[Broadcast HPE] Task creation failed:", error);
    // Fallback: generate task ID locally
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Integrate lead into HPE pipeline
 */
export async function integrateLeadIntoHPE(
  lead: DetectedLead,
  options?: {
    autoAssign?: boolean;
    skipAirtable?: boolean;
  }
): Promise<HPEIntegrationResult> {
  const result: HPEIntegrationResult = {
    success: false,
    clientId: "",
    stage: "Prospect",
    uoiSignalEmitted: false
  };
  
  try {
    // Step 1: Use classification from lead signal if available
    const classification = lead.leadSignal.metadata?.classification;
    
    let entryPoint: PipelineEntryPoint;
    let stage: HPEIntegrationResult["stage"];
    let taskDescription: string;
    let hseStates: string[];
    let uoiSignalType: string;
    
    if (classification) {
      // Use classification data
      entryPoint = classification.pipelineEntryPoint === "warm_lead" 
        ? (lead.leadSignal.source === "dm" ? "dm_intent" : "comment_intent")
        : classification.pipelineEntryPoint === "interested"
        ? "link_click"
        : classification.pipelineEntryPoint === "cold_lead"
        ? "high_engagement"
        : "high_engagement";
      
      stage = classification.pipelineEntryPoint === "warm_lead" ? "Prospect" :
              classification.pipelineEntryPoint === "interested" ? "Prospect" :
              classification.pipelineEntryPoint === "cold_lead" ? "Prospect" :
              "Prospect";
      
      taskDescription = classification.taskDescription || mapEntryPointToTask(entryPoint, lead.leadSignal);
      hseStates = classification.hseState.length > 0 ? classification.hseState : mapEntryPointToHSEState(entryPoint);
      uoiSignalType = classification.uoiSignal;
    } else {
      // Fallback to original logic
      entryPoint = determineEntryPoint(lead.leadSignal);
      stage = mapEntryPointToStage(entryPoint);
      taskDescription = mapEntryPointToTask(entryPoint, lead.leadSignal);
      hseStates = mapEntryPointToHSEState(entryPoint);
      uoiSignalType = mapEntryPointToUOISignal(entryPoint);
    }
    
    console.log(`[Broadcast HPE] Integrating lead via ${entryPoint} → ${stage}`);
    
    // Step 2: Create client in Airtable
    let clientData: { clientId: string; airtableId?: string } | null = null;
    
    if (!options?.skipAirtable) {
      const airtableResult = await createClientInAirtable(lead, entryPoint);
      if (airtableResult) {
        clientData = airtableResult;
        result.clientId = clientData.clientId;
        result.airtableId = clientData.airtableId;
        
        // Create interaction record
        if (clientData.airtableId) {
          await createInteractionInAirtable(clientData.airtableId, lead, entryPoint);
        }
      }
    } else {
      // Generate client ID even if skipping Airtable
      result.clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    if (!result.clientId) {
      throw new Error("Failed to create client");
    }
    
    // Step 3: Trigger HPE stage transition
    try {
      const transitionResult = await executeStageTransition({
        clientId: result.clientId,
        oldStage: "Prospect", // Starting stage
        newStage: stage,
        metadata: {
          source: "broadcast_engine",
          entryPoint,
          leadId: lead.id,
          platform: lead.leadSignal.platform,
          leadScore: lead.leadSignal.score,
          leadType: lead.leadSignal.type,
          leadUrgency: lead.leadSignal.urgency
        },
        clientData: {
          name: lead.name || lead.leadSignal.username,
          email: lead.email,
          phone: lead.phone,
          clientId: result.clientId,
          airtableId: result.airtableId
        }
      });
      
      result.stage = stage;
      result.transitionId = transitionResult.transitionId;
      result.hseStateUpdated = transitionResult.hseStateUpdated;
      result.uoiSignalEmitted = transitionResult.uoiSignalEmitted;
    } catch (error: any) {
      console.error("[Broadcast HPE] Stage transition failed:", error);
      // Continue - stage transition failure shouldn't block integration
    }
    
    // Step 4: Create task
    if (options?.autoAssign !== false) {
      try {
        const taskId = await createTaskViaHPE(result.clientId, taskDescription, entryPoint);
        if (taskId) {
          result.taskId = taskId;
        }
      } catch (error: any) {
        console.error("[Broadcast HPE] Task creation failed:", error);
      }
    }
    
    // Step 5: Update HSE state (if not already done by stage transition)
    if (!result.hseStateUpdated) {
      try {
        emitStateUpdate(hseStates);
        result.hseState = hseStates.join("_");
        result.hseStateUpdated = true;
      } catch (error: any) {
        console.error("[Broadcast HPE] HSE state update failed:", error);
      }
    }
    
    // Step 6: Emit UOI signal (if not already done by stage transition)
    if (!result.uoiSignalEmitted) {
      try {
        emitSignal({
          source: "broadcast_engine",
          type: uoiSignalType as any,
          payload: {
            leadId: lead.id,
            clientId: result.clientId,
            entryPoint,
            platform: lead.leadSignal.platform,
            score: lead.leadSignal.score,
            type: lead.leadSignal.type,
            urgency: lead.leadSignal.urgency,
            stage
          },
          priority: lead.leadSignal.urgency === "high" ? "high" : "medium"
        });
        result.uoiSignalEmitted = true;
      } catch (error: any) {
        console.error("[Broadcast HPE] UOI signal emission failed:", error);
      }
    }
    
    result.success = true;
    return result;
  } catch (error: any) {
    console.error("[Broadcast HPE] Integration failed:", error);
    result.error = error.message;
    return result;
  }
}

/**
 * Batch integrate leads into HPE
 */
export async function batchIntegrateLeadsIntoHPE(
  leads: DetectedLead[],
  options?: {
    autoAssign?: boolean;
    skipAirtable?: boolean;
  }
): Promise<HPEIntegrationResult[]> {
  const results: HPEIntegrationResult[] = [];
  
  for (const lead of leads) {
    try {
      const result = await integrateLeadIntoHPE(lead, options);
      results.push(result);
    } catch (error: any) {
      console.error(`[Broadcast HPE] Failed to integrate lead ${lead.id}:`, error);
      results.push({
        success: false,
        clientId: "",
        stage: "Prospect",
        uoiSignalEmitted: false,
        error: error.message
      });
    }
  }
  
  return results;
}
