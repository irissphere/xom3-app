// HSE Phase II - STRIKE 3: Behavior Layer
// The System's Autonomic Nervous System - Behaviors triggered by hyperstates

import { Hyperstate, HyperstateMap } from "./hyperstate-map";

/**
 * Behavior Action - An action to be executed based on hyperstate
 */
export interface BehaviorAction {
  type: string;
  target: string;
  parameters: Record<string, any>;
  description: string;
  executed: boolean;
  executedAt?: number;
  result?: string;
}

/**
 * Behavior Rule - Defines behaviors for a hyperstate
 */
export interface BehaviorRule {
  hyperstate: Hyperstate;
  actions: Array<{
    type: string;
    target: string;
    parameters: Record<string, any>;
    description: string;
    priority: number;
  }>;
}

/**
 * Behavior Execution State
 */
interface BehaviorState {
  activeBehaviors: Map<Hyperstate, BehaviorAction[]>;
  behaviorHistory: BehaviorAction[];
  rules: Map<Hyperstate, BehaviorRule>;
}

let behaviorState: BehaviorState = {
  activeBehaviors: new Map(),
  behaviorHistory: [],
  rules: new Map(),
};

/**
 * Initialize behavior layer with default rules
 */
export function initializeBehaviorLayer(): void {
  // NOMINAL behaviors (baseline operations)
  behaviorState.rules.set("NOMINAL", {
    hyperstate: "NOMINAL",
    actions: [
      {
        type: "monitor",
        target: "all",
        parameters: { frequency: "normal" },
        description: "Normal monitoring frequency",
        priority: 1,
      },
    ],
  });

  // ELEVATED_LOAD behaviors
  behaviorState.rules.set("ELEVATED_LOAD", {
    hyperstate: "ELEVATED_LOAD",
    actions: [
      {
        type: "throttle",
        target: "automations",
        parameters: { factor: 0.8, priority: "critical_only" },
        description: "Throttle non-essential automations to 80%",
        priority: 10,
      },
      {
        type: "cache",
        target: "cache",
        parameters: { ttl_multiplier: 1.5 },
        description: "Increase cache TTL by 50%",
        priority: 8,
      },
      {
        type: "sync",
        target: "background_sync",
        parameters: { frequency_reduction: 0.5 },
        description: "Reduce background sync frequency by 50%",
        priority: 7,
      },
      {
        type: "monitor",
        target: "all",
        parameters: { frequency: "elevated" },
        description: "Increase monitoring frequency",
        priority: 5,
      },
    ],
  });

  // DEGRADED behaviors
  behaviorState.rules.set("DEGRADED", {
    hyperstate: "DEGRADED",
    actions: [
      {
        type: "warn",
        target: "cockpit",
        parameters: { level: "warning", message: "System performance degraded" },
        description: "Surface warning in cockpit",
        priority: 10,
      },
      {
        type: "prioritize",
        target: "workflows",
        parameters: { priority: "critical_only" },
        description: "Prioritize critical workflows only",
        priority: 9,
      },
      {
        type: "disable",
        target: "analytics",
        parameters: { expensive: true },
        description: "Temporarily disable expensive analytics",
        priority: 8,
      },
      {
        type: "throttle",
        target: "automations",
        parameters: { factor: 0.5, priority: "critical_only" },
        description: "Throttle automations to 50%",
        priority: 7,
      },
      {
        type: "cache",
        target: "cache",
        parameters: { ttl_multiplier: 2.0 },
        description: "Double cache TTL",
        priority: 6,
      },
      {
        type: "monitor",
        target: "all",
        parameters: { frequency: "high" },
        description: "High-frequency monitoring",
        priority: 5,
      },
    ],
  });

  // CRITICAL behaviors
  behaviorState.rules.set("CRITICAL", {
    hyperstate: "CRITICAL",
    actions: [
      {
        type: "pause",
        target: "automations",
        parameters: { non_critical: true },
        description: "Pause all non-critical automations",
        priority: 20,
      },
      {
        type: "check",
        target: "consistency",
        parameters: { force: true, immediate: true },
        description: "Force immediate consistency checks",
        priority: 19,
      },
      {
        type: "alert",
        target: "system",
        parameters: { level: "critical", scope: "system_wide" },
        description: "Log system-wide critical alert",
        priority: 18,
      },
      {
        type: "activate",
        target: "recovery_routines",
        parameters: { mode: "aggressive" },
        description: "Activate aggressive recovery routines",
        priority: 17,
      },
      {
        type: "disable",
        target: "non_essential",
        parameters: { all: true },
        description: "Disable all non-essential operations",
        priority: 16,
      },
      {
        type: "monitor",
        target: "all",
        parameters: { frequency: "critical" },
        description: "Critical monitoring frequency",
        priority: 15,
      },
    ],
  });

  // RECOVERY_MODE behaviors
  behaviorState.rules.set("RECOVERY_MODE", {
    hyperstate: "RECOVERY_MODE",
    actions: [
      {
        type: "restore",
        target: "operations",
        parameters: { gradual: true, rate: 0.1 },
        description: "Gradually restore normal operations (10% at a time)",
        priority: 10,
      },
      {
        type: "enable",
        target: "automations",
        parameters: { critical_first: true, rate: 0.2 },
        description: "Re-enable automations starting with critical (20% at a time)",
        priority: 9,
      },
      {
        type: "flush",
        target: "cache",
        parameters: { stale_only: true },
        description: "Flush stale cache entries",
        priority: 8,
      },
      {
        type: "detect",
        target: "drift",
        parameters: { frequency: "high" },
        description: "Run drift detection frequently",
        priority: 7,
      },
      {
        type: "monitor",
        target: "all",
        parameters: { frequency: "elevated" },
        description: "Elevated monitoring during recovery",
        priority: 6,
      },
    ],
  });
}

/**
 * Execute behaviors for a hyperstate
 */
export async function executeBehaviors(
  hyperstate: Hyperstate,
  map: HyperstateMap
): Promise<BehaviorAction[]> {
  // Initialize if needed
  if (behaviorState.rules.size === 0) {
    initializeBehaviorLayer();
  }

  const rule = behaviorState.rules.get(hyperstate);
  if (!rule) {
    return [];
  }

  // Get previous behaviors for this hyperstate
  const previousBehaviors = behaviorState.activeBehaviors.get(hyperstate) || [];
  
  // Create new behaviors from rule
  const newBehaviors: BehaviorAction[] = rule.actions.map(action => ({
    type: action.type,
    target: action.target,
    parameters: action.parameters,
    description: action.description,
    executed: false,
  }));

  // Execute behaviors that haven't been executed yet
  const toExecute = newBehaviors.filter(newAction => {
    // Check if this action was already executed
    const alreadyExecuted = previousBehaviors.some(prev => 
      prev.type === newAction.type &&
      prev.target === newAction.target &&
      prev.executed
    );
    return !alreadyExecuted;
  });

  // Sort by priority (highest first)
  toExecute.sort((a, b) => {
    const aPriority = rule.actions.find(r => r.type === a.type && r.target === a.target)?.priority || 0;
    const bPriority = rule.actions.find(r => r.type === b.type && r.target === b.target)?.priority || 0;
    return bPriority - aPriority;
  });

  // Execute behaviors
  const executed: BehaviorAction[] = [];
  for (const action of toExecute) {
    try {
      const result = await executeBehaviorAction(action, map);
      action.executed = true;
      action.executedAt = Date.now();
      action.result = result;
      executed.push(action);
      
      // Add to history
      behaviorState.behaviorHistory.push({ ...action });
      
      // Keep only last 500 actions
      if (behaviorState.behaviorHistory.length > 500) {
        behaviorState.behaviorHistory.shift();
      }
    } catch (error) {
      action.executed = false;
      action.result = `Error: ${error}`;
      executed.push(action);
    }
  }

  // Update active behaviors
  behaviorState.activeBehaviors.set(hyperstate, newBehaviors);

  return executed;
}

/**
 * Execute a single behavior action
 */
async function executeBehaviorAction(
  action: BehaviorAction,
  map: HyperstateMap
): Promise<string> {
  // Import behavior executor for actual execution
  const {
    executeThrottleAutomations,
    executeBoostCache,
    executeReduceSyncFrequency,
    executePauseAnalytics,
    executePauseNonCriticalAutomations,
  } = await import('./behavior-executor');
  
  switch (action.type) {
    case "throttle":
      const throttleResult = await executeThrottleAutomations(
        action.parameters.factor || 0.8,
        action.parameters.priority || "critical_only"
      );
      return throttleResult.result || throttleResult.error || "Throttle executed";
    
    case "cache":
      const cacheResult = await executeBoostCache(action.parameters.ttl_multiplier || 1.5);
      return cacheResult.result || cacheResult.error || "Cache boost executed";
    
    case "sync":
      const syncResult = await executeReduceSyncFrequency(action.parameters.frequency_reduction || 0.5);
      return syncResult.result || syncResult.error || "Sync frequency reduced";
    
    case "warn":
      // TODO: Integrate with cockpit notification system
      return `Warning surfaced: ${action.parameters.message || "System alert"}`;
    
    case "prioritize":
      // TODO: Integrate with workflow prioritization
      return `Prioritized ${action.target} workflows`;
    
    case "disable":
      if (action.target === "analytics" && action.parameters.expensive) {
        const analyticsResult = await executePauseAnalytics();
        return analyticsResult.result || analyticsResult.error || "Analytics paused";
      }
      return `Disabled ${action.target} (expensive: ${action.parameters.expensive || false})`;
    
    case "pause":
      if (action.target === "automations" && action.parameters.non_critical) {
        const pauseResult = await executePauseNonCriticalAutomations();
        return pauseResult.result || pauseResult.error || "Non-critical automations paused";
      }
      return `Paused ${action.target} automations`;
    
    case "check":
      // TODO: Integrate with consistency checking system
      return `Forced consistency check on ${action.target}`;
    
    case "alert":
      // TODO: Integrate with alerting system
      return `System-wide alert logged: ${action.parameters.level || "critical"}`;
    
    case "activate":
      // TODO: Integrate with recovery system
      return `Activated ${action.target} in ${action.parameters.mode || "normal"} mode`;
    
    case "restore":
      // TODO: Integrate with operation restoration system
      return `Restoring operations at ${action.parameters.rate || 0.1} rate`;
    
    case "enable":
      // TODO: Integrate with automation enable system
      return `Enabling ${action.target} at ${action.parameters.rate || 0.2} rate`;
    
    case "flush":
      // TODO: Integrate with cache flush system
      return `Flushed ${action.target} (stale only: ${action.parameters.stale_only || false})`;
    
    case "detect":
      // TODO: Integrate with drift detection system
      return `Running drift detection on ${action.target}`;
    
    case "monitor":
      // TODO: Integrate with monitoring system
      return `Monitoring frequency set to ${action.parameters.frequency || "normal"}`;
    
    default:
      return `Unknown action type: ${action.type}`;
  }
}

/**
 * Get active behaviors for a hyperstate
 */
export function getActiveBehaviors(hyperstate: Hyperstate): BehaviorAction[] {
  return behaviorState.activeBehaviors.get(hyperstate) || [];
}

/**
 * Get behavior history
 */
export function getBehaviorHistory(limit?: number): BehaviorAction[] {
  const history = [...behaviorState.behaviorHistory];
  if (limit) {
    return history.slice(-limit);
  }
  return history;
}

/**
 * Clear behaviors for a hyperstate (when transitioning away)
 */
export function clearBehaviors(hyperstate: Hyperstate): void {
  behaviorState.activeBehaviors.delete(hyperstate);
}

/**
 * Reset behavior layer (for testing)
 */
export function resetBehaviorLayer(): void {
  behaviorState = {
    activeBehaviors: new Map(),
    behaviorHistory: [],
    rules: new Map(),
  };
  initializeBehaviorLayer();
}
