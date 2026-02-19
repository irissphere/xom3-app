// Kairos CRM — UOI Signal Integration

import { emitSignal } from "@/lib/uoi/signals";
import type { UOISignal } from "@/lib/uoi/contract";
import type { KairosSignalType, KairosSignalPayload } from "./types";

/**
 * Emit a Kairos CRM signal to the UOI bus
 */
export function emitKairosSignal(
  type: KairosSignalType,
  payload: KairosSignalPayload,
  priority: UOISignal["priority"] = "medium"
): UOISignal {
  return emitSignal({
    source: "kairos-crm",
    type: "event",
    payload: {
      signalType: type,
      ...payload,
    },
    priority,
  });
}

/**
 * Emit client status change signal
 */
export function emitClientStatusChange(
  clientId: string,
  clientName: string,
  previousStatus: string,
  newStatus: string
): UOISignal {
  const priority = newStatus === "churned" ? "high" : "medium";
  
  return emitKairosSignal(
    "kairos:client:status_changed",
    {
      entityType: "client",
      entityId: clientId,
      action: "status_changed",
      previousValue: previousStatus,
      newValue: newStatus,
      metadata: { clientName },
    },
    priority
  );
}

/**
 * Emit client health alert signal
 */
export function emitClientHealthAlert(
  clientId: string,
  clientName: string,
  healthScore: number,
  previousScore: number
): UOISignal {
  const priority = healthScore < 30 ? "critical" : healthScore < 50 ? "high" : "medium";
  
  return emitKairosSignal(
    "kairos:client:health_alert",
    {
      entityType: "client",
      entityId: clientId,
      action: "health_drop",
      previousValue: previousScore,
      newValue: healthScore,
      metadata: { clientName },
    },
    priority
  );
}

/**
 * Emit billing event signal
 */
export function emitBillingEvent(
  billingId: string,
  clientId: string,
  type: "created" | "paid" | "overdue",
  amount: number
): UOISignal {
  const signalType: KairosSignalType = 
    type === "paid" ? "kairos:billing:paid" :
    type === "overdue" ? "kairos:billing:overdue" :
    "kairos:billing:created";
  
  const priority = type === "overdue" ? "high" : "medium";
  
  return emitKairosSignal(
    signalType,
    {
      entityType: "billing",
      entityId: billingId,
      action: type,
      newValue: { amount },
      metadata: { clientId },
    },
    priority
  );
}

/**
 * Emit social queue signal
 */
export function emitSocialSignal(
  postId: string,
  clientId: string,
  type: "scheduled" | "posted" | "failed",
  platform: string
): UOISignal {
  const signalType: KairosSignalType = 
    type === "posted" ? "kairos:social:posted" :
    type === "failed" ? "kairos:social:failed" :
    "kairos:social:scheduled";
  
  const priority = type === "failed" ? "high" : "low";
  
  return emitKairosSignal(
    signalType,
    {
      entityType: "social",
      entityId: postId,
      action: type,
      metadata: { clientId, platform },
    },
    priority
  );
}

/**
 * Emit interaction created signal
 */
export function emitInteractionCreated(
  interactionId: string,
  clientId: string,
  interactionType: string,
  priority: string
): UOISignal {
  const signalPriority = priority === "urgent" ? "high" : "low";
  
  return emitKairosSignal(
    "kairos:interaction:created",
    {
      entityType: "interaction",
      entityId: interactionId,
      action: "created",
      metadata: { clientId, interactionType },
    },
    signalPriority
  );
}
