import { subscribe, type SovereignEvent } from "@/lib/sovereigns/event-bus";
import { gtmFunnels } from "./gtm-funnel-registry";
import type { GtmFunnelEventType, GtmFunnelEntityState } from "./gtm-funnel-types";
import { getFunnelEntityState, upsertFunnelEntityState } from "./gtm-funnel-state";

type GlobalGuard = {
  __xom3_gtm_funnels_bound__?: boolean;
  __xom3_gtm_funnels_unsub__?: (() => void) | null;
};

function g(): GlobalGuard {
  return globalThis as any;
}

function applyFunnelEvent(input: { entityId: string; eventType: GtmFunnelEventType; at: number; meta?: any }) {
  for (const funnel of gtmFunnels) {
    const mapping = funnel.mappedEvents.find((m) => m.eventType === input.eventType);
    if (!mapping) continue;

    const prev = getFunnelEntityState(input.entityId, funnel.id);
    const nextStageId = mapping.toStageId;
    const next: GtmFunnelEntityState = prev
      ? {
          ...prev,
          stageId: nextStageId,
          enteredAt: input.at,
          sourceEvent: { eventType: input.eventType, at: input.at, meta: input.meta },
          history: [...prev.history, { stageId: nextStageId, enteredAt: input.at, eventType: input.eventType }],
        }
      : {
          entityId: input.entityId,
          funnelId: funnel.id,
          stageId: nextStageId,
          enteredAt: input.at,
          sourceEvent: { eventType: input.eventType, at: input.at, meta: input.meta },
          history: [{ stageId: nextStageId, enteredAt: input.at, eventType: input.eventType }],
        };

    upsertFunnelEntityState(next);
  }
}

function handleOutbound(event: SovereignEvent) {
  if (event.type !== "gtm.outbound.sent") return;
  const itemId = String(event.payload?.itemId || "");
  const subjectId = String(event.payload?.subjectId || "");
  // If a subjectId is present, use it. Otherwise funnels remain driven by explicit entry events.
  const entityId = subjectId || "";
  if (!entityId) return;
  applyFunnelEvent({ entityId, eventType: "outboundSent", at: Date.now(), meta: { itemId } });
}

export function ingestFunnelEvent(input: { entityId: string; eventType: GtmFunnelEventType; at?: number; meta?: any }) {
  applyFunnelEvent({ entityId: input.entityId, eventType: input.eventType, at: input.at ?? Date.now(), meta: input.meta });
}

export function ensureGtmFunnelsBound() {
  const gg = g();
  if (gg.__xom3_gtm_funnels_bound__) return;
  gg.__xom3_gtm_funnels_bound__ = true;

  gg.__xom3_gtm_funnels_unsub__ = subscribe((event) => {
    try {
      handleOutbound(event);
    } catch {
      // passive lane
    }
  });
}
