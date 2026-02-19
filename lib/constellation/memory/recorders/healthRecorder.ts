import { MemoryStore } from "../memoryStore";
import type { SovereignHealthMemory } from "../types";

export const sovereignHealthMemory = new MemoryStore<SovereignHealthMemory>("sovereign-health");

type HealthState = {
  lastTickAt?: number;
  tickIntervalsMs: number[];
  errorStreak: number;
  lastHealthAt?: number;
};

const bySovereign: Record<string, HealthState> = {};
const MAX_INTERVAL_SAMPLES = 20;

function mean(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stddev(values: number[]) {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance = mean(values.map((v) => (v - m) * (v - m)));
  return Math.sqrt(variance);
}

function clamp01(n: number) {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function deriveHealth(state: HealthState, posture?: string) {
  const jitterMs = stddev(state.tickIntervalsMs);
  const errorStreak = state.errorStreak;

  const posturePenalty = posture && posture !== "running" ? 0.2 : 0;
  const errorPenalty = errorStreak >= 3 ? 0.6 : errorStreak > 0 ? 0.25 : 0;
  const jitterPenalty = jitterMs > 2000 ? 0.25 : jitterMs > 500 ? 0.12 : 0;

  const risk = clamp01(posturePenalty + errorPenalty + jitterPenalty);
  const score = clamp01(1 - risk);
  const derivedState = risk > 0.8 ? "error" : risk > 0.5 ? "degraded" : "healthy";

  return { derivedState, score, tickJitter: Math.round(jitterMs), errorStreak };
}

export function recordSovereignHealth(evt: {
  sovereign: string;
  type: string;
  timestamp?: string;
  payload?: any;
  tags?: string[];
}) {
  const id = evt?.sovereign;
  if (!id) return;

  const state = (bySovereign[id] ??= { tickIntervalsMs: [], errorStreak: 0 });
  const now = Date.now();

  const tickLike = evt.type === "sovereign.tick" || evt.type.endsWith(".tick");
  const errorLike = evt.type === "sovereign.error" || evt.type.endsWith(".error") || evt.tags?.includes("error");
  const posture = evt.payload?.to || evt.payload?.posture;

  if (tickLike) {
    if (typeof state.lastTickAt === "number") {
      state.tickIntervalsMs.unshift(now - state.lastTickAt);
      if (state.tickIntervalsMs.length > MAX_INTERVAL_SAMPLES) state.tickIntervalsMs.pop();
    }
    state.lastTickAt = now;
    state.errorStreak = 0;
  }

  if (errorLike) {
    state.errorStreak += 1;
  }

  const { derivedState, score, tickJitter, errorStreak } = deriveHealth(state, posture);

  // Bound write rate: we still keep this passive, but don't spam epochs on ultra-high volume streams.
  if (typeof state.lastHealthAt === "number" && now - state.lastHealthAt < 750) return;
  state.lastHealthAt = now;

  sovereignHealthMemory.record({
    id,
    state: derivedState,
    score,
    tickJitter,
    errorStreak,
  });
}
