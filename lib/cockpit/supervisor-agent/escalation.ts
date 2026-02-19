// Supervisor Agent - Escalation System
// Handles escalation of critical failures

import { AgentFailure, EscalationLevel, FailureSeverity } from "./types";
import { notificationManager } from "./notifications";
import { emitSignal } from "@/lib/uoi/signals";

interface EscalationRule {
  condition: (failure: AgentFailure) => boolean;
  level: EscalationLevel;
  delay: number; // ms before escalating
}

class EscalationManager {
  private escalationRules: EscalationRule[] = [];
  private escalatedFailures: Map<string, { level: EscalationLevel; escalatedAt: number }> = new Map();

  /**
   * Initialize escalation rules
   */
  initialize(): void {
    // Rule 1: Critical failures escalate immediately to operator
    this.escalationRules.push({
      condition: (failure) => failure.severity === "critical",
      level: "operator",
      delay: 0
    });

    // Rule 2: High severity failures escalate to operator after 5 minutes
    this.escalationRules.push({
      condition: (failure) => failure.severity === "high" && failure.restartAttempts >= 2,
      level: "operator",
      delay: 300000 // 5 minutes
    });

    // Rule 3: Multiple failures escalate to steward
    this.escalationRules.push({
      condition: (failure) => failure.restartAttempts >= 3,
      level: "steward",
      delay: 600000 // 10 minutes
    });

    // Rule 4: System-wide failures escalate to emergency
    this.escalationRules.push({
      condition: (failure) => failure.severity === "critical" && failure.restartAttempts >= 3,
      level: "emergency",
      delay: 900000 // 15 minutes
    });
  }

  /**
   * Check if failure should be escalated
   */
  async checkEscalation(failure: AgentFailure): Promise<void> {
    // Check if already escalated
    const existing = this.escalatedFailures.get(failure.id);
    if (existing) {
      return; // Already escalated
    }

    // Find matching rule
    for (const rule of this.escalationRules) {
      if (rule.condition(failure)) {
        const timeSinceDetection = Date.now() - failure.detectedAt;
        
        if (timeSinceDetection >= rule.delay) {
          await this.escalate(failure, rule.level);
          return;
        } else {
          // Schedule escalation
          setTimeout(() => {
            this.checkEscalation(failure).catch(console.error);
          }, rule.delay - timeSinceDetection);
        }
      }
    }
  }

  /**
   * Escalate failure
   */
  private async escalate(failure: AgentFailure, level: EscalationLevel): Promise<void> {
    failure.escalated = true;
    failure.escalationLevel = level;

    this.escalatedFailures.set(failure.id, {
      level,
      escalatedAt: Date.now()
    });

    // Send escalation alert
    await notificationManager.sendAlert({
      type: "escalation",
      severity: level === "emergency" ? "critical" : "high",
      title: `Escalation: ${level.toUpperCase()}`,
      message: `Failure escalated to ${level.toUpperCase()} level`,
      agentId: failure.agentId,
      agentName: failure.agentName,
      details: {
        failureId: failure.id,
        failureType: failure.failureType,
        severity: failure.severity,
        restartAttempts: failure.restartAttempts,
        error: failure.error
      },
      timestamp: Date.now(),
      escalationLevel: level
    });

    // Emit escalation signal
    emitSignal({
      source: "supervisor",
      type: "failure_escalated",
      priority: level === "emergency" ? "critical" : "high",
      payload: {
        failureId: failure.id,
        agentId: failure.agentId,
        agentName: failure.agentName,
        level,
        severity: failure.severity
      }
    });
  }

  /**
   * Get escalation level for failure
   */
  getEscalationLevel(failure: AgentFailure): EscalationLevel {
    const existing = this.escalatedFailures.get(failure.id);
    return existing ? existing.level : "none";
  }
}

export const escalationManager = new EscalationManager();
