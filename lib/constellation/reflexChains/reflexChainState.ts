import type { SovereignId } from "@/lib/sovereigns/event-bus";

export type ReflexChainRun = {
  runId: string;
  chainId: string;
  rootEventId: string;
  startedAt: number;
  epochId: string;
  steps: SovereignId[];
  status: "running" | "completed" | "failed";
  lastStepAt?: number;
};

type GlobalReflexChainState = {
  seq: number;
  lastTriggeredAtByChain: Record<string, number>;
  activeRuns: ReflexChainRun[];
};

function gs(): GlobalReflexChainState {
  const g = globalThis as any;
  if (!g.__xom3_reflex_chain_state__) {
    g.__xom3_reflex_chain_state__ = {
      seq: 0,
      lastTriggeredAtByChain: {},
      activeRuns: [],
    } satisfies GlobalReflexChainState;
  }
  return g.__xom3_reflex_chain_state__ as GlobalReflexChainState;
}

export function nextReflexChainRunId(prefix = "crx") {
  const s = gs();
  s.seq += 1;
  return `${prefix}_${Date.now()}_${s.seq}`;
}

export function canTriggerChain(chainId: string, cooldownMs: number) {
  const s = gs();
  const last = s.lastTriggeredAtByChain[chainId] || 0;
  const now = Date.now();
  if (now - last < Math.max(0, cooldownMs)) return false;
  s.lastTriggeredAtByChain[chainId] = now;
  return true;
}

export function addActiveRun(run: ReflexChainRun) {
  const s = gs();
  s.activeRuns.unshift(run);
  s.activeRuns = s.activeRuns.slice(0, 25);
}

export function updateRun(runId: string, patch: Partial<ReflexChainRun>) {
  const s = gs();
  const idx = s.activeRuns.findIndex((r) => r.runId === runId);
  if (idx < 0) return;
  s.activeRuns[idx] = { ...s.activeRuns[idx], ...patch };
}

export function listActiveRuns() {
  return gs().activeRuns;
}
