// UOI Explain - Generates human-readable explanations
// SOVEREIGN MODE: Operator-grade explanations with traceability and auditability

import { UOIRule } from "./governance";
import { UOIDirective } from "./contract";
import { isSovereignActive } from "./sovereign";

/**
 * Explain decision (for heartbeat)
 */
export function explain(decision: string, metrics: any, crossDomainPatterns?: any[]): string {
  // Federation mode explanations
  if (crossDomainPatterns && crossDomainPatterns.length > 0) {
    const pattern = crossDomainPatterns[0];
    if (decision === "PAUSE_PIPELINE")
      return `Federated decision: Paused pipeline due to cross-domain pattern "${pattern.pattern}" affecting ${pattern.subsystems.join(", ")}.`;
    
    if (decision === "REWRITE_MAPPING")
      return `Federated decision: Rewriting mapping due to cross-domain pattern "${pattern.pattern}" affecting ${pattern.subsystems.join(", ")}.`;
    
    if (decision === "REBALANCE_WORKFLOW")
      return `Federated decision: Rebalancing workflow due to cross-domain pattern "${pattern.pattern}" affecting ${pattern.subsystems.join(", ")}.`;
    
    if (decision === "TRIGGER_ALERT")
      return `Federated decision: Triggering alert due to cross-domain pattern "${pattern.pattern}" affecting ${pattern.subsystems.join(", ")}.`;
  }
  
  // Standard explanations
  if (decision === "PAUSE_PIPELINE")
    return `Pipeline paused due to high error rate (${(metrics.errorRate * 100).toFixed(1)}%).`;

  if (decision === "REWRITE_MAPPING")
    return `Mapping rewrite triggered due to drift count (${metrics.driftCount}).`;

  if (decision === "REBALANCE_WORKFLOW")
    return `Workflow rebalanced due to queue pressure (${metrics.queuePressure}).`;

  return "No action required.";
}

/**
 * Explain decision
 * SOVEREIGN MODE: Operator-grade explanation with traceability
 */
export function explainDecision(
  rule: UOIRule,
  context: any,
  directive: UOIDirective
): string {
  const parts: string[] = [];
  const timestamp = new Date().toISOString();
  const sovereignActive = isSovereignActive();

  // SOVEREIGN MODE: Full traceability
  if (sovereignActive) {
    parts.push(`=== SOVEREIGN DECISION ===`);
    parts.push(`Timestamp: ${timestamp}`);
    parts.push(`Decision ID: ${directive.id}`);
    parts.push(`Authority: UOI (Sovereign Mode)`);
    parts.push(``);
  }

  parts.push(`[${new Date(timestamp).toLocaleTimeString()}] ${rule.name}`);
  parts.push(`  Condition: ${getConditionDescription(rule, context)}`);
  
  // SOVEREIGN MODE: Show global rule override
  if (sovereignActive && context.globalErrorBudget !== undefined) {
    parts.push(`  Global Rule Applied: Error budget ${(context.globalErrorBudget * 100).toFixed(1)}% (overrides local)`);
  }
  if (sovereignActive && context.globalQueueLimit !== undefined) {
    parts.push(`  Global Rule Applied: Queue limit ${context.globalQueueLimit} (overrides local)`);
  }
  
  parts.push(`  Action: ${directive.type}`);
  parts.push(`  Target: ${directive.target}`);
  parts.push(`  Reason: ${directive.reason}`);
  
  // SOVEREIGN MODE: Add audit trail
  if (sovereignActive) {
    parts.push(``);
    parts.push(`=== AUDIT TRAIL ===`);
    parts.push(`Rule ID: ${rule.id}`);
    parts.push(`Rule Threshold: ${rule.threshold}`);
    parts.push(`Context Snapshot: ${JSON.stringify({
      errorRate: context.errorRate,
      workflowQueue: context.workflowQueue,
      mappingDrift: context.mappingDrift,
      throughputDrop: context.throughputDrop,
    })}`);
    parts.push(`Directive Payload: ${JSON.stringify(directive.payload)}`);
    parts.push(`Authoritative: ${directive.payload?.authoritative || false}`);
    parts.push(`Must Comply: ${directive.payload?.mustComply || false}`);
  }

  return parts.join("\n");
}

/**
 * Get condition description
 */
function getConditionDescription(rule: UOIRule, context: any): string {
  switch (rule.id) {
    case "error-rate-threshold":
      return `Error rate ${((context.errorRate || 0) * 100).toFixed(1)}% exceeds threshold ${(rule.threshold * 100).toFixed(0)}%`;
    case "workflow-queue-threshold":
      return `Workflow queue ${context.workflowQueue || 0} exceeds threshold ${rule.threshold}`;
    case "mapping-drift-detected":
      return "Mapping drift detected in pipeline";
    case "tenant-anomaly-detected":
      return "Tenant anomaly detected";
    case "throughput-drop":
      return `Throughput drop ${((context.throughputDrop || 0) * 100).toFixed(1)}% exceeds threshold ${(rule.threshold * 100).toFixed(0)}%`;
    default:
      return "Condition met";
  }
}

/**
 * Generate summary explanation
 */
export function generateSummary(
  signalsProcessed: number,
  directivesCreated: number,
  explanations: string[]
): string {
  const parts: string[] = [];

  parts.push("=== UOI Event Loop Summary ===");
  parts.push(`Signals Processed: ${signalsProcessed}`);
  parts.push(`Directives Created: ${directivesCreated}`);
  parts.push("");

  if (explanations.length > 0) {
    parts.push("Decisions:");
    explanations.forEach(explanation => {
      parts.push(explanation);
      parts.push("");
    });
  } else {
    parts.push("No decisions made in this cycle.");
  }

  return parts.join("\n");
}
