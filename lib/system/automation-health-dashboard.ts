// Automation Health Dashboard - Task 45
// Visualize automation throughput, failures, and latency

import { AutomationQueue, QueueStats, AutomationTask, automationQueue } from "./automation-queue";
import { AutomationDependencyGraph } from "./automation-dependency-graph";

export interface AutomationHealthMetrics {
  automationId: string;
  automationName: string;
  status: "healthy" | "degraded" | "unhealthy" | "unknown";
  throughput: number; // Tasks per minute
  successRate: number; // 0-1
  averageLatency: number; // milliseconds
  failureRate: number; // 0-1
  retryRate: number; // 0-1
  deadLetterCount: number;
  lastExecution?: string;
  lastError?: string;
  trends: {
    throughput: "increasing" | "decreasing" | "stable";
    latency: "increasing" | "decreasing" | "stable";
    failureRate: "increasing" | "decreasing" | "stable";
  };
}

export interface AutomationHealthDashboard {
  overallHealth: "healthy" | "degraded" | "unhealthy";
  totalAutomations: number;
  healthyCount: number;
  degradedCount: number;
  unhealthyCount: number;
  metrics: AutomationHealthMetrics[];
  queueStats: QueueStats;
  dependencyIssues: {
    cycleCount: number;
    cycles: string[][];
    orphanedNodes: string[];
  };
  generatedAt: string;
}

/**
 * Calculate health metrics for an automation
 */
export function calculateAutomationHealth(
  automationId: string,
  automationName: string,
  tasks: AutomationTask[],
  timeWindowMinutes: number = 60
): AutomationHealthMetrics {
  const now = Date.now();
  const windowStart = now - timeWindowMinutes * 60 * 1000;

  // Filter tasks in time window
  const recentTasks = tasks.filter(t => {
    const created = new Date(t.createdAt).getTime();
    return created >= windowStart;
  });

  const completed = recentTasks.filter(t => t.status === "completed");
  const failed = recentTasks.filter(t => t.status === "failed" || t.status === "dead_letter");
  const retried = recentTasks.filter(t => t.retryCount > 0);
  const deadLetter = recentTasks.filter(t => t.status === "dead_letter");

  const total = recentTasks.length;
  const successCount = completed.length;
  const failureCount = failed.length;

  // Calculate metrics
  const throughput = total > 0 ? (completed.length / timeWindowMinutes) : 0;
  const successRate = total > 0 ? successCount / total : 1;
  const failureRate = total > 0 ? failureCount / total : 0;
  const retryRate = total > 0 ? retried.length / total : 0;

  // Calculate average latency
  const latencies = completed
    .filter(t => t.executionTime)
    .map(t => t.executionTime!);
  const averageLatency = latencies.length > 0
    ? latencies.reduce((a, b) => a + b, 0) / latencies.length
    : 0;

  // Determine status
  let status: "healthy" | "degraded" | "unhealthy" | "unknown" = "unknown";
  if (total === 0) {
    status = "unknown";
  } else if (failureRate > 0.2 || successRate < 0.8) {
    status = "unhealthy";
  } else if (failureRate > 0.1 || successRate < 0.9 || retryRate > 0.3) {
    status = "degraded";
  } else {
    status = "healthy";
  }

  // Calculate trends (compare with previous window)
  const previousWindowStart = windowStart - timeWindowMinutes * 60 * 1000;
  const previousTasks = tasks.filter(t => {
    const created = new Date(t.createdAt).getTime();
    return created >= previousWindowStart && created < windowStart;
  });

  const previousCompleted = previousTasks.filter(t => t.status === "completed");
  const previousThroughput = previousTasks.length > 0
    ? previousCompleted.length / timeWindowMinutes
    : 0;
  const previousLatencies = previousCompleted
    .filter(t => t.executionTime)
    .map(t => t.executionTime!);
  const previousAverageLatency = previousLatencies.length > 0
    ? previousLatencies.reduce((a, b) => a + b, 0) / previousLatencies.length
    : 0;
  const previousFailureRate = previousTasks.length > 0
    ? previousTasks.filter(t => t.status === "failed" || t.status === "dead_letter").length / previousTasks.length
    : 0;

  const trends = {
    throughput:
      throughput > previousThroughput * 1.1
        ? ("increasing" as const)
        : throughput < previousThroughput * 0.9
          ? ("decreasing" as const)
          : ("stable" as const),
    latency:
      averageLatency > previousAverageLatency * 1.1
        ? ("increasing" as const)
        : averageLatency < previousAverageLatency * 0.9
          ? ("decreasing" as const)
          : ("stable" as const),
    failureRate:
      failureRate > previousFailureRate * 1.1
        ? ("increasing" as const)
        : failureRate < previousFailureRate * 0.9
          ? ("decreasing" as const)
          : ("stable" as const),
  };

  // Get last execution and error
  const lastExecution = completed.length > 0
    ? completed.sort((a, b) => 
        new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime()
      )[0]?.completedAt
    : undefined;

  const lastError = failed.length > 0
    ? failed.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0]?.error
    : undefined;

  return {
    automationId,
    automationName,
    status,
    throughput,
    successRate,
    averageLatency,
    failureRate,
    retryRate,
    deadLetterCount: deadLetter.length,
    lastExecution,
    lastError,
    trends,
  };
}

/**
 * Generate health dashboard
 */
export function generateHealthDashboard(
  queue: AutomationQueue,
  dependencyGraph: AutomationDependencyGraph,
  automationTasks: Record<string, AutomationTask[]>
): AutomationHealthDashboard {
  const queueStats = queue.getStats();
  const graphSummary = dependencyGraph.getGraphSummary();
  const graph = dependencyGraph.getGraph();

  // Calculate health for each automation
  const metrics: AutomationHealthMetrics[] = [];
  for (const [automationId, tasks] of Object.entries(automationTasks)) {
    const metric = calculateAutomationHealth(
      automationId,
      automationId, // Could be enhanced to get actual name
      tasks
    );
    metrics.push(metric);
  }

  // Count health statuses
  const healthyCount = metrics.filter(m => m.status === "healthy").length;
  const degradedCount = metrics.filter(m => m.status === "degraded").length;
  const unhealthyCount = metrics.filter(m => m.status === "unhealthy").length;

  // Determine overall health
  let overallHealth: "healthy" | "degraded" | "unhealthy" = "healthy";
  if (unhealthyCount > 0 || queueStats.deadLetter > 10) {
    overallHealth = "unhealthy";
  } else if (degradedCount > 0 || queueStats.deadLetter > 5 || graphSummary.cycleCount > 0) {
    overallHealth = "degraded";
  }

  // Find orphaned nodes (nodes with no dependencies or dependents)
  const orphanedNodes: string[] = [];
  for (const [nodeId, node] of Array.from(graph.nodes.entries())) {
    if (node.dependencies.length === 0 && node.dependents.length === 0) {
      orphanedNodes.push(nodeId);
    }
  }

  return {
    overallHealth,
    totalAutomations: metrics.length,
    healthyCount,
    degradedCount,
    unhealthyCount,
    metrics,
    queueStats,
    dependencyIssues: {
      cycleCount: graphSummary.cycleCount,
      cycles: graphSummary.cycles,
      orphanedNodes,
    },
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Get health summary for quick overview
 */
export function getHealthSummary(dashboard: AutomationHealthDashboard): {
  status: string;
  message: string;
  criticalIssues: string[];
} {
  const issues: string[] = [];

  if (dashboard.queueStats.deadLetter > 10) {
    issues.push(`${dashboard.queueStats.deadLetter} tasks in dead-letter queue`);
  }

  if (dashboard.dependencyIssues.cycleCount > 0) {
    issues.push(`${dashboard.dependencyIssues.cycleCount} dependency cycles detected`);
  }

  if (dashboard.unhealthyCount > 0) {
    issues.push(`${dashboard.unhealthyCount} unhealthy automations`);
  }

  if (dashboard.queueStats.pending > 50) {
    issues.push(`${dashboard.queueStats.pending} tasks pending in queue`);
  }

  let message = "All systems operational";
  if (issues.length > 0) {
    message = `Issues detected: ${issues.join(", ")}`;
  }

  return {
    status: dashboard.overallHealth,
    message,
    criticalIssues: issues,
  };
}

/**
 * Generate automation health dashboard (convenience wrapper)
 * Fetches current queue state and generates dashboard
 */
export async function generateAutomationHealthDashboard(): Promise<AutomationHealthDashboard> {
  // Import dependency graph dynamically to avoid circular dependencies
  const { AutomationDependencyGraph } = await import("./automation-dependency-graph");
  const dependencyGraph = new AutomationDependencyGraph();
  
  // Get queue stats (empty tasks map for now - could be enhanced to fetch from storage)
  const automationTasks: Record<string, AutomationTask[]> = {};
  
  return generateHealthDashboard(automationQueue, dependencyGraph, automationTasks);
}
