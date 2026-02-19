// Supervisor Agent - Restart Logic
// Handles restarting failed agents

import { AgentHealth, RestartAction, AgentFailure } from "./types";
import { monitoringEngine } from "./monitoring";
import { emitSignal } from "@/lib/uoi/signals";

class RestartManager {
  private restartActions: Map<string, RestartAction> = new Map();
  private restartCooldowns: Map<string, number> = new Map();
  private readonly DEFAULT_COOLDOWN = 60000; // 1 minute
  private readonly DEFAULT_MAX_ATTEMPTS = 3;

  /**
   * Attempt to restart a failed agent
   */
  async restartAgent(
    agentId: string,
    restartType: RestartAction["restartType"] = "soft",
    maxAttempts: number = this.DEFAULT_MAX_ATTEMPTS
  ): Promise<RestartAction> {
    const health = monitoringEngine.getAgentHealth(agentId);
    if (!health) {
      throw new Error(`Agent ${agentId} not found`);
    }

    // Check cooldown
    const cooldownEnd = this.restartCooldowns.get(agentId) || 0;
    if (Date.now() < cooldownEnd) {
      throw new Error(`Agent ${agentId} is in cooldown period`);
    }

    // Check if restart already in progress
    const existingAction = this.restartActions.get(agentId);
    if (existingAction && existingAction.status === "in_progress") {
      return existingAction;
    }

    // Create restart action
    const action: RestartAction = {
      id: `restart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      agentId,
      agentName: health.agentName,
      initiatedAt: Date.now(),
      status: "in_progress",
      restartType,
      attempts: existingAction ? existingAction.attempts + 1 : 1,
      maxAttempts
    };

    this.restartActions.set(agentId, action);

    try {
      // Emit restart signal
      emitSignal({
        source: "supervisor",
        type: "agent_restart",
        priority: "high",
        payload: {
          agentId,
          agentName: health.agentName,
          restartType,
          attempt: action.attempts
        }
      });

      // Perform restart based on type
      switch (restartType) {
        case "soft":
          await this.softRestart(agentId);
          break;
        case "hard":
          await this.hardRestart(agentId);
          break;
        case "full":
          await this.fullRestart(agentId);
          break;
      }

      // Update agent health
      health.status = "restarting";
      health.health = Math.min(100, health.health + 10);

      // Mark restart as completed
      action.status = "completed";
      action.completedAt = Date.now();

      // Reset cooldown
      this.restartCooldowns.delete(agentId);

      // Emit success signal
      emitSignal({
        source: "supervisor",
        type: "agent_restart_success",
        priority: "medium",
        payload: {
          agentId,
          agentName: health.agentName,
          restartType,
          attempt: action.attempts
        }
      });

      return action;
    } catch (error: any) {
      // Mark restart as failed
      action.status = "failed";
      action.completedAt = Date.now();
      action.error = error.message;

      // Set cooldown
      this.restartCooldowns.set(agentId, Date.now() + this.DEFAULT_COOLDOWN);

      // If max attempts not reached, schedule retry
      if (action.attempts < maxAttempts) {
        setTimeout(() => {
          this.restartAgent(agentId, restartType, maxAttempts).catch(console.error);
        }, this.DEFAULT_COOLDOWN);
      }

      // Emit failure signal
      emitSignal({
        source: "supervisor",
        type: "agent_restart_failure",
        priority: "high",
        payload: {
          agentId,
          agentName: health.agentName,
          restartType,
          attempt: action.attempts,
          error: error.message
        }
      });

      throw error;
    }
  }

  /**
   * Soft restart - reset agent state without full reinitialization
   */
  private async softRestart(agentId: string): Promise<void> {
    const health = monitoringEngine.getAgentHealth(agentId);
    if (!health) return;

    // Reset consecutive failures
    health.consecutiveFailures = 0;

    // Reset error rate
    health.errorRate = 0;

    // Update heartbeat
    monitoringEngine.updateHeartbeat(agentId);

    // Wait a bit for agent to stabilize
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  /**
   * Hard restart - reinitialize agent with current configuration
   */
  private async hardRestart(agentId: string): Promise<void> {
    const health = monitoringEngine.getAgentHealth(agentId);
    if (!health) return;

    // Perform soft restart first
    await this.softRestart(agentId);

    // Reset all metrics
    health.totalExecutions = 0;
    health.successRate = 100;
    health.averageLatency = 0;
    health.errorRate = 0;
    health.consecutiveFailures = 0;

    // Wait longer for agent to fully reinitialize
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  /**
   * Full restart - complete agent reinitialization
   */
  private async fullRestart(agentId: string): Promise<void> {
    const health = monitoringEngine.getAgentHealth(agentId);
    if (!health) return;

    // Perform hard restart first
    await this.hardRestart(agentId);

    // Reset all state
    health.lastSuccess = undefined;
    health.lastFailure = undefined;
    health.lastHeartbeat = Date.now();
    health.metadata = {};

    // Wait for full reinitialization
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  /**
   * Get restart action for agent
   */
  getRestartAction(agentId: string): RestartAction | undefined {
    return this.restartActions.get(agentId);
  }

  /**
   * Get all restart actions
   */
  getAllRestartActions(): RestartAction[] {
    return Array.from(this.restartActions.values());
  }

  /**
   * Clear completed restart actions
   */
  clearCompletedActions(): void {
    for (const [agentId, action] of Array.from(this.restartActions.entries())) {
      if (action.status === "completed" || action.status === "failed") {
        const age = Date.now() - (action.completedAt || action.initiatedAt);
        if (age > 3600000) { // 1 hour
          this.restartActions.delete(agentId);
        }
      }
    }
  }
}

export const restartManager = new RestartManager();
