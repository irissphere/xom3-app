// Unified Cockpit - State Engine (STRIKE 7)
// The mood and pressure system that makes the cockpit feel alive
// AKV: Clean, surgical, zero drift

import {
  CockpitSignal,
  CockpitIntelligence,
  SignalSeverity,
} from "./types";
import { cockpitIntelligenceEngine } from "./intelligence";

/**
 * Cockpit State Types
 * The 7 primary moods the cockpit can enter
 */
export type CockpitState =
  | "calm" // "All systems nominal."
  | "focus" // "Lock in."
  | "surge" // "We're scaling."
  | "alert" // "Something needs attention."
  | "critical" // "Immediate action required."
  | "restore" // "Stabilizing."
  | "ascend"; // "Evolution cycle active."

/**
 * UI Configuration
 * Visual and behavioral characteristics of each state
 */
export interface StateUIConfig {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  borderColor: string;
  transitionSpeed: number; // milliseconds
  transitionEasing: string;
  animationType: "smooth" | "pulse" | "pulse-strong" | "static" | "geometric";
  promptStyle: "soft" | "neutral" | "energized" | "amber" | "sharp" | "muted" | "ceremonial";
  distractionLevel: "minimal" | "low" | "medium" | "high" | "focused";
  contrastMode: "normal" | "high";
}

/**
 * State Configuration
 * Complete definition of a cockpit state
 */
export interface StateConfig {
  state: CockpitState;
  message: string;
  purpose: string;
  triggers: string[];
  ui: StateUIConfig;
  priority: number;
}

/**
 * State Transition
 */
export interface StateTransition {
  from: CockpitState;
  to: CockpitState;
  reason: string;
  triggeredBy?: CockpitSignal | string;
  timestamp: number;
  duration: number; // milliseconds
}

/**
 * CALM STATE — "All systems nominal."
 * Stability state
 */
const CALM_STATE: StateConfig = {
  state: "calm",
  message: "All systems nominal.",
  purpose: "Stability",
  triggers: [
    "stable_revenue",
    "low_anomalies",
    "balanced_agent_load",
    "normal_pressure",
  ],
  ui: {
    primaryColor: "#3b82f6", // soft blue
    secondaryColor: "#60a5fa",
    accentColor: "#93c5fd",
    backgroundColor: "#f8fafc",
    textColor: "#1e293b",
    borderColor: "#e2e8f0",
    transitionSpeed: 400,
    transitionEasing: "ease-in-out",
    animationType: "smooth",
    promptStyle: "soft",
    distractionLevel: "low",
    contrastMode: "normal",
  },
  priority: 0.3,
};

/**
 * FOCUS STATE — "Lock in."
 * Flow state
 */
const FOCUS_STATE: StateConfig = {
  state: "focus",
  message: "Lock in.",
  purpose: "Flow",
  triggers: [
    "high_priority_tasks",
    "deadlines",
    "operator_focus_ritual",
    "deep_work_mode",
  ],
  ui: {
    primaryColor: "#475569", // deep neutral
    secondaryColor: "#64748b",
    accentColor: "#94a3b8",
    backgroundColor: "#f1f5f9",
    textColor: "#0f172a",
    borderColor: "#cbd5e1",
    transitionSpeed: 300,
    transitionEasing: "ease-out",
    animationType: "static",
    promptStyle: "neutral",
    distractionLevel: "minimal",
    contrastMode: "normal",
  },
  priority: 0.6,
};

/**
 * SURGE STATE — "We're scaling."
 * Acceleration state
 */
const SURGE_STATE: StateConfig = {
  state: "surge",
  message: "We're scaling.",
  purpose: "Acceleration",
  triggers: [
    "revenue_spike",
    "viral_content",
    "ad_winner",
    "pipeline_surge",
    "trend_spike",
  ],
  ui: {
    primaryColor: "#f59e0b", // energized gold
    secondaryColor: "#fbbf24",
    accentColor: "#fcd34d",
    backgroundColor: "#fffbeb",
    textColor: "#78350f",
    borderColor: "#fde68a",
    transitionSpeed: 250,
    transitionEasing: "ease-out",
    animationType: "pulse",
    promptStyle: "energized",
    distractionLevel: "medium",
    contrastMode: "normal",
  },
  priority: 0.8,
};

/**
 * ALERT STATE — "Something needs attention."
 * Correction state
 */
const ALERT_STATE: StateConfig = {
  state: "alert",
  message: "Something needs attention.",
  purpose: "Correction",
  triggers: [
    "anomaly_cluster",
    "funnel_decay",
    "creative_fatigue",
    "agent_overload",
    "performance_drop",
  ],
  ui: {
    primaryColor: "#f97316", // amber
    secondaryColor: "#fb923c",
    accentColor: "#fdba74",
    backgroundColor: "#fff7ed",
    textColor: "#7c2d12",
    borderColor: "#fed7aa",
    transitionSpeed: 200,
    transitionEasing: "ease-in",
    animationType: "pulse",
    promptStyle: "amber",
    distractionLevel: "high",
    contrastMode: "normal",
  },
  priority: 0.9,
};

/**
 * CRITICAL STATE — "Immediate action required."
 * Intervention state
 */
const CRITICAL_STATE: StateConfig = {
  state: "critical",
  message: "Immediate action required.",
  purpose: "Intervention",
  triggers: [
    "revenue_drop",
    "system_failure",
    "broken_workflow",
    "high_severity_anomaly",
    "critical_error",
  ],
  ui: {
    primaryColor: "#dc2626", // sharp red
    secondaryColor: "#ef4444",
    accentColor: "#f87171",
    backgroundColor: "#fef2f2",
    textColor: "#7f1d1d",
    borderColor: "#fecaca",
    transitionSpeed: 100,
    transitionEasing: "linear",
    animationType: "pulse-strong",
    promptStyle: "sharp",
    distractionLevel: "high",
    contrastMode: "high",
  },
  priority: 1.0,
};

/**
 * RESTORE STATE — "Stabilizing."
 * Recovery state
 */
const RESTORE_STATE: StateConfig = {
  state: "restore",
  message: "Stabilizing.",
  purpose: "Recovery",
  triggers: [
    "post_critical_recovery",
    "operator_fatigue",
    "nightly_closure",
    "pressure_release",
  ],
  ui: {
    primaryColor: "#059669", // muted green
    secondaryColor: "#10b981",
    accentColor: "#34d399",
    backgroundColor: "#f0fdf4",
    textColor: "#064e3b",
    borderColor: "#a7f3d0",
    transitionSpeed: 600,
    transitionEasing: "ease-in-out",
    animationType: "smooth",
    promptStyle: "muted",
    distractionLevel: "low",
    contrastMode: "normal",
  },
  priority: 0.4,
};

/**
 * ASCEND STATE — "Evolution cycle active."
 * Evolution state
 */
const ASCEND_STATE: StateConfig = {
  state: "ascend",
  message: "Evolution cycle active.",
  purpose: "Evolution",
  triggers: [
    "optimization_cycle",
    "system_upgrade",
    "new_engine_activation",
    "ritual_milestone",
    "evolution_complete",
  ],
  ui: {
    primaryColor: "#7c3aed", // violet
    secondaryColor: "#8b5cf6",
    accentColor: "#a78bfa",
    backgroundColor: "#faf5ff",
    textColor: "#4c1d95",
    borderColor: "#c4b5fd",
    transitionSpeed: 500,
    transitionEasing: "ease-in-out",
    animationType: "geometric",
    promptStyle: "ceremonial",
    distractionLevel: "medium",
    contrastMode: "normal",
  },
  priority: 0.7,
};

/**
 * All State Configurations
 */
const STATE_CONFIGS: Record<CockpitState, StateConfig> = {
  calm: CALM_STATE,
  focus: FOCUS_STATE,
  surge: SURGE_STATE,
  alert: ALERT_STATE,
  critical: CRITICAL_STATE,
  restore: RESTORE_STATE,
  ascend: ASCEND_STATE,
};

/**
 * Cockpit State Engine
 * The emotional and operational state machine
 */
export class CockpitStateEngine {
  private currentState: CockpitState = "calm";
  private stateHistory: StateTransition[] = [];
  private maxHistorySize = 100;

  /**
   * Calculate state from signals and intelligence
   */
  async calculateState(
    intelligence: CockpitIntelligence,
    recentSignals: CockpitSignal[]
  ): Promise<CockpitState> {
    const pressure = intelligence.pressure;
    const anomalies = intelligence.anomalies;
    const criticalAnomalies = anomalies.filter((a) => a.severity === "critical");
    const highAnomalies = anomalies.filter((a) => a.severity === "high");

    // CRITICAL STATE — Highest priority
    if (
      criticalAnomalies.length > 0 ||
      pressure > 90 ||
      recentSignals.some((s) => s.severity === "critical" && s.type.includes("failure"))
    ) {
      return "critical";
    }

    // ALERT STATE — High priority
    if (
      highAnomalies.length > 3 ||
      pressure > 70 ||
      recentSignals.some((s) =>
        s.type.includes("decay") || s.type.includes("fatigue") || s.type.includes("overload")
      )
    ) {
      return "alert";
    }

    // SURGE STATE — Positive momentum
    if (
      recentSignals.some((s) =>
        s.type.includes("spike") ||
        s.type.includes("surge") ||
        s.type.includes("winner") ||
        s.type.includes("viral")
      )
    ) {
      return "surge";
    }

    // ASCEND STATE — Evolution active
    if (
      recentSignals.some((s) =>
        s.type.includes("evolution") ||
        s.type.includes("optimization") ||
        s.type.includes("upgrade") ||
        s.type.includes("milestone")
      )
    ) {
      return "ascend";
    }

    // RESTORE STATE — Recovery mode
    if (
      pressure < 30 ||
      recentSignals.some((s) => s.type.includes("recovery") || s.type.includes("closure"))
    ) {
      return "restore";
    }

    // FOCUS STATE — High priority tasks
    if (
      pressure > 50 &&
      pressure < 70 &&
      recentSignals.some((s) => s.type.includes("priority") || s.type.includes("deadline"))
    ) {
      return "focus";
    }

    // CALM STATE — Default
    return "calm";
  }

  /**
   * Transition to new state
   */
  async transitionTo(
    newState: CockpitState,
    reason: string,
    triggeredBy?: CockpitSignal | string
  ): Promise<StateTransition> {
    const from = this.currentState;
    const to = newState;
    const timestamp = Date.now();

    // Only transition if state actually changed
    if (from === to) {
      return {
        from,
        to,
        reason: "State unchanged",
        triggeredBy: typeof triggeredBy === "string" ? triggeredBy : undefined,
        timestamp,
        duration: 0,
      };
    }

    const transition: StateTransition = {
      from,
      to,
      reason,
      triggeredBy: typeof triggeredBy === "string" ? triggeredBy : undefined,
      timestamp,
      duration: STATE_CONFIGS[to].ui.transitionSpeed,
    };

    // Update current state
    this.currentState = to;

    // Store in history
    this.stateHistory.push(transition);
    if (this.stateHistory.length > this.maxHistorySize) {
      this.stateHistory.shift();
    }

    return transition;
  }

  /**
   * Get current state
   */
  getCurrentState(): CockpitState {
    return this.currentState;
  }

  /**
   * Get current state configuration
   */
  getCurrentStateConfig(): StateConfig {
    return STATE_CONFIGS[this.currentState];
  }

  /**
   * Get UI configuration for current state
   */
  getCurrentUIConfig(): StateUIConfig {
    return STATE_CONFIGS[this.currentState].ui;
  }

  /**
   * Get all state configurations
   */
  getAllStateConfigs(): Record<CockpitState, StateConfig> {
    return STATE_CONFIGS;
  }

  /**
   * Get state history
   */
  getStateHistory(limit: number = 20): StateTransition[] {
    return this.stateHistory.slice(-limit);
  }

  /**
   * Process signals and update state
   */
  async processSignals(
    intelligence: CockpitIntelligence,
    signals: CockpitSignal[]
  ): Promise<StateTransition> {
    // Calculate new state
    const newState = await this.calculateState(intelligence, signals);

    // Determine reason
    let reason = "";
    if (newState === "critical") {
      reason = "Critical anomalies or system failures detected";
    } else if (newState === "alert") {
      reason = "Anomalies or performance issues detected";
    } else if (newState === "surge") {
      reason = "Positive momentum detected (spikes, surges, winners)";
    } else if (newState === "ascend") {
      reason = "Evolution or optimization cycle active";
    } else if (newState === "restore") {
      reason = "Recovery or stabilization mode";
    } else if (newState === "focus") {
      reason = "High priority tasks or focus mode";
    } else {
      reason = "All systems nominal";
    }

    // Transition
    const transition = await this.transitionTo(newState, reason);

    return transition;
  }

  /**
   * Get state message
   */
  getStateMessage(state?: CockpitState): string {
    const targetState = state || this.currentState;
    return STATE_CONFIGS[targetState].message;
  }

  /**
   * Get state purpose
   */
  getStatePurpose(state?: CockpitState): string {
    const targetState = state || this.currentState;
    return STATE_CONFIGS[targetState].purpose;
  }
}

// Export singleton instance
export const cockpitStateEngine = new CockpitStateEngine();
