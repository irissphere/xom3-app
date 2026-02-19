// Inheritance Types - Generational Intelligence System
// The cockpit's memory of you, your patterns, and how subsystems evolve

export interface OperatorSignature {
  operator: string;
  activatedAt: string;
  lastUpdated: string;
  
  // Decision Style
  decisionStyle: {
    overrideFrequency: number; // 0-1, how often operator overrides
    genesisCadence: number; // Average time between genesis cycles (seconds)
    stabilityPreference: number; // 0-1, preference for stability vs. expansion
    riskTolerance: number; // 0-1, 0 = very cautious, 1 = very aggressive
    directiveAggressiveness: number; // 0-1, how aggressive directives are
    anomalySensitivity: number; // 0-1, how sensitive to anomalies
  };
  
  // Pattern Tracking
  patterns: {
    directivePatterns: DirectivePattern[];
    overridePatterns: OverridePattern[];
    anomalyResponsePatterns: AnomalyResponsePattern[];
    postureTransitionPatterns: PostureTransitionPattern[];
    ritualTimingPatterns: RitualTimingPattern[];
    crestInteractionPatterns: CrestInteractionPattern[];
  };
  
  // Statistics
  statistics: {
    totalDecisions: number;
    totalOverrides: number;
    totalGenesisCycles: number;
    totalDirectives: number;
    totalAnomalies: number;
    averageResponseTime: number; // milliseconds
    preferredPosture: "normal" | "protective" | "aggressive" | "recovery";
    mostCommonDirective: string;
  };
}

export interface DirectivePattern {
  id: string;
  type: string;
  context: string;
  frequency: number;
  effectiveness: number;
  lastUsed: string;
  createdAt: string;
}

export interface OverridePattern {
  id: string;
  subsystem: string;
  reason: string;
  frequency: number;
  timing: number; // Average time into session (seconds)
  lastUsed: string;
  createdAt: string;
}

export interface AnomalyResponsePattern {
  id: string;
  anomalyType: string;
  response: string;
  responseTime: number; // milliseconds
  frequency: number;
  effectiveness: number;
  lastUsed: string;
  createdAt: string;
}

export interface PostureTransitionPattern {
  id: string;
  from: string;
  to: string;
  trigger: string;
  frequency: number;
  timing: number; // Average time into session (seconds)
  lastUsed: string;
  createdAt: string;
}

export interface RitualTimingPattern {
  id: string;
  ritualType: string;
  timeOfDay: string; // "morning" | "midday" | "evening" | "night"
  frequency: number;
  lastUsed: string;
  createdAt: string;
}

export interface CrestInteractionPattern {
  id: string;
  interactionType: string; // "view" | "trigger" | "modify"
  frequency: number;
  timing: number;
  lastUsed: string;
  createdAt: string;
}

export interface SubsystemTrait {
  id: string;
  subsystem: string;
  traitType: "behavior" | "threshold" | "stability" | "directive" | "anomaly" | "risk";
  name: string;
  value: number | string | boolean;
  inheritedFrom?: string; // Subsystem ID that this trait came from
  strength: number; // 0-1, how strongly this trait is expressed
  createdAt: string;
  lastUpdated: string;
}

export interface SubsystemInheritance {
  subsystem: string;
  birthMoment: string;
  parentSubsystems: string[]; // Subsystems this one inherited from
  inheritedTraits: SubsystemTrait[];
  geneticProfile: {
    stabilityCurve: number[]; // Historical stability values
    riskThreshold: number;
    directiveTendency: string;
    anomalyResponseStyle: string;
    throughputProfile: number[]; // Historical throughput
    driftProfile: number[]; // Historical drift
  };
  evolution: {
    generation: number;
    mutations: number;
    adaptations: number;
    lastEvolution: string;
  };
}

export interface CrestLineageMemory {
  operatorGlyphs: string[]; // Glyph IDs from operator
  subsystemBirthMarks: string[]; // Mark IDs from subsystem births
  overrideFlashes: string[]; // Mark IDs from overrides
  recoverySpirals: string[]; // Mark IDs from recoveries
  stabilityBreaths: string[]; // Mark IDs from stability periods
  genesisBlooms: string[]; // Mark IDs from genesis cycles
  architecturalStyles: ArchitecturalStyle[];
  generationalDepth: number;
  lastTransmission: string;
}

export interface ArchitecturalStyle {
  id: string;
  operator: string;
  style: {
    directiveStyle: string;
    thresholdStyle: string;
    responseStyle: string;
    communicationStyle: string;
  };
  encodedAt: string;
  transmittedTo: string[]; // Subsystem IDs this style was transmitted to
}

export interface InheritanceState {
  active: boolean;
  activatedAt: string;
  lastUpdated: string;
  operatorSignatures: Record<string, OperatorSignature>;
  subsystemInheritances: Record<string, SubsystemInheritance>;
  crestLineage: CrestLineageMemory;
  statistics: {
    totalSignatures: number;
    totalInheritances: number;
    totalTransmissions: number;
    averageGenerationalDepth: number;
  };
}
