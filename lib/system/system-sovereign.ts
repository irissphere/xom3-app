// System Sovereign - Heartbeat + posture for platform health
// Idempotent start, bounded event log, non-blocking interval loop

import { collectHeartbeat, type SystemHeartbeat } from "./heartbeat-monitor";
import { emitAutomationEvent, emitErrorEvent } from "@/lib/cockpit/activity-events";
import { enqueueBroadcast } from "@/lib/broadcast/broadcast-sovereign";
import { publish } from "@/lib/sovereigns/event-bus";

export type SystemSovereignPosture = "idle" | "running" | "error" | "draining";

type SystemTick = {
  tickAt: string;
  heartbeat?: SystemHeartbeat;
  posture: SystemSovereignPosture;
  error?: string;
};

let started = false;
let startedAt: string | null = null;
let lastTickAt: string | null = null;
let lastError: string | null = null;
let draining = false;
let lastAnnouncedPosture: SystemSovereignPosture | null = null;
let lastAnnouncedHeartbeatStatus: SystemHeartbeat["status"] | null = null;
let intervalMs: number | null = null;
let kernelRunning = false;

const tickLog: SystemTick[] = [];
const MAX_TICKS = 1500;

function pushTick(tick: SystemTick) {
  tickLog.push(tick);
  if (tickLog.length > MAX_TICKS) tickLog.shift();
}

function derivePosture(input: { running: boolean; draining: boolean; lastError: string | null }): SystemSovereignPosture {
  if (input.lastError) return "error";
  if (input.draining) return "draining";
  if (input.running) return "running";
  return "idle";
}

export function startSystemSovereign(nextIntervalMs: number = 5000) {
  if (!started) {
    started = true;
    startedAt = new Date().toISOString();
    draining = false;
    kernelRunning = true;

    if (!process.env.SYSTEM_START_TIME) {
      process.env.SYSTEM_START_TIME = String(Date.now());
    }

    emitAutomationEvent("system-sovereign", "triggered", { startedAt });
  }
  intervalMs = nextIntervalMs;
  kernelRunning = true;
  // Delegate scheduling to kernel sovereign instance (fire-and-forget; avoids static cycles).
  void import("@/lib/sovereigns/registry")
    .then(({ startSovereign }) => startSovereign("system", { intervalMs: nextIntervalMs }))
    .catch(() => {});

  emitAutomationEvent("system-sovereign", "success", { intervalMs: nextIntervalMs });
}

export function stopSystemSovereign() {
  draining = true;
  kernelRunning = false;
  void import("@/lib/sovereigns/registry")
    .then(({ sovereigns }) => sovereigns.system.stop())
    .catch(() => {});
}

export function setSystemHeartbeatIntervalMs(next: number) {
  intervalMs = next;
}

// Kernel tick: one system heartbeat iteration (kernel schedules cadence).
export async function systemHeartbeatTick() {
  try {
    const hb = await collectHeartbeat();
    lastTickAt = new Date().toISOString();
    lastError = null;
    pushTick({
      tickAt: lastTickAt,
      heartbeat: hb,
      posture: derivePosture({ running: true, draining, lastError }),
    });
    publish({
      sovereign: "system",
      type: "system.tick",
      severity: hb.status === "critical" ? "error" : hb.status === "degraded" ? "warning" : "info",
      payload: { heartbeat: hb, tickAt: lastTickAt },
      tags: ["interlink", "system", "tick"],
    });

    // System → Broadcast: health narration (posture + critical/degraded heartbeat)
    const postureNow = derivePosture({ running: true, draining, lastError });
    if (lastAnnouncedPosture === null) lastAnnouncedPosture = postureNow;
    if (postureNow !== lastAnnouncedPosture) {
      enqueueBroadcast({
        channel: postureNow === "error" ? "slack" : "internal",
        priority: postureNow === "error" ? "high" : "medium",
        title: "System posture shift",
        body: `System Sovereign posture: ${lastAnnouncedPosture} → ${postureNow}`,
        metadata: { interlink: true, origin: "system", from: lastAnnouncedPosture, to: postureNow },
      });
      publish({
        sovereign: "system",
        type: "system.posture.changed",
        severity: postureNow === "error" ? "error" : "info",
        payload: { from: lastAnnouncedPosture, to: postureNow },
        tags: ["interlink", "system", "posture"],
      });
      lastAnnouncedPosture = postureNow;
    }

    if (lastAnnouncedHeartbeatStatus === null) lastAnnouncedHeartbeatStatus = hb.status;
    if (hb.status !== lastAnnouncedHeartbeatStatus) {
      enqueueBroadcast({
        channel: hb.status === "critical" ? "slack" : "internal",
        priority: hb.status === "critical" ? "high" : "medium",
        title: "System heartbeat shift",
        body: `Heartbeat status: ${lastAnnouncedHeartbeatStatus} → ${hb.status}`,
        metadata: {
          interlink: true,
          origin: "system",
          from: lastAnnouncedHeartbeatStatus,
          to: hb.status,
          uptime: hb.uptime,
        },
      });
      publish({
        sovereign: "system",
        type: "system.heartbeat.changed",
        severity: hb.status === "critical" ? "error" : "warning",
        payload: { from: lastAnnouncedHeartbeatStatus, to: hb.status, uptime: hb.uptime },
        tags: ["interlink", "system", "heartbeat"],
      });
      lastAnnouncedHeartbeatStatus = hb.status;
    }

    if (hb.status === "critical") {
      enqueueBroadcast({
        channel: "slack",
        priority: "high",
        title: "System critical heartbeat",
        body: `System heartbeat critical (uptime=${hb.uptime}s). Review System Status surface.`,
        metadata: {
          interlink: true,
          origin: "system",
          heartbeat: hb,
          posture: postureNow,
        },
      });
    }

    return { heartbeat: hb, tickAt: lastTickAt };
  } catch (err) {
    lastTickAt = new Date().toISOString();
    lastError = err instanceof Error ? err.message : "unknown_error";
    pushTick({
      tickAt: lastTickAt,
      posture: "error",
      error: lastError,
    });
    emitErrorEvent(lastError, "system", { surface: "system-sovereign" });
    emitAutomationEvent("system-sovereign", "error", { error: lastError });

    enqueueBroadcast({
      channel: "slack",
      priority: "high",
      title: "System Sovereign error",
      body: `System Sovereign entered ERROR posture.\n${lastError}`,
      metadata: { interlink: true, origin: "system", posture: "error", error: lastError },
    });
    publish({
      sovereign: "system",
      type: "system.error",
      severity: "error",
      payload: { error: lastError },
      tags: ["interlink", "system", "error"],
    });
    throw err;
  }
}

export function flushSystemSovereignLog(): number {
  const count = tickLog.length;
  tickLog.length = 0;
  return count;
}

export function getSystemSovereignStatus() {
  const loopRunning = kernelRunning;
  const posture = derivePosture({ running: loopRunning, draining, lastError });
  return {
    started,
    startedAt,
    posture,
    eventLoopStatus: {
      running: loopRunning,
      intervalMs,
      lastTickAt,
      lastError,
      logSize: tickLog.length,
    },
  };
}

export function getSystemSovereignLog(limit: number = 80) {
  return tickLog.slice(-limit);
}
