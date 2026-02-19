// HSE Real State Builder - Builds hyperstate from actual UOI signals
// No mocks, no fiction - pure signal-derived truth
// HSE Phase II: Now includes Hyperstate Map, Transition Engine, and Behavior Layer

import { getRecentSignals } from "@/lib/uoi/memory";
import { getPendingSignals } from "@/lib/uoi/signals";
import type { SubsystemState } from "@/lib/hse/types";
import { UOISignal } from "@/lib/uoi/contract";
import { decidePosture } from "@/lib/uoi/posture";
import { chooseDirective } from "@/lib/uoi/directives";
import { broadcastHseEvent } from "./stream";
import {
  isLineageModeActive,
  initializeLineageMode,
  recordLineageEvent,
  recordStabilityPeriod,
  recordRecovery,
} from "./lineage";
import { generatePredictions } from "./prediction";
import { buildHyperstateMap, HyperstateMap } from "./hyperstate-map";
import { evaluateTransitions, getLastTransition, initializeTransitionEngine } from "./transition-engine";
import { executeBehaviors, clearBehaviors, initializeBehaviorLayer } from "./behavior-layer";

const WINDOW_MS = 60_000; // 1 minute window for recent signals

// Lineage tracking state
let lastPosture: string | null = null;
let stabilityStart: number | null = null;
let previousGlobalState: string | null = null;

// HSE Phase II: Hyperstate tracking
let previousHyperstateMap: HyperstateMap | null = null;
let transitionEngineInitialized = false;
let behaviorLayerInitialized = false;

/**
 * Build hyperstate from real signals
 */
export async function buildHyperstate() {
  const now = Date.now();

  // 1) Pull recent signals from all engines (last 60 seconds)
  const recentSignals = getRecentSignals(1000); // Get up to 1000 recent signals (from memory)
  const pendingSignals = getPendingSignals(); // Get pending signals (from queue)
  
  // Combine and normalize - both formats should work
  const allSignals = [...recentSignals, ...pendingSignals];
  const windowStart = now - WINDOW_MS;
  const signals = allSignals
    .map(s => {
      // Normalize signal format - handle both UOISignal and normalized formats
      return {
        source: s.source || "unknown",
        type: s.type || "unknown",
        severity: s.severity || (s.priority === "critical" ? 10 : s.priority === "high" ? 7 : s.priority === "medium" ? 4 : 1),
        priority: s.priority || (s.severity > 7 ? "high" : s.severity > 4 ? "medium" : "low"),
        payload: s.payload || {},
        timestamp: s.timestamp || new Date().toISOString()
      };
    })
    .filter(s => {
      const signalTime = typeof s.timestamp === "string" 
        ? new Date(s.timestamp).getTime() 
        : (typeof s.timestamp === "number" ? s.timestamp : 0);
      return signalTime >= windowStart;
    });

  // 2) Derive subsystem views
  const subsystems = deriveSubsystemStates(signals);

  // 3) Vectors
  const riskVectors = analyzeRisk(signals, subsystems);
  const driftVectors = analyzeDrift(signals, subsystems);
  const queuePressure = analyzeQueues(signals, subsystems);

  // 4) Clusters
  const anomalyClusters = deriveAnomalyClusters(signals, subsystems);

  // 5) Sovereign posture + directive
  const sovereignPosture = decidePosture({
    subsystems,
    riskVectors,
    driftVectors,
    queuePressure,
    anomalyClusters
  });

  const currentDirective = chooseDirective({
    subsystems,
    posture: sovereignPosture,
    riskVectors,
    driftVectors,
    queuePressure,
    anomalyClusters
  });

  // 6) HSE Phase II: Build Hyperstate Map
  const hyperstateMap = buildHyperstateMap({
    subsystems,
    riskVectors,
    driftVectors,
    queuePressure,
    anomalyClusters,
    previousHyperstate: previousHyperstateMap?.hyperstate,
    previousTimestamp: previousHyperstateMap?.timestamp,
  });

  // 7) HSE Phase II: Evaluate transitions
  if (!transitionEngineInitialized) {
    initializeTransitionEngine();
    transitionEngineInitialized = true;
  }
  const evaluatedHyperstate = evaluateTransitions(hyperstateMap);
  hyperstateMap.hyperstate = evaluatedHyperstate;

  // 8) HSE Phase II: Execute behaviors
  if (!behaviorLayerInitialized) {
    initializeBehaviorLayer();
    behaviorLayerInitialized = true;
  }
  
  // Clear behaviors from previous hyperstate if we transitioned
  if (previousHyperstateMap && previousHyperstateMap.hyperstate !== evaluatedHyperstate) {
    clearBehaviors(previousHyperstateMap.hyperstate);
  }
  
  // Execute behaviors for current hyperstate
  const executedBehaviors = await executeBehaviors(evaluatedHyperstate, hyperstateMap);

  // 9) Legacy global state (for backward compatibility)
  const globalState = computeGlobalState({
    subsystems,
    riskVectors,
    driftVectors,
    queuePressure,
    anomalyClusters
  });

  // 7) Lineage tracking - record state changes
  if (!isLineageModeActive()) {
    initializeLineageMode();
  }

  // Record posture shifts
  if (lastPosture && lastPosture !== sovereignPosture) {
    recordLineageEvent({
      type: "posture_shift",
      metadata: {
        from: lastPosture,
        to: sovereignPosture,
        reason: currentDirective.reason,
      },
    });
  }
  lastPosture = sovereignPosture;

  // Record stability periods
  if (globalState === "stable") {
    if (!stabilityStart) {
      stabilityStart = now;
    }
    const stabilityDuration = Math.floor((now - stabilityStart) / 1000);
    if (stabilityDuration > 60 && stabilityDuration % 60 === 0) {
      // Record every minute of stability
      recordStabilityPeriod(stabilityDuration);
    }
  } else {
    stabilityStart = null;
  }

  // Record recoveries
  if (globalState === "recovering" && previousGlobalState === "unstable") {
    recordRecovery("system", {
      from: "unstable",
      to: "recovering",
    });
  }
  previousGlobalState = globalState;

  // Record anomalies
  if (anomalyClusters.length > 0) {
    anomalyClusters.forEach((cluster) => {
      recordLineageEvent({
        type: "anomaly_detected",
        subsystem: cluster.subsystems[0],
        metadata: {
          severity: cluster.severity,
          label: cluster.label,
        },
      });
    });
  }

  // Record directives
  if (currentDirective.action) {
    recordLineageEvent({
      type: "directive_issued",
      subsystem: currentDirective.target,
      metadata: {
        action: currentDirective.action,
        reason: currentDirective.reason,
      },
    });
  }

  // HPE: Generate predictions
  let predictions = null;
  try {
    predictions = await generatePredictions(30 * 60 * 1000); // 30 minute horizon
  } catch (error) {
    console.error("[HPE] Failed to generate predictions:", error);
    // Don't fail hyperstate if predictions fail
  }

  // Build complete hyperstate with Phase II additions
  const hyperstate = {
    timestamp: now,
    globalState,
    subsystems,
    riskVectors,
    driftVectors,
    queuePressure,
    anomalyClusters,
    sovereignPosture,
    currentDirective,
    predictions: predictions || undefined,
    // HSE Phase II additions
    hyperstateMap,
    transition: getLastTransition(),
    executedBehaviors,
  };

  // Store for next iteration
  previousHyperstateMap = hyperstateMap;

  // Broadcast to all streaming clients
  broadcastHseEvent({
    type: "hyperstate",
    timestamp: now,
    state: hyperstate
  });

  return hyperstate;
}

/**
 * Derive subsystem states from signals
 */
function deriveSubsystemStates(signals: any[]): Record<string, SubsystemState> {
  const subsystems: Record<string, SubsystemState> = {};

  const ensure = (name: string): SubsystemState => {
    if (!subsystems[name]) {
      subsystems[name] = {
        health: 1.0,
        load: 0,
        errors: 0,
      };
    }
    return subsystems[name];
  };

  // Group signals by source
  const bySource: Record<string, any[]> = {};
  signals.forEach(s => {
    const source = (s.source || "unknown").toLowerCase();
    if (!bySource[source]) bySource[source] = [];
    bySource[source].push(s);
  });

  // Process each subsystem
  Object.entries(bySource).forEach(([source, subsignals]) => {
    const sub = ensure(source);

    // Count errors
    const errorSignals = subsignals.filter(s => 
      s.type === "error" || 
      s.type?.includes("error") || 
      s.type?.includes("failure") ||
      (s.priority === "critical" || s.priority === "high")
    );
    sub.errors = errorSignals.length;

    // Compute health: start at 1.0, degrade for errors
    let health = 1.0;
    errorSignals.forEach(s => {
      const severity = s.severity || (s.priority === "critical" ? 10 : s.priority === "high" ? 7 : s.priority === "medium" ? 4 : 1);
      health -= severity / 100; // Degrade by severity percentage
    });
    sub.health = Math.max(0, Math.min(1, health));

    // Queue pressure
    const queueSignals = subsignals.filter(s => 
      s.type === "queue" || 
      s.type === "queue_pressure" ||
      (s.payload?.queueSize != null)
    );
    if (queueSignals.length > 0) {
      const maxQueue = Math.max(...queueSignals.map(s => s.payload?.queueSize || 0));
      sub.queue = maxQueue;
    }

    // Load (from throughput/capacity signals)
    const loadSignals = subsignals.filter(s => 
      s.type === "capacity" || 
      s.type === "load" ||
      (s.payload?.load != null)
    );
    if (loadSignals.length > 0) {
      const avgLoad = loadSignals.reduce((sum, s) => sum + (s.payload?.load || 0), 0) / loadSignals.length;
      sub.load = Math.min(1, avgLoad);
    }

    // Drift (from drift signals)
    const driftSignals = subsignals.filter(s => 
      s.type === "drift" || 
      s.type === "schema_drift" ||
      (s.payload?.driftAmount != null || s.payload?.drift != null)
    );
    if (driftSignals.length > 0) {
      const maxDrift = Math.max(...driftSignals.map(s => 
        s.payload?.driftAmount || s.payload?.drift || 0
      ));
      sub.drift = Math.min(1, maxDrift);
    }

    // Risk (from risk signals or error rate)
    if (subsignals.length > 0) {
      const errorRate = errorSignals.length / subsignals.length;
      sub.risk = errorRate;
      sub.riskScore = errorRate;
    }

    // Specific subsystem metrics
    if (source === "workflows" || source === "workflow") {
      // Workflow-specific: queue length
      const workflowQueue = subsignals.find(s => s.payload?.queueLength != null);
      if (workflowQueue) {
        sub.queue = workflowQueue.payload.queueLength;
      }
    }

    if (source === "compliance") {
      // Compliance-specific: violations
      const violations = subsignals.filter(s => s.type === "violation" || s.type === "rule_violation");
      sub.violations = violations.length;
    }

    if (source === "notifications" || source === "notification") {
      // Notification-specific: failures, storm detection
      const failures = subsignals.filter(s => s.type === "failed" || s.type === "notification_failed");
      sub.failures = failures.length;
      const stormSignals = subsignals.filter(s => s.type === "alert_storm" || s.payload?.storm === true);
      sub.storm = stormSignals.length > 0;
    }

    if (source === "analytics") {
      // Analytics-specific: drift, risk score
      const drift = sub.drift || 0;
      sub.drift = drift;
    }

    if (source === "uoi") {
      // UOI-specific: decisions per minute
      const decisionSignals = subsignals.filter(s => s.type === "decision" || s.type === "directive");
      const timeWindow = WINDOW_MS / 1000 / 60; // minutes
      sub.decisionsPerMin = decisionSignals.length / Math.max(timeWindow, 0.1);
    }
  });

  // Ensure all expected subsystems exist
  const expected = ["amp", "workflows", "compliance", "notifications", "analytics", "uoi"];
  expected.forEach(name => {
    if (!subsystems[name]) {
      subsystems[name] = {
        health: 1.0,
        load: 0,
        errors: 0,
      };
    }
  });

  return subsystems;
}

/**
 * Analyze risk vectors
 */
function analyzeRisk(signals: any[], subsystems: Record<string, SubsystemState>): Array<{ subsystem: string; value: number }> {
  const riskVectors: Array<{ subsystem: string; value: number }> = [];

  Object.entries(subsystems).forEach(([name, sub]) => {
    const risk = sub.risk || sub.riskScore || 0;
    if (risk > 0.1) {
      riskVectors.push({ subsystem: name, value: risk });
    }
  });

  // Also check for explicit risk signals
  const riskSignals = signals.filter(s => s.type === "risk" || s.type === "compliance_risk");
  riskSignals.forEach(s => {
    const source = (s.source || "unknown").toLowerCase();
    const riskValue = s.payload?.risk || s.payload?.level === "critical" ? 0.8 : s.payload?.level === "high" ? 0.6 : 0.4;
    const existing = riskVectors.find(v => v.subsystem === source);
    if (existing) {
      existing.value = Math.max(existing.value, riskValue);
    } else if (riskValue > 0.1) {
      riskVectors.push({ subsystem: source, value: riskValue });
    }
  });

  return riskVectors;
}

/**
 * Analyze drift vectors
 */
function analyzeDrift(signals: any[], subsystems: Record<string, SubsystemState>): Array<{ subsystem: string; value: number }> {
  const driftVectors: Array<{ subsystem: string; value: number }> = [];

  Object.entries(subsystems).forEach(([name, sub]) => {
    if (sub.drift != null && sub.drift > 0.01) {
      driftVectors.push({ subsystem: name, value: sub.drift });
    }
  });

  // Also check for explicit drift signals
  const driftSignals = signals.filter(s => 
    s.type === "drift" || 
    s.type === "schema_drift" || 
    s.type === "data_drift"
  );
  driftSignals.forEach(s => {
    const source = (s.source || "unknown").toLowerCase();
    const driftValue = s.payload?.driftAmount || s.payload?.drift || s.payload?.magnitude || 0.1;
    const existing = driftVectors.find(v => v.subsystem === source);
    if (existing) {
      existing.value = Math.max(existing.value, driftValue);
    } else if (driftValue > 0.01) {
      driftVectors.push({ subsystem: source, value: driftValue });
    }
  });

  return driftVectors;
}

/**
 * Analyze queue pressure
 */
function analyzeQueues(signals: any[], subsystems: Record<string, SubsystemState>): Array<{ subsystem: string; value: number }> {
  const queuePressure: Array<{ subsystem: string; value: number }> = [];

  Object.entries(subsystems).forEach(([name, sub]) => {
    if (sub.queue != null && sub.queue > 0) {
      // Normalize queue to 0-1 (assuming 100 is max reasonable queue)
      const normalized = Math.min(1, sub.queue / 100);
      queuePressure.push({ subsystem: name, value: normalized });
    }
    if (sub.load != null && sub.load > 0) {
      queuePressure.push({ subsystem: name, value: sub.load });
    }
  });

  // Also check for explicit queue signals
  const queueSignals = signals.filter(s => 
    s.type === "queue" || 
    s.type === "queue_pressure" ||
    s.payload?.queueSize != null
  );
  queueSignals.forEach(s => {
    const source = (s.source || "unknown").toLowerCase();
    const queueSize = s.payload?.queueSize || 0;
    const normalized = Math.min(1, queueSize / 100);
    const existing = queuePressure.find(v => v.subsystem === source);
    if (existing) {
      existing.value = Math.max(existing.value, normalized);
    } else if (normalized > 0) {
      queuePressure.push({ subsystem: source, value: normalized });
    }
  });

  return queuePressure;
}

/**
 * Derive anomaly clusters
 */
function deriveAnomalyClusters(signals: any[], subsystems: Record<string, SubsystemState>): Array<{
  id: string;
  severity: number;
  subsystems: string[];
  label: string;
}> {
  const clusters: Array<{
    id: string;
    severity: number;
    subsystems: string[];
    label: string;
  }> = [];

  // Find critical/high priority signals
  const criticalSignals = signals.filter(s => 
    s.priority === "critical" || 
    s.severity > 7 ||
    s.type === "anomaly"
  );

  if (criticalSignals.length > 0) {
    // Group by source
    const bySource: Record<string, any[]> = {};
    criticalSignals.forEach(s => {
      const source = (s.source || "unknown").toLowerCase();
      if (!bySource[source]) bySource[source] = [];
      bySource[source].push(s);
    });

    Object.entries(bySource).forEach(([source, subsignals]) => {
      const severity = subsignals.some(s => s.priority === "critical" || s.severity > 8) ? 8 : 5;
      clusters.push({
        id: `anomaly-${source}-${Date.now()}`,
        severity,
        subsystems: [source],
        label: `${subsignals.length} ${subsignals[0]?.type || "anomaly"} in ${source}`
      });
    });
  }

  // Also check subsystems with low health
  Object.entries(subsystems).forEach(([name, sub]) => {
    if (sub.health != null && sub.health < 0.6) {
      clusters.push({
        id: `health-${name}-${Date.now()}`,
        severity: sub.health < 0.4 ? 8 : 5,
        subsystems: [name],
        label: `Low health (${Math.round(sub.health * 100)}%) in ${name}`
      });
    }
  });

  return clusters;
}

// Posture and directive logic moved to dedicated modules:
// - lib/uoi/posture.ts (decidePosture)
// - lib/uoi/directives.ts (chooseDirective)

/**
 * Compute global state (legacy - for backward compatibility)
 * Maps new hyperstate to old global state format
 */
function computeGlobalState(params: {
  subsystems: Record<string, SubsystemState>;
  riskVectors: Array<{ subsystem: string; value: number }>;
  driftVectors: Array<{ subsystem: string; value: number }>;
  queuePressure: Array<{ subsystem: string; value: number }>;
  anomalyClusters: Array<{ id: string; severity: number; subsystems: string[]; label: string }>;
}): "stable" | "unstable" | "recovering" | "critical" {
  const { riskVectors, anomalyClusters, subsystems } = params;

  const maxRisk = riskVectors.length > 0
    ? Math.max(...riskVectors.map(v => v.value))
    : 0;
  const hasCriticalAnomalies = anomalyClusters.some(c => c.severity >= 8);
  const avgHealth = Object.values(subsystems).reduce((sum, sub) => sum + (sub.health || 1), 0) / Object.keys(subsystems).length;

  if (hasCriticalAnomalies || maxRisk > 0.8) {
    return "critical";
  }
  if (maxRisk > 0.6 || avgHealth < 0.6) {
    return "unstable";
  }
  if (maxRisk > 0.3 || avgHealth < 0.8) {
    return "recovering";
  }
  return "stable";
}
