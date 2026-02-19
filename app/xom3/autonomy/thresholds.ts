// Adaptive Thresholds Module
// Computes adaptive thresholds for autonomous execution

export interface AdaptiveThresholds {
  restartCooldownMs: number;
  conflictWindowMs: number;
  maxExecutionsPerHour: number;
  errorRateThreshold: number;
}

export interface ExecutionData {
  executions: any[];
  log: any[];
}

/**
 * Compute adaptive thresholds based on execution history
 */
export function computeAdaptiveThresholds(data: ExecutionData): AdaptiveThresholds {
  const { executions } = data;
  
  // Default thresholds
  const defaults: AdaptiveThresholds = {
    restartCooldownMs: 300000, // 5 minutes
    conflictWindowMs: 10000,   // 10 seconds
    maxExecutionsPerHour: 100,
    errorRateThreshold: 0.1,   // 10%
  };
  
  if (!executions || executions.length === 0) {
    return defaults;
  }
  
  // Calculate error rate from recent executions
  const recentExecutions = executions.slice(-100);
  const errorCount = recentExecutions.filter((e: any) => e.success === false).length;
  const errorRate = errorCount / recentExecutions.length;
  
  // Adapt cooldown based on error rate
  let restartCooldownMs = defaults.restartCooldownMs;
  if (errorRate > 0.2) {
    // High error rate - increase cooldown
    restartCooldownMs = 600000; // 10 minutes
  } else if (errorRate < 0.05) {
    // Low error rate - decrease cooldown
    restartCooldownMs = 180000; // 3 minutes
  }
  
  return {
    ...defaults,
    restartCooldownMs,
    errorRateThreshold: errorRate,
  };
}
