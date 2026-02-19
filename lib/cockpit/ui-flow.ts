// Unified Cockpit - UI Flow Layer (STRIKE 6)
// The movement system that enables zero-friction navigation
// AKV: Clean, surgical, zero drift

import {
  CockpitView,
  CockpitSignal,
  CockpitDecision,
  SignalSeverity,
} from "./types";
import { cockpitIntelligenceEngine } from "./intelligence";
import { crossEngineSignalRouter } from "./signal-map";

/**
 * Movement Mode Types
 * The 5 ways the operator travels through the cockpit
 */
export type MovementMode =
  | "linear" // Ritual Path
  | "reactive" // Signal Path
  | "strategic" // Executive Path
  | "agent" // Crew Path
  | "hyperstate"; // Mood Path

/**
 * Transition Type
 */
export type TransitionType = "fade" | "slide" | "instant" | "pressure" | "ritual";

/**
 * Flow Context
 * Retains context during navigation
 */
export interface FlowContext {
  previousView: CockpitView | null;
  currentView: CockpitView;
  movementMode: MovementMode;
  signalTrigger?: CockpitSignal | null;
  pressureLevel?: number;
  ritualPhase?: string;
  focusArea?: string;
  timestamp: number;
}

/**
 * Navigation Decision
 */
export interface NavigationDecision {
  targetView: CockpitView;
  movementMode: MovementMode;
  transitionType: TransitionType;
  reason: string;
  priority: number;
  context: FlowContext;
  estimatedDuration?: number; // milliseconds
}

/**
 * Linear Flow Mode (The Ritual Path)
 * Used during: morning activation, nightly closure, weekly ceremonies
 * Flow: System → Operations → Executive → Ritual → System
 */
export class LinearFlowMode {
  /**
   * Calculate next view in ritual path
   */
  calculateNextView(
    currentView: CockpitView,
    ritualPhase: string
  ): NavigationDecision {
    const flow: CockpitView[] = ["system", "operations", "executive", "ritual", "system"];
    const currentIndex = flow.indexOf(currentView);
    const nextIndex = (currentIndex + 1) % flow.length;
    const nextView = flow[nextIndex];

    return {
      targetView: nextView,
      movementMode: "linear",
      transitionType: "ritual",
      reason: `Ritual path: ${ritualPhase} → moving to ${nextView}`,
      priority: 1.0,
      context: {
        previousView: currentView,
        currentView: nextView,
        movementMode: "linear",
        ritualPhase,
        timestamp: Date.now(),
      },
      estimatedDuration: 300, // Smooth ritual transition
    };
  }

  /**
   * Get full ritual loop
   */
  getRitualLoop(): CockpitView[] {
    return ["system", "operations", "executive", "ritual", "system"];
  }
}

/**
 * Reactive Flow Mode (The Signal Path)
 * Triggered by: anomalies, pressure spikes, revenue dips, trend surges
 * Flow: Signal → Relevant Surface → Action → Return
 */
export class ReactiveFlowMode {
  /**
   * Calculate target view based on signal
   */
  calculateTargetView(signal: CockpitSignal): NavigationDecision {
    let targetView: CockpitView = "system";
    let reason = "";
    let priority = 0.5;

    // Anomaly → Operations View
    if (signal.type.includes("anomaly") || signal.severity === "critical") {
      targetView = "operations";
      reason = `Critical anomaly detected: ${signal.type}. Navigating to Operations View.`;
      priority = 1.0;
    }
    // Revenue dip → Executive View
    else if (signal.type.includes("revenue") || signal.type.includes("roas")) {
      targetView = "executive";
      reason = `Revenue signal: ${signal.type}. Navigating to Executive View.`;
      priority = 0.9;
    }
    // Trend surge → Operations View
    else if (signal.type.includes("trend") || signal.type.includes("spike")) {
      targetView = "operations";
      reason = `Trend signal: ${signal.type}. Navigating to Operations View.`;
      priority = 0.8;
    }
    // Pressure spike → System View
    else if (signal.type.includes("pressure")) {
      targetView = "system";
      reason = `Pressure signal: ${signal.type}. Navigating to System View.`;
      priority = 0.9;
    }
    // Agent signal → Agent View
    else if (signal.source === "agent") {
      targetView = "agent";
      reason = `Agent signal: ${signal.type}. Navigating to Agent View.`;
      priority = 0.8;
    }

    return {
      targetView,
      movementMode: "reactive",
      transitionType: signal.severity === "critical" ? "instant" : "slide",
      reason,
      priority,
      context: {
        previousView: null,
        currentView: targetView,
        movementMode: "reactive",
        signalTrigger: signal,
        timestamp: Date.now(),
      },
      estimatedDuration: signal.severity === "critical" ? 0 : 200,
    };
  }

  /**
   * Calculate return view
   */
  calculateReturnView(originalView: CockpitView): NavigationDecision {
    return {
      targetView: originalView,
      movementMode: "reactive",
      transitionType: "fade",
      reason: "Returning to previous view after signal action",
      priority: 0.5,
      context: {
        previousView: null,
        currentView: originalView,
        movementMode: "reactive",
        timestamp: Date.now(),
      },
      estimatedDuration: 250,
    };
  }
}

/**
 * Strategic Flow Mode (The Executive Path)
 * Used for: planning, scaling, forecasting, optimization cycles
 * Flow: Executive → Revenue → Optimization → Executive
 */
export class StrategicFlowMode {
  /**
   * Calculate next view in strategic path
   */
  calculateNextView(
    currentView: CockpitView,
    strategicPhase: "planning" | "scaling" | "forecasting" | "optimization"
  ): NavigationDecision {
    let targetView: CockpitView = "executive";
    let reason = "";

    switch (strategicPhase) {
      case "planning":
        targetView = "executive";
        reason = "Strategic planning phase → Executive View";
        break;
      case "scaling":
        targetView = "operations";
        reason = "Scaling phase → Operations View";
        break;
      case "forecasting":
        targetView = "executive";
        reason = "Forecasting phase → Executive View";
        break;
      case "optimization":
        targetView = "system";
        reason = "Optimization phase → System View";
        break;
    }

    return {
      targetView,
      movementMode: "strategic",
      transitionType: "fade",
      reason,
      priority: 0.7,
      context: {
        previousView: currentView,
        currentView: targetView,
        movementMode: "strategic",
        timestamp: Date.now(),
      },
      estimatedDuration: 400,
    };
  }

  /**
   * Get strategic loop
   */
  getStrategicLoop(): CockpitView[] {
    return ["executive", "operations", "system", "executive"];
  }
}

/**
 * Agent Flow Mode (The Crew Path)
 * Used for: task assignment, load balancing, performance review, workflow adjustments
 * Flow: Agent View → Operations → Agent View
 */
export class AgentFlowMode {
  /**
   * Calculate next view in agent path
   */
  calculateNextView(
    currentView: CockpitView,
    agentAction: "assign" | "balance" | "review" | "adjust"
  ): NavigationDecision {
    let targetView: CockpitView = "agent";
    let reason = "";

    switch (agentAction) {
      case "assign":
      case "balance":
        targetView = "operations";
        reason = `Agent action: ${agentAction} → Operations View`;
        break;
      case "review":
      case "adjust":
        targetView = "agent";
        reason = `Agent action: ${agentAction} → Agent View`;
        break;
    }

    return {
      targetView,
      movementMode: "agent",
      transitionType: "slide",
      reason,
      priority: 0.6,
      context: {
        previousView: currentView,
        currentView: targetView,
        movementMode: "agent",
        timestamp: Date.now(),
      },
      estimatedDuration: 250,
    };
  }

  /**
   * Get agent loop
   */
  getAgentLoop(): CockpitView[] {
    return ["agent", "operations", "agent"];
  }
}

/**
 * Hyperstate Flow Mode (The Mood Path)
 * Triggered by: operator fatigue, system overload, emotional pressure, anomaly clusters
 * Flow: HSE → UI Shift → Ritual Prompt → Stabilization
 */
export class HyperstateFlowMode {
  /**
   * Calculate UI shift based on hyperstate
   */
  calculateUIShift(
    pressureLevel: number,
    operatorState: "fatigue" | "overload" | "pressure" | "anomaly_cluster" | "normal"
  ): NavigationDecision {
    let targetView: CockpitView = "system";
    let transitionType: TransitionType = "pressure";
    let reason = "";
    let priority = 0.8;

    // High pressure → Ritual View (stabilization)
    if (pressureLevel > 80 || operatorState === "fatigue") {
      targetView = "ritual";
      transitionType = "pressure";
      reason = `High pressure detected (${pressureLevel}%). Navigating to Ritual View for stabilization.`;
      priority = 1.0;
    }
    // Overload → System View (overview)
    else if (operatorState === "overload") {
      targetView = "system";
      transitionType = "pressure";
      reason = "System overload detected. Navigating to System View for overview.";
      priority = 0.9;
    }
    // Anomaly cluster → Operations View
    else if (operatorState === "anomaly_cluster") {
      targetView = "operations";
      transitionType = "instant";
      reason = "Anomaly cluster detected. Navigating to Operations View.";
      priority = 1.0;
    }
    // Normal → Current view maintained
    else {
      targetView = "system";
      transitionType = "fade";
      reason = "Normal state. Maintaining current view.";
      priority = 0.3;
    }

    return {
      targetView,
      movementMode: "hyperstate",
      transitionType,
      reason,
      priority,
      context: {
        previousView: null,
        currentView: targetView,
        movementMode: "hyperstate",
        pressureLevel,
        timestamp: Date.now(),
      },
      estimatedDuration: transitionType === "instant" ? 0 : 300,
    };
  }

  /**
   * Calculate stabilization path
   */
  calculateStabilizationPath(): NavigationDecision[] {
    return [
      {
        targetView: "ritual",
        movementMode: "hyperstate",
        transitionType: "pressure",
        reason: "Stabilization: Navigate to Ritual View",
        priority: 1.0,
        context: {
          previousView: null,
          currentView: "ritual",
          movementMode: "hyperstate",
          timestamp: Date.now(),
        },
      },
      {
        targetView: "system",
        movementMode: "hyperstate",
        transitionType: "fade",
        reason: "Stabilization: Return to System View",
        priority: 0.5,
        context: {
          previousView: "ritual",
          currentView: "system",
          movementMode: "hyperstate",
          timestamp: Date.now(),
        },
      },
    ];
  }
}

/**
 * UI Flow Engine
 * Controls transitions, animations, surface hierarchy, context retention, focus management
 */
export class UIFlowEngine {
  private linearFlow: LinearFlowMode;
  private reactiveFlow: ReactiveFlowMode;
  private strategicFlow: StrategicFlowMode;
  private agentFlow: AgentFlowMode;
  private hyperstateFlow: HyperstateFlowMode;
  private contextHistory: FlowContext[] = [];
  private maxContextHistory = 50;

  constructor() {
    this.linearFlow = new LinearFlowMode();
    this.reactiveFlow = new ReactiveFlowMode();
    this.strategicFlow = new StrategicFlowMode();
    this.agentFlow = new AgentFlowMode();
    this.hyperstateFlow = new HyperstateFlowMode();
  }

  /**
   * Navigate based on movement mode
   */
  async navigate(
    currentView: CockpitView,
    movementMode: MovementMode,
    context?: {
      signal?: CockpitSignal;
      ritualPhase?: string;
      strategicPhase?: "planning" | "scaling" | "forecasting" | "optimization";
      agentAction?: "assign" | "balance" | "review" | "adjust";
      pressureLevel?: number;
      operatorState?: "fatigue" | "overload" | "pressure" | "anomaly_cluster" | "normal";
    }
  ): Promise<NavigationDecision> {
    let decision: NavigationDecision;

    switch (movementMode) {
      case "linear":
        decision = this.linearFlow.calculateNextView(
          currentView,
          context?.ritualPhase || "default"
        );
        break;

      case "reactive":
        if (!context?.signal) {
          throw new Error("Reactive flow requires a signal");
        }
        decision = this.reactiveFlow.calculateTargetView(context.signal);
        break;

      case "strategic":
        decision = this.strategicFlow.calculateNextView(
          currentView,
          context?.strategicPhase || "planning"
        );
        break;

      case "agent":
        decision = this.agentFlow.calculateNextView(
          currentView,
          context?.agentAction || "review"
        );
        break;

      case "hyperstate":
        decision = this.hyperstateFlow.calculateUIShift(
          context?.pressureLevel || 0,
          context?.operatorState || "normal"
        );
        break;

      default:
        throw new Error(`Unknown movement mode: ${movementMode}`);
    }

    // Store context
    this.storeContext(decision.context);

    return decision;
  }

  /**
   * Auto-navigate based on signal
   */
  async autoNavigate(signal: CockpitSignal): Promise<NavigationDecision> {
    // Determine movement mode from signal
    let movementMode: MovementMode = "reactive";

    if (signal.type.includes("ritual") || signal.source === "ritual") {
      movementMode = "linear";
    } else if (signal.type.includes("pressure") || signal.source === "hse") {
      movementMode = "hyperstate";
    } else if (signal.source === "agent") {
      movementMode = "agent";
    } else if (signal.type.includes("revenue") || signal.type.includes("ltv")) {
      movementMode = "strategic";
    }

    return await this.navigate("system", movementMode, { signal });
  }

  /**
   * Get suggested navigation paths
   */
  async getSuggestedPaths(
    currentView: CockpitView,
    context?: {
      pressureLevel?: number;
      signalCount?: number;
      ritualActive?: boolean;
    }
  ): Promise<NavigationDecision[]> {
    const suggestions: NavigationDecision[] = [];

    // High pressure → Suggest Ritual View
    if (context?.pressureLevel && context.pressureLevel > 70) {
      suggestions.push(
        await this.navigate(currentView, "hyperstate", {
          pressureLevel: context.pressureLevel,
          operatorState: "pressure",
        })
      );
    }

    // Many signals → Suggest Operations View
    if (context?.signalCount && context.signalCount > 10) {
      suggestions.push({
        targetView: "operations",
        movementMode: "reactive",
        transitionType: "slide",
        reason: "High signal volume. Operations View recommended.",
        priority: 0.7,
        context: {
          previousView: currentView,
          currentView: "operations",
          movementMode: "reactive",
          timestamp: Date.now(),
        },
      });
    }

    // Ritual active → Suggest Ritual View
    if (context?.ritualActive) {
      suggestions.push(
        await this.navigate(currentView, "linear", {
          ritualPhase: "active",
        })
      );
    }

    // Default: Suggest all views
    if (suggestions.length === 0) {
      const allViews: CockpitView[] = ["system", "operations", "executive", "agent", "ritual"];
      for (const view of allViews) {
        if (view !== currentView) {
          suggestions.push({
            targetView: view,
            movementMode: "linear",
            transitionType: "fade",
            reason: `Navigate to ${view}`,
            priority: 0.3,
            context: {
              previousView: currentView,
              currentView: view,
              movementMode: "linear",
              timestamp: Date.now(),
            },
          });
        }
      }
    }

    // Sort by priority
    return suggestions.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Store navigation context
   */
  private storeContext(context: FlowContext): void {
    this.contextHistory.push(context);
    if (this.contextHistory.length > this.maxContextHistory) {
      this.contextHistory.shift();
    }
  }

  /**
   * Get context history
   */
  getContextHistory(limit: number = 10): FlowContext[] {
    return this.contextHistory.slice(-limit);
  }

  /**
   * Get current context
   */
  getCurrentContext(): FlowContext | null {
    return this.contextHistory.length > 0
      ? this.contextHistory[this.contextHistory.length - 1]
      : null;
  }

  /**
   * Clear context history
   */
  clearContextHistory(): void {
    this.contextHistory = [];
  }

  /**
   * Get transition animation config
   */
  getTransitionConfig(transitionType: TransitionType): {
    duration: number;
    easing: string;
    effect: string;
  } {
    switch (transitionType) {
      case "instant":
        return { duration: 0, easing: "linear", effect: "none" };
      case "fade":
        return { duration: 300, easing: "ease-in-out", effect: "fade" };
      case "slide":
        return { duration: 250, easing: "ease-out", effect: "slide" };
      case "pressure":
        return { duration: 400, easing: "ease-in-out", effect: "pulse" };
      case "ritual":
        return { duration: 500, easing: "ease-in-out", effect: "ritual" };
      default:
        return { duration: 300, easing: "ease-in-out", effect: "fade" };
    }
  }
}

// Export singleton instance
export const uiFlowEngine = new UIFlowEngine();
