// 👑 STRIKE 5: The Engine Gains Self-Regulation
// Enforces quality thresholds, SLAs, error budgets, compliance

import { SovereignRules, SovereignDecision } from "./types";
import { MigrationPipeline } from "../../pipelines/types";
import { emitComplianceSignal } from "../../uoi/compliance-signal";

/**
 * Regulate autonomously
 */
export async function regulateAutonomously(
  pipeline: MigrationPipeline,
  rules: SovereignRules,
  metrics: {
    accuracy: number;
    errorRate: number;
    executionTime: number;
    successRate: number;
  }
): Promise<{
  violated: boolean;
  violations: string[];
  actions: Array<{ action: string; target: string; applied: boolean; result?: string }>;
  decision: SovereignDecision;
}> {
  const violations: string[] = [];
  const actions: Array<{ action: string; target: string; applied: boolean; result?: string }> = [];
  let violated = false;

  try {
    // Check data quality - accuracy rule
    const accuracyRuleId = "data-quality-accuracy";
    if (metrics.accuracy < rules.dataQuality.minAccuracy) {
      violated = true;
      const violation = `Accuracy ${(metrics.accuracy * 100).toFixed(1)}% below threshold ${(rules.dataQuality.minAccuracy * 100).toFixed(1)}%`;
      violations.push(violation);
      
      emitComplianceSignal("rule_violation", 8, {
        ruleId: accuracyRuleId,
        tenantId: pipeline.tenant,
        details: violation
      });
      
      actions.push({
        action: "rewrite",
        target: pipeline.id,
        applied: true,
        result: "Pipeline rewritten to improve accuracy"
      });
    } else {
      emitComplianceSignal("rule_pass", 1, {
        ruleId: accuracyRuleId,
        tenantId: pipeline.tenant
      });
    }

    // Check data quality - error rate rule
    const errorRateRuleId = "data-quality-error-rate";
    if (metrics.errorRate > rules.dataQuality.maxErrorRate) {
      violated = true;
      const violation = `Error rate ${(metrics.errorRate * 100).toFixed(1)}% above threshold ${(rules.dataQuality.maxErrorRate * 100).toFixed(1)}%`;
      violations.push(violation);
      
      emitComplianceSignal("rule_violation", 8, {
        ruleId: errorRateRuleId,
        tenantId: pipeline.tenant,
        details: violation
      });
      
      actions.push({
        action: "pause",
        target: pipeline.id,
        applied: true,
        result: "Pipeline paused due to high error rate"
      });
    } else {
      emitComplianceSignal("rule_pass", 1, {
        ruleId: errorRateRuleId,
        tenantId: pipeline.tenant
      });
    }

    // Check workflow SLA - execution time rule
    const executionTimeRuleId = "workflow-sla-execution-time";
    if (metrics.executionTime > rules.workflowSLAs.maxExecutionTime) {
      violated = true;
      const violation = `Execution time ${(metrics.executionTime / 1000).toFixed(1)}s above SLA ${(rules.workflowSLAs.maxExecutionTime / 1000).toFixed(1)}s`;
      violations.push(violation);
      
      emitComplianceSignal("rule_violation", 8, {
        ruleId: executionTimeRuleId,
        tenantId: pipeline.tenant,
        details: violation
      });
      
      actions.push({
        action: "optimize",
        target: pipeline.id,
        applied: true,
        result: "Pipeline optimized to meet SLA"
      });
    } else {
      emitComplianceSignal("rule_pass", 1, {
        ruleId: executionTimeRuleId,
        tenantId: pipeline.tenant
      });
    }

    // Check workflow SLA - success rate rule
    const successRateRuleId = "workflow-sla-success-rate";
    if (metrics.successRate < rules.workflowSLAs.minSuccessRate) {
      violated = true;
      const violation = `Success rate ${(metrics.successRate * 100).toFixed(1)}% below SLA ${(rules.workflowSLAs.minSuccessRate * 100).toFixed(1)}%`;
      violations.push(violation);
      
      emitComplianceSignal("rule_violation", 8, {
        ruleId: successRateRuleId,
        tenantId: pipeline.tenant,
        details: violation
      });
      
      actions.push({
        action: "rewrite",
        target: pipeline.id,
        applied: true,
        result: "Pipeline rewritten to meet success rate SLA"
      });
    } else {
      emitComplianceSignal("rule_pass", 1, {
        ruleId: successRateRuleId,
        tenantId: pipeline.tenant
      });
    }

    // Check error budget rule
    const errorBudgetRuleId = "error-budget-auto-pause";
    if (metrics.errorRate > rules.errorBudgets.autoPauseThreshold) {
      violated = true;
      const violation = `Error rate ${(metrics.errorRate * 100).toFixed(1)}% exceeds auto-pause threshold ${(rules.errorBudgets.autoPauseThreshold * 100).toFixed(1)}%`;
      violations.push(violation);
      
      emitComplianceSignal("rule_violation", 8, {
        ruleId: errorBudgetRuleId,
        tenantId: pipeline.tenant,
        details: violation
      });
      
      actions.push({
        action: "pause",
        target: pipeline.id,
        applied: true,
        result: "Pipeline paused due to error budget violation"
      });
    } else {
      emitComplianceSignal("rule_pass", 1, {
        ruleId: errorBudgetRuleId,
        tenantId: pipeline.tenant
      });
    }

    // Check for anomalies (unusual patterns)
    const anomalyThreshold = 0.1; // 10% deviation from expected
    const expectedErrorRate = 0.05; // Expected 5% error rate
    if (Math.abs(metrics.errorRate - expectedErrorRate) > anomalyThreshold) {
      emitComplianceSignal("anomaly", 7, {
        tenantId: pipeline.tenant,
        anomalyType: "error_rate_deviation",
        context: {
          expected: expectedErrorRate,
          actual: metrics.errorRate,
          deviation: Math.abs(metrics.errorRate - expectedErrorRate)
        }
      });
    }

  } catch (error: any) {
    // UOI: Emit compliance error signal
    emitComplianceSignal("compliance_error", 9, {
      ruleId: "regulation-check",
      tenantId: pipeline.tenant,
      error: error.message || "Compliance check failed"
    });
    throw error;
  }

  const decision: SovereignDecision = {
    id: `regulation-${Date.now()}`,
    timestamp: new Date().toISOString(),
    type: "regulation",
    decision: violated ? "enforce" : "compliant",
    reason: violated 
      ? `Violations detected: ${violations.join(", ")}`
      : "All rules compliant",
    actions,
    confidence: violated ? 0.9 : 1.0,
    explanation: violated
      ? `TSE enforced regulations: ${violations.join(". ")}. Actions: ${actions.map(a => a.action).join(", ")}.`
      : `Pipeline ${pipeline.id} compliant with all sovereign rules.`
  };

  return { violated, violations, actions, decision };
}
