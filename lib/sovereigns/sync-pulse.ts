// Sovereign Sync Pulse (SSP-1)
// Emits a constellation sync pulse on an interval so sovereigns can align via reflexes.

import { publish } from "@/lib/sovereigns/event-bus";
import { emitAutomationEvent } from "@/lib/cockpit/activity-events";

export type SyncPulsePosture = "idle" | "running" | "error" | "draining";

type SyncTick = {
  tickAt: string;
  posture: SyncPulsePosture;
  pulseId: string;
  error?: string;
};

let started = false;
let startedAt: string | null = null;
let lastTickAt: string | null = null;
let lastError: string | null = null;
let draining = false;
let intervalMs: number | null = 5000;
let kernelRunning = false;

const tickLog: SyncTick[] = [];
const MAX_TICKS = 800;

function pushTick(t: SyncTick) {
  tickLog.push(t);
  if (tickLog.length > MAX_TICKS) tickLog.shift();
}

function derivePosture(): SyncPulsePosture {
  if (lastError) return "error";
  if (draining) return "draining";
  return kernelRunning ? "running" : "idle";
}

export function setSyncPulseIntervalMs(nextIntervalMs: number) {
  intervalMs = nextIntervalMs;
}

// Kernel tick: emits one sync.pulse (kernel schedules the cadence)
export function syncPulseTick() {
  if (!started) {
    started = true;
    startedAt = new Date().toISOString();
    draining = false;
    emitAutomationEvent("sync-pulse", "triggered", { startedAt });
  }

  lastTickAt = new Date().toISOString();
  lastError = null;
  const pulseId = `pulse_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

  publish({
    sovereign: "sync",
    type: "sync.pulse",
    severity: "info",
    payload: {
      pulseId,
      intervalMs,
      tickAt: lastTickAt,
    },
    tags: ["sync", "pulse", "reflex"],
  });

  // PR-1: run prediction loop opportunistically on pulse (purely additive, fire-and-forget).
  void import("@/lib/constellation/memory")
    .then((memory) => {
      memory.ensureConstellationMemoryBound();
      // CRX-1: reflex chains are a passive lane (purely additive).
      void import("@/lib/constellation/reflexChains").then(({ ensureReflexChainsBound }) => ensureReflexChainsBound());
      import("@/lib/constellation/prediction").then(({ runPredictiveEngine }) =>
        runPredictiveEngine({
          sovereignHealth: memory.sovereignHealthMemory.getAll(),
          sovereignPosture: memory.sovereignPostureMemory.getAll(),
        })
      );
    })
    .catch(() => {});

  pushTick({ tickAt: lastTickAt, posture: "running", pulseId });
  return { pulseId, tickAt: lastTickAt };
}

export function startSyncPulse(nextIntervalMs: number = 5000) {
  intervalMs = nextIntervalMs;
  draining = false;
  kernelRunning = true;
  // Delegate scheduling to the kernel sovereign instance (fire-and-forget).
  void import("@/lib/sovereigns/registry")
    .then(({ startSovereign }) => startSovereign("sync", { intervalMs: nextIntervalMs }))
    .then(() => emitAutomationEvent("sync-pulse", "success", { intervalMs: nextIntervalMs }))
    .catch(() => {});
}

export function stopSyncPulse() {
  draining = true;
  kernelRunning = false;
  void import("@/lib/sovereigns/registry")
    .then(({ sovereigns }) => sovereigns.sync.stop())
    .then(() => emitAutomationEvent("sync-pulse", "success", { stoppedAt: new Date().toISOString() }))
    .catch(() => {});
}

export function getSyncPulseStatus() {
  return {
    started,
    startedAt,
    posture: derivePosture(),
    eventLoopStatus: {
      running: kernelRunning,
      intervalMs,
      lastTickAt,
      lastError,
      logSize: tickLog.length,
    },
  };
}

export function getSyncPulseLog(limit: number = 60) {
  return tickLog.slice(-Math.max(1, Math.min(200, limit)));
}
