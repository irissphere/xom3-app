// HSE Anomaly Detector - Detect anomaly clusters in global state

import { GlobalState, AnomalyCluster } from "./types";

/**
 * Detect anomalies in global state
 */
export function detectAnomalies(state: GlobalState): AnomalyCluster[] {
  const clusters: AnomalyCluster[] = [];
  const now = new Date().toISOString();
  
  // Detect high error rate anomalies
  Object.entries(state.subsystems).forEach(([name, health]) => {
    if (health.errors > 10 && health.throughput > 0) {
      const errorRate = health.errors / (health.throughput * 100);
      if (errorRate > 0.1) {
        clusters.push({
          id: `anomaly-${name}-errors-${Date.now()}`,
          patterns: [`high_error_rate_${name}`, `error_spike_${name}`],
          severity: errorRate > 0.3 ? "critical" : errorRate > 0.2 ? "high" : "medium",
          affectedAreas: [name],
          firstSeen: now,
          lastSeen: now,
          frequency: 1,
        });
      }
    }
  });
  
  // Detect high drift anomalies
  Object.entries(state.subsystems).forEach(([name, health]) => {
    if (health.drift > 0.7) {
      clusters.push({
        id: `anomaly-${name}-drift-${Date.now()}`,
        patterns: [`high_drift_${name}`, `schema_drift_${name}`],
        severity: health.drift > 0.9 ? "critical" : "high",
        affectedAreas: [name],
        firstSeen: now,
        lastSeen: now,
        frequency: 1,
      });
    }
  });
  
  // Detect high load anomalies
  Object.entries(state.subsystems).forEach(([name, health]) => {
    if (health.load > 0.9) {
      clusters.push({
        id: `anomaly-${name}-load-${Date.now()}`,
        patterns: [`high_load_${name}`, `capacity_pressure_${name}`],
        severity: "high",
        affectedAreas: [name],
        firstSeen: now,
        lastSeen: now,
        frequency: 1,
      });
    }
  });
  
  // Detect aggregate risk anomalies
  if (state.vectors.risk.aggregate_risk > 0.7) {
    clusters.push({
      id: `anomaly-aggregate-risk-${Date.now()}`,
      patterns: ["high_aggregate_risk", "system_instability"],
      severity: state.vectors.risk.aggregate_risk > 0.9 ? "critical" : "high",
      affectedAreas: Object.keys(state.subsystems),
      firstSeen: now,
      lastSeen: now,
      frequency: 1,
    });
  }
  
  return clusters;
}
