import { MemoryStore } from "../memoryStore";
import type { EventMemory } from "../types";

export const eventMemory = new MemoryStore<EventMemory>("events");

function compactEpochPayload(payload: any) {
  const to = payload?.to;
  const from = payload?.from;
  return {
    fromId: from?.id ?? null,
    toId: to?.id ?? null,
    toName: to?.name ?? null,
    toColor: to?.color ?? null,
    toGlyph: to?.glyph ?? null,
    changedAt: payload?.changedAt ?? null,
    reason: payload?.reason ?? null,
  };
}

function compactReflexChainPayload(payload: any) {
  return {
    runId: payload?.runId ?? null,
    chainId: payload?.chainId ?? null,
    stepIndex: payload?.stepIndex ?? null,
    from: payload?.from ?? null,
    to: payload?.to ?? null,
    color: payload?.color ?? null,
    glyph: payload?.glyph ?? null,
    intensity: payload?.intensity ?? null,
    delayMs: payload?.delayMs ?? null,
    epochId: payload?.epochId ?? null,
    at: payload?.at ?? null,
  };
}

export function recordEvent(evt: { id: string; type: string; sovereign: string; tags?: string[]; payload?: any }) {
  if (!evt?.id || !evt?.type || !evt?.sovereign) return;

  const storePayload =
    evt.type === "constellation.epoch.changed" ||
    evt.type === "operator.epoch.transition" ||
    evt.type === "epoch.transition.cinematic" ||
    evt.type === "reflex.chain.cinematic" ||
    String(evt.type).startsWith("constellation.reflex.chain.");

  eventMemory.record({
    id: evt.id,
    type: evt.type,
    sovereign: evt.sovereign,
    tags: evt.tags,
    payload: storePayload
      ? String(evt.type).includes("epoch")
        ? compactEpochPayload(evt.payload)
        : compactReflexChainPayload(evt.payload)
      : undefined,
  });
}
