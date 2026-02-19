// HSE Query - Query interface for global state

import { GlobalState, HealthVector, RiskVector, DriftVector, ThroughputVector, PressureVector } from "./types";
import { getGlobalState, getStateHistory } from "./state";

/**
 * Query current global state
 */
export function queryState(): GlobalState | null {
  return getGlobalState();
}

/**
 * Query specific vector
 */
export function queryVector(vectorType: "risk" | "drift" | "throughput" | "pressure"): RiskVector | DriftVector | ThroughputVector | PressureVector | null {
  const state = getGlobalState();
  if (!state) return null;
  
  switch (vectorType) {
    case "risk":
      return state.vectors.risk;
    case "drift":
      return state.vectors.drift;
    case "throughput":
      return state.vectors.throughput;
    case "pressure":
      return state.vectors.pressure;
    default:
      return null;
  }
}

/**
 * Query subsystem health
 */
export function querySubsystemHealth(subsystem: string): HealthVector | null {
  const state = getGlobalState();
  if (!state) return null;
  
  const subsystemKey = subsystem.toLowerCase() as keyof typeof state.subsystems;
  return state.subsystems[subsystemKey] || null;
}

/**
 * Query state history
 */
export function queryHistory(startTime?: string, endTime?: string) {
  return getStateHistory(startTime, endTime);
}

/**
 * Query anomalies
 */
export function queryAnomalies(severity?: "low" | "medium" | "high" | "critical") {
  const state = getGlobalState();
  if (!state) return [];
  
  if (severity) {
    return state.anomalies.filter(a => a.severity === severity);
  }
  
  return state.anomalies;
}

/**
 * Query stability
 */
export function queryStability() {
  const state = getGlobalState();
  if (!state) return null;
  
  return state.stability;
}
