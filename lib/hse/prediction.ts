// HPE: Hyperstate Prediction Engine
// The cockpit's first predictive intelligence layer
// Predicts future states before they occur

import { queryState } from "./query";
import { buildHyperstate } from "./buildHyperstate";
import { getHistory, getAllHistory } from "./history-store";
import { getLineageState } from "./lineage";
import { getInheritanceState, getOperatorSignature } from "./inheritance";
import { decidePosture } from "@/lib/uoi/posture";
import { chooseDirective } from "@/lib/uoi/directives";
import { getRecentSignals } from "@/lib/uoi/memory";

export interface HyperstatePrediction {
  timestamp: string;
  horizon: number; // milliseconds into future
  
  // Core predictions
  projectedPosture: {
    posture: string;
    confidence: number; // 0-1
    timeToTransition: number; // milliseconds
    reason: string;
  };
  
  projectedDirective: {
    type: string;
    target: string;
    confidence: number;
    timeToTrigger: number;
    reason: string;
  };
  
  projectedAnomalyZones: Array<{
    subsystem: string;
    confidence: number;
    severity: number; // 0-10
    timeToOccur: number;
    reason: string;
  }>;
  
  projectedQueuePressure: Array<{
    subsystem: string;
    pressure: number; // 0-1
    confidence: number;
    timeToPeak: number;
    reason: string;
  }>;
  
  projectedDrift: Array<{
    subsystem: string;
    driftMagnitude: number; // 0-1
    confidence: number;
    timeToDetect: number;
    reason: string;
  }>;
  
  projectedCrestRituals: Array<{
    ritual: string;
    confidence: number;
    timeToTrigger: number;
    reason: string;
  }>;
  
  // Meta
  predictionConfidence: number; // Overall confidence in predictions
  basedOn: {
    historyWindow: number;
    signalsAnalyzed: number;
    patternsMatched: number;
  };
}

const PREDICTION_HORIZON_MS = 30 * 60 * 1000; // 30 minutes
const HISTORY_WINDOW_MS = 60 * 60 * 1000; // 1 hour of history

/**
 * Generate hyperstate predictions
 */
export async function generatePredictions(
  horizonMs: number = PREDICTION_HORIZON_MS
): Promise<HyperstatePrediction> {
  const now = Date.now();
  
  // 1. Get current state
  const currentState = queryState();
  const currentHyperstate = await buildHyperstate();
  
  // 2. Get historical data
  const history = getAllHistory(HISTORY_WINDOW_MS);
  const recentSignals = getRecentSignals(1000);
  
  // 3. Get lineage and inheritance patterns
  const lineageState = getLineageState();
  const inheritanceState = getInheritanceState();
  const operatorSignature = getOperatorSignature("auren"); // TODO: Get actual operator
  
  // 4. Generate predictions
  const projectedPosture = predictPosture(
    currentState,
    history,
    operatorSignature,
    horizonMs
  );
  
  const projectedDirective = predictDirective(
    currentHyperstate,
    currentState,
    history,
    operatorSignature,
    horizonMs
  );
  
  const projectedAnomalyZones = predictAnomalyZones(
    currentHyperstate,
    history,
    recentSignals,
    horizonMs
  );
  
  const projectedQueuePressure = predictQueuePressure(
    currentHyperstate,
    history,
    horizonMs
  );
  
  const projectedDrift = predictDrift(
    currentHyperstate,
    history,
    horizonMs
  );
  
  const projectedCrestRituals = predictCrestRituals(
    lineageState,
    inheritanceState,
    currentHyperstate,
    horizonMs
  );
  
  // Calculate overall confidence
  const confidences = [
    projectedPosture.confidence,
    projectedDirective.confidence,
    ...projectedAnomalyZones.map(a => a.confidence),
    ...projectedQueuePressure.map(q => q.confidence),
    ...projectedDrift.map(d => d.confidence),
    ...projectedCrestRituals.map(c => c.confidence),
  ].filter(c => c > 0);
  
  const predictionConfidence = confidences.length > 0
    ? confidences.reduce((sum, c) => sum + c, 0) / confidences.length
    : 0.5;
  
  // Count patterns matched
  const patternsMatched = countPatternMatches(history, currentHyperstate);
  
  return {
    timestamp: new Date(now).toISOString(),
    horizon: horizonMs,
    projectedPosture,
    projectedDirective,
    projectedAnomalyZones,
    projectedQueuePressure,
    projectedDrift,
    projectedCrestRituals,
    predictionConfidence,
    basedOn: {
      historyWindow: HISTORY_WINDOW_MS,
      signalsAnalyzed: recentSignals.length,
      patternsMatched,
    },
  };
}

/**
 * Predict posture shift
 */
function predictPosture(
  currentState: any,
  history: any[],
  operatorSignature: any,
  horizonMs: number
): HyperstatePrediction["projectedPosture"] {
  const currentPosture = currentState?.sovereignPosture || "normal";
  
  // Analyze historical posture transitions
  const postureHistory = history.filter(h => h.type === "posture");
  
  // Check operator signature patterns
  const transitionPatterns = operatorSignature?.patterns?.postureTransitionPatterns || [];
  
  // Look for trends in risk/drift/queues that would trigger posture change
  const riskHistory = history.filter(h => h.type === "error" || h.type === "risk");
  const recentRisk = riskHistory.slice(-10);
  const olderRisk = riskHistory.slice(-20, -10);
  
  const recentRiskAvg = recentRisk.length > 0
    ? recentRisk.reduce((sum, h) => sum + h.value, 0) / recentRisk.length
    : 0;
  const olderRiskAvg = olderRisk.length > 0
    ? olderRisk.reduce((sum, h) => sum + h.value, 0) / olderRisk.length
    : 0;
  
  // Predict based on trends
  let predictedPosture = currentPosture;
  let confidence = 0.3;
  let timeToTransition = horizonMs;
  let reason = "No significant trends detected";
  
  // Rising risk -> protective or recovery
  if (recentRiskAvg > olderRiskAvg * 1.5 && recentRiskAvg > 0.5) {
    predictedPosture = recentRiskAvg > 0.8 ? "recovery" : "protective";
    confidence = Math.min(0.8, recentRiskAvg);
    timeToTransition = 5 * 60 * 1000; // 5 minutes
    reason = `Rising risk detected (${(recentRiskAvg * 100).toFixed(0)}% vs ${(olderRiskAvg * 100).toFixed(0)}%)`;
  }
  
  // Check operator patterns
  if (transitionPatterns.length > 0) {
    const commonTransition = transitionPatterns
      .filter(p => p.from === currentPosture)
      .sort((a, b) => b.frequency - a.frequency)[0];
    
    if (commonTransition && commonTransition.frequency > 3) {
      predictedPosture = commonTransition.to;
      confidence = Math.min(0.7, commonTransition.frequency / 10);
      timeToTransition = commonTransition.timing * 1000 || 15 * 60 * 1000;
      reason = `Based on operator pattern: ${commonTransition.trigger}`;
    }
  }
  
  return {
    posture: predictedPosture,
    confidence,
    timeToTransition,
    reason,
  };
}

/**
 * Predict directive
 */
function predictDirective(
  currentHyperstate: any,
  currentState: any,
  history: any[],
  operatorSignature: any,
  horizonMs: number
): HyperstatePrediction["projectedDirective"] {
  // Simulate future state to predict directive
  const futureState = {
    ...currentHyperstate,
    // Project forward based on trends
  };
  
  // Use directive engine logic to predict
  const predictedDirective = chooseDirective({
    subsystems: futureState.subsystems || currentHyperstate.subsystems,
    posture: currentState?.sovereignPosture || "normal",
    riskVectors: futureState.riskVectors || currentHyperstate.riskVectors,
    driftVectors: futureState.driftVectors || currentHyperstate.driftVectors,
    queuePressure: futureState.queuePressure || currentHyperstate.queuePressure,
    anomalyClusters: futureState.anomalyClusters || currentHyperstate.anomalyClusters,
  });
  
  // Check operator signature for directive patterns
  const directivePatterns = operatorSignature?.patterns?.directivePatterns || [];
  const commonDirective = directivePatterns
    .sort((a, b) => b.frequency - a.frequency)[0];
  
  let predictedType = predictedDirective.action || "NOOP";
  let predictedTarget = predictedDirective.target || "system";
  let confidence = 0.4;
  let timeToTrigger = horizonMs / 2;
  let reason = predictedDirective.reason || "Based on projected system state";
  
  if (commonDirective && commonDirective.frequency > 5) {
    predictedType = commonDirective.type;
    confidence = Math.min(0.7, commonDirective.frequency / 15);
    reason = `Based on operator directive pattern: ${commonDirective.context}`;
  }
  
  return {
    type: predictedType,
    target: predictedTarget,
    confidence,
    timeToTrigger,
    reason,
  };
}

/**
 * Predict anomaly zones
 */
function predictAnomalyZones(
  currentHyperstate: any,
  history: any[],
  recentSignals: any[],
  horizonMs: number
): HyperstatePrediction["projectedAnomalyZones"] {
  const zones: HyperstatePrediction["projectedAnomalyZones"] = [];
  
  // Analyze subsystems for rising error rates
  const subsystems = currentHyperstate.subsystems || {};
  
  Object.entries(subsystems).forEach(([subsystem, state]: [string, any]) => {
    const subsystemHistory = history.filter(h => h.subsystem === subsystem);
    const errorHistory = subsystemHistory.filter(h => h.type === "error");
    
    if (errorHistory.length < 3) return;
    
    const recent = errorHistory.slice(-5);
    const older = errorHistory.slice(-10, -5);
    
    const recentAvg = recent.reduce((sum, h) => sum + h.value, 0) / recent.length;
    const olderAvg = older.length > 0
      ? older.reduce((sum, h) => sum + h.value, 0) / older.length
      : recentAvg;
    
    // Rising error rate
    if (recentAvg > olderAvg * 1.5 && recentAvg > 0.3) {
      zones.push({
        subsystem,
        confidence: Math.min(0.8, recentAvg),
        severity: Math.min(10, recentAvg * 10),
        timeToOccur: 10 * 60 * 1000, // 10 minutes
        reason: `Rising error rate: ${(recentAvg * 100).toFixed(0)}% (was ${(olderAvg * 100).toFixed(0)}%)`,
      });
    }
    
    // Low health trend
    if (state.health < 0.7) {
      zones.push({
        subsystem,
        confidence: 0.6,
        severity: Math.min(10, (1 - state.health) * 10),
        timeToOccur: 15 * 60 * 1000,
        reason: `Health declining: ${(state.health * 100).toFixed(0)}%`,
      });
    }
  });
  
  // Check for critical signals
  const criticalSignals = recentSignals.filter(s =>
    s.priority === "critical" || s.severity > 8
  );
  
  criticalSignals.forEach(signal => {
    const source = (signal.source || "unknown").toLowerCase();
    const existing = zones.find(z => z.subsystem === source);
    if (!existing) {
      zones.push({
        subsystem: source,
        confidence: 0.7,
        severity: Math.min(10, signal.severity || 8),
        timeToOccur: 5 * 60 * 1000,
        reason: `Critical signal detected: ${signal.type}`,
      });
    }
  });
  
  return zones;
}

/**
 * Predict queue pressure
 */
function predictQueuePressure(
  currentHyperstate: any,
  history: any[],
  horizonMs: number
): HyperstatePrediction["projectedQueuePressure"] {
  const predictions: HyperstatePrediction["projectedQueuePressure"] = [];
  
  const queueHistory = history.filter(h => h.type === "queue" || h.type === "queue_pressure");
  const subsystems = currentHyperstate.subsystems || {};
  
  Object.entries(subsystems).forEach(([subsystem, state]: [string, any]) => {
    const subsystemQueue = queueHistory.filter(h => h.subsystem === subsystem);
    
    if (subsystemQueue.length < 3) {
      // Check current queue state
      if (state.queue && state.queue > 0.5) {
        predictions.push({
          subsystem,
          pressure: state.queue,
          confidence: 0.5,
          timeToPeak: horizonMs / 2,
          reason: `Current queue pressure: ${(state.queue * 100).toFixed(0)}%`,
        });
      }
      return;
    }
    
    const recent = subsystemQueue.slice(-5);
    const older = subsystemQueue.slice(-10, -5);
    
    const recentAvg = recent.reduce((sum, h) => sum + h.value, 0) / recent.length;
    const olderAvg = older.length > 0
      ? older.reduce((sum, h) => sum + h.value, 0) / older.length
      : recentAvg;
    
    // Rising queue
    if (recentAvg > olderAvg * 1.2 && recentAvg > 0.3) {
      predictions.push({
        subsystem,
        pressure: Math.min(1, recentAvg * 1.5), // Project forward
        confidence: Math.min(0.8, recentAvg),
        timeToPeak: 15 * 60 * 1000,
        reason: `Queue rising: ${(recentAvg * 100).toFixed(0)}% → ${((recentAvg * 1.5) * 100).toFixed(0)}%`,
      });
    }
  });
  
  return predictions;
}

/**
 * Predict drift
 */
function predictDrift(
  currentHyperstate: any,
  history: any[],
  horizonMs: number
): HyperstatePrediction["projectedDrift"] {
  const predictions: HyperstatePrediction["projectedDrift"] = [];
  
  const driftHistory = history.filter(h => h.type === "drift" || h.type === "schema_drift");
  const driftVectors = currentHyperstate.driftVectors || [];
  
  driftVectors.forEach((vector: any) => {
    const subsystemHistory = driftHistory.filter(h => h.subsystem === vector.subsystem);
    
    if (subsystemHistory.length < 3) {
      // Check current drift
      if (vector.value > 0.2) {
        predictions.push({
          subsystem: vector.subsystem,
          driftMagnitude: vector.value,
          confidence: 0.5,
          timeToDetect: 10 * 60 * 1000,
          reason: `Current drift: ${(vector.value * 100).toFixed(0)}%`,
        });
      }
      return;
    }
    
    const recent = subsystemHistory.slice(-5);
    const older = subsystemHistory.slice(-10, -5);
    
    const recentAvg = recent.reduce((sum, h) => sum + h.value, 0) / recent.length;
    const olderAvg = older.length > 0
      ? older.reduce((sum, h) => sum + h.value, 0) / older.length
      : recentAvg;
    
    // Rising drift
    if (recentAvg > olderAvg * 1.3 && recentAvg > 0.15) {
      predictions.push({
        subsystem: vector.subsystem,
        driftMagnitude: Math.min(1, recentAvg * 1.4),
        confidence: Math.min(0.7, recentAvg),
        timeToDetect: 20 * 60 * 1000,
        reason: `Drift accelerating: ${(recentAvg * 100).toFixed(0)}% → ${((recentAvg * 1.4) * 100).toFixed(0)}%`,
      });
    }
  });
  
  return predictions;
}

/**
 * Predict crest rituals
 */
function predictCrestRituals(
  lineageState: any,
  inheritanceState: any,
  currentHyperstate: any,
  horizonMs: number
): HyperstatePrediction["projectedCrestRituals"] {
  const rituals: HyperstatePrediction["projectedCrestRituals"] = [];
  
  // Predict based on anomalies
  const anomalies = currentHyperstate.anomalyClusters || [];
  const criticalAnomalies = anomalies.filter((a: any) => a.severity >= 8);
  
  if (criticalAnomalies.length > 0) {
    rituals.push({
      ritual: "sovereign_flash",
      confidence: 0.7,
      timeToTrigger: 5 * 60 * 1000,
      reason: `Critical anomaly detected - crest will flash`,
    });
  }
  
  // Predict recovery spiral if system recovering
  if (currentHyperstate.globalState === "recovering") {
    rituals.push({
      ritual: "recovery_spiral",
      confidence: 0.6,
      timeToTrigger: 10 * 60 * 1000,
      reason: `System in recovery - crest will spiral`,
    });
  }
  
  // Predict stability breath if stable
  if (currentHyperstate.globalState === "stable") {
    const stabilityDuration = 30 * 60 * 1000; // 30 min
    rituals.push({
      ritual: "stability_breath",
      confidence: 0.5,
      timeToTrigger: stabilityDuration,
      reason: `System stable - crest will breathe`,
    });
  }
  
  // Predict based on lineage patterns
  if (lineageState?.ledger?.statistics) {
    const avgRitualInterval = 60 * 60 * 1000; // 1 hour average
    rituals.push({
      ritual: "genesis_bloom",
      confidence: 0.4,
      timeToTrigger: avgRitualInterval,
      reason: `Based on lineage pattern - genesis bloom likely`,
    });
  }
  
  return rituals;
}

/**
 * Count pattern matches
 */
function countPatternMatches(history: any[], currentHyperstate: any): number {
  // Simple pattern matching - count repeating sequences
  let matches = 0;
  
  // Look for repeating error patterns
  const errorPatterns = history.filter(h => h.type === "error");
  if (errorPatterns.length > 5) {
    const recentErrors = errorPatterns.slice(-5).map(h => h.subsystem);
    const uniqueErrors = new Set(recentErrors);
    if (uniqueErrors.size < 3) {
      matches++; // Repeating error pattern
    }
  }
  
  // Look for drift trends
  const driftPatterns = history.filter(h => h.type === "drift");
  if (driftPatterns.length > 3) {
    const recentDrift = driftPatterns.slice(-3).map(h => h.value);
    const isRising = recentDrift[0] < recentDrift[recentDrift.length - 1];
    if (isRising) {
      matches++; // Rising drift pattern
    }
  }
  
  // Look for queue pressure waves
  const queuePatterns = history.filter(h => h.type === "queue");
  if (queuePatterns.length > 5) {
    matches++; // Queue activity pattern
  }
  
  return matches;
}

/**
 * Check if prediction confidence is high enough to trigger proactive actions
 */
export function shouldTriggerProactiveActions(
  prediction: HyperstatePrediction
): boolean {
  return prediction.predictionConfidence > 0.7 ||
    prediction.projectedAnomalyZones.some(z => z.confidence > 0.7 && z.severity >= 7) ||
    prediction.projectedPosture.confidence > 0.7;
}
