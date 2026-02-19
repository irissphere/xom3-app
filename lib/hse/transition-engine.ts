// HSE Phase II - STRIKE 2: Transition Engine
// The System's Reflex Layer - Rules for state transitions

import { Hyperstate, HyperstateMap, HYPERSTATE_THRESHOLDS } from "./hyperstate-map";

/**
 * Transition Rule - Defines when to transition between hyperstates
 */
export interface TransitionRule {
  from: Hyperstate | "*";  // "*" means any state
  to: Hyperstate;
  condition: (map: HyperstateMap) => boolean;
  priority: number;  // Higher priority rules checked first
  description: string;
}

/**
 * Transition Event - Record of a state transition
 */
export interface TransitionEvent {
  from: Hyperstate;
  to: Hyperstate;
  timestamp: number;
  reason: string;
  contributingSignals: Array<{ signal: string; value: number; threshold: number }>;
  duration: number;  // How long we were in the previous state
}

/**
 * Transition Engine State
 */
interface TransitionEngineState {
  currentHyperstate: Hyperstate;
  lastTransition: TransitionEvent | null;
  transitionHistory: TransitionEvent[];
  rules: TransitionRule[];
}

let engineState: TransitionEngineState = {
  currentHyperstate: "NOMINAL",
  lastTransition: null,
  transitionHistory: [],
  rules: [],
};

/**
 * Initialize transition engine with default rules
 */
export function initializeTransitionEngine(): void {
  engineState.rules = [
    // CRITICAL transitions (highest priority)
    {
      from: "*",
      to: "CRITICAL",
      priority: 100,
      description: "Queue depth exceeds critical threshold",
      condition: (map) => map.signals.automationQueueDepth > 0.9,
    },
    {
      from: "*",
      to: "CRITICAL",
      priority: 100,
      description: "Dead letter queue exceeds critical threshold",
      condition: (map) => map.signals.deadLetterQueueCount > 0.8,
    },
    {
      from: "*",
      to: "CRITICAL",
      priority: 100,
      description: "Consistency issues exceed critical threshold",
      condition: (map) => map.signals.consistencyIssues > 0.3,
    },
    {
      from: "*",
      to: "CRITICAL",
      priority: 100,
      description: "Drift score exceeds critical threshold",
      condition: (map) => map.signals.driftScore > 0.5,
    },

    // DEGRADED transitions
    {
      from: "*",
      to: "DEGRADED",
      priority: 80,
      description: "Performance degradation detected",
      condition: (map) => map.signals.performanceHeatmapSeverity > 0.4,
    },
    {
      from: "*",
      to: "DEGRADED",
      priority: 80,
      description: "Cache efficiency below threshold",
      condition: (map) => map.signals.cachingEfficiency < 0.5,
    },
    {
      from: "*",
      to: "DEGRADED",
      priority: 80,
      description: "Dead letter queue building up",
      condition: (map) => map.signals.deadLetterQueueCount > 0.3 && map.signals.deadLetterQueueCount <= 0.8,
    },
    {
      from: "*",
      to: "DEGRADED",
      priority: 80,
      description: "Moderate drift detected",
      condition: (map) => map.signals.driftScore > 0.3 && map.signals.driftScore <= 0.5,
    },

    // ELEVATED_LOAD transitions
    {
      from: "*",
      to: "ELEVATED_LOAD",
      priority: 60,
      description: "Automation queue depth elevated",
      condition: (map) => map.signals.automationQueueDepth > 0.6 && map.signals.automationQueueDepth <= 0.9,
    },
    {
      from: "*",
      to: "ELEVATED_LOAD",
      priority: 60,
      description: "Background worker load elevated",
      condition: (map) => map.signals.backgroundWorkerLoad > 0.7 && map.signals.backgroundWorkerLoad <= 0.9,
    },
    {
      from: "*",
      to: "ELEVATED_LOAD",
      priority: 60,
      description: "Usage spike detected",
      condition: (map) => map.signals.usageSpikes > 0.5 && map.signals.usageSpikes <= 0.8,
    },

    // RECOVERY_MODE transitions
    {
      from: "CRITICAL",
      to: "RECOVERY_MODE",
      priority: 70,
      description: "System stabilizing after critical event",
      condition: (map) => {
        const allLow = 
          map.signals.automationQueueDepth < 0.3 &&
          map.signals.deadLetterQueueCount < 0.2 &&
          map.signals.performanceHeatmapSeverity < 0.3 &&
          map.signals.consistencyIssues < 0.2 &&
          map.signals.driftScore < 0.2;
        return allLow && map.duration > HYPERSTATE_THRESHOLDS.stabilityDuration;
      },
    },
    {
      from: "DEGRADED",
      to: "RECOVERY_MODE",
      priority: 70,
      description: "System recovering from degraded state",
      condition: (map) => {
        const improving = 
          map.signals.performanceHeatmapSeverity < 0.3 &&
          map.signals.deadLetterQueueCount < 0.2 &&
          map.signals.driftScore < 0.2;
        return improving && map.duration > HYPERSTATE_THRESHOLDS.stabilityDuration;
      },
    },

    // NOMINAL transitions (from recovery)
    {
      from: "RECOVERY_MODE",
      to: "NOMINAL",
      priority: 50,
      description: "System fully recovered to nominal state",
      condition: (map) => {
        const allNominal = 
          map.signals.automationQueueDepth < 0.3 &&
          map.signals.deadLetterQueueCount < 0.1 &&
          map.signals.performanceHeatmapSeverity < 0.2 &&
          map.signals.consistencyIssues < 0.1 &&
          map.signals.driftScore < 0.1 &&
          map.signals.usageSpikes < 0.3 &&
          map.signals.backgroundWorkerLoad < 0.5;
        return allNominal && map.duration > HYPERSTATE_THRESHOLDS.stabilityDuration;
      },
    },
    {
      from: "ELEVATED_LOAD",
      to: "NOMINAL",
      priority: 50,
      description: "Load normalized",
      condition: (map) => {
        const normalized = 
          map.signals.automationQueueDepth < 0.3 &&
          map.signals.backgroundWorkerLoad < 0.5 &&
          map.signals.usageSpikes < 0.3;
        return normalized && map.duration > 10000; // 10 seconds of stability
      },
    },
  ];

  // Sort rules by priority (highest first)
  engineState.rules.sort((a, b) => b.priority - a.priority);
}

/**
 * Evaluate transitions and return the target hyperstate
 */
export function evaluateTransitions(map: HyperstateMap): Hyperstate {
  // If this is the first evaluation, initialize
  if (engineState.rules.length === 0) {
    initializeTransitionEngine();
  }

  // Check rules in priority order
  for (const rule of engineState.rules) {
    // Skip if rule doesn't match current state (unless "*")
    if (rule.from !== "*" && rule.from !== engineState.currentHyperstate) {
      continue;
    }

    // Check if condition is met
    if (rule.condition(map)) {
      // Transition triggered
      const newHyperstate = rule.to;
      
      // Only transition if different from current
      if (newHyperstate !== engineState.currentHyperstate) {
        recordTransition(engineState.currentHyperstate, newHyperstate, rule.description, map);
        engineState.currentHyperstate = newHyperstate;
      }
      
      return newHyperstate;
    }
  }

  // No transition rule matched - return current state
  return engineState.currentHyperstate;
}

/**
 * Record a transition event
 */
function recordTransition(
  from: Hyperstate,
  to: Hyperstate,
  reason: string,
  map: HyperstateMap
): void {
  const now = Date.now();
  
  // Find contributing signals that exceeded thresholds
  const contributingSignals: Array<{ signal: string; value: number; threshold: number }> = [];
  
  if (map.signals.automationQueueDepth > map.thresholds.queueDepthThreshold) {
    contributingSignals.push({
      signal: "automationQueueDepth",
      value: map.signals.automationQueueDepth,
      threshold: map.thresholds.queueDepthThreshold,
    });
  }
  if (map.signals.deadLetterQueueCount > map.thresholds.deadLetterThreshold / 100) {
    contributingSignals.push({
      signal: "deadLetterQueueCount",
      value: map.signals.deadLetterQueueCount,
      threshold: map.thresholds.deadLetterThreshold / 100,
    });
  }
  if (map.signals.performanceHeatmapSeverity > map.thresholds.performanceThreshold) {
    contributingSignals.push({
      signal: "performanceHeatmapSeverity",
      value: map.signals.performanceHeatmapSeverity,
      threshold: map.thresholds.performanceThreshold,
    });
  }
  if (map.signals.consistencyIssues > map.thresholds.consistencyThreshold) {
    contributingSignals.push({
      signal: "consistencyIssues",
      value: map.signals.consistencyIssues,
      threshold: map.thresholds.consistencyThreshold,
    });
  }
  if (map.signals.driftScore > map.thresholds.driftThreshold) {
    contributingSignals.push({
      signal: "driftScore",
      value: map.signals.driftScore,
      threshold: map.thresholds.driftThreshold,
    });
  }

  const transition: TransitionEvent = {
    from,
    to,
    timestamp: now,
    reason,
    contributingSignals,
    duration: map.duration,
  };

  engineState.lastTransition = transition;
  engineState.transitionHistory.push(transition);

  // Keep only last 100 transitions
  if (engineState.transitionHistory.length > 100) {
    engineState.transitionHistory.shift();
  }
}

/**
 * Get current hyperstate
 */
export function getCurrentHyperstate(): Hyperstate {
  return engineState.currentHyperstate;
}

/**
 * Get last transition
 */
export function getLastTransition(): TransitionEvent | null {
  return engineState.lastTransition;
}

/**
 * Get transition history
 */
export function getTransitionHistory(limit?: number): TransitionEvent[] {
  const history = [...engineState.transitionHistory];
  if (limit) {
    return history.slice(-limit);
  }
  return history;
}

/**
 * Add custom transition rule
 */
export function addTransitionRule(rule: TransitionRule): void {
  engineState.rules.push(rule);
  engineState.rules.sort((a, b) => b.priority - a.priority);
}

/**
 * Reset transition engine (for testing)
 */
export function resetTransitionEngine(): void {
  engineState = {
    currentHyperstate: "NOMINAL",
    lastTransition: null,
    transitionHistory: [],
    rules: [],
  };
  initializeTransitionEngine();
}
