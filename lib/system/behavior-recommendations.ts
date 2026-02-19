// Behavior-Driven Recommendations - Task 35
// Suggest shortcuts, automations, or UI changes based on usage patterns

import {
  UsageStats,
  calculateUsageStats,
  getStoredEvents,
  getHesitationHotspots,
  getWorkflowAbandonmentRates,
  getAbandonmentPoints,
} from "./usage-analytics";
import { ComponentHeatmap, generateComponentHeatmap } from "./interaction-heatmaps";

export type RecommendationType =
  | "shortcut"
  | "automation"
  | "ui_change"
  | "workflow_optimization"
  | "field_reorder"
  | "component_visibility"
  | "default_value";

export interface Recommendation {
  id: string;
  type: RecommendationType;
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  action: string; // What action to take
  target: string; // What component/page/workflow to target
  confidence: number; // 0-1, how confident we are this will help
  impact: "high" | "medium" | "low"; // Expected impact
  evidence: string[]; // Evidence supporting this recommendation
  metadata?: Record<string, any>;
}

/**
 * Generate behavior-driven recommendations
 */
export function generateRecommendations(
  stats?: UsageStats,
  page?: string
): Recommendation[] {
  const allStats = stats || calculateUsageStats(getStoredEvents());
  const recommendations: Recommendation[] = [];

  // 1. Shortcut recommendations (frequently used actions)
  const topActions = Object.entries(allStats.actionFrequency)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  for (const [action, count] of topActions) {
    if (count >= 20) {
      // If action is used 20+ times, suggest a shortcut
      recommendations.push({
        id: `shortcut_${action}`,
        type: "shortcut",
        priority: count >= 50 ? "high" : "medium",
        title: `Add keyboard shortcut for "${action}"`,
        description: `This action is used ${count} times. Adding a keyboard shortcut would save time.`,
        action: "add_shortcut",
        target: action,
        confidence: Math.min(count / 100, 0.9),
        impact: count >= 50 ? "high" : "medium",
        evidence: [`Action used ${count} times`],
        metadata: { usageCount: count },
      });
    }
  }

  // 2. UI change recommendations (hesitation hotspots)
  const hesitationHotspots = getHesitationHotspots(allStats, 10);
  for (const hotspot of hesitationHotspots) {
    if (hotspot.hesitationRate > 0.3) {
      // If >30% hesitation rate, suggest UI improvement
      recommendations.push({
        id: `ui_change_${hotspot.component}`,
        type: "ui_change",
        priority: hotspot.hesitationRate > 0.5 ? "high" : "medium",
        title: `Improve UI for "${hotspot.component}"`,
        description: `${(hotspot.hesitationRate * 100).toFixed(1)}% of interactions with this component show hesitation. Consider making it more intuitive.`,
        action: "improve_ui",
        target: hotspot.component,
        confidence: hotspot.hesitationRate,
        impact: hotspot.hesitationRate > 0.5 ? "high" : "medium",
        evidence: [
          `${hotspot.hesitationCount} hesitation events`,
          `${hotspot.clickCount} click events`,
          `${(hotspot.hesitationRate * 100).toFixed(1)}% hesitation rate`,
        ],
        metadata: {
          hesitationCount: hotspot.hesitationCount,
          clickCount: hotspot.clickCount,
          hesitationRate: hotspot.hesitationRate,
        },
      });
    }
  }

  // 3. Workflow optimization recommendations (slow workflows)
  const slowWorkflows = Object.entries(allStats.workflowDurations)
    .map(([workflow, data]) => ({ workflow, average: data.average }))
    .sort((a, b) => b.average - a.average)
    .slice(0, 5);

  for (const { workflow, average } of slowWorkflows) {
    if (average > 30000) {
      // If workflow takes >30 seconds on average
      recommendations.push({
        id: `workflow_opt_${workflow}`,
        type: "workflow_optimization",
        priority: average > 60000 ? "high" : "medium",
        title: `Optimize "${workflow}" workflow`,
        description: `This workflow takes ${(average / 1000).toFixed(1)} seconds on average. Consider breaking it into stages or adding parallel processing.`,
        action: "optimize_workflow",
        target: workflow,
        confidence: Math.min(average / 120000, 0.9),
        impact: average > 60000 ? "high" : "medium",
        evidence: [`Average duration: ${(average / 1000).toFixed(1)}s`],
        metadata: { averageDuration: average },
      });
    }
  }

  // 4. Abandonment recommendations
  const abandonmentPoints = getAbandonmentPoints(allStats, 10);
  for (const point of abandonmentPoints) {
    if (point.abandonmentRate > 0.2) {
      recommendations.push({
        id: `abandonment_${point.workflow || point.page}`,
        type: "workflow_optimization",
        priority: point.abandonmentRate > 0.4 ? "high" : "medium",
        title: `Address abandonment in "${point.workflow || point.page}"`,
        description: `${(point.abandonmentRate * 100).toFixed(1)}% of users abandon this ${point.workflow ? "workflow" : "page"}. Consider simplifying or adding guidance.`,
        action: "address_abandonment",
        target: point.workflow || point.page || "",
        confidence: point.abandonmentRate,
        impact: point.abandonmentRate > 0.4 ? "high" : "medium",
        evidence: [
          `${point.abandonmentCount} abandonments`,
          `${(point.abandonmentRate * 100).toFixed(1)}% abandonment rate`,
        ],
        metadata: {
          abandonmentCount: point.abandonmentCount,
          abandonmentRate: point.abandonmentRate,
        },
      });
    }
  }

  // 5. Automation recommendations (repetitive actions)
  const repetitiveActions = Object.entries(allStats.actionFrequency)
    .filter(([, count]) => count >= 30)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  for (const [action, count] of repetitiveActions) {
    recommendations.push({
      id: `automation_${action}`,
      type: "automation",
      priority: count >= 50 ? "high" : "medium",
      title: `Automate "${action}"`,
      description: `This action is performed ${count} times. Consider automating it to save time.`,
      action: "create_automation",
      target: action,
      confidence: Math.min(count / 100, 0.9),
      impact: count >= 50 ? "high" : "medium",
      evidence: [`Action performed ${count} times`],
      metadata: { usageCount: count },
    });
  }

  // 6. Component visibility recommendations (rarely used components)
  // This would integrate with adaptive-ui.ts
  const lowTrafficPages = Object.entries(allStats.pageViews)
    .filter(([, count]) => count < 5)
    .sort(([, a], [, b]) => a - b)
    .slice(0, 5);

  for (const [page, count] of lowTrafficPages) {
    recommendations.push({
      id: `visibility_${page}`,
      type: "component_visibility",
      priority: "low",
      title: `Consider hiding or collapsing "${page}"`,
      description: `This page is only viewed ${count} times. Consider hiding it or moving it to a less prominent location.`,
      action: "hide_component",
      target: page,
      confidence: Math.max(1 - count / 10, 0.3),
      impact: "low",
      evidence: [`Only ${count} page views`],
      metadata: { viewCount: count },
    });
  }

  // Sort by priority and confidence
  return recommendations.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    }
    return b.confidence - a.confidence;
  });
}

/**
 * Get recommendations for a specific page
 */
export function getPageRecommendations(page: string): Recommendation[] {
  const stats = calculateUsageStats(getStoredEvents());
  const allRecommendations = generateRecommendations(stats);
  
  // Filter recommendations relevant to this page
  return allRecommendations.filter(
    (rec) => rec.target === page || rec.metadata?.page === page
  );
}

/**
 * Get recommendations for a specific workflow
 */
export function getWorkflowRecommendations(workflow: string): Recommendation[] {
  const stats = calculateUsageStats(getStoredEvents());
  const allRecommendations = generateRecommendations(stats);
  
  return allRecommendations.filter(
    (rec) => rec.target === workflow || rec.type === "workflow_optimization"
  );
}

/**
 * Get high-priority recommendations
 */
export function getHighPriorityRecommendations(limit: number = 10): Recommendation[] {
  const allRecommendations = generateRecommendations();
  return allRecommendations
    .filter((rec) => rec.priority === "high")
    .slice(0, limit);
}
