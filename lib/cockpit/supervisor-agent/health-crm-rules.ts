// Supervisor Agent - Health CRM Specific Monitoring Rules
// Custom monitoring rules for Health CRM agents

import { AgentHealth, WorkflowHealth, AgentFailure, Anomaly, FailureSeverity } from "./types";

/**
 * Health CRM Agent Monitoring Rules
 */
export const HEALTH_CRM_MONITORING_RULES = {
  /**
   * Health Intake Agent Rules
   */
  healthIntake: {
    // Heartbeat timeout (60 seconds)
    heartbeatTimeout: 60000,
    
    // Failure thresholds
    failureThreshold: 3, // 3 consecutive failures before restart
    errorRateThreshold: 0.10, // 10% error rate triggers alert
    
    // Performance thresholds
    maxProcessingTime: 10000, // 10 seconds max processing time
    avgProcessingTime: 5000, // 5 seconds average
    
    // Success rate threshold
    minSuccessRate: 0.95, // 95% minimum success rate
    
    // Data quality thresholds
    minDataQuality: 0.98, // 98% minimum data quality
    
    // Anomaly detection
    anomalyThresholds: {
      errorSpike: 0.15, // 15% error rate spike
      processingTimeSpike: 2.0, // 2x normal processing time
      duplicateRateSpike: 0.30, // 30% duplicate rate
    },
    
    // Escalation rules
    escalationRules: [
      {
        condition: "consecutive_failures >= 3",
        action: "pause_agent",
        severity: "critical" as FailureSeverity,
        notify: ["operator", "supervisor"]
      },
      {
        condition: "error_rate > 0.10",
        action: "alert",
        severity: "high" as FailureSeverity,
        notify: ["operator"]
      },
      {
        condition: "processing_time > 10000",
        action: "alert",
        severity: "medium" as FailureSeverity,
        notify: ["operator"]
      },
      {
        condition: "data_quality < 0.98",
        action: "alert",
        severity: "high" as FailureSeverity,
        notify: ["compliance", "operator"]
      }
    ]
  },
  
  /**
   * Health Follow-up Agent Rules
   */
  healthFollowup: {
    // Heartbeat timeout (60 seconds)
    heartbeatTimeout: 60000,
    
    // Failure thresholds
    failureThreshold: 3, // 3 consecutive failures before restart
    errorRateThreshold: 0.10, // 10% error rate triggers alert
    
    // Performance thresholds
    maxProcessingTime: 30000, // 30 seconds max processing time
    avgProcessingTime: 10000, // 10 seconds average
    
    // Success rate threshold
    minSuccessRate: 0.95, // 95% minimum success rate
    
    // Task generation thresholds
    maxTasksPerCycle: 200, // Max tasks generated per cycle
    maxBacklog: 100, // Max overdue tasks before alert
    
    // Anomaly detection
    anomalyThresholds: {
      errorSpike: 0.15, // 15% error rate spike
      processingTimeSpike: 2.0, // 2x normal processing time
      taskGenerationSpike: 200, // 200 tasks in 15-minute window
      overdueRateSpike: 0.20, // 20% overdue rate
    },
    
    // Escalation rules
    escalationRules: [
      {
        condition: "consecutive_failures >= 3",
        action: "pause_agent",
        severity: "critical" as FailureSeverity,
        notify: ["operator", "supervisor"]
      },
      {
        condition: "error_rate > 0.10",
        action: "alert",
        severity: "high" as FailureSeverity,
        notify: ["operator"]
      },
      {
        condition: "backlog > 100",
        action: "alert",
        severity: "high" as FailureSeverity,
        notify: ["operator"]
      },
      {
        condition: "processing_time > 30000",
        action: "alert",
        severity: "medium" as FailureSeverity,
        notify: ["operator"]
      }
    ]
  }
};

/**
 * Check if agent health violates Health CRM rules
 */
export function checkHealthCrmRules(
  agentId: string,
  health: AgentHealth
): {
  violations: Array<{
    rule: string;
    severity: FailureSeverity;
    message: string;
  }>;
  shouldEscalate: boolean;
} {
  const violations: Array<{
    rule: string;
    severity: FailureSeverity;
    message: string;
  }> = [];
  
  let shouldEscalate = false;
  
  // Get rules for agent
  const rules = agentId === "health-intake" 
    ? HEALTH_CRM_MONITORING_RULES.healthIntake
    : agentId === "health-followup"
    ? HEALTH_CRM_MONITORING_RULES.healthFollowup
    : null;
  
  if (!rules) {
    return { violations, shouldEscalate };
  }
  
  // Check error rate
  if (health.errorRate > rules.errorRateThreshold * 100) {
    violations.push({
      rule: "error_rate_threshold",
      severity: "high",
      message: `Error rate ${health.errorRate.toFixed(2)}% exceeds threshold ${(rules.errorRateThreshold * 100).toFixed(2)}%`
    });
    shouldEscalate = true;
  }
  
  // Check success rate
  if (health.successRate < rules.minSuccessRate * 100) {
    violations.push({
      rule: "success_rate_threshold",
      severity: "high",
      message: `Success rate ${health.successRate.toFixed(2)}% below threshold ${(rules.minSuccessRate * 100).toFixed(2)}%`
    });
    shouldEscalate = true;
  }
  
  // Check processing time
  if (health.averageLatency > rules.maxProcessingTime) {
    violations.push({
      rule: "processing_time_threshold",
      severity: "medium",
      message: `Average processing time ${health.averageLatency}ms exceeds threshold ${rules.maxProcessingTime}ms`
    });
  }
  
  // Check consecutive failures
  if (health.consecutiveFailures >= rules.failureThreshold) {
    violations.push({
      rule: "consecutive_failures",
      severity: "critical",
      message: `Consecutive failures ${health.consecutiveFailures} exceeds threshold ${rules.failureThreshold}`
    });
    shouldEscalate = true;
  }
  
  return { violations, shouldEscalate };
}

/**
 * Get escalation action for Health CRM agent
 */
export function getHealthCrmEscalationAction(
  agentId: string,
  violation: { rule: string; severity: FailureSeverity; message: string }
): {
  action: "pause" | "alert" | "restart" | "none";
  notify: string[];
} {
  const rules = agentId === "health-intake" 
    ? HEALTH_CRM_MONITORING_RULES.healthIntake
    : agentId === "health-followup"
    ? HEALTH_CRM_MONITORING_RULES.healthFollowup
    : null;
  
  if (!rules) {
    return { action: "none", notify: [] };
  }
  
  // Find matching escalation rule
  const escalationRule = rules.escalationRules.find(rule => {
    // Simple condition matching (in production, use proper evaluator)
    if (rule.condition.includes("consecutive_failures") && violation.rule === "consecutive_failures") {
      return true;
    }
    if (rule.condition.includes("error_rate") && violation.rule === "error_rate_threshold") {
      return true;
    }
    if (rule.condition.includes("processing_time") && violation.rule === "processing_time_threshold") {
      return true;
    }
    if (rule.condition.includes("data_quality") && violation.rule === "data_quality_threshold") {
      return true;
    }
    if (rule.condition.includes("backlog") && violation.rule === "backlog_threshold") {
      return true;
    }
    return false;
  });
  
  if (escalationRule) {
    return {
      action: escalationRule.action === "pause_agent" ? "pause" : "alert",
      notify: escalationRule.notify || []
    };
  }
  
  // Default escalation based on severity
  if (violation.severity === "critical") {
    return { action: "pause", notify: ["operator", "supervisor"] };
  } else if (violation.severity === "high") {
    return { action: "alert", notify: ["operator"] };
  }
  
  return { action: "none", notify: [] };
}
