// Sovereign Interlinking - Cross-sovereign messaging reflex layer
// Connects UOI, System, HSE, and Broadcast into a self-reporting constellation.

import { enqueueBroadcast } from "@/lib/broadcast/broadcast-sovereign";
import { getGlobalState, initializeGlobalState, isHSEInitialized } from "@/lib/hse";
import { emitAutomationEvent, emitErrorEvent, emitHseTransitionEvent } from "@/lib/cockpit/activity-events";
import { sovereigns } from "@/lib/sovereigns/registry";

let interlinkingStarted = false;
let watcherInterval: NodeJS.Timeout | null = null;

let lastRiskLevel: string | null = null;
let lastCriticalAnomalyIds = new Set<string>();

function enabled(): boolean {
  return process.env.SOVEREIGN_INTERLINKING_DISABLED !== "1";
}

function broadcastChannelForSeverity(severity: "info" | "warning" | "error") {
  if (severity === "error") return "slack";
  return "internal";
}

function announce(input: { severity: "info" | "warning" | "error"; title: string; body: string; meta?: Record<string, any> }) {
  if (!enabled()) return;
  enqueueBroadcast({
    channel: broadcastChannelForSeverity(input.severity),
    priority: input.severity === "error" ? "high" : input.severity === "warning" ? "medium" : "low",
    title: input.title,
    body: input.body,
    metadata: { interlink: true, ...input.meta },
  });
}

function computeHsePostureFromRiskLevel(level: string | null) {
  if (!level) return "idle";
  if (level === "critical") return "recovery";
  if (level === "high") return "protective";
  if (level === "medium") return "normal";
  return "aggressive";
}

function mapHseToKernelPosture(input: { posture: string; riskLevel: string }) {
  if (input.posture === "idle") return "idle" as const;
  if (input.riskLevel === "critical" || input.posture === "recovery") return "error" as const;
  return "running" as const;
}

function tickHseWatcher() {
  if (!enabled()) return;

  if (!isHSEInitialized()) {
    initializeGlobalState();
  }

  const state = getGlobalState();
  if (!state) return;

  const riskLevel = state.stability?.risk_level || "low";
  const posture = computeHsePostureFromRiskLevel(riskLevel);
  sovereigns.hse.setPosture(mapHseToKernelPosture({ posture, riskLevel }));

  if (lastRiskLevel === null) {
    lastRiskLevel = riskLevel;
  } else if (riskLevel !== lastRiskLevel) {
    const from = computeHsePostureFromRiskLevel(lastRiskLevel);
    const to = posture;
    lastRiskLevel = riskLevel;

    emitHseTransitionEvent(from, to, `HSE risk_level=${riskLevel}`);
    sovereigns.hse.setPosture(mapHseToKernelPosture({ posture: to, riskLevel }));
    sovereigns.hse.publish(
      "hse.posture.changed",
      riskLevel === "critical" ? "error" : riskLevel === "high" ? "warning" : "info",
      { from, to, riskLevel },
      { tags: ["interlink", "hse", "posture"] }
    );

    announce({
      severity: riskLevel === "critical" ? "error" : riskLevel === "high" ? "warning" : "info",
      title: "HSE posture shift",
      body: `HSE posture transitioned: ${from} → ${to} (risk_level=${riskLevel})`,
      meta: { from, to, riskLevel },
    });
  }

  // Critical anomaly emergence detection (announce only when new critical anomalies appear)
  const critical = state.anomalies.filter((a) => a.severity === "critical");
  const criticalIds = new Set(critical.map((a) => a.id));
  const newlyCritical = critical.filter((a) => !lastCriticalAnomalyIds.has(a.id));

  if (newlyCritical.length > 0) {
    newlyCritical.forEach((a) => {
      sovereigns.hse.publish(
        "system.anomaly",
        "error",
        { anomalyId: a.id, affectedAreas: a.affectedAreas, patterns: a.patterns },
        { tags: ["interlink", "hse", "anomaly"] }
      );
      announce({
        severity: "error",
        title: "HSE critical anomaly",
        body: `${a.id}: ${a.patterns?.[0] || "pattern"} (areas: ${(a.affectedAreas || []).join(", ")})`,
        meta: { anomalyId: a.id, affectedAreas: a.affectedAreas, patterns: a.patterns },
      });
    });
  }

  lastCriticalAnomalyIds = criticalIds;
}

export function initializeSovereignInterlinking(): void {
  if (interlinkingStarted) return;
  if (!enabled()) return;

  interlinkingStarted = true;
  emitAutomationEvent("sovereign-interlinking", "triggered", { startedAt: new Date().toISOString() });

  // HSE watcher tick (5s). Keeps interlinking truthful and lightweight.
  watcherInterval = setInterval(() => {
    try {
      tickHseWatcher();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown_error";
      emitErrorEvent(msg, "hse", { surface: "sovereign-interlinking" });
    }
  }, 5000);

  // Run once immediately so initial posture is captured.
  try {
    tickHseWatcher();
  } catch {}

  emitAutomationEvent("sovereign-interlinking", "success", { intervalMs: 5000 });
}

export function getSovereignInterlinkingStatus() {
  return {
    enabled: enabled(),
    started: interlinkingStarted,
    watcherRunning: watcherInterval !== null,
    lastRiskLevel,
    criticalAnomaliesTracked: lastCriticalAnomalyIds.size,
  };
}
