// Broadcast Engine - Funnel Engine: Routing Module
// Decides which pipeline stage, agent, task, urgency, HSE state based on lead tier, type, agent availability

import { LeadObject } from "./lead-intake";
import { PipelineEntryPoint } from "../hpe-integration";
import { LeadClassification } from "../lead-scoring-engine";

export interface RoutingDecision {
  pipelineStage: string;
  entryPoint: PipelineEntryPoint;
  agentId?: string;
  taskDescription: string;
  taskPriority: "high" | "medium" | "low";
  taskDueDate?: string; // ISO date string
  urgency: "high" | "medium" | "low";
  hseStates: string[];
  uoiSignalType: string;
  reasoning: string;
}

/**
 * Route lead based on tier and type
 */
export function routeLead(lead: LeadObject): RoutingDecision {
  const tier = lead.leadTier;
  const type = lead.leadType;
  const urgency = lead.urgency;
  
  // Map tier to pipeline stage
  let pipelineStage: string;
  let entryPoint: PipelineEntryPoint;
  let taskDescription: string;
  let taskPriority: "high" | "medium" | "low";
  let taskDueDate: string | undefined;
  let hseStates: string[];
  let uoiSignalType: string;
  let reasoning: string;
  
  if (tier === "hot") {
    // Hot leads: immediate action required
    pipelineStage = "Prospect";
    entryPoint = type === "dm_intent" ? "dm_intent" : "comment_intent";
    taskDescription = type === "dm_intent" 
      ? `Respond to DM from ${lead.username || "user"}: "${lead.content.substring(0, 100)}"`
      : `Respond to comment from ${lead.username || "user"}: "${lead.content.substring(0, 100)}"`;
    taskPriority = "high";
    taskDueDate = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
    hseStates = ["lead_created", "lead_hot", "elevated"];
    uoiSignalType = type === "dm_intent" ? "lead_dm" : "lead_created";
    reasoning = `Hot lead (score: ${lead.leadScore}) with ${type} - immediate response required`;
  } else if (tier === "warm") {
    // Warm leads: strong interest
    pipelineStage = "Prospect";
    entryPoint = type === "link_click" ? "link_click" : "high_engagement";
    taskDescription = `Follow up with warm lead: ${lead.username || "user"} (score: ${lead.leadScore})`;
    taskPriority = "medium";
    taskDueDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours
    hseStates = ["lead_created", "lead_warm", "nominal"];
    uoiSignalType = "lead_engaged";
    reasoning = `Warm lead (score: ${lead.leadScore}) - follow up within 24 hours`;
  } else if (tier === "interested") {
    // Interested leads: moderate interest
    pipelineStage = "Prospect";
    entryPoint = "link_click";
    taskDescription = `Warm up interested lead: ${lead.username || "user"} (score: ${lead.leadScore})`;
    taskPriority = "medium";
    taskDueDate = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(); // 48 hours
    hseStates = ["lead_created", "lead_interested", "nominal"];
    uoiSignalType = "lead_click";
    reasoning = `Interested lead (score: ${lead.leadScore}) - warm up within 48 hours`;
  } else if (tier === "cold") {
    // Cold leads: low interest
    pipelineStage = "Prospect";
    entryPoint = "high_engagement";
    taskDescription = `Nurture cold lead: ${lead.username || "user"} (score: ${lead.leadScore})`;
    taskPriority = "low";
    taskDueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
    hseStates = ["lead_created", "lead_cold", "nominal"];
    uoiSignalType = "lead_engaged";
    reasoning = `Cold lead (score: ${lead.leadScore}) - nurture over time`;
  } else {
    // Noise: ignore
    pipelineStage = "Prospect";
    entryPoint = "high_engagement";
    taskDescription = `Review noise lead: ${lead.username || "user"}`;
    taskPriority = "low";
    hseStates = ["lead_created", "lead_noise"];
    uoiSignalType = "lead_created";
    reasoning = `Noise lead (score: ${lead.leadScore}) - review before action`;
  }
  
  // Override with classification if available
  const classification = lead.metadata.classification;
  if (classification) {
    entryPoint = classification.pipelineEntryPoint === "warm_lead"
      ? (type === "dm_intent" ? "dm_intent" : "comment_intent")
      : classification.pipelineEntryPoint === "interested"
      ? "link_click"
      : classification.pipelineEntryPoint === "cold_lead"
      ? "high_engagement"
      : entryPoint;
    
    pipelineStage = classification.pipelineEntryPoint === "warm_lead" ? "Prospect" :
                    classification.pipelineEntryPoint === "interested" ? "Prospect" :
                    classification.pipelineEntryPoint === "cold_lead" ? "Prospect" :
                    pipelineStage;
    
    taskDescription = classification.taskDescription || taskDescription;
    hseStates = classification.hseState.length > 0 ? classification.hseState : hseStates;
    uoiSignalType = classification.uoiSignal || uoiSignalType;
  }
  
  return {
    pipelineStage,
    entryPoint,
    taskDescription,
    taskPriority,
    taskDueDate,
    urgency,
    hseStates,
    uoiSignalType,
    reasoning
  };
}

/**
 * Select agent for lead (placeholder - implement intelligent selection)
 */
export async function selectAgent(
  lead: LeadObject,
  routing: RoutingDecision
): Promise<string | null> {
  // In production, implement:
  // - Round-robin
  // - Based on workload
  // - Based on expertise
  // - Based on availability
  // - Based on specialization (healthcare, legacy, commerce)
  
  // For now, return null - agent assignment happens in HPE automation
  return null;
}
