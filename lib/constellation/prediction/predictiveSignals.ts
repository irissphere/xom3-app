import type { MemoryEpoch, SovereignHealthMemory, SovereignPostureMemory } from "@/lib/constellation/memory";
import type { PredictiveSignal } from "./types";

function clamp01(n: number) {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function trend(values: number[]): number {
  if (values.length < 3) return 0;
  return values[values.length - 1] - values[0];
}

function createSignalId() {
  const anyCrypto = globalThis.crypto as Crypto | undefined;
  if (anyCrypto?.randomUUID) return anyCrypto.randomUUID();
  return `pr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function deriveReasons(
  health: Array<MemoryEpoch<SovereignHealthMemory>>,
  posture: Array<MemoryEpoch<SovereignPostureMemory>>
): string[] {
  const reasons: string[] = [];
  const jitterTrend = trend(health.map((h) => Number(h.data.tickJitter || 0)));
  const errorTrend = trend(health.map((h) => Number(h.data.errorStreak || 0)));
  const postureInstability = posture.filter((p) => String(p.data.posture) !== "running").length;

  if (jitterTrend > 0) reasons.push("tick jitter rising");
  if (errorTrend > 0) reasons.push("error streak rising");
  if (postureInstability > 2) reasons.push("posture instability");
  return reasons;
}

function computeRiskScore(
  health: Array<MemoryEpoch<SovereignHealthMemory>>,
  posture: Array<MemoryEpoch<SovereignPostureMemory>>
): number {
  let score = 0;

  const jitterTrend = trend(health.map((h) => Number(h.data.tickJitter || 0)));
  const errorTrend = trend(health.map((h) => Number(h.data.errorStreak || 0)));
  const postureInstability = posture.filter((p) => String(p.data.posture) !== "running").length;

  score += jitterTrend > 0 ? 0.3 : 0;
  score += errorTrend > 0 ? 0.4 : 0;
  score += postureInstability > 2 ? 0.3 : 0;

  return clamp01(score);
}

export function computePredictiveSignal(
  healthHistory: Array<MemoryEpoch<SovereignHealthMemory>>,
  postureHistory: Array<MemoryEpoch<SovereignPostureMemory>>
): PredictiveSignal {
  const now = Date.now();

  const recentHealth = healthHistory.slice(-10);
  const recentPosture = postureHistory.slice(-10);

  const risk = computeRiskScore(recentHealth, recentPosture);
  const predictedState = risk > 0.8 ? "error" : risk > 0.5 ? "degraded" : "healthy";
  const sovereign = recentHealth[recentHealth.length - 1]?.data?.id || "unknown";

  return {
    id: createSignalId(),
    sovereign,
    risk,
    reasons: deriveReasons(recentHealth, recentPosture),
    predictedState,
    at: now,
  };
}
