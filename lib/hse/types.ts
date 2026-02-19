// HSE Types - Global state structures

export interface GlobalState {
  timestamp: string;
  subsystems: SubsystemHealth;
  vectors: StateVectors;
  anomalies: AnomalyCluster[];
  stability: StabilityMetrics;
  lastUpdated: string;
}

export interface SubsystemHealth {
  amp: HealthVector;
  workflow: HealthVector;
  compliance: HealthVector;
  notification: HealthVector;
  analytics: HealthVector;
  uoi: HealthVector;
}

export interface HealthVector {
  load: number; // 0-1
  errors: number;
  throughput: number; // items/second
  drift: number; // 0-1
  queueLength?: number;
  successRate: number; // 0-1
  latency?: number; // milliseconds
  lastUpdated: string;
}

// HSE Phase II: derived subsystem state (computed from signals, used by hyperstate builders)
export interface SubsystemState {
  health: number; // 0-1
  load: number; // 0-1
  errors: number;
  [key: string]: any;
}

export interface StateVectors {
  risk: RiskVector;
  drift: DriftVector;
  throughput: ThroughputVector;
  pressure: PressureVector;
}

export interface RiskVector {
  error_risk: number; // 0-1
  drift_risk: number; // 0-1
  capacity_risk: number; // 0-1
  compliance_risk: number; // 0-1
  aggregate_risk: number; // 0-1
  lastUpdated: string;
}

export interface DriftVector {
  schema_drift: {
    magnitude: number; // 0-1
    affectedSchemas: string[];
  };
  data_drift: {
    magnitude: number; // 0-1
    affectedData: string[];
  };
  pattern_drift: {
    magnitude: number; // 0-1
    affectedPatterns: string[];
  };
  lastUpdated: string;
}

export interface ThroughputVector {
  overall: number; // items/second
  subsystems: Record<string, number>;
  bottleneck_indicators: string[];
  lastUpdated: string;
}

export interface PressureVector {
  queue_pressure: number; // 0-1
  load_pressure: number; // 0-1
  error_pressure: number; // 0-1
  aggregate_pressure: number; // 0-1
  lastUpdated: string;
}

export interface AnomalyCluster {
  id: string;
  patterns: string[];
  severity: "low" | "medium" | "high" | "critical";
  affectedAreas: string[];
  firstSeen: string;
  lastSeen: string;
  frequency: number;
}

export interface StabilityMetrics {
  overall_stability: number; // 0-1
  subsystem_stability: Record<string, number>;
  risk_level: "low" | "medium" | "high" | "critical";
  trend: "improving" | "stable" | "degrading";
  lastUpdated: string;
}

export interface StateUpdate {
  subsystem: string;
  health: Partial<HealthVector>;
  timestamp: string;
}

export interface StateShift {
  magnitude: number; // 0-1
  direction: "improving" | "stable" | "degrading";
  affectedAreas: string[];
  timestamp: string;
}

export interface StateHistory {
  timestamp: string;
  state: GlobalState;
}
