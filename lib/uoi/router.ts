// UOI Router - Routes tasks to the right subsystem

export interface RoutingDecision {
  task: string;
  subsystem: string;
  priority: number;
  reason: string;
}

const routingRules: Array<{
  condition: (task: any) => boolean;
  subsystem: string;
  priority: number;
}> = [
  {
    condition: (task) => task.type === "data_ingestion" || task.type === "csv_import",
    subsystem: "migration",
    priority: 1.0
  },
  {
    condition: (task) => task.type === "workflow_execution",
    subsystem: "workflow",
    priority: 0.9
  },
  {
    condition: (task) => task.type === "compliance_check",
    subsystem: "compliance",
    priority: 1.0
  },
  {
    condition: (task) => task.type === "notification",
    subsystem: "notification",
    priority: 0.8
  },
  {
    condition: (task) => task.type === "analytics" || task.type === "reporting",
    subsystem: "analytics",
    priority: 0.7
  }
];

/**
 * Route decision to subsystem (for heartbeat)
 */
export function routeDecision(decision: string): { target: string; action: string } {
  switch (decision) {
    case "PAUSE_PIPELINE":
      return { target: "amp", action: "pause" };
    case "RESUME_PIPELINE":
      return { target: "amp", action: "resume" };
    case "REWRITE_MAPPING":
      return { target: "amp", action: "rewriteMapping" };
    case "REBALANCE_WORKFLOW":
      return { target: "workflow", action: "rebalance" };
    case "TRIGGER_ALERT":
      return { target: "notification", action: "alert" };
    case "OPTIMIZE_ORDER":
      return { target: "amp", action: "optimizeOrder" };
    case "REQUEST_HUMAN_REVIEW":
      return { target: "operator", action: "review" };
    default:
      return { target: "none", action: "noop" };
  }
}

/**
 * Route federated decision (cross-domain routing)
 */
export function routeFederatedDecision(
  decision: string,
  pattern: any,
  context: any
): { target: string; action: string } {
  // Cross-domain routing logic
  
  // Pattern: AMP errors + Workflow congestion → throttle AMP
  if (pattern.pattern.includes("AMP errors") && pattern.pattern.includes("Workflow congestion")) {
    return { target: "amp", action: "throttle" };
  }
  
  // Pattern: Compliance violations + Notification failures → escalate notifications
  if (pattern.pattern.includes("Compliance violations") && pattern.pattern.includes("Notification failures")) {
    return { target: "notification", action: "escalate" };
  }
  
  // Pattern: Analytics risk + AMP drift → recalibrate analytics
  if (pattern.pattern.includes("Analytics risk") && pattern.pattern.includes("AMP drift")) {
    return { target: "analytics", action: "recalibrate" };
  }
  
  // Pattern: Workflow retries + Compliance anomalies → trigger compliance review
  if (pattern.pattern.includes("Workflow retries") && pattern.pattern.includes("Compliance anomalies")) {
    return { target: "compliance", action: "review" };
  }
  
  // Pattern: Multi-subsystem error cascade → pause all and alert
  if (pattern.pattern.includes("Multi-subsystem error cascade")) {
    return { target: "operator", action: "emergency_alert" };
  }
  
  // Default to standard routing
  return routeDecision(decision);
}

/**
 * Route task to subsystem
 */
export function routeTask(task: any): RoutingDecision {
  for (const rule of routingRules) {
    if (rule.condition(task)) {
      return {
        task: task.id || task.type,
        subsystem: rule.subsystem,
        priority: rule.priority,
        reason: `Task type '${task.type}' routed to ${rule.subsystem} subsystem`
      };
    }
  }

  // Default routing
  return {
    task: task.id || task.type,
    subsystem: "migration",
    priority: 0.5,
    reason: "Default routing to migration subsystem"
  };
}

/**
 * Add routing rule
 */
export function addRoutingRule(
  condition: (task: any) => boolean,
  subsystem: string,
  priority: number
): void {
  routingRules.push({ condition, subsystem, priority });
}
