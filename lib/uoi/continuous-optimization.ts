// UOI Continuous Optimization - Sovereign mode optimization engine
// Cross-domain optimization becomes continuous

import { isSovereignActive, recordOptimizationCycle, getGlobalRule } from "./sovereign";
import { getRecentSignals } from "./memory";
import { createDirective } from "./orchestrator";
import { UOIDirective } from "./contract";

export interface OptimizationAction {
  id: string;
  type: "throttle" | "escalate" | "tighten" | "reorder" | "rewrite" | "recalibrate";
  target: string;
  reason: string;
  predictedImpact: number;
  applied: boolean;
  timestamp: string;
}

/**
 * Run continuous optimization cycle
 * SOVEREIGN MODE: Continuously optimizes across all domains
 */
export async function runContinuousOptimization(): Promise<{
  actions: OptimizationAction[];
  optimizationsApplied: number;
}> {
  if (!isSovereignActive()) {
    return { actions: [], optimizationsApplied: 0 };
  }
  
  const actions: OptimizationAction[] = [];
  const recent = getRecentSignals(200); // Look at more history for optimization
  
  // Group by subsystem
  const bySubsystem: Record<string, any[]> = {};
  recent.forEach(s => {
    const source = s.source || "unknown";
    if (!bySubsystem[source]) bySubsystem[source] = [];
    bySubsystem[source].push(s);
  });
  
  // Optimization 1: AMP slows automatically when workflows overload
  const workflowQueue = bySubsystem.workflow?.filter(s => 
    s.type === "metric" && (s.payload?.workflowQueue > 15 || s.payload?.queueLength > 15)
  ) || [];
  const ampThroughput = bySubsystem.amp?.filter(s => 
    s.type === "metric" && s.payload?.throughput
  ) || [];
  
  if (workflowQueue.length > 0 && ampThroughput.length > 0) {
    const avgThroughput = ampThroughput.reduce((sum, s) => sum + (s.payload?.throughput || 0), 0) / ampThroughput.length;
    if (avgThroughput > 50) { // Only throttle if AMP is running hot
      actions.push({
        id: `opt-${Date.now()}-1`,
        type: "throttle",
        target: "amp",
        reason: "Workflow queue pressure detected, throttling AMP to reduce load",
        predictedImpact: 0.3, // Reduce load by 30%
        applied: false,
        timestamp: new Date().toISOString(),
      });
    }
  }
  
  // Optimization 2: Compliance rules tighten when analytics detects risk
  const analyticsRisk = bySubsystem.analytics?.filter(s => 
    s.type === "anomaly" || (s.type === "pattern" && s.payload?.riskScore > 0.6)
  ) || [];
  const complianceRules = bySubsystem.compliance?.filter(s => s.type === "metric") || [];
  
  if (analyticsRisk.length > 0 && complianceRules.length > 0) {
    const maxRisk = Math.max(...analyticsRisk.map((s: any) => s.payload?.riskScore || 0));
    if (maxRisk > 0.7) {
      actions.push({
        id: `opt-${Date.now()}-2`,
        type: "tighten",
        target: "compliance",
        reason: `Analytics detected high risk (${(maxRisk * 100).toFixed(0)}%), tightening compliance rules`,
        predictedImpact: 0.2, // Increase strictness by 20%
        applied: false,
        timestamp: new Date().toISOString(),
      });
    }
  }
  
  // Optimization 3: Notifications escalate when compliance clusters
  const complianceClusters = bySubsystem.compliance?.filter(s => 
    s.type === "anomaly" && s.priority === "high"
  ) || [];
  const notificationRate = bySubsystem.notification?.filter(s => 
    s.type === "metric" && s.payload?.deliveryRate
  ) || [];
  
  if (complianceClusters.length >= 3 && notificationRate.length > 0) {
    actions.push({
      id: `opt-${Date.now()}-3`,
      type: "escalate",
      target: "notification",
      reason: `${complianceClusters.length} compliance violations detected, escalating notifications`,
      predictedImpact: 0.4, // Increase escalation rate by 40%
      applied: false,
      timestamp: new Date().toISOString(),
    });
  }
  
  // Optimization 4: Workflows reorder themselves based on predicted throughput
  const workflowMetrics = bySubsystem.workflow?.filter(s => 
    s.type === "metric" && (s.payload?.executionTime || s.payload?.successRate)
  ) || [];
  const predictedThroughput = bySubsystem.amp?.filter(s => 
    s.type === "metric" && s.payload?.predictedThroughput
  ) || [];
  
  if (workflowMetrics.length > 5 && predictedThroughput.length > 0) {
    const avgSuccessRate = workflowMetrics.reduce((sum, s) => sum + (s.payload?.successRate || 0), 0) / workflowMetrics.length;
    if (avgSuccessRate < 0.8) { // If success rate is low, reorder
      actions.push({
        id: `opt-${Date.now()}-4`,
        type: "reorder",
        target: "workflow",
        reason: `Low workflow success rate (${(avgSuccessRate * 100).toFixed(0)}%), reordering based on predicted throughput`,
        predictedImpact: 0.15, // Improve success rate by 15%
        applied: false,
        timestamp: new Date().toISOString(),
      });
    }
  }
  
  // Optimization 5: Mapping rewrites trigger before drift becomes visible
  const driftSignals = bySubsystem.amp?.filter(s => s.type === "drift") || [];
  const errorSignals = bySubsystem.amp?.filter(s => s.type === "error") || [];
  
  if (driftSignals.length > 0 && errorSignals.length > 0) {
    // Predictive rewrite: if drift detected and errors increasing, rewrite proactively
    const errorTrend = errorSignals.slice(-10).length; // Recent errors
    if (errorTrend > 2) {
      actions.push({
        id: `opt-${Date.now()}-5`,
        type: "rewrite",
        target: "amp",
        reason: "Drift detected with increasing errors, proactively rewriting mapping",
        predictedImpact: 0.25, // Reduce errors by 25%
        applied: false,
        timestamp: new Date().toISOString(),
      });
    }
  }
  
  // Apply optimizations
  let optimizationsApplied = 0;
  for (const action of actions) {
    try {
      const directive = createDirective(
        action.type === "throttle" ? "OPTIMIZE_ORDER" :
        action.type === "escalate" ? "TRIGGER_ALERT" :
        action.type === "tighten" ? "REQUEST_HUMAN_REVIEW" :
        action.type === "reorder" ? "REBALANCE_WORKFLOW" :
        action.type === "rewrite" ? "REWRITE_MAPPING" :
        "OPTIMIZE_ORDER",
        action.target,
        { optimization: action, predictedImpact: action.predictedImpact },
        `Sovereign optimization: ${action.reason}`
      );
      
      // In sovereign mode, directives are authoritative
      action.applied = true;
      optimizationsApplied++;
    } catch (error) {
      console.error(`[UOI] Failed to apply optimization ${action.id}:`, error);
    }
  }
  
  if (optimizationsApplied > 0) {
    recordOptimizationCycle();
  }
  
  return { actions, optimizationsApplied };
}
