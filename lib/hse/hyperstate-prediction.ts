// HSE Phase II - Prediction Engine
// The cockpit's intuition - anticipatory intelligence

import { getRecentTimeline } from './hyperstate-timeline';
import { evaluateHyperstateWithTransition } from './hyperstate-transition';
import type { HyperstateLevel } from './hyperstate-types';

export interface Prediction {
  type: 'transition' | 'pressure_spike' | 'degradation' | 'recovery' | 'drift_warning' | 'consistency_risk';
  targetLevel?: HyperstateLevel;
  confidence: number; // 0-1
  timeframe: number; // milliseconds until predicted event
  reason: string;
  signals: {
    automationQueueDepth?: number;
    deadLetterCount?: number;
    slowOperationScore?: number;
    consistencyIssueCount?: number;
    driftScore?: number;
    usagePressureScore?: number;
    backgroundWorkerLoad?: number;
  };
  recommendation: string;
  timestamp: number;
}

export interface PredictionHistory {
  prediction: Prediction;
  actualized: boolean;
  actualizedAt?: number;
  accuracy?: number; // How close was the prediction
}

const predictionHistory: PredictionHistory[] = [];
const MAX_HISTORY = 100;

/**
 * Analyze signal trends to predict future hyperstate
 */
function analyzeSignalTrends(points: ReturnType<typeof getRecentTimeline>): {
  automationQueueTrend: number; // -1 to 1 (decreasing to increasing)
  deadLetterTrend: number;
  performanceTrend: number;
  consistencyTrend: number;
  driftTrend: number;
  usageTrend: number;
  workerTrend: number;
} {
  if (points.length < 3) {
    return {
      automationQueueTrend: 0,
      deadLetterTrend: 0,
      performanceTrend: 0,
      consistencyTrend: 0,
      driftTrend: 0,
      usageTrend: 0,
      workerTrend: 0,
    };
  }

  // Calculate linear regression slope for each signal
  const calculateTrend = (values: number[]): number => {
    if (values.length < 2) return 0;
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((sum, val, idx) => sum + val * idx, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return Math.max(-1, Math.min(1, slope * 10)); // Normalize to -1 to 1
  };

  const recent = points.slice(-10); // Last 10 points
  const older = points.slice(-20, -10); // Previous 10 points

  return {
    automationQueueTrend: calculateTrend(recent.map(p => p.signals.automationQueueDepth)),
    deadLetterTrend: calculateTrend(recent.map(p => p.signals.deadLetterCount)),
    performanceTrend: calculateTrend(recent.map(p => p.signals.slowOperationScore)),
    consistencyTrend: calculateTrend(recent.map(p => p.signals.consistencyIssueCount)),
    driftTrend: calculateTrend(recent.map(p => p.signals.driftScore)),
    usageTrend: calculateTrend(recent.map(p => p.signals.usagePressureScore)),
    workerTrend: calculateTrend(recent.map(p => p.signals.backgroundWorkerLoad)),
  };
}

/**
 * Predict future hyperstate transitions
 */
export async function predictHyperstateTransitions(): Promise<Prediction[]> {
  const { snapshot } = await evaluateHyperstateWithTransition();
  const recentPoints = getRecentTimeline(30); // Last 30 minutes
  const predictions: Prediction[] = [];

  if (recentPoints.length < 3) {
    return predictions; // Not enough data
  }

  const trends = analyzeSignalTrends(recentPoints);
  const currentSignals = snapshot.signals;
  const currentLevel = snapshot.level;

  // Prediction 1: Automation pressure rising → ELEVATED_LOAD or DEGRADED
  if (trends.automationQueueTrend > 0.3 && currentSignals.automationQueueDepth > 30) {
    const projectedDepth = currentSignals.automationQueueDepth + (trends.automationQueueTrend * 50);
    let targetLevel: HyperstateLevel = 'ELEVATED_LOAD';
    let confidence = 0.6;
    let timeframe = 5 * 60 * 1000; // 5 minutes

    if (projectedDepth > 200) {
      targetLevel = 'DEGRADED';
      confidence = 0.8;
      timeframe = 3 * 60 * 1000; // 3 minutes
    }

    if (currentLevel !== targetLevel) {
      predictions.push({
        type: 'transition',
        targetLevel,
        confidence,
        timeframe,
        reason: `Automation queue depth trending upward (${trends.automationQueueTrend.toFixed(2)}/min), projected to ${Math.round(projectedDepth)}`,
        signals: {
          automationQueueDepth: projectedDepth,
        },
        recommendation: 'Consider throttling non-critical automations or scaling workers',
        timestamp: Date.now(),
      });
    }
  }

  // Prediction 2: Performance degradation → DEGRADED
  if (trends.performanceTrend > 0.2 && currentSignals.slowOperationScore > 40) {
    const projectedScore = currentSignals.slowOperationScore + (trends.performanceTrend * 30);
    if (projectedScore > 60 && currentLevel !== 'DEGRADED' && currentLevel !== 'CRITICAL') {
      predictions.push({
        type: 'degradation',
        targetLevel: 'DEGRADED',
        confidence: 0.7,
        timeframe: 10 * 60 * 1000, // 10 minutes
        reason: `Performance degradation detected (slow operation score trending upward: ${trends.performanceTrend.toFixed(2)}/min)`,
        signals: {
          slowOperationScore: projectedScore,
        },
        recommendation: 'Increase cache TTL and reduce background sync frequency',
        timestamp: Date.now(),
      });
    }
  }

  // Prediction 3: Dead letter queue building → CRITICAL
  if (trends.deadLetterTrend > 0.1 && currentSignals.deadLetterCount > 5) {
    const projectedCount = currentSignals.deadLetterCount + (trends.deadLetterTrend * 20);
    if (projectedCount > 20 && currentLevel !== 'CRITICAL') {
      predictions.push({
        type: 'transition',
        targetLevel: 'CRITICAL',
        confidence: 0.75,
        timeframe: 8 * 60 * 1000, // 8 minutes
        reason: `Dead letter queue building (${trends.deadLetterTrend.toFixed(2)}/min), projected to ${Math.round(projectedCount)}`,
        signals: {
          deadLetterCount: projectedCount,
        },
        recommendation: 'Investigate failed automations and pause non-critical work',
        timestamp: Date.now(),
      });
    }
  }

  // Prediction 4: Drift increasing → CRITICAL
  if (trends.driftTrend > 0.15 && currentSignals.driftScore > 30) {
    const projectedDrift = currentSignals.driftScore + (trends.driftTrend * 40);
    if (projectedDrift > 80 && currentLevel !== 'CRITICAL') {
      predictions.push({
        type: 'drift_warning',
        targetLevel: 'CRITICAL',
        confidence: 0.65,
        timeframe: 15 * 60 * 1000, // 15 minutes
        reason: `Drift score trending upward (${trends.driftTrend.toFixed(2)}/min), projected to ${Math.round(projectedDrift)}`,
        signals: {
          driftScore: projectedDrift,
        },
        recommendation: 'Run drift detection and consider workflow adjustments',
        timestamp: Date.now(),
      });
    }
  }

  // Prediction 5: Consistency issues rising → CRITICAL
  if (trends.consistencyTrend > 0.1 && currentSignals.consistencyIssueCount > 20) {
    const projectedIssues = currentSignals.consistencyIssueCount + (trends.consistencyTrend * 30);
    if (projectedIssues > 50 && currentLevel !== 'CRITICAL') {
      predictions.push({
        type: 'consistency_risk',
        targetLevel: 'CRITICAL',
        confidence: 0.7,
        timeframe: 12 * 60 * 1000, // 12 minutes
        reason: `Consistency issues trending upward (${trends.consistencyTrend.toFixed(2)}/min), projected to ${Math.round(projectedIssues)}`,
        signals: {
          consistencyIssueCount: projectedIssues,
        },
        recommendation: 'Run consistency checks and fix identified issues',
        timestamp: Date.now(),
      });
    }
  }

  // Prediction 6: Recovery from CRITICAL/DEGRADED
  if ((currentLevel === 'CRITICAL' || currentLevel === 'DEGRADED') && 
      trends.automationQueueTrend < -0.2 && 
      trends.deadLetterTrend < -0.1 &&
      trends.performanceTrend < -0.1) {
    predictions.push({
      type: 'recovery',
      targetLevel: 'RECOVERY_MODE',
      confidence: 0.65,
      timeframe: 5 * 60 * 1000, // 5 minutes
      reason: 'Signals trending downward, system stabilizing',
      signals: {
        automationQueueDepth: currentSignals.automationQueueDepth * 0.8,
        deadLetterCount: currentSignals.deadLetterCount * 0.7,
        slowOperationScore: currentSignals.slowOperationScore * 0.8,
      },
      recommendation: 'Continue monitoring, recovery routines will activate automatically',
      timestamp: Date.now(),
    });
  }

  // Prediction 7: Usage pressure spike → ELEVATED_LOAD
  if (trends.usageTrend > 0.25 && currentSignals.usagePressureScore > 50) {
    const projectedPressure = currentSignals.usagePressureScore + (trends.usageTrend * 30);
    if (projectedPressure > 70 && currentLevel === 'NOMINAL') {
      predictions.push({
        type: 'pressure_spike',
        targetLevel: 'ELEVATED_LOAD',
        confidence: 0.6,
        timeframe: 6 * 60 * 1000, // 6 minutes
        reason: `Usage pressure trending upward (${trends.usageTrend.toFixed(2)}/min), projected to ${Math.round(projectedPressure)}`,
        signals: {
          usagePressureScore: projectedPressure,
        },
        recommendation: 'Prepare for increased load, consider scaling resources',
        timestamp: Date.now(),
      });
    }
  }

  return predictions;
}

/**
 * Record prediction actualization
 */
export function recordPredictionActualization(
  prediction: Prediction,
  actualized: boolean,
  actualLevel?: HyperstateLevel
): void {
  let accuracy = 0;
  if (actualized && prediction.targetLevel && actualLevel) {
    // Calculate accuracy based on how close the prediction was
    if (prediction.targetLevel === actualLevel) {
      accuracy = 1.0;
    } else {
      // Partial credit for close predictions
      const levels: HyperstateLevel[] = ['NOMINAL', 'ELEVATED_LOAD', 'DEGRADED', 'CRITICAL', 'RECOVERY_MODE'];
      const predictedIdx = levels.indexOf(prediction.targetLevel);
      const actualIdx = levels.indexOf(actualLevel);
      const distance = Math.abs(predictedIdx - actualIdx);
      accuracy = Math.max(0, 1 - (distance * 0.3));
    }
  }

  predictionHistory.push({
    prediction,
    actualized,
    actualizedAt: actualized ? Date.now() : undefined,
    accuracy,
  });

  // Trim history
  if (predictionHistory.length > MAX_HISTORY) {
    predictionHistory.shift();
  }
}

/**
 * Get prediction accuracy metrics
 */
export function getPredictionAccuracy(): {
  total: number;
  actualized: number;
  accuracy: number;
  byType: Record<string, { total: number; actualized: number; avgAccuracy: number }>;
} {
  const actualized = predictionHistory.filter(p => p.actualized);
  const avgAccuracy = actualized.length > 0
    ? actualized.reduce((sum, p) => sum + (p.accuracy || 0), 0) / actualized.length
    : 0;

  const byType: Record<string, { total: number; actualized: number; avgAccuracy: number }> = {};
  predictionHistory.forEach(p => {
    const type = p.prediction.type;
    if (!byType[type]) {
      byType[type] = { total: 0, actualized: 0, avgAccuracy: 0 };
    }
    byType[type].total++;
    if (p.actualized) {
      byType[type].actualized++;
      byType[type].avgAccuracy = (byType[type].avgAccuracy * (byType[type].actualized - 1) + (p.accuracy || 0)) / byType[type].actualized;
    }
  });

  return {
    total: predictionHistory.length,
    actualized: actualized.length,
    accuracy: avgAccuracy,
    byType,
  };
}

/**
 * Get recent predictions
 */
export function getRecentPredictions(limit: number = 20): Prediction[] {
  return predictionHistory
    .slice(-limit)
    .map(p => p.prediction)
    .reverse();
}
