// Supervisor Agent - Lane Registry
// Maintains the registry of all lanes and their associated agents/workflows

import { LaneRegistry, LaneConfig } from "./types";

class LaneRegistryStore {
  private lanes: Map<string, LaneRegistry> = new Map();
  private agentToLane: Map<string, string> = new Map(); // Agent ID -> Lane ID
  private workflowToLane: Map<string, string> = new Map(); // Workflow ID -> Lane ID

  /**
   * Initialize registry from configuration
   */
  initialize(configs: LaneConfig[]): void {
    this.lanes.clear();
    this.agentToLane.clear();
    this.workflowToLane.clear();

    for (const config of configs) {
      const registry: LaneRegistry = {
        laneId: config.laneId,
        laneName: config.laneName,
        description: "",
        agents: [...config.agents],
        workflows: [...config.workflows],
        status: "healthy",
        health: 100,
        lastUpdated: Date.now(),
        metadata: {
          priority: config.priority,
          dependencies: [],
          governanceRules: [...config.governanceRules]
        }
      };

      this.lanes.set(config.laneId, registry);

      // Map agents to lanes
      for (const agentId of config.agents) {
        this.agentToLane.set(agentId, config.laneId);
      }

      // Map workflows to lanes
      for (const workflowId of config.workflows) {
        this.workflowToLane.set(workflowId, config.laneId);
      }
    }
  }

  /**
   * Get lane by ID
   */
  getLane(laneId: string): LaneRegistry | undefined {
    return this.lanes.get(laneId);
  }

  /**
   * Get all lanes
   */
  getAllLanes(): LaneRegistry[] {
    return Array.from(this.lanes.values());
  }

  /**
   * Get lane for an agent
   */
  getLaneForAgent(agentId: string): LaneRegistry | undefined {
    const laneId = this.agentToLane.get(agentId);
    return laneId ? this.lanes.get(laneId) : undefined;
  }

  /**
   * Get lane for a workflow
   */
  getLaneForWorkflow(workflowId: string): LaneRegistry | undefined {
    const laneId = this.workflowToLane.get(workflowId);
    return laneId ? this.lanes.get(laneId) : undefined;
  }

  /**
   * Update lane health
   */
  updateLaneHealth(laneId: string, health: number, status: LaneRegistry["status"]): void {
    const lane = this.lanes.get(laneId);
    if (lane) {
      lane.health = health;
      lane.status = status;
      lane.lastUpdated = Date.now();
    }
  }

  /**
   * Register agent to lane
   */
  registerAgent(agentId: string, laneId: string): void {
    const lane = this.lanes.get(laneId);
    if (lane && !lane.agents.includes(agentId)) {
      lane.agents.push(agentId);
      this.agentToLane.set(agentId, laneId);
      lane.lastUpdated = Date.now();
    }
  }

  /**
   * Unregister agent from lane
   */
  unregisterAgent(agentId: string): void {
    const laneId = this.agentToLane.get(agentId);
    if (laneId) {
      const lane = this.lanes.get(laneId);
      if (lane) {
        lane.agents = lane.agents.filter(id => id !== agentId);
        lane.lastUpdated = Date.now();
      }
      this.agentToLane.delete(agentId);
    }
  }

  /**
   * Register workflow to lane
   */
  registerWorkflow(workflowId: string, laneId: string): void {
    const lane = this.lanes.get(laneId);
    if (lane && !lane.workflows.includes(workflowId)) {
      lane.workflows.push(workflowId);
      this.workflowToLane.set(workflowId, laneId);
      lane.lastUpdated = Date.now();
    }
  }

  /**
   * Unregister workflow from lane
   */
  unregisterWorkflow(workflowId: string): void {
    const laneId = this.workflowToLane.get(workflowId);
    if (laneId) {
      const lane = this.lanes.get(laneId);
      if (lane) {
        lane.workflows = lane.workflows.filter(id => id !== workflowId);
        lane.lastUpdated = Date.now();
      }
      this.workflowToLane.delete(workflowId);
    }
  }

  /**
   * Get agents in lane
   */
  getAgentsInLane(laneId: string): string[] {
    const lane = this.lanes.get(laneId);
    return lane ? [...lane.agents] : [];
  }

  /**
   * Get workflows in lane
   */
  getWorkflowsInLane(laneId: string): string[] {
    const lane = this.lanes.get(laneId);
    return lane ? [...lane.workflows] : [];
  }
}

export const laneRegistry = new LaneRegistryStore();
