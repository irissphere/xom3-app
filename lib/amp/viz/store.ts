// AMP Visualization Status Store
// In-memory store for real-time pipeline execution status
// Tracks node statuses during pipeline execution

import { AmpVizNodeStatus, AmpVizNode } from "./model";

type ExecutionStatus = {
  executionId: string;
  pipelineId: string;
  nodes: Map<string, {
    status: AmpVizNodeStatus;
    metadata?: AmpVizNode["metadata"];
  }>;
  lastUpdated: string;
};

class VizStatusStore {
  private executions: Map<string, ExecutionStatus> = new Map();

  /**
   * Initialize or update execution status
   */
  initExecution(executionId: string, pipelineId: string): void {
    if (!this.executions.has(executionId)) {
      this.executions.set(executionId, {
        executionId,
        pipelineId,
        nodes: new Map(),
        lastUpdated: new Date().toISOString()
      });
    }
  }

  /**
   * Update node status for an execution
   */
  updateNode(
    executionId: string,
    nodeId: string,
    status: AmpVizNodeStatus,
    metadata?: AmpVizNode["metadata"]
  ): void {
    const execution = this.executions.get(executionId);
    if (!execution) {
      console.warn(`Execution ${executionId} not found in store`);
      return;
    }

    execution.nodes.set(nodeId, { status, metadata });
    execution.lastUpdated = new Date().toISOString();
  }

  /**
   * Get current status for an execution
   */
  getExecutionStatus(executionId: string): ExecutionStatus | undefined {
    return this.executions.get(executionId);
  }

  /**
   * Get status by pipeline ID (returns most recent execution)
   */
  getPipelineStatus(pipelineId: string): ExecutionStatus | undefined {
    let latest: ExecutionStatus | undefined;
    for (const execution of Array.from(this.executions.values())) {
      if (execution.pipelineId === pipelineId) {
        if (!latest || execution.lastUpdated > latest.lastUpdated) {
          latest = execution;
        }
      }
    }
    return latest;
  }

  /**
   * Clean up old executions (older than 1 hour)
   */
  cleanup(): void {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    for (const [executionId, execution] of Array.from(this.executions.entries())) {
      const lastUpdated = new Date(execution.lastUpdated).getTime();
      if (lastUpdated < oneHourAgo) {
        this.executions.delete(executionId);
      }
    }
  }

  /**
   * Clear all executions (for testing)
   */
  clear(): void {
    this.executions.clear();
  }
}

// Singleton instance
export const vizStatusStore = new VizStatusStore();

// Cleanup old executions every 10 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    vizStatusStore.cleanup();
  }, 10 * 60 * 1000);
}

/**
 * Update visualization status during pipeline execution
 */
export function vizUpdate(
  executionId: string,
  nodeId: string,
  status: AmpVizNodeStatus,
  metadata?: AmpVizNode["metadata"]
): void {
  vizStatusStore.updateNode(executionId, nodeId, status, metadata);
}
