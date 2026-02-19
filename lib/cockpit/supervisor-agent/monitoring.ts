// Supervisor Agent - Monitoring Loop
// Continuously monitors all agents and workflows for health and failures

import { AgentHealth, WorkflowHealth, AgentFailure, Anomaly, FailureSeverity } from "./types";
import { laneRegistry } from "./registry";
import { emitSignal } from "@/lib/uoi/signals";
import { detectAnomalies } from "./anomaly-detection";

class MonitoringEngine {
  private agents: Map<string, AgentHealth> = new Map();
  private workflows: Map<string, WorkflowHealth> = new Map();
  private failures: Map<string, AgentFailure> = new Map();
  private anomalies: Map<string, Anomaly> = new Map();
  private monitoringInterval?: NodeJS.Timeout;
  private heartbeatTimeouts: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Start monitoring loop
   */
  start(intervalMs: number = 30000): void {
    if (this.monitoringInterval) {
      this.stop();
    }

    this.monitoringInterval = setInterval(() => {
      this.monitoringCycle();
    }, intervalMs);

    // Initial cycle
    this.monitoringCycle();
  }

  /**
   * Stop monitoring loop
   */
  stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    // Clear all heartbeat timeouts
    for (const timeout of Array.from(this.heartbeatTimeouts.values())) {
      clearTimeout(timeout);
    }
    this.heartbeatTimeouts.clear();
  }

  /**
   * Main monitoring cycle
   */
  private monitoringCycle(): void {
    const now = Date.now();

    // Check all agents
    for (const [agentId, health] of Array.from(this.agents.entries())) {
      this.checkAgentHealth(agentId, health, now);
    }

    // Check all workflows
    for (const [workflowId, health] of Array.from(this.workflows.entries())) {
      this.checkWorkflowHealth(workflowId, health, now);
    }

    // Update lane health based on agent/workflow health
    this.updateLaneHealth();

    // Detect anomalies
    this.detectAnomalies();

    // Emit monitoring signal
    emitSignal({
      source: "supervisor",
      type: "monitoring_cycle",
      priority: "low",
      payload: {
        timestamp: now,
        agentsChecked: this.agents.size,
        workflowsChecked: this.workflows.size,
        failures: this.failures.size,
        anomalies: this.anomalies.size
      }
    });
  }

  /**
   * Check agent health
   */
  private checkAgentHealth(agentId: string, health: AgentHealth, now: number): void {
    const heartbeatTimeout = 60000; // 60 seconds
    const timeSinceHeartbeat = now - health.lastHeartbeat;

    // Check for missed heartbeat
    if (timeSinceHeartbeat > heartbeatTimeout) {
      this.recordFailure(agentId, {
        failureType: "heartbeat_missed",
        severity: "high",
        error: `Heartbeat missed for ${timeSinceHeartbeat}ms`,
        context: {
          lastHeartbeat: health.lastHeartbeat,
          timeout: heartbeatTimeout
        }
      });
      return;
    }

    // Check success rate
    if (health.successRate < 50 && health.totalExecutions > 10) {
      this.recordFailure(agentId, {
        failureType: "degraded",
        severity: "medium",
        error: `Success rate below 50%: ${health.successRate}%`,
        context: {
          successRate: health.successRate,
          totalExecutions: health.totalExecutions
        }
      });
      return;
    }

    // Check error rate
    if (health.errorRate > 20 && health.totalExecutions > 10) {
      this.recordFailure(agentId, {
        failureType: "degraded",
        severity: "medium",
        error: `Error rate above 20%: ${health.errorRate}%`,
        context: {
          errorRate: health.errorRate,
          totalExecutions: health.totalExecutions
        }
      });
      return;
    }

    // Check consecutive failures
    if (health.consecutiveFailures >= 3) {
      this.recordFailure(agentId, {
        failureType: "error",
        severity: "critical",
        error: `${health.consecutiveFailures} consecutive failures`,
        context: {
          consecutiveFailures: health.consecutiveFailures,
          lastFailure: health.lastFailure
        }
      });
      return;
    }

    // Agent is healthy
    if (health.status !== "healthy") {
      health.status = "healthy";
      health.health = Math.min(100, health.health + 10);
      this.resolveFailure(agentId);
    }
  }

  /**
   * Check workflow health
   */
  private checkWorkflowHealth(workflowId: string, health: WorkflowHealth, now: number): void {
    // Check if workflow hasn't executed in expected time
    const expectedInterval = 3600000; // 1 hour default
    if (health.lastExecution && (now - health.lastExecution) > expectedInterval * 2) {
      health.status = "offline";
      return;
    }

    // Check error rate
    if (health.errorRate > 20 && health.executionCount > 10) {
      health.status = "degraded";
      return;
    }

    // Check if workflow is failing
    if (health.failureCount > 0 && health.executionCount > 0) {
      const failureRate = (health.failureCount / health.executionCount) * 100;
      if (failureRate > 30) {
        health.status = "failed";
        return;
      }
    }

    // Workflow is healthy
    if (health.status !== "healthy") {
      health.status = "healthy";
    }
  }

  /**
   * Record agent failure
   */
  recordFailure(agentId: string, details: {
    failureType: AgentFailure["failureType"];
    severity: FailureSeverity;
    error?: string;
    stackTrace?: string;
    context?: Record<string, any>;
  }): void {
    const health = this.agents.get(agentId);
    if (!health) return;

    const failure: AgentFailure = {
      id: `failure-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      agentId,
      agentName: health.agentName,
      agentType: health.agentType,
      failureType: details.failureType,
      severity: details.severity,
      detectedAt: Date.now(),
      error: details.error,
      stackTrace: details.stackTrace,
      context: details.context || {},
      restartAttempts: 0,
      escalated: false,
      escalationLevel: "none"
    };

    this.failures.set(agentId, failure);

    // Update agent health
    health.status = details.severity === "critical" ? "failed" : "degraded";
    health.lastFailure = Date.now();
    health.consecutiveFailures++;
    health.health = Math.max(0, health.health - 20);
    health.errorRate = health.totalExecutions > 0
      ? ((health.totalExecutions - (health.totalExecutions * health.successRate / 100)) / health.totalExecutions) * 100
      : 0;

    // Emit failure signal
    emitSignal({
      source: "supervisor",
      type: "agent_failure",
      priority: details.severity === "critical" ? "critical" : "high",
      payload: {
        agentId,
        agentName: health.agentName,
        failureType: details.failureType,
        severity: details.severity,
        error: details.error
      }
    });
  }

  /**
   * Resolve agent failure
   */
  resolveFailure(agentId: string): void {
    const failure = this.failures.get(agentId);
    if (failure) {
      failure.resolvedAt = Date.now();
      this.failures.delete(agentId);
    }
  }

  /**
   * Update lane health based on agent/workflow health
   */
  private updateLaneHealth(): void {
    const lanes = laneRegistry.getAllLanes();

    for (const lane of lanes) {
      const agentIds = laneRegistry.getAgentsInLane(lane.laneId);
      const workflowIds = laneRegistry.getWorkflowsInLane(lane.laneId);

      let totalHealth = 0;
      let count = 0;
      let hasFailed = false;
      let hasDegraded = false;

      // Check agent health
      for (const agentId of agentIds) {
        const health = this.agents.get(agentId);
        if (health) {
          totalHealth += health.health;
          count++;
          if (health.status === "failed") hasFailed = true;
          if (health.status === "degraded") hasDegraded = true;
        }
      }

      // Check workflow health
      for (const workflowId of workflowIds) {
        const health = this.workflows.get(workflowId);
        if (health) {
          const workflowHealth = health.status === "healthy" ? 100 : health.status === "degraded" ? 50 : 0;
          totalHealth += workflowHealth;
          count++;
          if (health.status === "failed") hasFailed = true;
          if (health.status === "degraded") hasDegraded = true;
        }
      }

      // Update lane health
      const avgHealth = count > 0 ? totalHealth / count : 100;
      const status = hasFailed ? "failed" : hasDegraded ? "degraded" : "healthy";
      laneRegistry.updateLaneHealth(lane.laneId, avgHealth, status);
    }
  }

  /**
   * Detect anomalies
   */
  private detectAnomalies(): void {
    for (const [agentId, health] of Array.from(this.agents.entries())) {
      const detected = detectAnomalies(agentId, health);
      for (const anomaly of detected) {
        this.anomalies.set(anomaly.id, anomaly);
      }
    }
  }

  /**
   * Register agent for monitoring
   */
  registerAgent(health: AgentHealth): void {
    this.agents.set(health.agentId, health);
  }

  /**
   * Unregister agent from monitoring
   */
  unregisterAgent(agentId: string): void {
    this.agents.delete(agentId);
    this.failures.delete(agentId);
    const timeout = this.heartbeatTimeouts.get(agentId);
    if (timeout) {
      clearTimeout(timeout);
      this.heartbeatTimeouts.delete(agentId);
    }
  }

  /**
   * Update agent heartbeat
   */
  updateHeartbeat(agentId: string): void {
    const health = this.agents.get(agentId);
    if (health) {
      health.lastHeartbeat = Date.now();
    }
  }

  /**
   * Record agent execution
   */
  recordExecution(agentId: string, success: boolean, latency: number, error?: string): void {
    const health = this.agents.get(agentId);
    if (!health) return;

    health.totalExecutions++;
    if (success) {
      health.lastSuccess = Date.now();
      health.consecutiveFailures = 0;
    } else {
      health.lastFailure = Date.now();
      health.consecutiveFailures++;
    }

    // Update success rate (rolling average)
    const successCount = health.totalExecutions * (health.successRate / 100);
    health.successRate = ((successCount + (success ? 1 : 0)) / health.totalExecutions) * 100;

    // Update average latency (rolling average)
    health.averageLatency = (health.averageLatency * (health.totalExecutions - 1) + latency) / health.totalExecutions;

    // Update error rate
    health.errorRate = health.totalExecutions > 0
      ? ((health.totalExecutions - (health.totalExecutions * health.successRate / 100)) / health.totalExecutions) * 100
      : 0;
  }

  /**
   * Register workflow for monitoring
   */
  registerWorkflow(health: WorkflowHealth): void {
    this.workflows.set(health.workflowId, health);
  }

  /**
   * Record workflow execution
   */
  recordWorkflowExecution(workflowId: string, success: boolean, duration: number, error?: string): void {
    const health = this.workflows.get(workflowId);
    if (!health) return;

    health.executionCount++;
    health.lastExecution = Date.now();

    if (success) {
      health.successCount++;
      health.lastSuccess = Date.now();
    } else {
      health.failureCount++;
      health.lastFailure = Date.now();
      health.lastError = error;
    }

    // Update average duration
    health.averageDuration = (health.averageDuration * (health.executionCount - 1) + duration) / health.executionCount;

    // Update error rate
    health.errorRate = health.executionCount > 0
      ? (health.failureCount / health.executionCount) * 100
      : 0;
  }

  /**
   * Get agent health
   */
  getAgentHealth(agentId: string): AgentHealth | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Get all agent health
   */
  getAllAgentHealth(): AgentHealth[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get workflow health
   */
  getWorkflowHealth(workflowId: string): WorkflowHealth | undefined {
    return this.workflows.get(workflowId);
  }

  /**
   * Get all workflow health
   */
  getAllWorkflowHealth(): WorkflowHealth[] {
    return Array.from(this.workflows.values());
  }

  /**
   * Get active failures
   */
  getActiveFailures(): AgentFailure[] {
    return Array.from(this.failures.values());
  }

  /**
   * Get active anomalies
   */
  getActiveAnomalies(): Anomaly[] {
    return Array.from(this.anomalies.values()).filter(a => !a.resolved);
  }
}

export const monitoringEngine = new MonitoringEngine();
