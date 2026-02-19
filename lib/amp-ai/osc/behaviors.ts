// 🌌 STRIKE 3: Replace Workflows With Behaviors
// Instinct-based actions instead of instructions

import { Behavior } from "./types";

/**
 * Create behavior in continuum
 */
export function createBehavior(
  type: Behavior["type"],
  instinct: string,
  trigger: Behavior["trigger"],
  action: Behavior["action"]
): Behavior {
  return {
    id: `behavior-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    instinct,
    trigger,
    action,
    state: "dormant",
    lastExecuted: new Date().toISOString()
  };
}

/**
 * Initialize continuum behaviors
 */
export function initializeContinuumBehaviors(): Behavior[] {
  return [
    createBehavior(
      "adapt",
      "Continuum adapts to changes in data shape",
      { condition: "schema_drift_detected", threshold: 0.3 },
      { type: "rewrite_attractors", intensity: 0.7, duration: 5000 }
    ),
    createBehavior(
      "predict",
      "Continuum predicts future distortions",
      { condition: "pattern_detected", threshold: 0.8 },
      { type: "preventive_stabilization", intensity: 0.6, duration: 3000 }
    ),
    createBehavior(
      "rewrite",
      "Continuum rewrites flows to optimize",
      { condition: "flow_inefficiency", threshold: 0.5 },
      { type: "flow_optimization", intensity: 0.8, duration: 4000 }
    ),
    createBehavior(
      "protect",
      "Continuum protects field integrity",
      { condition: "distortion_detected", threshold: 0.4 },
      { type: "field_stabilization", intensity: 0.9, duration: 2000 }
    ),
    createBehavior(
      "expand",
      "Continuum expands capabilities",
      { condition: "new_pattern", threshold: 0.7 },
      { type: "attractor_creation", intensity: 0.5, duration: 6000 }
    ),
    createBehavior(
      "balance",
      "Continuum balances field energy",
      { condition: "load_imbalance", threshold: 0.6 },
      { type: "rhythm_adjustment", intensity: 0.7, duration: 3000 }
    ),
    createBehavior(
      "harmonize",
      "Continuum harmonizes all elements",
      { condition: "coherence_low", threshold: 0.5 },
      { type: "field_harmonization", intensity: 0.8, duration: 5000 }
    )
  ];
}

/**
 * Execute behavior
 */
export function executeBehavior(behavior: Behavior, context: any): {
  executed: boolean;
  result: string;
} {
  if (behavior.state === "dormant") {
    // Check if trigger condition is met
    const shouldExecute = evaluateTrigger(behavior.trigger, context);

    if (shouldExecute) {
      behavior.state = "executing";
      behavior.lastExecuted = new Date().toISOString();

      return {
        executed: true,
        result: `${behavior.type} behavior executed: ${behavior.instinct}`
      };
    }
  }

  return {
    executed: false,
    result: "Behavior not triggered"
  };
}

/**
 * Evaluate trigger condition
 */
function evaluateTrigger(
  trigger: Behavior["trigger"],
  context: any
): boolean {
  // Simplified trigger evaluation
  if (trigger.condition === "schema_drift_detected") {
    return (context.drift || 0) >= trigger.threshold;
  }
  if (trigger.condition === "pattern_detected") {
    return (context.patternConfidence || 0) >= trigger.threshold;
  }
  if (trigger.condition === "flow_inefficiency") {
    return (context.flowEfficiency || 1.0) <= (1 - trigger.threshold);
  }
  if (trigger.condition === "distortion_detected") {
    return (context.distortionMagnitude || 0) >= trigger.threshold;
  }
  if (trigger.condition === "new_pattern") {
    return (context.patternNovelty || 0) >= trigger.threshold;
  }
  if (trigger.condition === "load_imbalance") {
    return (context.loadVariance || 0) >= trigger.threshold;
  }
  if (trigger.condition === "coherence_low") {
    return (context.coherence || 1.0) <= trigger.threshold;
  }

  return false;
}
