import { computePredictiveSignal } from "./predictiveSignals";
import { predictiveReflexes } from "./predictiveReflexTable";
import type { PredictiveReflex, PredictiveSignal } from "./types";

import type { MemoryEpoch, SovereignHealthMemory, SovereignPostureMemory } from "@/lib/constellation/memory";
import { groupEpochsById } from "@/lib/constellation/memory";
import { publish } from "@/lib/sovereigns/event-bus";

type MemorySnapshot = {
  sovereignHealth: Array<MemoryEpoch<SovereignHealthMemory>>;
  sovereignPosture: Array<MemoryEpoch<SovereignPostureMemory>>;
};

export async function runPredictiveEngine(memory: MemorySnapshot) {
  const groupedHealth = groupEpochsById<SovereignHealthMemory>(memory.sovereignHealth);
  const groupedPosture = groupEpochsById<SovereignPostureMemory>(memory.sovereignPosture);

  const signals: PredictiveSignal[] = [];

  for (const sovereignId of Object.keys(groupedHealth)) {
    const healthHistory = groupedHealth[sovereignId] || [];
    const postureHistory = groupedPosture[sovereignId] || [];
    if (healthHistory.length === 0 || postureHistory.length === 0) continue;

    const signal = computePredictiveSignal(healthHistory, postureHistory);
    signals.push(signal);

    publish({
      sovereign: "uoi",
      type: "predictive.signal",
      severity: signal.predictedState === "error" ? "error" : signal.predictedState === "degraded" ? "warning" : "info",
      payload: signal,
      tags: ["predictive", "signal"],
    });

    for (const reflex of predictiveReflexes) {
      if (reflex.source !== sovereignId) continue;
      if (reflex.condition(signal)) {
        await triggerPredictiveReflex(reflex, signal);
      }
    }
  }

  return signals;
}

async function triggerPredictiveReflex(reflex: PredictiveReflex, signal: PredictiveSignal) {
  publish({
    sovereign: "uoi",
    type: "predictive.reflex.triggered",
    severity: "warning",
    payload: {
      reflexId: reflex.id,
      sovereign: signal.sovereign,
      predictedState: signal.predictedState,
      risk: signal.risk,
      action: reflex.action,
      reasons: signal.reasons,
      at: Date.now(),
    },
    tags: ["predictive", "reflex"],
  });

  if (reflex.action.startsWith("ritual:")) {
    const ritualKey = reflex.action.replace("ritual:", "");
    const { triggerRitual } = await import("@/lib/rituals/engine");
    await triggerRitual(ritualKey, {
      source: { type: "predictive", eventId: signal.id },
      sourceEvent: {
        id: signal.id,
        sovereign: "uoi",
        type: "predictive.signal",
        severity: "warning",
        timestamp: new Date(signal.at).toISOString(),
        payload: signal,
        tags: ["predictive"],
      } as any,
    });
  }
}
