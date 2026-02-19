/**
 * Governance Rules Engine
 * Lightweight, declarative rules for automation governance
 */

export type Severity = "high" | "medium" | "low";

export interface GovernanceRule {
  id: string;
  name: string;
  condition: (analytics: any, baseline?: any) => boolean;
  severity: Severity;
  message: (analytics: any, baseline?: any) => string;
}

export interface GovernanceAlert {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: Severity;
  message: string;
  timestamp: string;
  workflowName?: string;
  metadata?: any;
}

export interface AutomationHealthScore {
  score: number; // 0-100
  factors: {
    successRate: number;
    failureRate: number;
    durationStability: number;
    volumeStability: number;
  };
  status: "healthy" | "degraded" | "critical";
}

/**
 * Calculate automation health score
 */
export function calculateHealthScore(analytics: any, baseline?: any): AutomationHealthScore {
  // Success rate factor (0-40 points)
  const successRateFactor = Math.max(0, (analytics.successRate / 100) * 40);

  // Failure rate factor (0-30 points, inverse)
  const failureRateFactor = Math.max(0, (1 - analytics.failureRate / 100) * 30);

  // Duration stability (0-15 points)
  // Compare current avg duration to baseline
  let durationStability = 15;
  if (baseline && baseline.avgDuration > 0) {
    const durationRatio = analytics.avgDuration / baseline.avgDuration;
    if (durationRatio > 1.5) {
      durationStability = 0; // Degraded
    } else if (durationRatio > 1.25) {
      durationStability = 7; // Warning
    } else if (durationRatio > 1.1) {
      durationStability = 12; // Slight degradation
    }
  }

  // Volume stability (0-15 points)
  // This would require historical data, defaulting to full points for now
  const volumeStability = 15;

  const score = Math.round(successRateFactor + failureRateFactor + durationStability + volumeStability);

  let status: "healthy" | "degraded" | "critical" = "healthy";
  if (score < 50) {
    status = "critical";
  } else if (score < 75) {
    status = "degraded";
  }

  return {
    score,
    factors: {
      successRate: Math.round(successRateFactor),
      failureRate: Math.round(failureRateFactor),
      durationStability: Math.round(durationStability),
      volumeStability: Math.round(volumeStability)
    },
    status
  };
}

/**
 * Governance rules
 */
export const governanceRules: GovernanceRule[] = [
  {
    id: "failure-spike",
    name: "Failure Spike Detection",
    condition: (analytics, baseline) => {
      if (!baseline) return false;
      const failureRate24h = analytics.failureRate || 0;
      const baselineFailureRate = baseline.failureRate || 0;
      return failureRate24h > baselineFailureRate * 1.5 && failureRate24h > 5; // 50% increase and >5% failure rate
    },
    severity: "high",
    message: (analytics, baseline) => {
      const currentRate = analytics.failureRate?.toFixed(1) || 0;
      const baselineRate = baseline?.failureRate?.toFixed(1) || 0;
      return `Failure spike detected: ${currentRate}% (baseline: ${baselineRate}%)`;
    }
  },
  {
    id: "duration-degradation",
    name: "Workflow Duration Degradation",
    condition: (analytics, baseline) => {
      if (!baseline || baseline.avgDuration === 0) return false;
      const currentDuration = analytics.avgDuration || 0;
      const baselineDuration = baseline.avgDuration || 0;
      return currentDuration > baselineDuration * 1.25; // 25% increase
    },
    severity: "medium",
    message: (analytics, baseline) => {
      const current = analytics.avgDuration || 0;
      const baselineVal = baseline?.avgDuration || 0;
      return `Workflow durations increased by ${((current / baselineVal - 1) * 100).toFixed(1)}% over baseline`;
    }
  },
  {
    id: "stuck-workflows",
    name: "Stuck Workflow Detection",
    condition: (analytics) => {
      return (analytics.running || 0) > 10; // More than 10 workflows running
    },
    severity: "medium",
    message: (analytics) => {
      return `${analytics.running || 0} workflows currently in Running state - possible stuck workflows`;
    }
  },
  {
    id: "low-success-rate",
    name: "Low Success Rate",
    condition: (analytics) => {
      return (analytics.successRate || 0) < 85; // Less than 85% success rate
    },
    severity: "high",
    message: (analytics) => {
      return `Success rate is ${analytics.successRate?.toFixed(1) || 0}% (below 85% threshold)`;
    }
  },
  {
    id: "high-failure-rate",
    name: "High Failure Rate",
    condition: (analytics) => {
      return (analytics.failureRate || 0) > 10; // More than 10% failure rate
    },
    severity: "high",
    message: (analytics) => {
      return `Failure rate is ${analytics.failureRate?.toFixed(1) || 0}% (above 10% threshold)`;
    }
  },
  {
    id: "workflow-failure-spike",
    name: "Individual Workflow Failure Spike",
    condition: (analytics) => {
      // Check if any workflow has >50% failure rate
      const topFailing = analytics.topFailingWorkflows || [];
      return topFailing.some((wf: any) => wf.failureRate > 50 && wf.failureCount > 5);
    },
    severity: "high",
    message: (analytics) => {
      const topFailing = analytics.topFailingWorkflows || [];
      const critical = topFailing.find((wf: any) => wf.failureRate > 50 && wf.failureCount > 5);
      if (critical) {
        return `${critical.workflowName} has ${critical.failureRate.toFixed(1)}% failure rate (${critical.failureCount} failures)`;
      }
      return "One or more workflows showing high failure rates";
    }
  },
  {
    id: "manual-trigger-spike",
    name: "Manual Trigger Spike",
    condition: (analytics) => {
      // This would require tracking triggerType in analytics
      // For now, we'll check if there's a way to detect manual triggers
      // This is a placeholder - actual implementation would need triggerType in execution data
      return false; // Disabled for now until triggerType is tracked in analytics
    },
    severity: "medium",
    message: () => {
      return "High volume of manual triggers detected - consider automation";
    }
  },
  {
    id: "excessive-retries",
    name: "Excessive Retry Activity",
    condition: (analytics) => {
      // This would require tracking retry count per workflow
      // Placeholder for now
      return false; // Disabled for now until retry tracking is implemented
    },
    severity: "medium",
    message: () => {
      return "High number of retries detected - investigate root causes";
    }
  }
];

/**
 * Evaluate governance rules and generate alerts
 * Optionally filters out alerts for disabled workflows
 */
export function evaluateGovernanceRules(
  analytics: any,
  baseline?: any,
  workflowControls?: Record<string, { controlState: string }>
): GovernanceAlert[] {
  const alerts: GovernanceAlert[] = [];

  for (const rule of governanceRules) {
    try {
      if (rule.condition(analytics, baseline)) {
        const alert: GovernanceAlert = {
          id: `${rule.id}-${Date.now()}`,
          ruleId: rule.id,
          ruleName: rule.name,
          severity: rule.severity,
          message: rule.message(analytics, baseline),
          timestamp: new Date().toISOString(),
          metadata: {
            analytics,
            baseline
          }
        };

        // Extract workflow name from alert if available
        const workflowName = alert.workflowName || 
                            (analytics.topFailingWorkflows?.[0]?.workflowName);

        // If workflow is disabled, suppress alerts for it (except critical workflow disabled alert)
        if (workflowName && workflowControls && workflowControls[workflowName]?.controlState === "disabled") {
          // Only suppress if it's not a "critical workflow disabled" type alert
          if (!rule.id.includes("disabled")) {
            continue; // Skip this alert
          }
        }

        alerts.push(alert);
      }
    } catch (error) {
      console.error(`Error evaluating rule ${rule.id}:`, error);
    }
  }

  return alerts;
}
