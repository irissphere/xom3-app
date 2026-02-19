// Performance Heatmap - Task 50
// Visualize slow screens, slow workflows, and slow agents

import { UsageStats, calculateUsageStats, getStoredEvents } from "./usage-analytics";

export interface PerformancePoint {
  id: string;
  type: "screen" | "workflow" | "agent";
  name: string;
  averageTime: number; // milliseconds
  executionCount: number;
  slowThreshold: number; // milliseconds
  isSlow: boolean;
  percentile50: number;
  percentile95: number;
  percentile99: number;
}

export interface PerformanceHeatmap {
  screens: PerformancePoint[];
  workflows: PerformancePoint[];
  agents: PerformancePoint[];
  slowestScreens: PerformancePoint[];
  slowestWorkflows: PerformancePoint[];
  slowestAgents: PerformancePoint[];
  generatedAt: string;
}

/**
 * Generate performance heatmap
 */
export function generatePerformanceHeatmap(
  stats?: UsageStats,
  slowThreshold?: number
): PerformanceHeatmap {
  const allStats = stats || calculateUsageStats(getStoredEvents());
  const threshold = slowThreshold || 1000; // 1 second default

  // Analyze screens (pages)
  const screenData: Record<string, number[]> = {};
  const events = getStoredEvents();

  for (const event of events) {
    if (event.type === "page_view" && event.page && event.duration) {
      if (!screenData[event.page]) {
        screenData[event.page] = [];
      }
      screenData[event.page].push(event.duration);
    }
  }

  const screens: PerformancePoint[] = [];
  for (const [page, durations] of Object.entries(screenData)) {
    if (durations.length === 0) continue;

    durations.sort((a, b) => a - b);
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    const p50 = durations[Math.floor(durations.length * 0.5)];
    const p95 = durations[Math.floor(durations.length * 0.95)];
    const p99 = durations[Math.floor(durations.length * 0.99)];

    screens.push({
      id: `screen_${page}`,
      type: "screen",
      name: page,
      averageTime: avg,
      executionCount: durations.length,
      slowThreshold: threshold,
      isSlow: avg > threshold,
      percentile50: p50,
      percentile95: p95,
      percentile99: p99,
    });
  }

  // Analyze workflows
  const workflows: PerformancePoint[] = [];
  for (const [workflow, data] of Object.entries(allStats.workflowDurations)) {
    if (data.count === 0) continue;

    // Get all workflow completion events for this workflow
    const workflowEvents = events.filter(
      e => e.type === "workflow_complete" && e.action === workflow && e.duration
    );
    const durations = workflowEvents.map(e => e.duration!).sort((a, b) => a - b);

    if (durations.length === 0) continue;

    const avg = data.average;
    const p50 = durations[Math.floor(durations.length * 0.5)];
    const p95 = durations[Math.floor(durations.length * 0.95)];
    const p99 = durations[Math.floor(durations.length * 0.99)];

    workflows.push({
      id: `workflow_${workflow}`,
      type: "workflow",
      name: workflow,
      averageTime: avg,
      executionCount: data.count,
      slowThreshold: threshold,
      isSlow: avg > threshold,
      percentile50: p50,
      percentile95: p95,
      percentile99: p99,
    });
  }

  // Analyze agents
  const agents: PerformancePoint[] = [];
  for (const [agentId, activity] of Object.entries(allStats.agentActivity)) {
    if (activity.workflowsCompleted === 0) continue;

    // Get workflow completion events for this agent
    const agentEvents = events.filter(
      e => e.userId === agentId && e.type === "workflow_complete" && e.duration
    );
    const durations = agentEvents.map(e => e.duration!).sort((a, b) => a - b);

    if (durations.length === 0) continue;

    const avg = activity.averageWorkflowTime;
    const p50 = durations[Math.floor(durations.length * 0.5)];
    const p95 = durations[Math.floor(durations.length * 0.95)];
    const p99 = durations[Math.floor(durations.length * 0.99)];

    agents.push({
      id: `agent_${agentId}`,
      type: "agent",
      name: agentId,
      averageTime: avg,
      executionCount: activity.workflowsCompleted,
      slowThreshold: threshold,
      isSlow: avg > threshold,
      percentile50: p50,
      percentile95: p95,
      percentile99: p99,
    });
  }

  // Sort and get slowest
  const slowestScreens = [...screens]
    .filter(s => s.isSlow)
    .sort((a, b) => b.averageTime - a.averageTime)
    .slice(0, 10);

  const slowestWorkflows = [...workflows]
    .filter(w => w.isSlow)
    .sort((a, b) => b.averageTime - a.averageTime)
    .slice(0, 10);

  const slowestAgents = [...agents]
    .filter(a => a.isSlow)
    .sort((a, b) => b.averageTime - a.averageTime)
    .slice(0, 10);

  return {
    screens,
    workflows,
    agents,
    slowestScreens,
    slowestWorkflows,
    slowestAgents,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Get performance summary
 */
export function getPerformanceSummary(heatmap: PerformanceHeatmap): {
  totalSlow: number;
  slowestItem: PerformancePoint | null;
  averagePerformance: number;
  recommendations: string[];
} {
  const allSlow = [
    ...heatmap.slowestScreens,
    ...heatmap.slowestWorkflows,
    ...heatmap.slowestAgents,
  ];

  const slowest = allSlow.length > 0
    ? allSlow.sort((a, b) => b.averageTime - a.averageTime)[0]
    : null;

  const allItems = [
    ...heatmap.screens,
    ...heatmap.workflows,
    ...heatmap.agents,
  ];
  const avgPerformance = allItems.length > 0
    ? allItems.reduce((sum, item) => sum + item.averageTime, 0) / allItems.length
    : 0;

  const recommendations: string[] = [];
  if (slowest) {
    recommendations.push(
      `Optimize ${slowest.type} "${slowest.name}" (${(slowest.averageTime / 1000).toFixed(1)}s average)`
    );
  }
  if (heatmap.slowestScreens.length > 5) {
    recommendations.push(`${heatmap.slowestScreens.length} slow screens detected. Consider lazy loading.`);
  }
  if (heatmap.slowestWorkflows.length > 3) {
    recommendations.push(`${heatmap.slowestWorkflows.length} slow workflows detected. Consider optimization.`);
  }

  return {
    totalSlow: allSlow.length,
    slowestItem: slowest,
    averagePerformance: avgPerformance,
    recommendations,
  };
}
