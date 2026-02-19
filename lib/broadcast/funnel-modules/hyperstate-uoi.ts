// Broadcast Engine - Funnel Engine: Hyperstate & UOI Module
// Updates HSE state and emits UOI events

import { LeadObject } from "./lead-intake";
import { RoutingDecision } from "./routing";
import { PipelineEvent } from "./pipeline";
import { Task } from "./task";

/**
 * Update HSE state
 */
export async function updateHSEState(
  hseStates: string[],
  metadata?: any
): Promise<{ success: boolean }> {
  try {
    const { emitStateUpdate } = await import("@/lib/hse/signals");
    emitStateUpdate(hseStates);
    
    return { success: true };
  } catch (error: any) {
    console.error("[Funnel HSE] HSE state update failed:", error);
    return { success: false };
  }
}

/**
 * Emit UOI signal
 */
export async function emitUOISignal(
  signalType: string,
  payload: any,
  priority: "high" | "medium" | "low" = "medium"
): Promise<{ success: boolean }> {
  try {
    const { emitSignal } = await import("@/lib/uoi/signals");
    emitSignal({
      source: "broadcast_engine",
      type: signalType as any,
      payload,
      priority
    });
    
    return { success: true };
  } catch (error: any) {
    console.error("[Funnel UOI] UOI signal emission failed:", error);
    return { success: false };
  }
}

/**
 * Emit lead created signal
 */
export async function emitLeadCreatedSignal(
  lead: LeadObject,
  routing: RoutingDecision,
  clientId: string
): Promise<{ success: boolean }> {
  return emitUOISignal(
    routing.uoiSignalType,
    {
      leadId: lead.id,
      clientId,
      entryPoint: routing.entryPoint,
      platform: lead.platform,
      score: lead.leadScore,
      tier: lead.leadTier,
      type: lead.leadType,
      urgency: lead.urgency,
      stage: routing.pipelineStage
    },
    routing.urgency === "high" ? "high" : "medium"
  );
}

/**
 * Emit task created signal
 */
export async function emitTaskCreatedSignal(
  task: Task,
  routing: RoutingDecision
): Promise<{ success: boolean }> {
  return emitUOISignal(
    "task_created",
    {
      taskId: task.id,
      clientId: task.clientId,
      leadId: task.leadId,
      title: task.title,
      description: task.description,
      priority: task.priority,
      dueDate: task.dueDate,
      agentId: task.agentId,
      taskType: task.taskType,
      metadata: task.metadata
    },
    routing.taskPriority === "high" ? "high" : "medium"
  );
}

/**
 * Emit pipeline event signal
 */
export async function emitPipelineEventSignal(
  event: PipelineEvent
): Promise<{ success: boolean }> {
  return emitUOISignal(
    "pipeline_event_logged",
    {
      eventId: event.id,
      leadId: event.leadId,
      clientId: event.clientId,
      eventType: event.eventType,
      pipelineStage: event.pipelineStage,
      previousStage: event.previousStage,
      metadata: event.metadata
    },
    "low"
  );
}

/**
 * Emit conversion feedback signal (for learning)
 */
export async function emitConversionFeedbackSignal(
  lead: LeadObject,
  routing: RoutingDecision,
  conversionData: {
    converted: boolean;
    revenue?: number;
    conversionTime?: number; // Minutes
    platform?: string;
    contentId?: string;
  }
): Promise<{ success: boolean }> {
  return emitUOISignal(
    "conversion_feedback",
    {
      leadId: lead.id,
      leadScore: lead.leadScore,
      leadTier: lead.leadTier,
      entryPoint: routing.entryPoint,
      platform: lead.platform,
      converted: conversionData.converted,
      revenue: conversionData.revenue,
      conversionTime: conversionData.conversionTime,
      contentId: conversionData.contentId
    },
    "low"
  );
}
