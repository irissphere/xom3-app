// UOI Adaptive Thresholds - Thresholds adapt automatically
// Evolution mode: Error budgets, drift tolerances, queue limits become dynamic

import { isEvolutionActive, recordThresholdAdaptation } from "./evolution";
import { getGlobalRule, updateGlobalRule } from "./sovereign";
import { isSovereignActive } from "./sovereign";
import { getRecentSignals } from "./memory";

export interface ThresholdAnalysis {
  domain: "error_budget" | "throughput_floor" | "drift_tolerance" | "queue_limit";
  currentThreshold: number;
  proposedThreshold: number;
  reason: string;
  basedOn: "historical_performance" | "current_load" | "predicted_risk" | "subsystem_health";
  confidence: number;
}

/**
 * Analyze thresholds for adaptation
 * EVOLUTION MODE: Adjusts thresholds based on historical performance, current load, predicted risk
 */
export function analyzeThresholdsForAdaptation(): ThresholdAnalysis[] {
  if (!isEvolutionActive() || !isSovereignActive()) {
    return [];
  }
  
  const analyses: ThresholdAnalysis[] = [];
  const recent = getRecentSignals(500); // Look at more history
  
  // Analyze each threshold domain
  const domains: Array<"error_budget" | "throughput_floor" | "drift_tolerance" | "queue_limit"> = [
    "error_budget",
    "throughput_floor",
    "drift_tolerance",
    "queue_limit"
  ];
  
  domains.forEach(domain => {
    const globalRule = getGlobalRule(domain);
    if (!globalRule || typeof globalRule.value !== "number") {
      return;
    }
    
    const currentThreshold = globalRule.value;
    const analysis = analyzeThreshold(domain, currentThreshold, recent);
    
    if (analysis && Math.abs(analysis.proposedThreshold - currentThreshold) > 0.01) {
      analyses.push(analysis);
    }
  });
  
  return analyses;
}

/**
 * Analyze single threshold
 */
function analyzeThreshold(
  domain: "error_budget" | "throughput_floor" | "drift_tolerance" | "queue_limit",
  currentThreshold: number,
  recentSignals: any[]
): ThresholdAnalysis | null {
  let proposedThreshold = currentThreshold;
  let reason = "";
  let basedOn: ThresholdAnalysis["basedOn"] = "historical_performance";
  let confidence = 0.5;
  
  // Group signals by type
  const errors = recentSignals.filter(s => s.type === "error");
  const metrics = recentSignals.filter(s => s.type === "metric");
  const drift = recentSignals.filter(s => s.type === "drift");
  
  switch (domain) {
    case "error_budget":
      // Analyze error rate trends
      const errorRate = errors.length / recentSignals.length;
      const errorTrend = calculateTrend(errors.slice(-100).map((e: any) => e.severity || 1));
      
      if (errorRate > currentThreshold * 1.2 && errorTrend > 0) {
        // Errors increasing, tighten budget
        proposedThreshold = Math.max(0.01, currentThreshold * 0.95);
        reason = `Error rate (${(errorRate * 100).toFixed(1)}%) exceeds threshold and trending up. Tightening error budget.`;
        basedOn = "predicted_risk";
        confidence = 0.7;
      } else if (errorRate < currentThreshold * 0.5 && errorTrend < 0) {
        // Errors decreasing, can relax slightly
        proposedThreshold = Math.min(0.1, currentThreshold * 1.02);
        reason = `Error rate (${(errorRate * 100).toFixed(1)}%) well below threshold and trending down. Slightly relaxing error budget.`;
        basedOn = "historical_performance";
        confidence = 0.6;
      }
      break;
      
    case "throughput_floor":
      // Analyze throughput trends
      const throughputs = metrics.filter((m: any) => m.payload?.throughput).map((m: any) => m.payload.throughput);
      if (throughputs.length > 0) {
        const avgThroughput = throughputs.reduce((a: number, b: number) => a + b, 0) / throughputs.length;
        const throughputTrend = calculateTrend(throughputs.slice(-50));
        
        if (avgThroughput < currentThreshold * 0.8 && throughputTrend < 0) {
          // Throughput dropping, lower floor
          proposedThreshold = Math.max(0.3, currentThreshold * 0.95);
          reason = `Throughput (${(avgThroughput * 100).toFixed(1)}%) below floor and dropping. Lowering throughput floor.`;
          basedOn = "current_load";
          confidence = 0.7;
        } else if (avgThroughput > currentThreshold * 1.3 && throughputTrend > 0) {
          // Throughput improving, raise floor
          proposedThreshold = Math.min(0.9, currentThreshold * 1.05);
          reason = `Throughput (${(avgThroughput * 100).toFixed(1)}%) above floor and improving. Raising throughput floor.`;
          basedOn = "historical_performance";
          confidence = 0.6;
        }
      }
      break;
      
    case "drift_tolerance":
      // Analyze drift frequency
      const driftRate = drift.length / recentSignals.length;
      const driftTrend = calculateTrend(drift.slice(-50).map(() => 1));
      
      if (driftRate > currentThreshold * 1.5 && driftTrend > 0) {
        // Drift increasing, tighten tolerance
        proposedThreshold = Math.max(0.3, currentThreshold * 0.9);
        reason = `Drift rate (${(driftRate * 100).toFixed(1)}%) high and increasing. Tightening drift tolerance.`;
        basedOn = "predicted_risk";
        confidence = 0.7;
      } else if (driftRate < currentThreshold * 0.3 && driftTrend < 0) {
        // Drift decreasing, can relax
        proposedThreshold = Math.min(0.9, currentThreshold * 1.05);
        reason = `Drift rate (${(driftRate * 100).toFixed(1)}%) low and decreasing. Relaxing drift tolerance.`;
        basedOn = "historical_performance";
        confidence = 0.6;
      }
      break;
      
    case "queue_limit":
      // Analyze queue pressure
      const queues = metrics.filter((m: any) => m.payload?.workflowQueue || m.payload?.queueLength)
        .map((m: any) => m.payload?.workflowQueue || m.payload?.queueLength);
      if (queues.length > 0) {
        const avgQueue = queues.reduce((a: number, b: number) => a + b, 0) / queues.length;
        const queueTrend = calculateTrend(queues.slice(-50));
        
        if (avgQueue > currentThreshold * 0.9 && queueTrend > 0) {
          // Queue pressure high, increase limit
          proposedThreshold = Math.min(100, currentThreshold * 1.1);
          reason = `Queue pressure (${avgQueue.toFixed(1)}) near limit and increasing. Raising queue limit.`;
          basedOn = "current_load";
          confidence = 0.7;
        } else if (avgQueue < currentThreshold * 0.3 && queueTrend < 0) {
          // Queue pressure low, can lower limit
          proposedThreshold = Math.max(10, currentThreshold * 0.95);
          reason = `Queue pressure (${avgQueue.toFixed(1)}) well below limit and decreasing. Lowering queue limit.`;
          basedOn = "subsystem_health";
          confidence = 0.6;
        }
      }
      break;
  }
  
  if (Math.abs(proposedThreshold - currentThreshold) < 0.01) {
    return null;
  }
  
  return {
    domain,
    currentThreshold,
    proposedThreshold,
    reason,
    basedOn,
    confidence,
  };
}

/**
 * Calculate trend (positive = increasing, negative = decreasing)
 */
function calculateTrend(values: number[]): number {
  if (values.length < 2) return 0;
  
  const firstHalf = values.slice(0, Math.floor(values.length / 2));
  const secondHalf = values.slice(Math.floor(values.length / 2));
  
  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
  
  return (secondAvg - firstAvg) / firstAvg; // Normalized trend
}

/**
 * Apply threshold adaptations
 */
export async function applyThresholdAdaptations(analyses: ThresholdAnalysis[]): Promise<number> {
  if (!isEvolutionActive() || !isSovereignActive() || analyses.length === 0) {
    return 0;
  }
  
  let applied = 0;
  
  for (const analysis of analyses) {
    // Only apply high-confidence adaptations
    if (analysis.confidence < 0.6) {
      continue;
    }
    
    try {
      // Record adaptation
      const adaptation = recordThresholdAdaptation(
        analysis.domain,
        analysis.currentThreshold,
        analysis.proposedThreshold,
        analysis.reason,
        analysis.basedOn
      );
      
      // Apply the adaptation
      updateGlobalRule(analysis.domain, analysis.proposedThreshold);
      adaptation.applied = true;
      adaptation.appliedAt = new Date().toISOString();
      
      applied++;
    } catch (error) {
      console.error(`[UOI] Failed to apply threshold adaptation ${analysis.domain}:`, error);
    }
  }
  
  return applied;
}
