// Lineage Mode - Ancestral Memory System
// The cockpit remembers who it is, where it came from, and what it is becoming

import {
  LineageEvent,
  LineageEventType,
  LineageLedger,
  LineageMark,
  LineageMarkType,
  LineageThread,
  LineageGlyph,
  LineageGlyphType,
  LineageRitualType,
  LineageState,
} from "./lineage-types";
import {
  isInheritanceModeActive,
  updateCrestLineageMemory,
} from "./inheritance";

// Global lineage ledger singleton
let lineageLedger: LineageLedger | null = null;
let lineageActive = false;

/**
 * Initialize Lineage Mode
 */
export function initializeLineageMode(): LineageLedger {
  const now = new Date().toISOString();
  
  lineageLedger = {
    activatedAt: now,
    events: [],
    marks: [],
    threads: {},
    glyphs: [],
    crestState: {
      innerRing: [],
      middleRing: [],
      outerRing: [],
    },
    statistics: {
      totalEvents: 0,
      totalGenesisCycles: 0,
      totalOverrides: 0,
      totalRituals: 0,
      totalInterventions: 0,
      longestStabilityPeriod: 0,
      currentStabilityStreak: 0,
    },
  };
  
  lineageActive = true;
  
  // Record the activation event
  recordLineageEvent({
    type: "activation",
    metadata: { mode: "lineage", message: "Lineage Mode activated. The cockpit remembers." },
  });
  
  return lineageLedger;
}

/**
 * Record a lineage event
 */
export function recordLineageEvent(event: {
  type: LineageEventType;
  subsystem?: string;
  operator?: string;
  metadata?: Record<string, any>;
}): LineageEvent {
  if (!lineageLedger) {
    initializeLineageMode();
  }
  
  const lineageEvent: LineageEvent = {
    id: `lineage-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: event.type,
    timestamp: new Date().toISOString(),
    subsystem: event.subsystem,
    operator: event.operator || "system",
    metadata: event.metadata || {},
  };
  
  // Determine mark, glyph, and ritual based on event type
  const { mark, glyph, ritual } = determineLineageSymbols(event.type);
  lineageEvent.mark = mark;
  lineageEvent.glyph = glyph;
  lineageEvent.ritual = ritual;
  
  lineageLedger!.events.push(lineageEvent);
  lineageLedger!.statistics.totalEvents++;
  
  // Update statistics based on event type
  updateStatistics(event.type);
  
  // Create mark if applicable
  let createdMark: LineageMark | null = null;
  if (mark) {
    createdMark = createLineageMark(mark, lineageEvent.id);
  }
  
  // Create glyph if applicable
  if (glyph) {
    createLineageGlyph(glyph, lineageEvent.id, event.operator || "system", event.metadata?.context || "");
  }
  
  // Trigger ritual if applicable
  if (ritual) {
    triggerLineageRitual(ritual);
  }
  
  // Update subsystem thread
  if (event.subsystem) {
    updateSubsystemThread(event.subsystem, lineageEvent);
  }
  
  // INHERITANCE MODE: Update crest lineage memory
  if (isInheritanceModeActive()) {
    const updates: any = {};
    
    if (glyph && event.operator && event.operator !== "system") {
      updates.operatorGlyphs = [lineageEvent.id];
    }
    
    if (createdMark) {
      switch (event.type) {
        case "subsystem_birth":
          updates.subsystemBirthMarks = [createdMark.id];
          break;
        case "override":
        case "sovereign_intervention":
          updates.overrideFlashes = [createdMark.id];
          break;
        case "recovery":
          updates.recoverySpirals = [createdMark.id];
          break;
        case "stability_period":
          updates.stabilityBreaths = [createdMark.id];
          break;
        case "genesis_cycle":
          updates.genesisBlooms = [createdMark.id];
          break;
      }
    }
    
    if (Object.keys(updates).length > 0) {
      updateCrestLineageMemory(updates);
    }
  }
  
  return lineageEvent;
}

/**
 * Determine lineage symbols based on event type
 */
function determineLineageSymbols(
  eventType: LineageEventType
): {
  mark?: LineageMarkType;
  glyph?: LineageGlyphType;
  ritual?: LineageRitualType;
} {
  switch (eventType) {
    case "genesis_cycle":
      return {
        mark: "genesis_mark",
        glyph: "expansion_glyph",
        ritual: "genesis_bloom",
      };
    case "subsystem_birth":
      return {
        mark: "genesis_mark",
        glyph: "creation_glyph",
      };
    case "override":
      return {
        mark: "override_mark",
        glyph: "sovereign_glyph",
        ritual: "sovereign_flash",
      };
    case "sovereign_intervention":
      return {
        mark: "override_mark",
        glyph: "intervention_glyph",
        ritual: "sovereign_flash",
      };
    case "stability_period":
      return {
        mark: "stability_mark",
        glyph: "stability_glyph",
        ritual: "stability_breath",
      };
    case "recovery":
      return {
        mark: "recovery_mark",
        glyph: "recovery_glyph",
        ritual: "recovery_spiral",
      };
    case "architectural_evolution":
      return {
        mark: "evolution_mark",
        glyph: "expansion_glyph",
        ritual: "evolution_pulse",
      };
    case "crest_ritual":
      return {
        mark: "ritual_mark",
        glyph: "ritual_glyph",
      };
    default:
      return {};
  }
}

/**
 * Create a lineage mark on the crest
 */
function createLineageMark(type: LineageMarkType, eventId: string): LineageMark {
  if (!lineageLedger) return null as any;
  
  const mark: LineageMark = {
    id: `mark-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    timestamp: new Date().toISOString(),
    intensity: getMarkIntensity(type),
    position: {
      ring: getMarkRing(type),
      angle: Math.random() * 360,
    },
    persistent: isMarkPersistent(type),
    eventId,
  };
  
  lineageLedger.marks.push(mark);
  
  // Add to crest state
  const ringKey = `${mark.position.ring}Ring` as keyof typeof lineageLedger.crestState;
  if (Array.isArray(lineageLedger.crestState[ringKey])) {
    (lineageLedger.crestState[ringKey] as LineageMark[]).push(mark);
  }
  
  return mark;
}

/**
 * Get mark intensity based on type
 */
function getMarkIntensity(type: LineageMarkType): number {
  switch (type) {
    case "genesis_mark":
      return 0.8;
    case "override_mark":
      return 1.0; // Sharp and visible
    case "stability_mark":
      return 0.4; // Soft glow
    case "recovery_mark":
      return 0.6;
    case "evolution_mark":
      return 0.7;
    case "ritual_mark":
      return 0.5;
    default:
      return 0.5;
  }
}

/**
 * Get mark ring position
 */
function getMarkRing(type: LineageMarkType): "inner" | "middle" | "outer" {
  switch (type) {
    case "genesis_mark":
      return "inner";
    case "override_mark":
      return "outer"; // Sharp, visible
    case "stability_mark":
      return "middle"; // Soft radial glow
    case "recovery_mark":
      return "inner"; // Inward pulse
    case "evolution_mark":
      return "middle";
    case "ritual_mark":
      return "outer";
    default:
      return "middle";
  }
}

/**
 * Check if mark is persistent
 */
function isMarkPersistent(type: LineageMarkType): boolean {
  switch (type) {
    case "genesis_mark":
    case "stability_mark":
    case "evolution_mark":
      return true; // Permanent
    case "override_mark":
    case "recovery_mark":
    case "ritual_mark":
      return false; // Temporary
    default:
      return false;
  }
}

/**
 * Create a lineage glyph
 */
function createLineageGlyph(
  type: LineageGlyphType,
  eventId: string,
  operator: string,
  context: string
): LineageGlyph {
  if (!lineageLedger) return null as any;
  
  const glyph: LineageGlyph = {
    id: `glyph-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    timestamp: new Date().toISOString(),
    operator,
    context,
    intensity: getGlyphIntensity(type),
    eventId,
  };
  
  lineageLedger.glyphs.push(glyph);
  
  return glyph;
}

/**
 * Get glyph intensity
 */
function getGlyphIntensity(type: LineageGlyphType): number {
  switch (type) {
    case "creation_glyph":
    case "sovereign_glyph":
    case "intervention_glyph":
      return 1.0;
    case "stability_glyph":
      return 0.6;
    case "recovery_glyph":
      return 0.8;
    case "expansion_glyph":
      return 0.9;
    case "ritual_glyph":
      return 0.7;
    default:
      return 0.5;
  }
}

/**
 * Trigger a lineage ritual (crest animation)
 */
function triggerLineageRitual(ritual: LineageRitualType): void {
  if (!lineageLedger) return;
  
  lineageLedger.crestState.currentRitual = ritual;
  lineageLedger.crestState.ritualActiveUntil = new Date(
    Date.now() + getRitualDuration(ritual)
  ).toISOString();
}

/**
 * Get ritual duration in milliseconds
 */
function getRitualDuration(ritual: LineageRitualType): number {
  switch (ritual) {
    case "genesis_bloom":
      return 2000; // 2 seconds
    case "sovereign_flash":
      return 500; // 0.5 seconds
    case "stability_breath":
      return 5000; // 5 seconds (slow breathing)
    case "recovery_spiral":
      return 3000; // 3 seconds
    case "evolution_pulse":
      return 1500; // 1.5 seconds
    default:
      return 1000;
  }
}

/**
 * Update subsystem thread
 */
function updateSubsystemThread(subsystem: string, event: LineageEvent): void {
  if (!lineageLedger) return;
  
  if (!lineageLedger.threads[subsystem]) {
    // Create new thread
    lineageLedger.threads[subsystem] = {
      subsystem,
      birthMoment: event.timestamp,
      events: [],
      metrics: {
        totalEvents: 0,
        anomalies: 0,
        recoveries: 0,
        postureShifts: 0,
        interventions: 0,
        stabilityStreaks: 0,
      },
      currentState: {
        health: 1.0,
        stability: 1.0,
        longestStabilityStreak: 0,
      },
    };
  }
  
  const thread = lineageLedger.threads[subsystem];
  thread.events.push(event);
  thread.metrics.totalEvents++;
  
  // Update metrics based on event type
  switch (event.type) {
    case "anomaly_detected":
      thread.metrics.anomalies++;
      thread.currentState.lastAnomaly = event.timestamp;
      break;
    case "recovery":
      thread.metrics.recoveries++;
      thread.currentState.lastRecovery = event.timestamp;
      break;
    case "posture_shift":
      thread.metrics.postureShifts++;
      break;
    case "sovereign_intervention":
      thread.metrics.interventions++;
      break;
    case "stability_period":
      thread.metrics.stabilityStreaks++;
      break;
  }
}

/**
 * Update statistics
 */
function updateStatistics(eventType: LineageEventType): void {
  if (!lineageLedger) return;
  
  switch (eventType) {
    case "genesis_cycle":
      lineageLedger.statistics.totalGenesisCycles++;
      break;
    case "override":
    case "sovereign_intervention":
      lineageLedger.statistics.totalOverrides++;
      break;
    case "crest_ritual":
      lineageLedger.statistics.totalRituals++;
      break;
    case "sovereign_intervention":
      lineageLedger.statistics.totalInterventions++;
      break;
  }
}

/**
 * Get lineage state
 */
export function getLineageState(): LineageState | null {
  if (!lineageLedger || !lineageActive) {
    return null;
  }
  
  // Check if ritual has expired
  if (
    lineageLedger.crestState.ritualActiveUntil &&
    new Date(lineageLedger.crestState.ritualActiveUntil) < new Date()
  ) {
    lineageLedger.crestState.currentRitual = undefined;
    lineageLedger.crestState.ritualActiveUntil = undefined;
  }
  
  return {
    ledger: { ...lineageLedger },
    active: lineageActive,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Check if lineage mode is active
 */
export function isLineageModeActive(): boolean {
  return lineageActive && lineageLedger !== null;
}

/**
 * Record genesis cycle
 */
export function recordGenesisCycle(metadata?: Record<string, any>): LineageEvent {
  return recordLineageEvent({
    type: "genesis_cycle",
    metadata: { ...metadata, message: "New genesis cycle initiated" },
  });
}

/**
 * Record subsystem birth
 */
export function recordSubsystemBirth(subsystem: string, metadata?: Record<string, any>): LineageEvent {
  return recordLineageEvent({
    type: "subsystem_birth",
    subsystem,
    metadata: { ...metadata, message: `Subsystem ${subsystem} born` },
  });
}

/**
 * Record override
 */
export function recordOverride(operator: string, subsystem: string, metadata?: Record<string, any>): LineageEvent {
  return recordLineageEvent({
    type: "override",
    operator,
    subsystem,
    metadata: { ...metadata, message: `Sovereign override by ${operator}` },
  });
}

/**
 * Record stability period
 */
export function recordStabilityPeriod(durationSeconds: number, metadata?: Record<string, any>): LineageEvent {
  if (!lineageLedger) {
    initializeLineageMode();
  }
  
  lineageLedger!.statistics.currentStabilityStreak = durationSeconds;
  if (durationSeconds > lineageLedger!.statistics.longestStabilityPeriod) {
    lineageLedger!.statistics.longestStabilityPeriod = durationSeconds;
  }
  
  return recordLineageEvent({
    type: "stability_period",
    metadata: { ...metadata, durationSeconds, message: `Stability maintained for ${durationSeconds}s` },
  });
}

/**
 * Record recovery
 */
export function recordRecovery(subsystem: string, metadata?: Record<string, any>): LineageEvent {
  return recordLineageEvent({
    type: "recovery",
    subsystem,
    metadata: { ...metadata, message: `Recovery from instability` },
  });
}

/**
 * Get lineage threads for all subsystems
 */
export function getLineageThreads(): Record<string, LineageThread> {
  if (!lineageLedger) {
    return {};
  }
  return { ...lineageLedger.threads };
}

/**
 * Get lineage glyphs for an operator
 */
export function getOperatorGlyphs(operator: string): LineageGlyph[] {
  if (!lineageLedger) {
    return [];
  }
  return lineageLedger.glyphs.filter(g => g.operator === operator);
}
