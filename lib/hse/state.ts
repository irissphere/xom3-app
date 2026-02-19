// HSE State - Global state storage and management

import { GlobalState, StateHistory } from "./types";

// Global state singleton
let globalState: GlobalState | null = null;

// State history (rolling 24h window)
const stateHistory: StateHistory[] = [];
const HISTORY_RETENTION_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Initialize global state
 */
export function initializeGlobalState(): GlobalState {
  const now = new Date().toISOString();
  
  globalState = {
    timestamp: now,
    subsystems: {
      amp: {
        load: 0,
        errors: 0,
        throughput: 0,
        drift: 0,
        successRate: 1.0,
        lastUpdated: now,
      },
      workflow: {
        load: 0,
        errors: 0,
        throughput: 0,
        drift: 0,
        queueLength: 0,
        successRate: 1.0,
        latency: 0,
        lastUpdated: now,
      },
      compliance: {
        load: 0,
        errors: 0,
        throughput: 0,
        drift: 0,
        successRate: 1.0,
        lastUpdated: now,
      },
      notification: {
        load: 0,
        errors: 0,
        throughput: 0,
        drift: 0,
        successRate: 1.0,
        latency: 0,
        lastUpdated: now,
      },
      analytics: {
        load: 0,
        errors: 0,
        throughput: 0,
        drift: 0,
        successRate: 1.0,
        latency: 0,
        lastUpdated: now,
      },
      uoi: {
        load: 0,
        errors: 0,
        throughput: 0,
        drift: 0,
        successRate: 1.0,
        lastUpdated: now,
      },
    },
    vectors: {
      risk: {
        error_risk: 0,
        drift_risk: 0,
        capacity_risk: 0,
        compliance_risk: 0,
        aggregate_risk: 0,
        lastUpdated: now,
      },
      drift: {
        schema_drift: { magnitude: 0, affectedSchemas: [] },
        data_drift: { magnitude: 0, affectedData: [] },
        pattern_drift: { magnitude: 0, affectedPatterns: [] },
        lastUpdated: now,
      },
      throughput: {
        overall: 0,
        subsystems: {},
        bottleneck_indicators: [],
        lastUpdated: now,
      },
      pressure: {
        queue_pressure: 0,
        load_pressure: 0,
        error_pressure: 0,
        aggregate_pressure: 0,
        lastUpdated: now,
      },
    },
    anomalies: [],
    stability: {
      overall_stability: 1.0,
      subsystem_stability: {},
      risk_level: "low",
      trend: "stable",
      lastUpdated: now,
    },
    lastUpdated: now,
  };
  
  return globalState;
}

/**
 * Get current global state
 */
export function getGlobalState(): GlobalState | null {
  return globalState ? { ...globalState } : null;
}

/**
 * Update global state
 */
export function updateGlobalState(updater: (state: GlobalState) => GlobalState): GlobalState {
  if (!globalState) {
    globalState = initializeGlobalState();
  }
  
  globalState = updater(globalState);
  globalState.lastUpdated = new Date().toISOString();
  
  // Store in history
  stateHistory.push({
    timestamp: globalState.lastUpdated,
    state: { ...globalState },
  });
  
  // Trim history to 24h window
  const cutoff = Date.now() - HISTORY_RETENTION_MS;
  while (stateHistory.length > 0 && new Date(stateHistory[0].timestamp).getTime() < cutoff) {
    stateHistory.shift();
  }
  
  return globalState;
}

/**
 * Get state history
 */
export function getStateHistory(startTime?: string, endTime?: string): StateHistory[] {
  if (!startTime && !endTime) {
    return [...stateHistory];
  }
  
  const start = startTime ? new Date(startTime).getTime() : 0;
  const end = endTime ? new Date(endTime).getTime() : Date.now();
  
  return stateHistory.filter(h => {
    const time = new Date(h.timestamp).getTime();
    return time >= start && time <= end;
  });
}

/**
 * Check if HSE is initialized
 */
export function isHSEInitialized(): boolean {
  return globalState !== null;
}
