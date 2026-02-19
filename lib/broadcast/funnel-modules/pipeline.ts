// Broadcast Engine - Funnel Engine: Pipeline Module
// Handles creating client, moving pipeline stage, updating status, logging events

import { LeadObject } from "./lead-intake";
import { RoutingDecision } from "./routing";
import { PipelineEntryPoint, integrateLeadIntoHPE, HPEIntegrationResult } from "../hpe-integration";
import { DetectedLead } from "../types";

export interface PipelineEvent {
  id: string;
  leadId: string;
  clientId: string;
  eventType: "client_created" | "stage_moved" | "status_updated" | "event_logged";
  pipelineStage: string;
  previousStage?: string;
  metadata: {
    entryPoint: PipelineEntryPoint;
    routing: RoutingDecision;
    timestamp: string;
  };
}

/**
 * Create client in pipeline
 */
export async function createClientInPipeline(
  lead: LeadObject,
  routing: RoutingDecision
): Promise<{ clientId: string; airtableId?: string }> {
  // Convert LeadObject to DetectedLead for HPE integration
  const now = new Date().toISOString();
  const detectedLead: DetectedLead = {
    id: lead.id,
    name: lead.username,
    email: "", // Extract from lead if available
    phone: "", // Extract from lead if available
    funnelStage: "New Lead",
    createdAt: now,
    updatedAt: now,
    leadSignal: {
      id: lead.sourceSignalId || lead.id,
      platform: lead.platform,
      source: lead.leadType === "dm_intent" ? "dm" : 
              lead.leadType === "comment_intent" ? "comment" :
              lead.leadType === "link_click" ? "link_click" :
              "high_engagement",
      content: lead.content,
      username: lead.username,
      userId: lead.userId,
      score: lead.leadScore,
      urgency: lead.urgency,
      type: lead.leadTier === "hot" ? "hot" : lead.leadTier === "warm" ? "warm" : "cold",
      detectedAt: lead.firstSeenAt,
      postId: lead.sourcePostId,
      sentiment: lead.sentiment,
      keywords: lead.keywords,
      intent: lead.leadTier === "hot" ? "high_intent" : 
              lead.leadTier === "warm" ? "medium_intent" :
              "low_intent",
      metadata: {
        classification: lead.metadata.classification
      }
    }
  };
  
  // Use HPE integration to create client
  const result = await integrateLeadIntoHPE(detectedLead, {
    autoAssign: true,
    skipAirtable: false
  });
  
  if (!result.success) {
    throw new Error(result.error || "Failed to create client in pipeline");
  }
  
  return {
    clientId: result.clientId,
    airtableId: result.airtableId
  };
}

/**
 * Move pipeline stage
 */
export async function movePipelineStage(
  clientId: string,
  currentStage: string,
  newStage: string,
  metadata?: any
): Promise<{ success: boolean; transitionId?: string }> {
  try {
    const { executeStageTransition } = await import("@/lib/hpe/stage-transition-service");
    
    const result = await executeStageTransition({
      clientId,
      oldStage: currentStage,
      newStage,
      metadata: {
        source: "broadcast_engine",
        ...metadata
      }
    });
    
    return {
      success: true,
      transitionId: result.transitionId
    };
  } catch (error: any) {
    console.error("[Funnel Pipeline] Stage transition failed:", error);
    return {
      success: false
    };
  }
}

/**
 * Update client status
 */
export async function updateClientStatus(
  clientId: string,
  status: string,
  metadata?: any
): Promise<{ success: boolean }> {
  // In production, update status in Airtable or HPE
  // For now, emit signal
  try {
    const { emitSignal } = await import("@/lib/uoi/signals");
    emitSignal({
      source: "broadcast_engine",
      type: "client_status_updated",
      payload: {
        clientId,
        status,
        ...metadata
      },
      priority: "medium"
    });
    
    return { success: true };
  } catch (error: any) {
    console.error("[Funnel Pipeline] Status update failed:", error);
    return { success: false };
  }
}

/**
 * Log pipeline event
 */
export function logPipelineEvent(
  leadId: string,
  clientId: string,
  eventType: PipelineEvent["eventType"],
  pipelineStage: string,
  routing: RoutingDecision,
  previousStage?: string
): PipelineEvent {
  const event: PipelineEvent = {
    id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    leadId,
    clientId,
    eventType,
    pipelineStage,
    previousStage,
    metadata: {
      entryPoint: routing.entryPoint,
      routing,
      timestamp: new Date().toISOString()
    }
  };
  
  // In production, store in database
  // For now, emit signal
  try {
    const { emitSignal } = require("@/lib/uoi/signals");
    emitSignal({
      source: "broadcast_engine",
      type: "pipeline_event_logged",
      payload: event,
      priority: "low"
    });
  } catch (error) {
    console.error("[Funnel Pipeline] Event logging failed:", error);
  }
  
  return event;
}
