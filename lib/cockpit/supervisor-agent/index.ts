// Supervisor Agent - Main Orchestrator
// The Supervisor Agent of the Vieron Cockpit

import { SupervisorConfig, GlobalState, AgentHealth, WorkflowHealth, LaneConfig } from "./types";
import { laneRegistry } from "./registry";
import { monitoringEngine } from "./monitoring";
import { restartManager } from "./restart";
import { notificationManager } from "./notifications";
import { governanceEngine } from "./governance";
import { escalationManager } from "./escalation";
import { emitSignal } from "@/lib/uoi/signals";

class SupervisorAgent {
  private config: SupervisorConfig | null = null;
  private globalState: GlobalState | null = null;
  private isRunning = false;

  /**
   * Initialize supervisor with configuration
   */
  initialize(config: SupervisorConfig): void {
    this.config = config;

    // Initialize lane registry
    laneRegistry.initialize(config.lanes);

    // Initialize governance engine
    governanceEngine.initialize();

    // Initialize escalation manager
    escalationManager.initialize();

    // Initialize global state
    this.globalState = this.createInitialState();

    console.log("[Supervisor] Initialized with", config.lanes.length, "lanes");
  }

  /**
   * Start supervisor monitoring loop
   */
  start(): void {
    if (!this.config) {
      throw new Error("Supervisor not initialized. Call initialize() first.");
    }

    if (this.isRunning) {
      console.warn("[Supervisor] Already running");
      return;
    }

    this.isRunning = true;

    // Start monitoring engine
    monitoringEngine.start(this.config.monitoringInterval);

    // Start periodic tasks
    this.startPeriodicTasks();

    console.log("[Supervisor] Started monitoring loop");
  }

  /**
   * Stop supervisor
   */
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    monitoringEngine.stop();

    console.log("[Supervisor] Stopped");
  }

  /**
   * Start periodic tasks
   */
  private startPeriodicTasks(): void {
    if (!this.config) return;

    // Update global state every 30 seconds
    setInterval(() => {
      this.updateGlobalState();
    }, 30000);

    // Check for failures and restart every minute
    setInterval(() => {
      this.checkAndRestartFailedAgents();
    }, 60000);

    // Check governance violations every 30 seconds
    setInterval(() => {
      this.checkGovernanceViolations();
    }, 30000);

    // Clear old restart actions every hour
    setInterval(() => {
      restartManager.clearCompletedActions();
    }, 3600000);
  }

  /**
   * Check and restart failed agents
   */
  private async checkAndRestartFailedAgents(): Promise<void> {
    if (!this.config) return;

    const failures = monitoringEngine.getActiveFailures();

    for (const failure of failures) {
      // Check escalation
      await escalationManager.checkEscalation(failure);

      // Check if restart is needed
      if (failure.severity === "critical" || failure.restartAttempts < this.config.maxRestartAttempts) {
        const health = monitoringEngine.getAgentHealth(failure.agentId);
        if (health && health.status === "failed") {
          try {
            await restartManager.restartAgent(
              failure.agentId,
              "soft",
              this.config.maxRestartAttempts
            );

            // Send restart notification
            await notificationManager.sendAlert({
              type: "restart",
              severity: "medium",
              title: "Agent Restart Initiated",
              message: `Agent ${failure.agentName} is being restarted due to failure`,
              agentId: failure.agentId,
              agentName: failure.agentName,
              details: {
                failureType: failure.failureType,
                severity: failure.severity,
                restartAttempts: failure.restartAttempts + 1
              },
              timestamp: Date.now()
            });

            failure.restartAttempts++;
          } catch (error: any) {
            console.error(`[Supervisor] Failed to restart agent ${failure.agentId}:`, error);
          }
        }
      }
    }
  }

  /**
   * Check governance violations
   */
  private async checkGovernanceViolations(): Promise<void> {
    if (!this.config?.governanceEnforcementEnabled) return;

    const agents = monitoringEngine.getAllAgentHealth();

    for (const agent of agents) {
      await governanceEngine.checkAgent(agent);
    }
  }

  /**
   * Update global state
   */
  private updateGlobalState(): void {
    if (!this.config) return;

    const agents = monitoringEngine.getAllAgentHealth();
    const workflows = monitoringEngine.getAllWorkflowHealth();
    const failures = monitoringEngine.getActiveFailures();
    const anomalies = monitoringEngine.getActiveAnomalies();
    const violations = governanceEngine.getActiveViolations();

    const healthyAgents = agents.filter(a => a.status === "healthy").length;
    const failedAgents = agents.filter(a => a.status === "failed").length;
    const degradedAgents = agents.filter(a => a.status === "degraded").length;
    const activeWorkflows = workflows.filter(w => w.status === "healthy").length;
    const failedWorkflows = workflows.filter(w => w.status === "failed").length;

    const systemHealth = agents.length > 0
      ? (healthyAgents / agents.length) * 100
      : 100;

    this.globalState = {
      timestamp: Date.now(),
      totalAgents: agents.length,
      healthyAgents,
      failedAgents,
      degradedAgents,
      totalWorkflows: workflows.length,
      activeWorkflows,
      failedWorkflows,
      lanes: laneRegistry.getAllLanes(),
      recentFailures: failures.slice(0, 10),
      activeAnomalies: anomalies,
      systemHealth,
      governanceViolations: violations
    };

    // Emit state update signal
    emitSignal({
      source: "supervisor",
      type: "global_state_update",
      priority: "low",
      payload: {
        systemHealth,
        totalAgents: agents.length,
        healthyAgents,
        failedAgents
      }
    });
  }

  /**
   * Create initial global state
   */
  private createInitialState(): GlobalState {
    return {
      timestamp: Date.now(),
      totalAgents: 0,
      healthyAgents: 0,
      failedAgents: 0,
      degradedAgents: 0,
      totalWorkflows: 0,
      activeWorkflows: 0,
      failedWorkflows: 0,
      lanes: [],
      recentFailures: [],
      activeAnomalies: [],
      systemHealth: 100,
      governanceViolations: []
    };
  }

  /**
   * Register agent for monitoring
   */
  registerAgent(health: AgentHealth, laneId?: string): void {
    monitoringEngine.registerAgent(health);

    if (laneId) {
      laneRegistry.registerAgent(health.agentId, laneId);
    }

    // Update heartbeat
    monitoringEngine.updateHeartbeat(health.agentId);
  }

  /**
   * Register workflow for monitoring
   */
  registerWorkflow(health: WorkflowHealth): void {
    monitoringEngine.registerWorkflow(health);

    const lane = laneRegistry.getLaneForWorkflow(health.workflowId);
    if (!lane) {
      // Auto-register to lane if not already registered
      const lanes = laneRegistry.getAllLanes();
      if (lanes.length > 0) {
        laneRegistry.registerWorkflow(health.workflowId, lanes[0].laneId);
      }
    }
  }

  /**
   * Record agent execution
   */
  recordAgentExecution(agentId: string, success: boolean, latency: number, error?: string): void {
    monitoringEngine.recordExecution(agentId, success, latency, error);
    monitoringEngine.updateHeartbeat(agentId);
  }

  /**
   * Record workflow execution
   */
  recordWorkflowExecution(workflowId: string, success: boolean, duration: number, error?: string): void {
    monitoringEngine.recordWorkflowExecution(workflowId, success, duration, error);
  }

  /**
   * Get global state
   */
  getGlobalState(): GlobalState | null {
    return this.globalState;
  }

  /**
   * Get agent health
   */
  getAgentHealth(agentId: string): AgentHealth | undefined {
    return monitoringEngine.getAgentHealth(agentId);
  }

  /**
   * Get all agent health
   */
  getAllAgentHealth(): AgentHealth[] {
    return monitoringEngine.getAllAgentHealth();
  }

  /**
   * Get workflow health
   */
  getWorkflowHealth(workflowId: string): WorkflowHealth | undefined {
    return monitoringEngine.getWorkflowHealth(workflowId);
  }

  /**
   * Get all workflow health
   */
  getAllWorkflowHealth(): WorkflowHealth[] {
    return monitoringEngine.getAllWorkflowHealth();
  }

  /**
   * Get active failures
   */
  getActiveFailures() {
    return monitoringEngine.getActiveFailures();
  }

  /**
   * Get active anomalies
   */
  getActiveAnomalies() {
    return monitoringEngine.getActiveAnomalies();
  }

  /**
   * Get governance violations
   */
  getGovernanceViolations() {
    return governanceEngine.getActiveViolations();
  }

  /**
   * Manually restart agent
   */
  async restartAgent(agentId: string, restartType: "soft" | "hard" | "full" = "soft"): Promise<void> {
    await restartManager.restartAgent(agentId, restartType);
  }
}

export const supervisorAgent = new SupervisorAgent();

// Export all components
export * from "./types";
export { laneRegistry } from "./registry";
export { monitoringEngine } from "./monitoring";
export { restartManager } from "./restart";
export { notificationManager } from "./notifications";
export { governanceEngine } from "./governance";
export { escalationManager } from "./escalation";
