// Supervisor Agent - Governance Enforcement
// Enforces governance rules and detects violations

import { GovernanceViolation, AgentHealth, FailureSeverity } from "./types";
import { emitSignal } from "@/lib/uoi/signals";
import { notificationManager } from "./notifications";

interface GovernanceRule {
  id: string;
  name: string;
  description: string;
  condition: (agent: AgentHealth) => boolean;
  severity: FailureSeverity;
  action?: (agent: AgentHealth) => void;
}

class GovernanceEngine {
  private rules: Map<string, GovernanceRule> = new Map();
  private violations: Map<string, GovernanceViolation> = new Map();

  /**
   * Initialize governance rules
   */
  initialize(): void {
    // Rule 1: Minimum success rate
    this.addRule({
      id: "min_success_rate",
      name: "Minimum Success Rate",
      description: "Agent success rate must be above 80%",
      severity: "high",
      condition: (agent) => agent.totalExecutions > 10 && agent.successRate < 80,
      action: async (agent) => {
        await notificationManager.sendAlert({
          type: "governance_violation",
          severity: "high",
          title: "Governance Violation: Low Success Rate",
          message: `Agent ${agent.agentName} has success rate below 80%: ${agent.successRate.toFixed(2)}%`,
          agentId: agent.agentId,
          agentName: agent.agentName,
          details: {
            successRate: agent.successRate,
            totalExecutions: agent.totalExecutions
          },
          timestamp: Date.now()
        });
      }
    });

    // Rule 2: Maximum error rate
    this.addRule({
      id: "max_error_rate",
      name: "Maximum Error Rate",
      description: "Agent error rate must be below 10%",
      severity: "high",
      condition: (agent) => agent.totalExecutions > 10 && agent.errorRate > 10,
      action: async (agent) => {
        await notificationManager.sendAlert({
          type: "governance_violation",
          severity: "high",
          title: "Governance Violation: High Error Rate",
          message: `Agent ${agent.agentName} has error rate above 10%: ${agent.errorRate.toFixed(2)}%`,
          agentId: agent.agentId,
          agentName: agent.agentName,
          details: {
            errorRate: agent.errorRate,
            totalExecutions: agent.totalExecutions
          },
          timestamp: Date.now()
        });
      }
    });

    // Rule 3: Maximum latency
    this.addRule({
      id: "max_latency",
      name: "Maximum Latency",
      description: "Agent average latency must be below 5 seconds",
      severity: "medium",
      condition: (agent) => agent.totalExecutions > 10 && agent.averageLatency > 5000,
      action: async (agent) => {
        await notificationManager.sendAlert({
          type: "governance_violation",
          severity: "medium",
          title: "Governance Violation: High Latency",
          message: `Agent ${agent.agentName} has average latency above 5s: ${agent.averageLatency.toFixed(2)}ms`,
          agentId: agent.agentId,
          agentName: agent.agentName,
          details: {
            averageLatency: agent.averageLatency,
            totalExecutions: agent.totalExecutions
          },
          timestamp: Date.now()
        });
      }
    });

    // Rule 4: Maximum consecutive failures
    this.addRule({
      id: "max_consecutive_failures",
      name: "Maximum Consecutive Failures",
      description: "Agent must not have more than 3 consecutive failures",
      severity: "critical",
      condition: (agent) => agent.consecutiveFailures > 3,
      action: async (agent) => {
        await notificationManager.sendAlert({
          type: "governance_violation",
          severity: "critical",
          title: "Governance Violation: Excessive Consecutive Failures",
          message: `Agent ${agent.agentName} has ${agent.consecutiveFailures} consecutive failures`,
          agentId: agent.agentId,
          agentName: agent.agentName,
          details: {
            consecutiveFailures: agent.consecutiveFailures,
            lastFailure: agent.lastFailure
          },
          timestamp: Date.now(),
          escalationLevel: "operator"
        });
      }
    });

    // Rule 5: Heartbeat requirement
    this.addRule({
      id: "heartbeat_required",
      name: "Heartbeat Required",
      description: "Agent must send heartbeat within 60 seconds",
      severity: "high",
      condition: (agent) => {
        const timeSinceHeartbeat = Date.now() - agent.lastHeartbeat;
        return timeSinceHeartbeat > 60000;
      },
      action: async (agent) => {
        await notificationManager.sendAlert({
          type: "governance_violation",
          severity: "high",
          title: "Governance Violation: Missing Heartbeat",
          message: `Agent ${agent.agentName} has not sent heartbeat in ${((Date.now() - agent.lastHeartbeat) / 1000).toFixed(0)} seconds`,
          agentId: agent.agentId,
          agentName: agent.agentName,
          details: {
            lastHeartbeat: agent.lastHeartbeat,
            timeSinceHeartbeat: Date.now() - agent.lastHeartbeat
          },
          timestamp: Date.now()
        });
      }
    });
  }

  /**
   * Add governance rule
   */
  addRule(rule: GovernanceRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Remove governance rule
   */
  removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
  }

  /**
   * Check agent against all rules
   */
  async checkAgent(agent: AgentHealth): Promise<GovernanceViolation[]> {
    const violations: GovernanceViolation[] = [];

    for (const rule of Array.from(this.rules.values())) {
      if (rule.condition(agent)) {
        const violation: GovernanceViolation = {
          id: `violation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          rule: rule.id,
          agentId: agent.agentId,
          severity: rule.severity,
          detectedAt: Date.now(),
          description: `${rule.name}: ${rule.description}`,
          resolved: false
        };

        this.violations.set(violation.id, violation);
        violations.push(violation);

        // Execute rule action if defined
        if (rule.action) {
          try {
            await rule.action(agent);
          } catch (error: any) {
            console.error(`[Governance] Rule action failed for ${rule.id}:`, error);
          }
        }

        // Emit violation signal
        emitSignal({
          source: "supervisor",
          type: "governance_violation",
          priority: rule.severity === "critical" ? "critical" : "high",
          payload: {
            ruleId: rule.id,
            ruleName: rule.name,
            agentId: agent.agentId,
            agentName: agent.agentName,
            severity: rule.severity
          }
        });
      }
    }

    return violations;
  }

  /**
   * Resolve violation
   */
  resolveViolation(violationId: string): void {
    const violation = this.violations.get(violationId);
    if (violation) {
      violation.resolved = true;
      violation.resolvedAt = Date.now();
    }
  }

  /**
   * Get active violations
   */
  getActiveViolations(): GovernanceViolation[] {
    return Array.from(this.violations.values()).filter(v => !v.resolved);
  }

  /**
   * Get violations for agent
   */
  getViolationsForAgent(agentId: string): GovernanceViolation[] {
    return Array.from(this.violations.values()).filter(v => v.agentId === agentId && !v.resolved);
  }
}

export const governanceEngine = new GovernanceEngine();
