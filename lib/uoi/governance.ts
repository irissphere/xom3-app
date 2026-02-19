// UOI Governance - Rules, thresholds, constraints

import { isSovereignActive, getGlobalRule } from "./sovereign";

export interface UOIRule {
  id: string;
  name: string;
  condition: (context: any) => boolean;
  action: string;
  threshold: number;
  enabled: boolean;
}

/**
 * UOI Rules - The cockpit's constitution
 * SOVEREIGN MODE: Global rules override these defaults
 */
export const UoiRules = {
  maxErrorRate: 0.05,
  maxWorkflowQueue: 20,
  driftSensitivity: 0.7,
  throughputFloor: 0.6,
};

/**
 * Get effective rule value (sovereign mode uses global rules)
 */
export function getEffectiveRule(domain: "error_budget" | "throughput_floor" | "drift_tolerance" | "queue_limit"): number {
  if (isSovereignActive()) {
    const globalRule = getGlobalRule(domain);
    if (globalRule && typeof globalRule.value === "number") {
      return globalRule.value;
    }
  }
  
  // Default values
  switch (domain) {
    case "error_budget":
      return UoiRules.maxErrorRate;
    case "throughput_floor":
      return UoiRules.throughputFloor;
    case "drift_tolerance":
      return UoiRules.driftSensitivity;
    case "queue_limit":
      return UoiRules.maxWorkflowQueue;
    default:
      return 0;
  }
}

const rules: UOIRule[] = [
  {
    id: "error-rate-threshold",
    name: "Error Rate Threshold",
    condition: (ctx) => (ctx.errorRate || 0) > 0.2,
    action: "PAUSE_PIPELINE",
    threshold: 0.2,
    enabled: true
  },
  {
    id: "workflow-queue-threshold",
    name: "Workflow Queue Threshold",
    condition: (ctx) => (ctx.workflowQueue || 0) > 100,
    action: "REBALANCE_WORKFLOW",
    threshold: 100,
    enabled: true
  },
  {
    id: "mapping-drift-detected",
    name: "Mapping Drift Detected",
    condition: (ctx) => ctx.mappingDrift === true,
    action: "REWRITE_MAPPING",
    threshold: 1,
    enabled: true
  },
  {
    id: "tenant-anomaly-detected",
    name: "Tenant Anomaly Detected",
    condition: (ctx) => ctx.tenantAnomaly === true,
    action: "TRIGGER_ALERT",
    threshold: 1,
    enabled: true
  },
  {
    id: "throughput-drop",
    name: "Throughput Drop",
    condition: (ctx) => (ctx.throughputDrop || 0) > 0.3,
    action: "OPTIMIZE_ORDER",
    threshold: 0.3,
    enabled: true
  }
];

/**
 * Evaluate all rules against context
 * SOVEREIGN MODE: Uses global rules for thresholds
 */
export function evaluateRules(context: any): Array<{ rule: UOIRule; triggered: boolean }> {
  // SOVEREIGN MODE: Apply global rules to context
  if (isSovereignActive()) {
    const errorBudget = getGlobalRule("error_budget");
    const queueLimit = getGlobalRule("queue_limit");
    const driftTolerance = getGlobalRule("drift_tolerance");
    const throughputFloor = getGlobalRule("throughput_floor");
    
    if (errorBudget && typeof errorBudget.value === "number") {
      context.globalErrorBudget = errorBudget.value;
    }
    if (queueLimit && typeof queueLimit.value === "number") {
      context.globalQueueLimit = queueLimit.value;
    }
    if (driftTolerance && typeof driftTolerance.value === "number") {
      context.globalDriftTolerance = driftTolerance.value;
    }
    if (throughputFloor && typeof throughputFloor.value === "number") {
      context.globalThroughputFloor = throughputFloor.value;
    }
  }
  
  return rules
    .filter(r => r.enabled)
    .map(rule => {
      // SOVEREIGN MODE: Use global thresholds
      if (isSovereignActive()) {
        if (rule.id === "error-rate-threshold" && context.globalErrorBudget !== undefined) {
          rule = { ...rule, threshold: context.globalErrorBudget };
        } else if (rule.id === "workflow-queue-threshold" && context.globalQueueLimit !== undefined) {
          rule = { ...rule, threshold: context.globalQueueLimit };
        } else if (rule.id === "mapping-drift-detected" && context.globalDriftTolerance !== undefined) {
          // Adjust drift sensitivity based on global tolerance
          rule = { ...rule, threshold: context.globalDriftTolerance };
        } else if (rule.id === "throughput-drop" && context.globalThroughputFloor !== undefined) {
          rule = { ...rule, threshold: 1 - context.globalThroughputFloor };
        }
      }
      
      return {
        rule,
        triggered: rule.condition(context)
      };
    });
}

/**
 * Get rule by ID
 */
export function getRule(id: string): UOIRule | undefined {
  return rules.find(r => r.id === id);
}

/**
 * Enable/disable rule
 */
export function setRuleEnabled(id: string, enabled: boolean): boolean {
  const rule = getRule(id);
  if (rule) {
    rule.enabled = enabled;
    return true;
  }
  return false;
}

/**
 * Get all rules
 */
export function getAllRules(): UOIRule[] {
  return [...rules];
}
