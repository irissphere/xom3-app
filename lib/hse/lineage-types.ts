// Lineage Types - Ancestral memory system types
// The cockpit's memory of who it is, where it came from, and what it is becoming

export type LineageEventType =
  | "genesis_cycle"
  | "subsystem_birth"
  | "override"
  | "crest_ritual"
  | "activation"
  | "closure"
  | "sovereign_intervention"
  | "architectural_evolution"
  | "stability_period"
  | "recovery"
  | "posture_shift"
  | "directive_issued"
  | "anomaly_detected"
  | "pattern_discovered";

export type LineageMarkType =
  | "genesis_mark"
  | "override_mark"
  | "stability_mark"
  | "recovery_mark"
  | "evolution_mark"
  | "ritual_mark";

export type LineageGlyphType =
  | "creation_glyph"
  | "sovereign_glyph"
  | "stability_glyph"
  | "recovery_glyph"
  | "expansion_glyph"
  | "intervention_glyph"
  | "ritual_glyph";

export type LineageRitualType =
  | "genesis_bloom"
  | "sovereign_flash"
  | "stability_breath"
  | "recovery_spiral"
  | "evolution_pulse";

export interface LineageEvent {
  id: string;
  type: LineageEventType;
  timestamp: string;
  subsystem?: string;
  operator?: string;
  metadata: Record<string, any>;
  mark?: LineageMarkType;
  glyph?: LineageGlyphType;
  ritual?: LineageRitualType;
}

export interface LineageMark {
  id: string;
  type: LineageMarkType;
  timestamp: string;
  intensity: number; // 0-1
  position: {
    ring: "inner" | "middle" | "outer";
    angle: number; // 0-360 degrees
  };
  persistent: boolean; // true = permanent, false = temporary
  eventId: string;
}

export interface LineageThread {
  subsystem: string;
  birthMoment: string;
  events: LineageEvent[];
  metrics: {
    totalEvents: number;
    anomalies: number;
    recoveries: number;
    postureShifts: number;
    interventions: number;
    stabilityStreaks: number;
  };
  currentState: {
    health: number;
    stability: number;
    lastAnomaly?: string;
    lastRecovery?: string;
    longestStabilityStreak: number; // seconds
  };
}

export interface LineageGlyph {
  id: string;
  type: LineageGlyphType;
  timestamp: string;
  operator: string;
  context: string;
  intensity: number; // 0-1
  eventId: string;
}

export interface LineageLedger {
  activatedAt: string;
  events: LineageEvent[];
  marks: LineageMark[];
  threads: Record<string, LineageThread>;
  glyphs: LineageGlyph[];
  crestState: {
    innerRing: LineageMark[];
    middleRing: LineageMark[];
    outerRing: LineageMark[];
    currentRitual?: LineageRitualType;
    ritualActiveUntil?: string;
  };
  statistics: {
    totalEvents: number;
    totalGenesisCycles: number;
    totalOverrides: number;
    totalRituals: number;
    totalInterventions: number;
    longestStabilityPeriod: number; // seconds
    currentStabilityStreak: number; // seconds
  };
}

export interface LineageState {
  ledger: LineageLedger;
  active: boolean;
  lastUpdated: string;
}
