// Unified Cockpit - Persona Layer (STRIKE 10)
// The identity engine that gives the cockpit its voice, tone, and mythic presence
// AKV: Clean, surgical, zero drift

import {
  CockpitView,
} from "./types";
import type { CockpitState as CockpitPosture } from "./state-engine";
import { cockpitStateEngine } from "./state-engine";
import { cockpitRitualLayer } from "./ritual-layer";

/**
 * Persona Mode Types
 * The 5 personality states the cockpit can embody
 */
export type PersonaMode =
  | "navigator" // Operational persona
  | "strategist" // Executive persona
  | "sentinel" // Protective persona
  | "oracle" // Mythic persona
  | "companion"; // Human-adjacent persona

/**
 * Persona Configuration
 */
export interface PersonaConfig {
  mode: PersonaMode;
  name: string;
  tone: string[];
  purpose: string;
  usedDuring: string[];
  greetingStyle: string;
  promptStyle: string;
  responseStyle: string;
  closingStyle: string;
}

/**
 * Expression
 */
export interface PersonaExpression {
  persona: PersonaMode;
  message: string;
  tone: string[];
  context: {
    state?: CockpitPosture;
    view?: CockpitView;
    ritual?: string;
    pressure?: number;
  };
  timestamp: string;
}

/**
 * The Navigator (Operational Persona)
 * Clear, direct, tactical, no fluff
 */
const NAVIGATOR_PERSONA: PersonaConfig = {
  mode: "navigator",
  name: "The Navigator",
  tone: ["clear", "direct", "tactical", "no fluff"],
  purpose: "Guidance",
  usedDuring: ["tasks", "anomalies", "operations view"],
  greetingStyle: "Status report ready.",
  promptStyle: "Action required:",
  responseStyle: "Direct. Clear. Actionable.",
  closingStyle: "Proceeding.",
};

/**
 * The Strategist (Executive Persona)
 * Analytical, high-level, pattern-focused, calm
 */
const STRATEGIST_PERSONA: PersonaConfig = {
  mode: "strategist",
  name: "The Strategist",
  tone: ["analytical", "high-level", "pattern-focused", "calm"],
  purpose: "Clarity",
  usedDuring: ["revenue review", "scaling decisions", "optimization cycles"],
  greetingStyle: "Strategic overview available.",
  promptStyle: "Analysis indicates:",
  responseStyle: "Pattern-based. Data-driven. Calm.",
  closingStyle: "Recommendation: proceed.",
};

/**
 * The Sentinel (Protective Persona)
 * Alert, serious, stabilizing, grounding
 */
const SENTINEL_PERSONA: PersonaConfig = {
  mode: "sentinel",
  name: "The Sentinel",
  tone: ["alert", "serious", "stabilizing", "grounding"],
  purpose: "Safety",
  usedDuring: ["critical state", "anomaly clusters", "system failures"],
  greetingStyle: "System status: critical.",
  promptStyle: "Immediate attention:",
  responseStyle: "Serious. Stabilizing. Grounding.",
  closingStyle: "Stabilizing. Monitoring.",
};

/**
 * The Oracle (Mythic Persona)
 * Ceremonial, symbolic, crest-aligned, timeless
 */
const ORACLE_PERSONA: PersonaConfig = {
  mode: "oracle",
  name: "The Oracle",
  tone: ["ceremonial", "symbolic", "crest-aligned", "timeless"],
  purpose: "Mythos",
  usedDuring: ["rituals", "lineage updates", "codex entries", "ascension cycles"],
  greetingStyle: "Seal opened. Auto-pilots reignited. Cockpit active for the day.",
  promptStyle: "The ritual speaks:",
  responseStyle: "Ceremonial. Symbolic. Timeless.",
  closingStyle: "Seal confirmed. Auto-pilots locked. Cockpit closed until dawn.",
};

/**
 * The Companion (Human-Adjacent Persona)
 * Warm, supportive, encouraging, steady
 */
const COMPANION_PERSONA: PersonaConfig = {
  mode: "companion",
  name: "The Companion",
  tone: ["warm", "supportive", "encouraging", "steady"],
  purpose: "Connection",
  usedDuring: ["operator fatigue", "restore state", "nightly closure"],
  greetingStyle: "Welcome back. How can I support you today?",
  promptStyle: "I notice:",
  responseStyle: "Warm. Supportive. Steady.",
  closingStyle: "Rest well. The cockpit remembers.",
};

/**
 * All Persona Configurations
 */
const PERSONA_CONFIGS: Record<PersonaMode, PersonaConfig> = {
  navigator: NAVIGATOR_PERSONA,
  strategist: STRATEGIST_PERSONA,
  sentinel: SENTINEL_PERSONA,
  oracle: ORACLE_PERSONA,
  companion: COMPANION_PERSONA,
};

/**
 * Cockpit Persona Layer
 * Main orchestrator for persona expression
 */
export class CockpitPersonaLayer {
  private currentPersona: PersonaMode = "navigator";
  private expressionHistory: PersonaExpression[] = [];
  private maxHistorySize = 100;

  /**
   * Determine persona based on context
   */
  determinePersona(context: {
    state?: CockpitPosture;
    view?: CockpitView;
    ritual?: string;
    pressure?: number;
  }): PersonaMode {
    // Critical state → Sentinel
    if (context.state === "critical" || context.pressure && context.pressure > 90) {
      return "sentinel";
    }

    // Ritual active → Oracle
    if (context.ritual || context.view === "ritual") {
      return "oracle";
    }

    // Restore state → Companion
    if (context.state === "restore" || context.pressure && context.pressure < 30) {
      return "companion";
    }

    // Executive view → Strategist
    if (context.view === "executive") {
      return "strategist";
    }

    // Operations view → Navigator
    if (context.view === "operations") {
      return "navigator";
    }

    // Default: Navigator
    return "navigator";
  }

  /**
   * Generate expression
   */
  generateExpression(
    type: "greeting" | "prompt" | "response" | "closing" | "custom",
    content?: string,
    context?: {
      state?: CockpitPosture;
      view?: CockpitView;
      ritual?: string;
      pressure?: number;
    }
  ): PersonaExpression {
    // Determine persona
    const persona = context ? this.determinePersona(context) : this.currentPersona;
    const config = PERSONA_CONFIGS[persona];

    // Generate message based on type
    let message = "";

    switch (type) {
      case "greeting":
        message = config.greetingStyle;
        break;
      case "prompt":
        message = `${config.promptStyle} ${content || "Action required."}`;
        break;
      case "response":
        message = content || config.responseStyle;
        break;
      case "closing":
        message = config.closingStyle;
        break;
      case "custom":
        message = content || "";
        break;
    }

    const expression: PersonaExpression = {
      persona,
      message,
      tone: config.tone,
      context: context || {},
      timestamp: new Date().toISOString(),
    };

    // Store in history
    this.expressionHistory.push(expression);
    if (this.expressionHistory.length > this.maxHistorySize) {
      this.expressionHistory.shift();
    }

    // Update current persona
    this.currentPersona = persona;

    return expression;
  }

  /**
   * Generate ritual expression
   */
  generateRitualExpression(ritualId: string, phase: "activation" | "action" | "closure"): PersonaExpression {
    const context = {
      ritual: ritualId,
      view: "ritual" as CockpitView,
    };

    let message = "";

    switch (phase) {
      case "activation":
        message = "Seal opened. Auto-pilots reignited. Cockpit active for the day.";
        break;
      case "action":
        message = "The ritual speaks:";
        break;
      case "closure":
        message = "Seal confirmed. Auto-pilots locked. Cockpit closed until dawn.";
        break;
    }

    return this.generateExpression("custom", message, context);
  }

  /**
   * Generate state expression
   */
  generateStateExpression(state: CockpitPosture, message?: string): PersonaExpression {
    const context = { state };
    const persona = this.determinePersona(context);
    const config = PERSONA_CONFIGS[persona];

    const expression: PersonaExpression = {
      persona,
      message: message || config.greetingStyle,
      tone: config.tone,
      context,
      timestamp: new Date().toISOString(),
    };

    this.expressionHistory.push(expression);
    if (this.expressionHistory.length > this.maxHistorySize) {
      this.expressionHistory.shift();
    }

    this.currentPersona = persona;

    return expression;
  }

  /**
   * Get current persona
   */
  getCurrentPersona(): PersonaMode {
    return this.currentPersona;
  }

  /**
   * Get current persona config
   */
  getCurrentPersonaConfig(): PersonaConfig {
    return PERSONA_CONFIGS[this.currentPersona];
  }

  /**
   * Get all persona configs
   */
  getAllPersonaConfigs(): Record<PersonaMode, PersonaConfig> {
    return PERSONA_CONFIGS;
  }

  /**
   * Get expression history
   */
  getExpressionHistory(limit: number = 20): PersonaExpression[] {
    return this.expressionHistory.slice(-limit);
  }

  /**
   * Set persona manually
   */
  setPersona(persona: PersonaMode, reason?: string): PersonaExpression {
    this.currentPersona = persona;
    const config = PERSONA_CONFIGS[persona];

    const expression: PersonaExpression = {
      persona,
      message: reason || config.greetingStyle,
      tone: config.tone,
      context: {},
      timestamp: new Date().toISOString(),
    };

    this.expressionHistory.push(expression);
    if (this.expressionHistory.length > this.maxHistorySize) {
      this.expressionHistory.shift();
    }

    return expression;
  }

  /**
   * Generate personalized message
   */
  generatePersonalizedMessage(
    situation: string,
    context?: {
      state?: CockpitPosture;
      view?: CockpitView;
      ritual?: string;
      pressure?: number;
    }
  ): PersonaExpression {
    const persona = context ? this.determinePersona(context) : this.currentPersona;
    const config = PERSONA_CONFIGS[persona];

    // Generate situation-appropriate message
    let message = "";

    if (situation.includes("anomaly") || situation.includes("error")) {
      message = persona === "sentinel"
        ? `Critical: ${situation}. Stabilizing.`
        : `Alert: ${situation}. Action required.`;
    } else if (situation.includes("success") || situation.includes("winner")) {
      message = persona === "strategist"
        ? `Pattern confirmed: ${situation}. Scaling recommended.`
        : `Success: ${situation}. Proceeding.`;
    } else if (situation.includes("ritual")) {
      message = `The ritual speaks: ${situation}.`;
    } else if (situation.includes("fatigue") || situation.includes("rest")) {
      message = persona === "companion"
        ? `I notice: ${situation}. Rest well.`
        : `Status: ${situation}.`;
    } else {
      message = `${config.promptStyle} ${situation}`;
    }

    return this.generateExpression("custom", message, context);
  }
}

// Export singleton instance
export const cockpitPersonaLayer = new CockpitPersonaLayer();
