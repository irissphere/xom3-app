// UOI Event Loop - In-memory sovereign pulse
// Runs a full UOI cycle on an interval and records a bounded heartbeat log

import { processOneCycle } from "./orchestrator";

let loopIntervalMs: number | null = null;
let lastTickAt: string | null = null;
let lastError: string | null = null;
let kernelRunning = false;

// Simple in-memory log for the dashboard
const heartbeatLog: any[] = [];

/**
 * Get heartbeat log
 */
export function getHeartbeatLog(limit = 50) {
  return heartbeatLog.slice(-limit);
}

/**
 * Push heartbeat entry to log
 */
function pushHeartbeat(entry: any) {
  heartbeatLog.push(entry);
  if (heartbeatLog.length > 5000) heartbeatLog.shift();
}

export function setUoiIntervalMs(next: number) {
  loopIntervalMs = next;
}

// Kernel tick: run one UOI cycle (kernel schedules cadence).
export async function uoiHeartbeatTick() {
  const result = await processOneCycle();
  lastTickAt = new Date().toISOString();
  lastError = null;
  pushHeartbeat({
    tickAt: lastTickAt,
    ...result,
  });
  return { tickAt: lastTickAt, ...result };
}

/**
 * Start UOI event loop
 */
export function startUoiEventLoop(intervalMs = 5000) {
  loopIntervalMs = intervalMs;
  kernelRunning = true;
  // Delegate scheduling to kernel sovereign instance (fire-and-forget).
  void import("@/lib/sovereigns/registry")
    .then(({ startSovereign }) => startSovereign("uoi", { intervalMs }))
    .catch(() => {});
}

/**
 * Stop UOI event loop
 */
export function stopUoiEventLoop() {
  kernelRunning = false;
  void import("@/lib/sovereigns/registry")
    .then(({ sovereigns }) => sovereigns.uoi.stop())
    .catch(() => {});
}

/**
 * Get event loop status
 */
export function getEventLoopStatus() {
  return {
    running: kernelRunning,
    intervalMs: loopIntervalMs,
    lastTickAt,
    lastError,
    logSize: heartbeatLog.length,
  };
}
