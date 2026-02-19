// Broadcast Engine - Funnel Engine Deep-Detail
// The conversion core that turns signals into leads, leads into pipeline entries, and pipeline entries into revenue

import type { DetectedLead, Platform } from "./types";
import { normalizeDetectedLead, LeadObject } from "./funnel-modules/lead-intake";
import { routeLead, RoutingDecision } from "./funnel-modules/routing";
import { createClientInPipeline, movePipelineStage, logPipelineEvent } from "./funnel-modules/pipeline";
import { createTask, createTaskViaHPE, Task } from "./funnel-modules/task";
import { assignAgentToLead, AgentAssignment } from "./funnel-modules/agent-assignment";
import { updateHSEState, emitLeadCreatedSignal, emitTaskCreatedSignal, emitConversionFeedbackSignal } from "./funnel-modules/hyperstate-uoi";

export interface FunnelIntegrationResult {
  success: boolean;
  leadId: string;
  clientId: string;
  agentId?: string;
  taskId?: string;
  pipelineStage: string;
  entryPoint: string;
  hseStateUpdated: boolean;
  uoiSignalEmitted: boolean;
  events: any[];
  error?: string;
}

/**
 * Integrate lead into funnel (full deep-detail flow)
 */
export async function integrateLeadIntoFunnelDeep(
  lead: DetectedLead
): Promise<FunnelIntegrationResult> {
  const result: FunnelIntegrationResult = {
    success: false,
    leadId: lead.id,
    clientId: "",
    pipelineStage: "",
    entryPoint: "",
    hseStateUpdated: false,
    uoiSignalEmitted: false,
    events: []
  };
  
  try {
    // Step 1: Lead Intake - Normalize lead
    const leadObject = normalizeDetectedLead(lead);
    result.leadId = leadObject.id;
    
    // Step 2: Routing - Decide pipeline stage, agent, task, urgency, HSE state
    const routing = routeLead(leadObject);
    result.pipelineStage = routing.pipelineStage;
    result.entryPoint = routing.entryPoint;
    
    // Step 3: Pipeline - Create client
    const clientData = await createClientInPipeline(leadObject, routing);
    result.clientId = clientData.clientId;
    
    // Log event
    const clientEvent = logPipelineEvent(
      leadObject.id,
      result.clientId,
      "client_created",
      routing.pipelineStage,
      routing
    );
    result.events.push(clientEvent);
    
    // Step 4: Agent Assignment - Assign agent
    const agentAssignment = await assignAgentToLead(leadObject, routing);
    if (agentAssignment) {
      result.agentId = agentAssignment.agentId;
    }
    
    // Step 5: Task - Create task
    const task = createTask(leadObject, routing, result.clientId, result.agentId);
    result.taskId = task.id;
    
    // Create task via HPE
    await createTaskViaHPE(task);
    
    // Log event
    const taskEvent = logPipelineEvent(
      leadObject.id,
      result.clientId,
      "event_logged",
      routing.pipelineStage,
      routing
    );
    result.events.push(taskEvent);
    
    // Step 6: Hyperstate & UOI - Update HSE state
    const hseResult = await updateHSEState(routing.hseStates, {
      leadId: leadObject.id,
      clientId: result.clientId,
      entryPoint: routing.entryPoint
    });
    result.hseStateUpdated = hseResult.success;
    
    // Step 7: Hyperstate & UOI - Emit UOI signals
    const leadSignalResult = await emitLeadCreatedSignal(leadObject, routing, result.clientId);
    result.uoiSignalEmitted = leadSignalResult.success;
    
    const taskSignalResult = await emitTaskCreatedSignal(task, routing);
    if (taskSignalResult.success) {
      result.events.push({ type: "task_signal_emitted", taskId: task.id });
    }
    
    result.success = true;
    return result;
  } catch (error: any) {
    console.error("[Funnel Engine Deep] Integration failed:", error);
    result.error = error.message;
    return result;
  }
}

/**
 * Batch integrate leads into funnel
 */
export async function batchIntegrateLeadsIntoFunnelDeep(
  leads: DetectedLead[]
): Promise<FunnelIntegrationResult[]> {
  const results: FunnelIntegrationResult[] = [];
  
  for (const lead of leads) {
    try {
      const result = await integrateLeadIntoFunnelDeep(lead);
      results.push(result);
    } catch (error: any) {
      console.error(`[Funnel Engine Deep] Failed to integrate lead ${lead.id}:`, error);
      results.push({
        success: false,
        leadId: lead.id,
        clientId: "",
        pipelineStage: "",
        entryPoint: "",
        hseStateUpdated: false,
        uoiSignalEmitted: false,
        events: [],
        error: error.message
      });
    }
  }
  
  return results;
}

/**
 * Send conversion feedback to learning systems
 */
export async function sendConversionFeedback(
  leadId: string,
  conversionData: {
    converted: boolean;
    revenue?: number;
    conversionTime?: number;
    platform?: string;
    contentId?: string;
  }
): Promise<{ success: boolean }> {
  try {
    const platform: Platform =
      conversionData.platform && (["youtube","tiktok","instagram","facebook","linkedin","twitter","shorts","reels"] as const).includes(conversionData.platform as any)
        ? (conversionData.platform as Platform)
        : "instagram";

    // Get lead object (in production, fetch from database)
    // For now, create minimal lead object
    const leadObject: LeadObject = {
      id: leadId,
      platform,
      leadScore: 0,
      leadTier: "cold",
      leadType: "unknown",
      urgency: "low",
      content: "",
      firstSeenAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
      metadata: {}
    };
    
    const routing: RoutingDecision = {
      pipelineStage: "Prospect",
      entryPoint: "high_engagement",
      taskDescription: "",
      taskPriority: "low",
      urgency: "low",
      hseStates: [],
      uoiSignalType: "conversion_feedback",
      reasoning: ""
    };
    
    await emitConversionFeedbackSignal(leadObject, routing, conversionData);
    
    return { success: true };
  } catch (error: any) {
    console.error("[Funnel Engine Deep] Conversion feedback failed:", error);
    return { success: false };
  }
}
