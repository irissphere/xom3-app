// HSE Synthesizer - Core state synthesis engine

import { GlobalState, StateUpdate, SubsystemHealth, StateVectors, StabilityMetrics } from "./types";
import { getGlobalState, updateGlobalState, initializeGlobalState, isHSEInitialized } from "./state";
import { computeRiskVector, computeDriftVector, computeThroughputVector, computePressureVector } from "./vectors";
import { detectAnomalies } from "./anomaly-detector";

/**
 * Synthesize global state from subsystem updates
 */
export function synthesizeGlobalState(updates: StateUpdate[]): GlobalState {
  if (!isHSEInitialized()) {
    initializeGlobalState();
  }
  
  return updateGlobalState((state) => {
    const now = new Date().toISOString();
    
    // Update subsystem health from updates
    updates.forEach(update => {
      const subsystem = update.subsystem.toLowerCase();
      if (state.subsystems[subsystem as keyof SubsystemHealth]) {
        Object.assign(state.subsystems[subsystem as keyof SubsystemHealth], {
          ...state.subsystems[subsystem as keyof SubsystemHealth],
          ...update.health,
          lastUpdated: now,
        });
      }
    });
    
    // Recompute vectors
    state.vectors.risk = computeRiskVector(state.subsystems);
    state.vectors.drift = computeDriftVector(state.subsystems);
    state.vectors.throughput = computeThroughputVector(state.subsystems);
    state.vectors.pressure = computePressureVector(state.subsystems);
    
    // Detect anomalies
    state.anomalies = detectAnomalies(state);
    
    // Compute stability
    state.stability = computeStability(state);
    
    state.timestamp = now;
    
    return state;
  });
}

/**
 * Update state with single subsystem update
 */
export function updateState(subsystem: string, health: Partial<SubsystemHealth[keyof SubsystemHealth]>): GlobalState {
  return synthesizeGlobalState([{
    subsystem,
    health,
    timestamp: new Date().toISOString(),
  }]);
}

/**
 * Compute stability metrics
 */
function computeStability(state: GlobalState): StabilityMetrics {
  const now = new Date().toISOString();
  
  // Compute subsystem stability scores
  const subsystemStability: Record<string, number> = {};
  let totalStability = 0;
  let subsystemCount = 0;
  
  Object.entries(state.subsystems).forEach(([name, health]) => {
    // Stability = weighted combination of success rate, inverse error rate, and inverse load
    const errorFactor = Math.max(0, 1 - (health.errors / 100)); // Normalize errors
    const loadFactor = Math.max(0, 1 - health.load); // Lower load = more stable
    const successFactor = health.successRate;
    
    const stability = (successFactor * 0.5 + errorFactor * 0.3 + loadFactor * 0.2);
    subsystemStability[name] = stability;
    totalStability += stability;
    subsystemCount++;
  });
  
  const overallStability = subsystemCount > 0 ? totalStability / subsystemCount : 1.0;
  
  // Determine risk level
  const aggregateRisk = state.vectors.risk.aggregate_risk;
  let riskLevel: "low" | "medium" | "high" | "critical" = "low";
  if (aggregateRisk > 0.7) riskLevel = "critical";
  else if (aggregateRisk > 0.5) riskLevel = "high";
  else if (aggregateRisk > 0.3) riskLevel = "medium";
  
  // Determine trend (simplified - would compare with history in real implementation)
  const trend: "improving" | "stable" | "degrading" = 
    aggregateRisk < 0.2 ? "improving" :
    aggregateRisk > 0.6 ? "degrading" :
    "stable";
  
  return {
    overall_stability: overallStability,
    subsystem_stability: subsystemStability,
    risk_level: riskLevel,
    trend,
    lastUpdated: now,
  };
}
