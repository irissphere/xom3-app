import { ensureConstellationMemoryBound, sovereignHealthMemory, eventMemory } from "@/lib/constellation/memory";
import type { EpochContext } from "./epochEngine";

function recentWithinMs<T extends { at: number }>(epochs: T[], ms: number) {
  const now = Date.now();
  return epochs.filter((e) => now - Number(e.at) <= ms);
}

function lastById<T extends { at: number; data: { id: string } }>(epochs: T[]) {
  const map: Record<string, T> = {};
  for (const e of epochs) {
    const id = e?.data?.id;
    if (!id) continue;
    const prev = map[id];
    if (!prev || e.at > prev.at) map[id] = e;
  }
  return map;
}

export function deriveEpochContext(): EpochContext {
  ensureConstellationMemoryBound();

  const bootCompleted = true;

  const healthEpochs = sovereignHealthMemory.getAll();
  const lastHealth = lastById(healthEpochs);
  const systemOk = (lastHealth.system?.data?.score ?? 0) >= 0.75;
  const uoiOk = (lastHealth.uoi?.data?.score ?? 0) >= 0.75;
  const healthStable = systemOk && uoiOk;

  const events = eventMemory.getAll();
  const recentEvents = recentWithinMs(events, 5 * 60 * 1000);

  const ritualsActive = recentEvents.some((e) => String(e.data.type).startsWith("ritual.")) || recentEvents.some((e) => e.data.type === "ritual.cinematic");
  const lanesExpanded =
    recentEvents.some((e) => e.data.type === "predictive.signal") ||
    recentEvents.some((e) => e.data.type === "ritual.cinematic") ||
    events.length > 60;

  const gtmReady = false; // CE-1 v1: promote this when GTM surfaces emit domain signals.

  // Operator Epoch should only activate when operator-specific signals exist (or explicitly forced).
  const operatorMode = process.env.XOM3_FORCE_OPERATOR_EPOCH === "1";

  return {
    bootCompleted,
    healthStable,
    lanesExpanded,
    gtmReady,
    ritualsActive,
    operatorMode,
  };
}
