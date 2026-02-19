// HSE Phase II - STRIKE 1: Hyperstate Map
// The System's Weather Layer - Single unified interpretation of system conditions

import type { SubsystemState } from "./types";

/**
 * Core Hyperstates - The 5 fundamental states of the system
 */
export type Hyperstate = 
  | "NOMINAL"           // Everything stable
  | "ELEVATED_LOAD"     // Automations or performance under pressure
  | "DEGRADED"          // Slow queries, high latency, or repeated failures
  | "CRITICAL"          // Cascading failures or high drift
  | "RECOVERY_MODE";    // System stabilizing after a critical event

/**
 * Hyperstate Map - Complete system condition representation
 */
export interface HyperstateMap {
  // Core state
  hyperstate: Hyperstate;
  timestamp: number;
  
  // Contributing signals (0-1 normalized)
  signals: {
    automationQueueDepth: number;      // Queue depth for automations
    deadLetterQueueCount: number;      // Failed messages in DLQ
    performanceHeatmapSeverity: number; // Performance issues severity
    consistencyIssues: number;         // Data consistency problems
    driftScore: number;                // Overall drift magnitude
    usageSpikes: number;               // Usage spike intensity
    cachingEfficiency: number;         // Cache hit rate (inverted: 1 = perfect, 0 = poor)
    backgroundWorkerLoad: number;      // Background worker utilization
  };
  
  // Signal sources
  signalSources: {
    queueDepth: Array<{ subsystem: string; value: number }>;
    deadLetterQueue: Array<{ subsystem: string; count: number }>;
    performanceIssues: Array<{ subsystem: string; severity: number }>;
    consistencyIssues: Array<{ subsystem: string; count: number }>;
    drift: Array<{ subsystem: string; magnitude: number }>;
    usageSpikes: Array<{ subsystem: string; intensity: number }>;
    cacheMetrics: Array<{ subsystem: string; hitRate: number }>;
    workerLoad: Array<{ subsystem: string; load: number }>;
  };
  
  // Thresholds that triggered this state
  thresholds: {
    queueDepthThreshold: number;
    deadLetterThreshold: number;
    performanceThreshold: number;
    consistencyThreshold: number;
    driftThreshold: number;
    usageThreshold: number;
    cacheThreshold: number;
    workerThreshold: number;
  };
  
  // Confidence score (0-1) - how confident we are in this hyperstate
  confidence: number;
  
  // Duration in current state (milliseconds)
  duration: number;
  
  // Previous hyperstate (for transition tracking)
  previousHyperstate?: Hyperstate;
  transitionTimestamp?: number;
}

/**
 * Default thresholds for hyperstate transitions
 */
export const HYPERSTATE_THRESHOLDS = {
  // ELEVATED_LOAD triggers
  queueDepthThreshold: 0.6,        // 60% of max queue
  workerLoadThreshold: 0.7,         // 70% worker utilization
  usageSpikeThreshold: 0.5,          // 50% above baseline
  
  // DEGRADED triggers
  performanceThreshold: 0.4,        // 40% performance degradation
  cacheEfficiencyThreshold: 0.5,    // 50% cache hit rate (below this is bad)
  deadLetterThreshold: 10,          // 10+ messages in DLQ
  
  // CRITICAL triggers
  consistencyThreshold: 0.3,        // 30% consistency issues
  driftThreshold: 0.5,              // 50% drift magnitude
  criticalErrorThreshold: 0.2,     // 20% error rate
  
  // RECOVERY_MODE triggers
  stabilityDuration: 30000,          // 30 seconds of stability
  recoveryThreshold: 0.2,           // Metrics below 20% of critical
};

/**
 * Build the Hyperstate Map from system signals
 */
export function buildHyperstateMap(params: {
  subsystems: Record<string, SubsystemState>;
  riskVectors: Array<{ subsystem: string; value: number }>;
  driftVectors: Array<{ subsystem: string; value: number }>;
  queuePressure: Array<{ subsystem: string; value: number }>;
  anomalyClusters: Array<{ id: string; severity: number; subsystems: string[]; label: string }>;
  previousHyperstate?: Hyperstate;
  previousTimestamp?: number;
}): HyperstateMap {
  const {
    subsystems,
    riskVectors,
    driftVectors,
    queuePressure,
    anomalyClusters,
    previousHyperstate,
    previousTimestamp,
  } = params;

  const now = Date.now();
  const duration = previousTimestamp ? now - previousTimestamp : 0;

  // 1. Collect signal sources
  const signalSources = {
    queueDepth: queuePressure.map(v => ({ subsystem: v.subsystem, value: v.value })),
    deadLetterQueue: Object.entries(subsystems)
      .filter(([_, sub]) => sub.errors && sub.errors > 0)
      .map(([name, sub]) => ({ subsystem: name, count: sub.errors || 0 })),
    performanceIssues: Object.entries(subsystems)
      .filter(([_, sub]) => sub.health !== undefined && sub.health < 1.0)
      .map(([name, sub]) => ({ 
        subsystem: name, 
        severity: 1 - (sub.health || 1.0) 
      })),
    consistencyIssues: riskVectors
      .filter(v => v.value > 0.3)
      .map(v => ({ subsystem: v.subsystem, count: Math.round(v.value * 100) })),
    drift: driftVectors.map(v => ({ subsystem: v.subsystem, magnitude: v.value })),
    usageSpikes: Object.entries(subsystems)
      .filter(([_, sub]) => sub.load && sub.load > 0.5)
      .map(([name, sub]) => ({ subsystem: name, intensity: sub.load || 0 })),
    cacheMetrics: [], // Will be populated from cache signals if available
    workerLoad: Object.entries(subsystems)
      .filter(([_, sub]) => sub.load !== undefined)
      .map(([name, sub]) => ({ subsystem: name, load: sub.load || 0 })),
  };

  // 2. Aggregate signals (normalize to 0-1)
  const maxQueueDepth = signalSources.queueDepth.length > 0
    ? Math.max(...signalSources.queueDepth.map(s => s.value))
    : 0;
  const automationQueueDepth = Math.min(1, maxQueueDepth / HYPERSTATE_THRESHOLDS.queueDepthThreshold);

  const totalDeadLetters = signalSources.deadLetterQueue.reduce((sum, s) => sum + s.count, 0);
  const deadLetterQueueCount = Math.min(1, totalDeadLetters / HYPERSTATE_THRESHOLDS.deadLetterThreshold);

  const maxPerformanceSeverity = signalSources.performanceIssues.length > 0
    ? Math.max(...signalSources.performanceIssues.map(s => s.severity))
    : 0;
  const performanceHeatmapSeverity = Math.min(1, maxPerformanceSeverity / HYPERSTATE_THRESHOLDS.performanceThreshold);

  const totalConsistencyIssues = signalSources.consistencyIssues.reduce((sum, s) => sum + s.count, 0);
  const consistencyIssues = Math.min(1, totalConsistencyIssues / 100); // Normalize to 0-1

  const maxDrift = signalSources.drift.length > 0
    ? Math.max(...signalSources.drift.map(s => s.magnitude))
    : 0;
  const driftScore = Math.min(1, maxDrift / HYPERSTATE_THRESHOLDS.driftThreshold);

  const maxUsageSpike = signalSources.usageSpikes.length > 0
    ? Math.max(...signalSources.usageSpikes.map(s => s.intensity))
    : 0;
  const usageSpikes = Math.min(1, maxUsageSpike / HYPERSTATE_THRESHOLDS.usageSpikeThreshold);

  // Cache efficiency (inverted - higher is better, so we invert for signal)
  // For now, assume 0.8 if no cache issues detected
  const cachingEfficiency = 0.8; // TODO: Wire in actual cache metrics

  const maxWorkerLoad = signalSources.workerLoad.length > 0
    ? Math.max(...signalSources.workerLoad.map(s => s.load))
    : 0;
  const backgroundWorkerLoad = Math.min(1, maxWorkerLoad / HYPERSTATE_THRESHOLDS.workerLoadThreshold);

  // 3. Determine hyperstate
  const hyperstate = determineHyperstate({
    automationQueueDepth,
    deadLetterQueueCount,
    performanceHeatmapSeverity,
    consistencyIssues,
    driftScore,
    usageSpikes,
    cachingEfficiency,
    backgroundWorkerLoad,
    anomalyClusters,
    previousHyperstate,
    duration,
  });

  // 4. Calculate confidence
  const confidence = calculateConfidence({
    signals: {
      automationQueueDepth,
      deadLetterQueueCount,
      performanceHeatmapSeverity,
      consistencyIssues,
      driftScore,
      usageSpikes,
      cachingEfficiency,
      backgroundWorkerLoad,
    },
    hyperstate,
    anomalyClusters,
  });

  // 5. Build the map
  const map: HyperstateMap = {
    hyperstate,
    timestamp: now,
    signals: {
      automationQueueDepth,
      deadLetterQueueCount,
      performanceHeatmapSeverity,
      consistencyIssues,
      driftScore,
      usageSpikes,
      cachingEfficiency,
      backgroundWorkerLoad,
    },
    signalSources,
    thresholds: {
      queueDepthThreshold: HYPERSTATE_THRESHOLDS.queueDepthThreshold,
      deadLetterThreshold: HYPERSTATE_THRESHOLDS.deadLetterThreshold,
      performanceThreshold: HYPERSTATE_THRESHOLDS.performanceThreshold,
      consistencyThreshold: HYPERSTATE_THRESHOLDS.consistencyThreshold,
      driftThreshold: HYPERSTATE_THRESHOLDS.driftThreshold,
      usageThreshold: HYPERSTATE_THRESHOLDS.usageSpikeThreshold,
      cacheThreshold: HYPERSTATE_THRESHOLDS.cacheEfficiencyThreshold,
      workerThreshold: HYPERSTATE_THRESHOLDS.workerLoadThreshold,
    },
    confidence,
    duration,
    previousHyperstate,
    transitionTimestamp: previousHyperstate && previousHyperstate !== hyperstate ? now : undefined,
  };

  return map;
}

/**
 * Determine hyperstate from signals
 */
function determineHyperstate(params: {
  automationQueueDepth: number;
  deadLetterQueueCount: number;
  performanceHeatmapSeverity: number;
  consistencyIssues: number;
  driftScore: number;
  usageSpikes: number;
  cachingEfficiency: number;
  backgroundWorkerLoad: number;
  anomalyClusters: Array<{ id: string; severity: number; subsystems: string[]; label: string }>;
  previousHyperstate?: Hyperstate;
  duration: number;
}): Hyperstate {
  const {
    automationQueueDepth,
    deadLetterQueueCount,
    performanceHeatmapSeverity,
    consistencyIssues,
    driftScore,
    usageSpikes,
    backgroundWorkerLoad,
    anomalyClusters,
    previousHyperstate,
    duration,
  } = params;

  // CRITICAL: Cascading failures or high drift
  const hasCriticalAnomalies = anomalyClusters.some(c => c.severity >= 8);
  const criticalDrift = driftScore > 0.5;
  const criticalConsistency = consistencyIssues > 0.3;
  const criticalErrors = deadLetterQueueCount > 0.5;

  if (hasCriticalAnomalies || criticalDrift || criticalConsistency || criticalErrors) {
    return "CRITICAL";
  }

  // RECOVERY_MODE: System stabilizing after critical
  if (previousHyperstate === "CRITICAL" || previousHyperstate === "DEGRADED") {
    const allSignalsLow = 
      automationQueueDepth < 0.3 &&
      deadLetterQueueCount < 0.2 &&
      performanceHeatmapSeverity < 0.3 &&
      consistencyIssues < 0.2 &&
      driftScore < 0.2 &&
      usageSpikes < 0.3 &&
      backgroundWorkerLoad < 0.3;

    if (allSignalsLow && duration > HYPERSTATE_THRESHOLDS.stabilityDuration) {
      return "RECOVERY_MODE";
    }
  }

  // DEGRADED: Slow queries, high latency, or repeated failures
  const degradedPerformance = performanceHeatmapSeverity > 0.4;
  const degradedCache = params.cachingEfficiency < 0.5;
  const degradedDeadLetters = deadLetterQueueCount > 0.3;
  const degradedDrift = driftScore > 0.3;

  if (degradedPerformance || degradedCache || degradedDeadLetters || degradedDrift) {
    return "DEGRADED";
  }

  // ELEVATED_LOAD: Automations or performance under pressure
  const elevatedQueue = automationQueueDepth > 0.6;
  const elevatedWorkers = backgroundWorkerLoad > 0.7;
  const elevatedUsage = usageSpikes > 0.5;

  if (elevatedQueue || elevatedWorkers || elevatedUsage) {
    return "ELEVATED_LOAD";
  }

  // NOMINAL: Everything stable
  return "NOMINAL";
}

/**
 * Calculate confidence in the hyperstate determination
 */
function calculateConfidence(params: {
  signals: HyperstateMap["signals"];
  hyperstate: Hyperstate;
  anomalyClusters: Array<{ id: string; severity: number; subsystems: string[]; label: string }>;
}): number {
  const { signals, hyperstate, anomalyClusters } = params;

  // Base confidence from signal clarity
  let confidence = 0.5;

  // Increase confidence if signals are clearly above/below thresholds
  const signalValues = Object.values(signals);
  const maxSignal = Math.max(...signalValues);
  const minSignal = Math.min(...signalValues);
  const signalSpread = maxSignal - minSignal;

  // High spread = clear signal = higher confidence
  confidence += signalSpread * 0.3;

  // Anomalies increase confidence in CRITICAL
  if (hyperstate === "CRITICAL" && anomalyClusters.length > 0) {
    confidence += 0.2;
  }

  // Multiple signals pointing to same state = higher confidence
  const signalsAboveThreshold = signalValues.filter(v => v > 0.5).length;
  if (hyperstate !== "NOMINAL" && signalsAboveThreshold >= 2) {
    confidence += 0.1;
  }

  return Math.min(1, Math.max(0.3, confidence));
}
