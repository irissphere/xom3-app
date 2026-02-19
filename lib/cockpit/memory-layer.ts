// Unified Cockpit - Memory Layer (STRIKE 9)
// The continuity engine that allows the cockpit to remember and evolve
// AKV: Clean, surgical, zero drift

import {
  CockpitView,
  CockpitSignal,
  CockpitDecision,
} from "./types";
import { cockpitStateEngine } from "./state-engine";
import { cockpitRitualLayer } from "./ritual-layer";

/**
 * Memory System Types
 * The 5 memory organs of the cockpit
 */
export type MemorySystemType =
  | "operator" // Personal memory
  | "system" // Operational memory
  | "engine" // Engine-level memory
  | "ritual" // Rhythm memory
  | "legacy"; // Mythic memory

/**
 * Memory Entry
 */
export interface MemoryEntry {
  id: string;
  system: MemorySystemType;
  type: string;
  data: Record<string, any>;
  frequency: number;
  effectiveness: number;
  firstSeen: string;
  lastSeen: string;
  tags: string[];
  context?: Record<string, any>;
}

/**
 * Operator Memory System
 * Remembers: working style, preferred flows, pressure patterns, ritual timing, decision tendencies
 */
export class OperatorMemorySystem {
  public memories: Map<string, MemoryEntry> = new Map();

  /**
   * Remember operator preference
   */
  rememberPreference(
    type: "working_style" | "preferred_flow" | "pressure_pattern" | "ritual_timing" | "decision_tendency",
    data: Record<string, any>,
    effectiveness: number = 0.5
  ): MemoryEntry {
    const key = `operator-${type}-${JSON.stringify(data)}`;
    const existing = this.memories.get(key);

    if (existing) {
      existing.frequency++;
      existing.lastSeen = new Date().toISOString();
      existing.effectiveness = (existing.effectiveness + effectiveness) / 2;
      return existing;
    }

    const entry: MemoryEntry = {
      id: `memory-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      system: "operator",
      type,
      data,
      frequency: 1,
      effectiveness,
      firstSeen: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      tags: [type],
    };

    this.memories.set(key, entry);
    return entry;
  }

  /**
   * Recall operator preference
   */
  recallPreference(type: string, context?: Record<string, any>): MemoryEntry | null {
    // Find most relevant memory
    let bestMatch: MemoryEntry | null = null;
    let bestScore = 0;

    this.memories.forEach((entry) => {
      if (entry.type === type) {
        const score = entry.frequency * entry.effectiveness;
        if (score > bestScore) {
          bestScore = score;
          bestMatch = entry;
        }
      }
    });

    return bestMatch;
  }

  /**
   * Get operator profile
   */
  getOperatorProfile(): {
    workingStyle: MemoryEntry[];
    preferredFlows: MemoryEntry[];
    pressurePatterns: MemoryEntry[];
    ritualTiming: MemoryEntry[];
    decisionTendencies: MemoryEntry[];
  } {
    return {
      workingStyle: Array.from(this.memories.values()).filter((m) => m.type === "working_style"),
      preferredFlows: Array.from(this.memories.values()).filter((m) => m.type === "preferred_flow"),
      pressurePatterns: Array.from(this.memories.values()).filter((m) => m.type === "pressure_pattern"),
      ritualTiming: Array.from(this.memories.values()).filter((m) => m.type === "ritual_timing"),
      decisionTendencies: Array.from(this.memories.values()).filter((m) => m.type === "decision_tendency"),
    };
  }
}

/**
 * System Memory System
 * Remembers: past anomalies, past surges, past failures, past optimizations, past scaling events
 */
export class SystemMemorySystem {
  public memories: Map<string, MemoryEntry> = new Map();

  /**
   * Remember system event
   */
  rememberEvent(
    type: "anomaly" | "surge" | "failure" | "optimization" | "scaling",
    data: Record<string, any>,
    effectiveness: number = 0.5
  ): MemoryEntry {
    const key = `system-${type}-${JSON.stringify(data)}`;
    const existing = this.memories.get(key);

    if (existing) {
      existing.frequency++;
      existing.lastSeen = new Date().toISOString();
      existing.effectiveness = (existing.effectiveness + effectiveness) / 2;
      return existing;
    }

    const entry: MemoryEntry = {
      id: `memory-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      system: "system",
      type,
      data,
      frequency: 1,
      effectiveness,
      firstSeen: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      tags: [type],
    };

    this.memories.set(key, entry);
    return entry;
  }

  /**
   * Recall similar event
   */
  recallSimilarEvent(type: string, context: Record<string, any>): MemoryEntry[] {
    const matches: MemoryEntry[] = [];

    this.memories.forEach((entry) => {
      if (entry.type === type) {
        // Simple similarity check
        const similarity = this.calculateSimilarity(entry.data, context);
        if (similarity > 0.5) {
          matches.push(entry);
        }
      }
    });

    return matches.sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * Predict future issue
   */
  predictIssue(context: Record<string, any>): {
    likely: boolean;
    type: string;
    confidence: number;
    reason: string;
  } {
    // Look for patterns that predict issues
    const anomalies = this.recallSimilarEvent("anomaly", context);
    const failures = this.recallSimilarEvent("failure", context);

    if (failures.length > 0) {
      return {
        likely: true,
        type: "failure",
        confidence: Math.min(0.9, failures[0].frequency / 10),
        reason: `Similar failure pattern seen ${failures[0].frequency} times`,
      };
    }

    if (anomalies.length > 0) {
      return {
        likely: true,
        type: "anomaly",
        confidence: Math.min(0.7, anomalies[0].frequency / 10),
        reason: `Similar anomaly pattern seen ${anomalies[0].frequency} times`,
      };
    }

    return {
      likely: false,
      type: "unknown",
      confidence: 0,
      reason: "No matching patterns",
    };
  }

  private calculateSimilarity(a: Record<string, any>, b: Record<string, any>): number {
    // Simple similarity calculation
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    const commonKeys = keysA.filter((k) => keysB.includes(k));
    return commonKeys.length / Math.max(keysA.length, keysB.length, 1);
  }
}

/**
 * Engine Memory System
 * Each engine stores: winners, losers, patterns, cycles, seasonal behavior
 */
export class EngineMemorySystem {
  public memories: Map<string, MemoryEntry> = new Map();

  /**
   * Remember engine event
   */
  rememberEngineEvent(
    engineId: string,
    type: "winner" | "loser" | "pattern" | "cycle" | "seasonal",
    data: Record<string, any>,
    effectiveness: number = 0.5
  ): MemoryEntry {
    const key = `engine-${engineId}-${type}-${JSON.stringify(data)}`;
    const existing = this.memories.get(key);

    if (existing) {
      existing.frequency++;
      existing.lastSeen = new Date().toISOString();
      existing.effectiveness = (existing.effectiveness + effectiveness) / 2;
      return existing;
    }

    const entry: MemoryEntry = {
      id: `memory-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      system: "engine",
      type,
      data: { ...data, engineId },
      frequency: 1,
      effectiveness,
      firstSeen: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      tags: [engineId, type],
    };

    this.memories.set(key, entry);
    return entry;
  }

  /**
   * Get engine memory
   */
  getEngineMemory(engineId: string): {
    winners: MemoryEntry[];
    losers: MemoryEntry[];
    patterns: MemoryEntry[];
    cycles: MemoryEntry[];
    seasonal: MemoryEntry[];
  } {
    const all = Array.from(this.memories.values()).filter((m) => m.data.engineId === engineId);
    return {
      winners: all.filter((m) => m.type === "winner"),
      losers: all.filter((m) => m.type === "loser"),
      patterns: all.filter((m) => m.type === "pattern"),
      cycles: all.filter((m) => m.type === "cycle"),
      seasonal: all.filter((m) => m.type === "seasonal"),
    };
  }

  /**
   * Recall winning pattern
   */
  recallWinningPattern(engineId: string, context: Record<string, any>): MemoryEntry | null {
    const winners = this.getEngineMemory(engineId).winners;
    if (winners.length === 0) return null;

    // Return most effective winner
    return winners.sort((a, b) => b.effectiveness - a.effectiveness)[0];
  }
}

/**
 * Ritual Memory System
 * Remembers: activation timing, closure timing, weekly cadence, seasonal rhythms
 */
export class RitualMemorySystem {
  public memories: Map<string, MemoryEntry> = new Map();

  /**
   * Remember ritual timing
   */
  rememberRitualTiming(
    ritualId: string,
    timing: Record<string, any>,
    effectiveness: number = 0.5
  ): MemoryEntry {
    const key = `ritual-${ritualId}-${JSON.stringify(timing)}`;
    const existing = this.memories.get(key);

    if (existing) {
      existing.frequency++;
      existing.lastSeen = new Date().toISOString();
      existing.effectiveness = (existing.effectiveness + effectiveness) / 2;
      return existing;
    }

    const entry: MemoryEntry = {
      id: `memory-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      system: "ritual",
      type: "timing",
      data: { ...timing, ritualId },
      frequency: 1,
      effectiveness,
      firstSeen: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      tags: [ritualId, "timing"],
    };

    this.memories.set(key, entry);
    return entry;
  }

  /**
   * Get ritual rhythm
   */
  getRitualRhythm(ritualId: string): {
    averageTiming: number;
    frequency: number;
    patterns: MemoryEntry[];
  } {
    const timings = Array.from(this.memories.values()).filter(
      (m) => m.data.ritualId === ritualId && m.type === "timing"
    );

    if (timings.length === 0) {
      return { averageTiming: 0, frequency: 0, patterns: [] };
    }

    const avgTiming = timings.reduce((sum, t) => sum + (t.data.timing || 0), 0) / timings.length;
    const frequency = timings.reduce((sum, t) => sum + t.frequency, 0) / timings.length;

    return {
      averageTiming: avgTiming,
      frequency,
      patterns: timings,
    };
  }
}

/**
 * Legacy Memory System
 * Remembers: crest updates, codex entries, lineage notes, mythic symbols, generational markers
 */
export class LegacyMemorySystem {
  public memories: Map<string, MemoryEntry> = new Map();

  /**
   * Remember legacy event
   */
  rememberLegacyEvent(
    type: "crest" | "codex" | "lineage" | "mythic" | "generational",
    data: Record<string, any>,
    effectiveness: number = 1.0
  ): MemoryEntry {
    const key = `legacy-${type}-${JSON.stringify(data)}`;
    const existing = this.memories.get(key);

    if (existing) {
      existing.frequency++;
      existing.lastSeen = new Date().toISOString();
      return existing;
    }

    const entry: MemoryEntry = {
      id: `memory-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      system: "legacy",
      type,
      data,
      frequency: 1,
      effectiveness,
      firstSeen: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      tags: [type, "legacy"],
    };

    this.memories.set(key, entry);
    return entry;
  }

  /**
   * Get legacy timeline
   */
  getLegacyTimeline(): {
    crests: MemoryEntry[];
    codex: MemoryEntry[];
    lineage: MemoryEntry[];
    mythic: MemoryEntry[];
    generational: MemoryEntry[];
  } {
    const all = Array.from(this.memories.values());
    return {
      crests: all.filter((m) => m.type === "crest"),
      codex: all.filter((m) => m.type === "codex"),
      lineage: all.filter((m) => m.type === "lineage"),
      mythic: all.filter((m) => m.type === "mythic"),
      generational: all.filter((m) => m.type === "generational"),
    };
  }
}

/**
 * Cockpit Memory Layer
 * Main orchestrator for all memory systems
 */
export class CockpitMemoryLayer {
  private operatorMemory: OperatorMemorySystem;
  private systemMemory: SystemMemorySystem;
  private engineMemory: EngineMemorySystem;
  private ritualMemory: RitualMemorySystem;
  private legacyMemory: LegacyMemorySystem;

  constructor() {
    this.operatorMemory = new OperatorMemorySystem();
    this.systemMemory = new SystemMemorySystem();
    this.engineMemory = new EngineMemorySystem();
    this.ritualMemory = new RitualMemorySystem();
    this.legacyMemory = new LegacyMemorySystem();
  }

  /**
   * Store memory
   */
  store(
    system: MemorySystemType,
    type: string,
    data: Record<string, any>,
    effectiveness: number = 0.5
  ): MemoryEntry {
    switch (system) {
      case "operator":
        return this.operatorMemory.rememberPreference(type as any, data, effectiveness);
      case "system":
        return this.systemMemory.rememberEvent(type as any, data, effectiveness);
      case "engine":
        const engineId = data.engineId || "unknown";
        return this.engineMemory.rememberEngineEvent(engineId, type as any, data, effectiveness);
      case "ritual":
        const ritualId = data.ritualId || "unknown";
        return this.ritualMemory.rememberRitualTiming(ritualId, data, effectiveness);
      case "legacy":
        return this.legacyMemory.rememberLegacyEvent(type as any, data, effectiveness);
      default:
        throw new Error(`Unknown memory system: ${system}`);
    }
  }

  /**
   * Recall memory
   */
  recall(system: MemorySystemType, type: string, context?: Record<string, any>): MemoryEntry | MemoryEntry[] | null {
    switch (system) {
      case "operator":
        return this.operatorMemory.recallPreference(type, context);
      case "system":
        return context ? this.systemMemory.recallSimilarEvent(type, context) : null;
      case "engine":
        const engineId = context?.engineId || "unknown";
        if (type === "winner") {
          return this.engineMemory.recallWinningPattern(engineId, context || {});
        }
        return null;
      case "ritual":
        const ritualId = context?.ritualId || "unknown";
        const rhythm = this.ritualMemory.getRitualRhythm(ritualId);
        return rhythm.patterns.length > 0 ? rhythm.patterns[0] : null;
      case "legacy":
        const timeline = this.legacyMemory.getLegacyTimeline();
        return timeline[type as keyof typeof timeline] || null;
      default:
        return null;
    }
  }

  /**
   * Get operator profile
   */
  getOperatorProfile() {
    return this.operatorMemory.getOperatorProfile();
  }

  /**
   * Predict system issue
   */
  predictIssue(context: Record<string, any>) {
    return this.systemMemory.predictIssue(context);
  }

  /**
   * Get engine memory
   */
  getEngineMemory(engineId: string) {
    return this.engineMemory.getEngineMemory(engineId);
  }

  /**
   * Get ritual rhythm
   */
  getRitualRhythm(ritualId: string) {
    return this.ritualMemory.getRitualRhythm(ritualId);
  }

  /**
   * Get legacy timeline
   */
  getLegacyTimeline() {
    return this.legacyMemory.getLegacyTimeline();
  }

  /**
   * Get all memories
   */
  getAllMemories(system?: MemorySystemType): MemoryEntry[] {
    const all: MemoryEntry[] = [];
    
    if (!system || system === "operator") {
      all.push(...Array.from(this.operatorMemory.memories.values()));
    }
    if (!system || system === "system") {
      all.push(...Array.from(this.systemMemory.memories.values()));
    }
    if (!system || system === "engine") {
      all.push(...Array.from(this.engineMemory.memories.values()));
    }
    if (!system || system === "ritual") {
      all.push(...Array.from(this.ritualMemory.memories.values()));
    }
    if (!system || system === "legacy") {
      all.push(...Array.from(this.legacyMemory.memories.values()));
    }

    return all.sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime());
  }
}

// Export singleton instance
export const cockpitMemoryLayer = new CockpitMemoryLayer();
