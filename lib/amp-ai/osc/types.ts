// The Omni-Sovereign Continuum (OSC) - Type Definitions
// The unified intelligence field

export interface ContinuumField {
  id: string;
  state: "stable" | "distorted" | "harmonizing" | "expanding";
  intensity: number; // 0-1, overall field strength
  coherence: number; // 0-1, how unified the field is
  lastUpdated: string;
}

export interface Flow {
  id: string;
  source: string;
  target: string;
  data: any;
  propagation: {
    velocity: number;
    direction: string[];
    intensity: number;
    phase: number;
  };
  state: "propagating" | "resonating" | "stabilized" | "distorted";
  createdAt: string;
}

export interface Behavior {
  id: string;
  type: "adapt" | "predict" | "rewrite" | "protect" | "expand" | "balance" | "harmonize";
  instinct: string;
  trigger: {
    condition: string;
    threshold: number;
  };
  action: {
    type: string;
    intensity: number;
    duration: number;
  };
  state: "active" | "dormant" | "executing";
  lastExecuted: string;
}

export interface Attractor {
  id: string;
  name: string;
  type: "firstName-like" | "email-like" | "status-like" | "date-like" | "phone-like" | "number-like";
  strength: number; // 0-1, how strongly it attracts data
  signature: {
    patterns: string[];
    weights: number[];
  };
  state: "active" | "dormant" | "evolving";
  lastUsed: string;
}

export interface Rhythm {
  id: string;
  cycle: "dawn" | "midday" | "dusk" | "midnight";
  phase: number; // 0-1, position in cycle
  behaviors: string[]; // Behavior IDs active in this cycle
  priorities: Record<string, number>;
  optimizations: Record<string, any>;
  duration: number; // milliseconds
  nextTransition: string;
}

export interface FieldDistortion {
  id: string;
  type: "error" | "drift" | "overload" | "anomaly" | "conflict";
  location: string; // Where in the field
  magnitude: number; // 0-1, how severe
  detectedAt: string;
  stabilized: boolean;
  stabilizationActions: Array<{
    action: string;
    applied: boolean;
    result: string;
  }>;
  stabilizedAt?: string;
}

export interface Signal {
  id: string;
  type: "alert" | "warn" | "predict" | "guide" | "influence" | "harmonize";
  frequency: number; // Hz, vibration frequency
  amplitude: number; // 0-1, signal strength
  source: string;
  target: string | "field";
  payload: any;
  propagation: {
    velocity: number;
    attenuation: number;
  };
  timestamp: string;
}

export interface ContinuumMemory {
  patterns: Array<{
    id: string;
    pattern: any;
    frequency: number;
    lastSeen: string;
    effectiveness: number;
  }>;
  distortions: Array<{
    id: string;
    type: string;
    resolution: string;
    learned: boolean;
  }>;
  resolutions: Array<{
    id: string;
    distortion: string;
    action: string;
    success: boolean;
  }>;
  optimizations: Array<{
    id: string;
    optimization: string;
    impact: number;
    applied: boolean;
  }>;
  tenantSignatures: Record<string, {
    patterns: string[];
    preferences: Record<string, any>;
    rhythms: string[];
  }>;
  lastUpdated: string;
}

export interface ContinuumSovereignty {
  priorities: Array<{
    id: string;
    priority: string;
    weight: number;
    current: number;
    target: number;
  }>;
  loadBalance: Record<string, number>;
  structure: {
    flows: number;
    behaviors: number;
    attractors: number;
    rhythms: number;
  };
  integrity: {
    coherence: number;
    stability: number;
    expansion: number;
  };
  lastGoverned: string;
}

export interface ContinuumState {
  field: ContinuumField;
  flows: Flow[];
  behaviors: Behavior[];
  attractors: Attractor[];
  rhythms: Rhythm[];
  distortions: FieldDistortion[];
  signals: Signal[];
  memory: ContinuumMemory;
  sovereignty: ContinuumSovereignty;
  lastUpdated: string;
}
