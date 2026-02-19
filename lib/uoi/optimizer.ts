// UOI Optimizer - Improves flows over time
// This is the intelligence layer

import { rememberPattern, recall, getEffectiveMemories } from "./memory";

export interface Optimization {
  id: string;
  type: "pipeline_order" | "mapping_rule" | "workflow_route" | "resource_allocation";
  change: any;
  impact: number;
  applied: boolean;
  appliedAt?: string;
}

/**
 * Analyze signals for patterns (for heartbeat)
 */
export function analyzeSignals(signals: any[]): {
  errorRate: number;
  driftCount: number;
  queuePressure: number;
} {
  if (signals.length === 0) {
    return { errorRate: 0, driftCount: 0, queuePressure: 0 };
  }

  const errors = signals.filter(s => s.type === "error");
  const drift = signals.filter(s => s.type === "drift");
  const queue = signals.filter(s => s.type === "queue" || s.type === "metric");

  return {
    errorRate: errors.length / signals.length,
    driftCount: drift.length,
    queuePressure: queue.reduce((a, b) => a + (b.payload?.workflowQueue || b.payload?.queueLength || 0), 0)
  };
}

/**
 * Detect cross-domain patterns (FEDERATION MODE)
 */
export function detectCrossDomainPatterns(
  signals: any[],
  context: any
): Array<{
  pattern: string;
  subsystems: string[];
  severity: "low" | "medium" | "high" | "critical";
  evidence: any[];
}> {
  const patterns: Array<{
    pattern: string;
    subsystems: string[];
    severity: "low" | "medium" | "high" | "critical";
    evidence: any[];
  }> = [];

  if (!signals.length) return patterns;

  // Group signals by subsystem
  const bySubsystem: Record<string, any[]> = {};
  signals.forEach(s => {
    const source = s.source || "unknown";
    if (!bySubsystem[source]) bySubsystem[source] = [];
    bySubsystem[source].push(s);
  });

  const subsystems = Object.keys(bySubsystem);

  // Pattern 1: AMP errors + Workflow congestion
  const ampErrors = bySubsystem.amp?.filter(s => s.type === "error") || [];
  const workflowQueue = bySubsystem.workflow?.filter(s => 
    s.type === "metric" && (s.payload?.workflowQueue > 20 || s.payload?.queueLength > 20)
  ) || [];
  
  if (ampErrors.length > 0 && workflowQueue.length > 0) {
    patterns.push({
      pattern: "AMP errors + Workflow congestion",
      subsystems: ["amp", "workflow"],
      severity: ampErrors.length > 5 ? "critical" : "high",
      evidence: [...ampErrors.slice(0, 3), ...workflowQueue.slice(0, 2)]
    });
  }

  // Pattern 2: Compliance violations + Notification failures
  const complianceViolations = bySubsystem.compliance?.filter(s => 
    s.type === "anomaly" || s.priority === "high" || s.priority === "critical"
  ) || [];
  const notificationFailures = bySubsystem.notification?.filter(s => 
    s.type === "error" || s.type === "metric" && s.payload?.failureRate > 0.1
  ) || [];
  
  if (complianceViolations.length > 0 && notificationFailures.length > 0) {
    patterns.push({
      pattern: "Compliance violations + Notification failures",
      subsystems: ["compliance", "notification"],
      severity: complianceViolations.some((s: any) => s.priority === "critical") ? "critical" : "high",
      evidence: [...complianceViolations.slice(0, 2), ...notificationFailures.slice(0, 2)]
    });
  }

  // Pattern 3: Analytics risk + AMP drift
  const analyticsRisk = bySubsystem.analytics?.filter(s => 
    s.type === "anomaly" || s.type === "pattern" && s.payload?.riskScore > 0.7
  ) || [];
  const ampDrift = bySubsystem.amp?.filter(s => s.type === "drift") || [];
  
  if (analyticsRisk.length > 0 && ampDrift.length > 0) {
    patterns.push({
      pattern: "Analytics risk + AMP drift",
      subsystems: ["analytics", "amp"],
      severity: "high",
      evidence: [...analyticsRisk.slice(0, 2), ...ampDrift.slice(0, 2)]
    });
  }

  // Pattern 4: Workflow retries + Compliance anomalies
  const workflowRetries = bySubsystem.workflow?.filter(s => 
    s.type === "metric" && s.payload?.retryCount > 3
  ) || [];
  const complianceAnomalies = bySubsystem.compliance?.filter(s => s.type === "anomaly") || [];
  
  if (workflowRetries.length > 0 && complianceAnomalies.length > 0) {
    patterns.push({
      pattern: "Workflow retries + Compliance anomalies",
      subsystems: ["workflow", "compliance"],
      severity: "medium",
      evidence: [...workflowRetries.slice(0, 2), ...complianceAnomalies.slice(0, 2)]
    });
  }

  // Pattern 5: Multiple subsystems showing errors simultaneously
  const errorSubsystems = subsystems.filter(sub => 
    (bySubsystem[sub] || []).some((s: any) => s.type === "error" || s.priority === "critical")
  );
  
  if (errorSubsystems.length >= 3) {
    patterns.push({
      pattern: "Multi-subsystem error cascade",
      subsystems: errorSubsystems,
      severity: "critical",
      evidence: errorSubsystems.flatMap(sub => 
        (bySubsystem[sub] || []).filter((s: any) => s.type === "error" || s.priority === "critical").slice(0, 1)
      )
    });
  }

  return patterns;
}

/**
 * Suggest optimization
 */
export function suggestOptimization(
  type: Optimization["type"],
  current: any,
  proposed: any
): Optimization {
  // Check if we've seen this optimization before
  const existing = recall("optimization", { type, proposed });

  if (existing && existing.effectiveness > 0.7) {
    return {
      id: existing.id,
      type,
      change: proposed,
      impact: existing.effectiveness,
      applied: false
    };
  }

  // New optimization
  const optimization: Optimization = {
    id: `opt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    change: proposed,
    impact: 0.5, // Default impact, will be updated based on results
    applied: false
  };

  rememberPattern("optimization", { type, proposed }, 0.5);

  return optimization;
}

/**
 * Apply optimization
 */
export function applyOptimization(optimization: Optimization): Optimization {
  optimization.applied = true;
  optimization.appliedAt = new Date().toISOString();
  return optimization;
}

/**
 * Record optimization result
 */
export function recordOptimizationResult(
  optimization: Optimization,
  actualImpact: number
): void {
  rememberPattern("optimization", { type: optimization.type, change: optimization.change }, actualImpact);
}

/**
 * Get proven optimizations
 */
export function getProvenOptimizations(type?: Optimization["type"]): Optimization[] {
  const memories = getEffectiveMemories(0.7);
  const optimizations: Optimization[] = [];

  memories.forEach(memory => {
    if (memory.type === "optimization" && memory.data.type) {
      if (!type || memory.data.type === type) {
        optimizations.push({
          id: memory.id,
          type: memory.data.type,
          change: memory.data.change,
          impact: memory.effectiveness,
          applied: true,
          appliedAt: memory.lastSeen
        });
      }
    }
  });

  return optimizations;
}
