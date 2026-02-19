// Unified Cockpit - Command Layer (STRIKE 8)
// The control system that enables operator commands across the organism
// AKV: Clean, surgical, zero drift

import {
  CockpitView,
  CockpitDecision,
  CockpitSignal,
} from "./types";
import { cockpitIntelligenceEngine } from "./intelligence";
import { crossEngineSignalRouter } from "./signal-map";
import { cockpitRitualLayer } from "./ritual-layer";
import { cockpitStateEngine } from "./state-engine";
import { uiFlowEngine } from "./ui-flow";

/**
 * Command Mode Types
 * The 5 ways the operator interacts with the cockpit
 */
export type CommandMode =
  | "direct" // Manual control
  | "contextual" // Smart control
  | "ritual" // Ceremonial control
  | "state_driven" // Instinctive control
  | "autonomous"; // Self-governing control

/**
 * Command Type
 */
export type CommandType =
  | "generate"
  | "scan"
  | "rebalance"
  | "optimize"
  | "scale"
  | "resolve"
  | "reassign"
  | "trigger"
  | "stabilize"
  | "regenerate"
  | "adjust"
  | "update"
  | "shift"
  | "execute"
  | "custom";

/**
 * Command
 */
export interface Command {
  id: string;
  mode: CommandMode;
  type: CommandType;
  text: string;
  target?: string; // Engine or surface
  context?: {
    view?: CockpitView;
    state?: string;
    ritual?: string;
    signal?: CockpitSignal;
  };
  payload?: Record<string, any>;
  timestamp: number;
}

/**
 * Command Execution Result
 */
export interface CommandExecutionResult {
  commandId: string;
  success: boolean;
  mode: CommandMode;
  type: CommandType;
  target: string;
  action: string;
  result: any;
  decisions: CockpitDecision[];
  message: string;
  duration: number; // milliseconds
  timestamp: string;
}

/**
 * Direct Command Mode
 * Operator issues a direct instruction
 */
export class DirectCommandMode {
  /**
   * Parse direct command
   */
  parseCommand(text: string): Command {
    const lowerText = text.toLowerCase();

    // Generate commands
    if (lowerText.includes("generate") && lowerText.includes("creative")) {
      return {
        id: `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        mode: "direct",
        type: "generate",
        text,
        target: "commerce",
        payload: { type: "creatives" },
        timestamp: Date.now(),
      };
    }

    // Scan commands
    if (lowerText.includes("scan") && lowerText.includes("product")) {
      return {
        id: `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        mode: "direct",
        type: "scan",
        text,
        target: "commerce",
        payload: { type: "product_winners" },
        timestamp: Date.now(),
      };
    }

    // Rebalance commands
    if (lowerText.includes("rebalance") && lowerText.includes("agent")) {
      return {
        id: `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        mode: "direct",
        type: "rebalance",
        text,
        target: "agent",
        payload: { type: "load_balancing" },
        timestamp: Date.now(),
      };
    }

    // Optimization commands
    if (lowerText.includes("optimization") || lowerText.includes("optimize")) {
      return {
        id: `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        mode: "direct",
        type: "optimize",
        text,
        target: "optimization",
        payload: { type: "full_cycle" },
        timestamp: Date.now(),
      };
    }

    // Default: custom command
    return {
      id: `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      mode: "direct",
      type: "custom",
      text,
      timestamp: Date.now(),
    };
  }

  /**
   * Execute direct command
   */
  async execute(command: Command): Promise<CommandExecutionResult> {
    const startTime = Date.now();
    const decisions: CockpitDecision[] = [];

    let target = command.target || "system";
    let action = command.type;
    let result: any = {};
    let message = "";

    switch (command.type) {
      case "generate":
        // Generate creatives
        message = `Generating new creatives for ${target} engine.`;
        result = { generated: true, count: 0 };
        decisions.push({
          id: `decision-${Date.now()}-1`,
          type: "optimization",
          source: "operator",
          target,
          action: "generate_creatives",
          reason: message,
          executed: false,
        });
        break;

      case "scan":
        // Scan for product winners
        message = `Scanning for product winners in ${target} engine.`;
        result = { scanned: true, winners: [] };
        decisions.push({
          id: `decision-${Date.now()}-2`,
          type: "optimization",
          source: "operator",
          target,
          action: "scan_product_winners",
          reason: message,
          executed: false,
        });
        break;

      case "rebalance":
        // Rebalance agent load
        message = `Rebalancing agent load.`;
        result = { rebalanced: true };
        decisions.push({
          id: `decision-${Date.now()}-3`,
          type: "routing",
          source: "operator",
          target: "agent",
          action: "rebalance_load",
          reason: message,
          executed: false,
        });
        break;

      case "optimize":
        // Run optimization cycle
        message = `Running optimization cycle.`;
        result = { optimized: true };
        decisions.push({
          id: `decision-${Date.now()}-4`,
          type: "optimization",
          source: "operator",
          target: "optimization",
          action: "run_cycle",
          reason: message,
          executed: false,
        });
        break;

      default:
        message = `Executing custom command: ${command.text}`;
        result = { executed: true };
    }

    const duration = Date.now() - startTime;

    return {
      commandId: command.id,
      success: true,
      mode: "direct",
      type: command.type,
      target,
      action,
      result,
      decisions,
      message,
      duration,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Contextual Command Mode
 * Commands issued from within a surface
 */
export class ContextualCommandMode {
  /**
   * Parse contextual command
   */
  parseCommand(text: string, context: { view: CockpitView; [key: string]: any }): Command {
    const lowerText = text.toLowerCase();

    // Executive View commands
    if (context.view === "executive") {
      if (lowerText.includes("scale") && lowerText.includes("ad")) {
        return {
          id: `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          mode: "contextual",
          type: "scale",
          text,
          target: "commerce",
          context: { view: context.view },
          payload: { type: "ad_set", context: context },
          timestamp: Date.now(),
        };
      }
    }

    // Operations View commands
    if (context.view === "operations") {
      if (lowerText.includes("resolve") && lowerText.includes("anomaly")) {
        return {
          id: `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          mode: "contextual",
          type: "resolve",
          text,
          target: "uoi",
          context: { view: context.view },
          payload: { type: "anomaly", context: context },
          timestamp: Date.now(),
        };
      }
    }

    // Agent View commands
    if (context.view === "agent") {
      if (lowerText.includes("reassign") && lowerText.includes("task")) {
        return {
          id: `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          mode: "contextual",
          type: "reassign",
          text,
          target: "agent",
          context: { view: context.view },
          payload: { type: "task", context: context },
          timestamp: Date.now(),
        };
      }
    }

    // Default: fall back to direct mode
    return {
      id: `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      mode: "contextual",
      type: "custom",
      text,
      context: { view: context.view },
      timestamp: Date.now(),
    };
  }

  /**
   * Execute contextual command
   */
  async execute(command: Command): Promise<CommandExecutionResult> {
    const startTime = Date.now();
    const decisions: CockpitDecision[] = [];

    const target = command.target || "system";
    const action = command.type;
    let result: any = {};
    let message = "";

    // Use context to enhance execution
    const view = command.context?.view;
    const contextData = command.payload?.context || {};

    switch (command.type) {
      case "scale":
        message = `Scaling ad set from ${view} view.`;
        result = { scaled: true, context: contextData };
        decisions.push({
          id: `decision-${Date.now()}-1`,
          type: "adjustment",
          source: "operator",
          target,
          action: "scale_ad_set",
          reason: message,
          executed: false,
        });
        break;

      case "resolve":
        message = `Resolving anomaly from ${view} view.`;
        result = { resolved: true, context: contextData };
        decisions.push({
          id: `decision-${Date.now()}-2`,
          type: "alert",
          source: "operator",
          target,
          action: "resolve_anomaly",
          reason: message,
          executed: false,
        });
        break;

      case "reassign":
        message = `Reassigning task from ${view} view.`;
        result = { reassigned: true, context: contextData };
        decisions.push({
          id: `decision-${Date.now()}-3`,
          type: "routing",
          source: "operator",
          target,
          action: "reassign_task",
          reason: message,
          executed: false,
        });
        break;

      default:
        message = `Executing contextual command: ${command.text}`;
        result = { executed: true, context: contextData };
    }

    const duration = Date.now() - startTime;

    return {
      commandId: command.id,
      success: true,
      mode: "contextual",
      type: command.type,
      target,
      action,
      result,
      decisions,
      message,
      duration,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Ritual Command Mode
 * Commands tied to rituals
 */
export class RitualCommandMode {
  /**
   * Parse ritual command
   */
  parseCommand(text: string): Command {
    const lowerText = text.toLowerCase();

    if (lowerText.includes("morning") && lowerText.includes("activation")) {
      return {
        id: `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        mode: "ritual",
        type: "trigger",
        text,
        target: "ritual",
        context: { ritual: "morning-activation" },
        payload: { ritualId: "morning-activation", cycleType: "daily" },
        timestamp: Date.now(),
      };
    }

    if (lowerText.includes("nightly") && lowerText.includes("closure")) {
      return {
        id: `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        mode: "ritual",
        type: "trigger",
        text,
        target: "ritual",
        context: { ritual: "nightly-closure" },
        payload: { ritualId: "nightly-closure", cycleType: "daily" },
        timestamp: Date.now(),
      };
    }

    if (lowerText.includes("weekly") && lowerText.includes("review")) {
      return {
        id: `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        mode: "ritual",
        type: "trigger",
        text,
        target: "ritual",
        context: { ritual: "weekly-ceremony" },
        payload: { ritualId: "weekly-ceremony", cycleType: "weekly" },
        timestamp: Date.now(),
      };
    }

    return {
      id: `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      mode: "ritual",
      type: "custom",
      text,
      timestamp: Date.now(),
    };
  }

  /**
   * Execute ritual command
   */
  async execute(command: Command): Promise<CommandExecutionResult> {
    const startTime = Date.now();
    const decisions: CockpitDecision[] = [];

    const ritualId = command.payload?.ritualId;
    const cycleType = command.payload?.cycleType || "daily";

    if (ritualId) {
      // Execute ritual
      const ritualResult = await cockpitRitualLayer.executeRitual(ritualId, cycleType as any);

      return {
        commandId: command.id,
        success: ritualResult.success,
        mode: "ritual",
        type: "trigger",
        target: "ritual",
        action: "execute_ritual",
        result: ritualResult,
        decisions,
        message: ritualResult.message,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }

    return {
      commandId: command.id,
      success: false,
      mode: "ritual",
      type: "custom",
      target: "ritual",
      action: "unknown",
      result: {},
      decisions,
      message: "Unknown ritual command",
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * State-Driven Command Mode
 * Commands triggered by cockpit state
 */
export class StateDrivenCommandMode {
  /**
   * Parse state-driven command
   */
  parseCommand(text: string, currentState: string): Command {
    const lowerText = text.toLowerCase();

    // Alert State commands
    if (currentState === "alert") {
      if (lowerText.includes("root") && lowerText.includes("cause")) {
        return {
          id: `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          mode: "state_driven",
          type: "resolve",
          text,
          target: "uoi",
          context: { state: currentState },
          payload: { action: "show_root_cause" },
          timestamp: Date.now(),
        };
      }
    }

    // Surge State commands
    if (currentState === "surge") {
      if (lowerText.includes("scale") && lowerText.includes("funnel")) {
        return {
          id: `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          mode: "state_driven",
          type: "scale",
          text,
          target: "commerce",
          context: { state: currentState },
          payload: { action: "scale_winning_funnel" },
          timestamp: Date.now(),
        };
      }
    }

    // Critical State commands
    if (currentState === "critical") {
      if (lowerText.includes("stabilize")) {
        return {
          id: `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          mode: "state_driven",
          type: "stabilize",
          text,
          target: "system",
          context: { state: currentState },
          payload: { action: "stabilize_system" },
          timestamp: Date.now(),
        };
      }
    }

    return {
      id: `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      mode: "state_driven",
      type: "custom",
      text,
      context: { state: currentState },
      timestamp: Date.now(),
    };
  }

  /**
   * Execute state-driven command
   */
  async execute(command: Command): Promise<CommandExecutionResult> {
    const startTime = Date.now();
    const decisions: CockpitDecision[] = [];

    const currentState = cockpitStateEngine.getCurrentState();
    const target = command.target || "system";
    const action = command.type;
    let result: any = {};
    let message = "";

    switch (command.type) {
      case "resolve":
        message = `Showing root cause analysis (state: ${currentState}).`;
        result = { rootCause: "analyzing", state: currentState };
        decisions.push({
          id: `decision-${Date.now()}-1`,
          type: "alert",
          source: "operator",
          target,
          action: "show_root_cause",
          reason: message,
          executed: false,
        });
        break;

      case "scale":
        message = `Scaling winning funnel (state: ${currentState}).`;
        result = { scaled: true, state: currentState };
        decisions.push({
          id: `decision-${Date.now()}-2`,
          type: "adjustment",
          source: "operator",
          target,
          action: "scale_winning_funnel",
          reason: message,
          executed: false,
        });
        break;

      case "stabilize":
        message = `Stabilizing system (state: ${currentState}).`;
        result = { stabilized: true, state: currentState };
        // Transition to restore state
        await cockpitStateEngine.transitionTo("restore", "Operator requested stabilization");
        decisions.push({
          id: `decision-${Date.now()}-3`,
          type: "alert",
          source: "operator",
          target,
          action: "stabilize_system",
          reason: message,
          executed: false,
        });
        break;

      default:
        message = `Executing state-driven command: ${command.text}`;
        result = { executed: true, state: currentState };
    }

    const duration = Date.now() - startTime;

    return {
      commandId: command.id,
      success: true,
      mode: "state_driven",
      type: command.type,
      target,
      action,
      result,
      decisions,
      message,
      duration,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Autonomous Command Mode
 * The cockpit issues commands to itself
 */
export class AutonomousCommandMode {
  /**
   * Generate autonomous commands based on intelligence
   */
  async generateCommands(intelligence: any): Promise<Command[]> {
    const commands: Command[] = [];

    // Regenerate creatives if needed
    if (intelligence.creativeFatigue) {
      commands.push({
        id: `cmd-auto-${Date.now()}-1`,
        mode: "autonomous",
        type: "regenerate",
        text: "Regenerate fatigued creatives",
        target: "commerce",
        payload: { type: "creatives", reason: "fatigue_detected" },
        timestamp: Date.now(),
      });
    }

    // Rebalance agents if overloaded
    if (intelligence.agentOverload) {
      commands.push({
        id: `cmd-auto-${Date.now()}-2`,
        mode: "autonomous",
        type: "rebalance",
        text: "Rebalance agent load",
        target: "agent",
        payload: { type: "load_balancing", reason: "overload_detected" },
        timestamp: Date.now(),
      });
    }

    // Adjust pricing if drift detected
    if (intelligence.pricingDrift) {
      commands.push({
        id: `cmd-auto-${Date.now()}-3`,
        mode: "autonomous",
        type: "adjust",
        text: "Adjust pricing",
        target: "commerce",
        payload: { type: "pricing", reason: "drift_detected" },
        timestamp: Date.now(),
      });
    }

    // Update funnels if decay detected
    if (intelligence.funnelDecay) {
      commands.push({
        id: `cmd-auto-${Date.now()}-4`,
        mode: "autonomous",
        type: "update",
        text: "Update decaying funnels",
        target: "commerce",
        payload: { type: "funnels", reason: "decay_detected" },
        timestamp: Date.now(),
      });
    }

    // Shift posting cadence if audience decay
    if (intelligence.audienceDecay) {
      commands.push({
        id: `cmd-auto-${Date.now()}-5`,
        mode: "autonomous",
        type: "shift",
        text: "Shift posting cadence",
        target: "broadcast",
        payload: { type: "cadence", reason: "audience_decay" },
        timestamp: Date.now(),
      });
    }

    return commands;
  }

  /**
   * Execute autonomous command
   */
  async execute(command: Command): Promise<CommandExecutionResult> {
    const startTime = Date.now();
    const decisions: CockpitDecision[] = [];

    const target = command.target || "system";
    const action = command.type;
    let result: any = {};
    let message = "";

    switch (command.type) {
      case "regenerate":
        message = `Autonomously regenerating creatives.`;
        result = { regenerated: true };
        decisions.push({
          id: `decision-auto-${Date.now()}-1`,
          type: "optimization",
          source: "cockpit",
          target,
          action: "regenerate_creatives",
          reason: message,
          executed: false,
        });
        break;

      case "rebalance":
        message = `Autonomously rebalancing agent load.`;
        result = { rebalanced: true };
        decisions.push({
          id: `decision-auto-${Date.now()}-2`,
          type: "routing",
          source: "cockpit",
          target,
          action: "rebalance_agents",
          reason: message,
          executed: false,
        });
        break;

      case "adjust":
        message = `Autonomously adjusting pricing.`;
        result = { adjusted: true };
        decisions.push({
          id: `decision-auto-${Date.now()}-3`,
          type: "adjustment",
          source: "cockpit",
          target,
          action: "adjust_pricing",
          reason: message,
          executed: false,
        });
        break;

      case "update":
        message = `Autonomously updating funnels.`;
        result = { updated: true };
        decisions.push({
          id: `decision-auto-${Date.now()}-4`,
          type: "optimization",
          source: "cockpit",
          target,
          action: "update_funnels",
          reason: message,
          executed: false,
        });
        break;

      case "shift":
        message = `Autonomously shifting posting cadence.`;
        result = { shifted: true };
        decisions.push({
          id: `decision-auto-${Date.now()}-5`,
          type: "adjustment",
          source: "cockpit",
          target,
          action: "shift_cadence",
          reason: message,
          executed: false,
        });
        break;

      default:
        message = `Executing autonomous command: ${command.text}`;
        result = { executed: true };
    }

    const duration = Date.now() - startTime;

    return {
      commandId: command.id,
      success: true,
      mode: "autonomous",
      type: command.type,
      target,
      action,
      result,
      decisions,
      message,
      duration,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Cockpit Command Layer
 * Main orchestrator for all command modes
 */
export class CockpitCommandLayer {
  private directMode: DirectCommandMode;
  private contextualMode: ContextualCommandMode;
  private ritualMode: RitualCommandMode;
  private stateDrivenMode: StateDrivenCommandMode;
  private autonomousMode: AutonomousCommandMode;
  private commandHistory: Command[] = [];
  private maxHistorySize = 200;

  constructor() {
    this.directMode = new DirectCommandMode();
    this.contextualMode = new ContextualCommandMode();
    this.ritualMode = new RitualCommandMode();
    this.stateDrivenMode = new StateDrivenCommandMode();
    this.autonomousMode = new AutonomousCommandMode();
  }

  /**
   * Execute command
   */
  async executeCommand(
    text: string,
    mode: CommandMode,
    context?: {
      view?: CockpitView;
      state?: string;
      [key: string]: any;
    }
  ): Promise<CommandExecutionResult> {
    let command: Command;
    let result: CommandExecutionResult;

    // Parse command based on mode
    switch (mode) {
      case "direct":
        command = this.directMode.parseCommand(text);
        result = await this.directMode.execute(command);
        break;

      case "contextual":
        if (!context?.view) {
          throw new Error("Contextual mode requires view context");
        }
        command = this.contextualMode.parseCommand(text, { ...context, view: context.view });
        result = await this.contextualMode.execute(command);
        break;

      case "ritual":
        command = this.ritualMode.parseCommand(text);
        result = await this.ritualMode.execute(command);
        break;

      case "state_driven":
        const currentState = cockpitStateEngine.getCurrentState();
        command = this.stateDrivenMode.parseCommand(text, currentState);
        result = await this.stateDrivenMode.execute(command);
        break;

      case "autonomous":
        // Autonomous commands are generated, not parsed
        throw new Error("Autonomous commands must be generated, not executed directly");

      default:
        throw new Error(`Unknown command mode: ${mode}`);
    }

    // Store in history
    this.commandHistory.push(command);
    if (this.commandHistory.length > this.maxHistorySize) {
      this.commandHistory.shift();
    }

    return result;
  }

  /**
   * Generate and execute autonomous commands
   */
  async executeAutonomousCommands(intelligence: any): Promise<CommandExecutionResult[]> {
    const commands = await this.autonomousMode.generateCommands(intelligence);
    const results: CommandExecutionResult[] = [];

    for (const command of commands) {
      const result = await this.autonomousMode.execute(command);
      results.push(result);
      this.commandHistory.push(command);
    }

    if (this.commandHistory.length > this.maxHistorySize) {
      this.commandHistory = this.commandHistory.slice(-this.maxHistorySize);
    }

    return results;
  }

  /**
   * Get command history
   */
  getCommandHistory(limit: number = 50): Command[] {
    return this.commandHistory.slice(-limit);
  }

  /**
   * Clear command history
   */
  clearCommandHistory(): void {
    this.commandHistory = [];
  }
}

// Export singleton instance
export const cockpitCommandLayer = new CockpitCommandLayer();
