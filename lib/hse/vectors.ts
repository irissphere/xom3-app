// HSE Vectors - Compute state vectors from subsystem health

import { SubsystemHealth, RiskVector, DriftVector, ThroughputVector, PressureVector } from "./types";

/**
 * Compute risk vector from subsystem health
 */
export function computeRiskVector(subsystems: SubsystemHealth): RiskVector {
  const now = new Date().toISOString();
  
  // Error risk: based on error rates across subsystems
  const errorRates = Object.values(subsystems).map(s => s.errors / Math.max(1, s.throughput * 100));
  const error_risk = Math.min(1, errorRates.reduce((a, b) => a + b, 0) / errorRates.length);
  
  // Drift risk: based on drift levels
  const driftLevels = Object.values(subsystems).map(s => s.drift);
  const drift_risk = Math.min(1, driftLevels.reduce((a, b) => a + b, 0) / driftLevels.length);
  
  // Capacity risk: based on load levels
  const loadLevels = Object.values(subsystems).map(s => s.load);
  const capacity_risk = Math.min(1, loadLevels.reduce((a, b) => a + b, 0) / loadLevels.length);
  
  // Compliance risk: simplified (would use compliance subsystem data)
  const compliance_risk = 0; // Placeholder
  
  // Aggregate risk: weighted combination
  const aggregate_risk = (
    error_risk * 0.4 +
    drift_risk * 0.3 +
    capacity_risk * 0.2 +
    compliance_risk * 0.1
  );
  
  return {
    error_risk,
    drift_risk,
    capacity_risk,
    compliance_risk,
    aggregate_risk,
    lastUpdated: now,
  };
}

/**
 * Compute drift vector from subsystem health
 */
export function computeDriftVector(subsystems: SubsystemHealth): DriftVector {
  const now = new Date().toISOString();
  
  // Aggregate drift from all subsystems
  const driftLevels = Object.entries(subsystems).map(([name, health]) => ({
    subsystem: name,
    drift: health.drift,
  }));
  
  const maxDrift = Math.max(...driftLevels.map(d => d.drift));
  const highDriftSubsystems = driftLevels
    .filter(d => d.drift > 0.5)
    .map(d => d.subsystem);
  
  return {
    schema_drift: {
      magnitude: maxDrift,
      affectedSchemas: highDriftSubsystems,
    },
    data_drift: {
      magnitude: maxDrift * 0.8, // Simplified
      affectedData: highDriftSubsystems,
    },
    pattern_drift: {
      magnitude: maxDrift * 0.6, // Simplified
      affectedPatterns: highDriftSubsystems,
    },
    lastUpdated: now,
  };
}

/**
 * Compute throughput vector from subsystem health
 */
export function computeThroughputVector(subsystems: SubsystemHealth): ThroughputVector {
  const now = new Date().toISOString();
  
  const subsystemThroughput: Record<string, number> = {};
  let totalThroughput = 0;
  const bottleneckIndicators: string[] = [];
  
  Object.entries(subsystems).forEach(([name, health]) => {
    subsystemThroughput[name] = health.throughput;
    totalThroughput += health.throughput;
    
    // Detect bottlenecks (high load + low throughput)
    if (health.load > 0.8 && health.throughput < 10) {
      bottleneckIndicators.push(name);
    }
  });
  
  return {
    overall: totalThroughput,
    subsystems: subsystemThroughput,
    bottleneck_indicators: bottleneckIndicators,
    lastUpdated: now,
  };
}

/**
 * Compute pressure vector from subsystem health
 */
export function computePressureVector(subsystems: SubsystemHealth): PressureVector {
  const now = new Date().toISOString();
  
  // Queue pressure: based on queue lengths (if available)
  const queueLengths = Object.values(subsystems)
    .map(s => s.queueLength || 0)
    .filter(q => q > 0);
  const maxQueue = queueLengths.length > 0 ? Math.max(...queueLengths) : 0;
  const queue_pressure = Math.min(1, maxQueue / 100); // Normalize to 0-1
  
  // Load pressure: based on load levels
  const loadLevels = Object.values(subsystems).map(s => s.load);
  const load_pressure = loadLevels.reduce((a, b) => a + b, 0) / loadLevels.length;
  
  // Error pressure: based on error rates
  const errorRates = Object.values(subsystems).map(s => s.errors / Math.max(1, s.throughput * 100));
  const error_pressure = Math.min(1, errorRates.reduce((a, b) => a + b, 0) / errorRates.length);
  
  // Aggregate pressure: weighted combination
  const aggregate_pressure = (
    queue_pressure * 0.3 +
    load_pressure * 0.4 +
    error_pressure * 0.3
  );
  
  return {
    queue_pressure,
    load_pressure,
    error_pressure,
    aggregate_pressure,
    lastUpdated: now,
  };
}
