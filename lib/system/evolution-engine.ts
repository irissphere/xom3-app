// Evolution Engine - Task 55
// Suggest new workflows, automations, or UI changes based on long-term patterns

import { UsageStats, calculateUsageStats, getStoredEvents } from "./usage-analytics";
import { generateRecommendations, Recommendation } from "./behavior-recommendations";

export interface EvolutionSuggestion {
  id: string;
  type: "workflow" | "automation" | "ui_change" | "feature";
  title: string;
  description: string;
  rationale: string;
  expectedImpact: "high" | "medium" | "low";
  confidence: number; // 0-1
  evidence: string[];
  implementation: {
    complexity: "simple" | "medium" | "complex";
    estimatedTime: string; // e.g., "2 hours", "1 day"
    steps: string[];
  };
  patterns: Array<{
    type: string;
    frequency: number;
    trend: "increasing" | "decreasing" | "stable";
  }>;
}

/**
 * Evolution Engine
 */
export class EvolutionEngine {
  private suggestions: EvolutionSuggestion[] = [];
  private patternHistory: Array<{
    timestamp: string;
    pattern: string;
    frequency: number;
  }> = [];

  /**
   * Analyze long-term patterns and generate evolution suggestions
   */
  generateEvolutionSuggestions(
    stats?: UsageStats,
    timeWindowDays: number = 30
  ): EvolutionSuggestion[] {
    const allStats = stats || calculateUsageStats(getStoredEvents());
    const suggestions: EvolutionSuggestion[] = [];

    // 1. Workflow evolution suggestions
    const workflowSuggestions = this.analyzeWorkflowPatterns(allStats);
    suggestions.push(...workflowSuggestions);

    // 2. Automation evolution suggestions
    const automationSuggestions = this.analyzeAutomationPatterns(allStats);
    suggestions.push(...automationSuggestions);

    // 3. UI evolution suggestions
    const uiSuggestions = this.analyzeUIPatterns(allStats);
    suggestions.push(...uiSuggestions);

    // 4. Feature evolution suggestions
    const featureSuggestions = this.analyzeFeaturePatterns(allStats);
    suggestions.push(...featureSuggestions);

    // Sort by expected impact and confidence
    return suggestions.sort((a, b) => {
      const impactOrder = { high: 3, medium: 2, low: 1 };
      if (impactOrder[a.expectedImpact] !== impactOrder[b.expectedImpact]) {
        return impactOrder[b.expectedImpact] - impactOrder[a.expectedImpact];
      }
      return b.confidence - a.confidence;
    });
  }

  /**
   * Analyze workflow patterns
   */
  private analyzeWorkflowPatterns(stats: UsageStats): EvolutionSuggestion[] {
    const suggestions: EvolutionSuggestion[] = [];

    // Find frequently used workflows that could be automated
    const frequentWorkflows = Object.entries(stats.workflowDurations)
      .filter(([, data]) => data.count >= 20)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 5);

    for (const [workflow, data] of frequentWorkflows) {
      if (data.average > 30000) {
        // Workflow takes >30s and is used frequently
        suggestions.push({
          id: `evolve_workflow_${workflow}`,
          type: "workflow",
          title: `Optimize "${workflow}" workflow`,
          description: `This workflow is executed ${data.count} times and takes ${(data.average / 1000).toFixed(1)}s on average. Consider breaking it into stages or adding parallel processing.`,
          rationale: `High frequency (${data.count} executions) combined with long duration (${(data.average / 1000).toFixed(1)}s) suggests optimization would save significant time.`,
          expectedImpact: data.count >= 50 ? "high" : "medium",
          confidence: Math.min(data.count / 100, 0.9),
          evidence: [
            `${data.count} executions`,
            `${(data.average / 1000).toFixed(1)}s average duration`,
          ],
          implementation: {
            complexity: "medium",
            estimatedTime: "4-8 hours",
            steps: [
              "Analyze workflow stages",
              "Identify bottlenecks",
              "Implement parallel processing where possible",
              "Add progress indicators",
              "Test and measure improvement",
            ],
          },
          patterns: [{
            type: "workflow_frequency",
            frequency: data.count,
            trend: "stable",
          }],
        });
      }
    }

    return suggestions;
  }

  /**
   * Analyze automation patterns
   */
  private analyzeAutomationPatterns(stats: UsageStats): EvolutionSuggestion[] {
    const suggestions: EvolutionSuggestion[] = [];

    // Find repetitive actions that could be automated
    const repetitiveActions = Object.entries(stats.actionFrequency)
      .filter(([, count]) => count >= 30)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    for (const [action, count] of repetitiveActions) {
      suggestions.push({
        id: `evolve_automation_${action}`,
        type: "automation",
        title: `Automate "${action}"`,
        description: `This action is performed ${count} times. Automating it would save time and reduce errors.`,
        rationale: `High repetition (${count} times) indicates this is a prime candidate for automation.`,
        expectedImpact: count >= 50 ? "high" : "medium",
        confidence: Math.min(count / 100, 0.9),
        evidence: [`${count} executions`],
        implementation: {
          complexity: count >= 100 ? "medium" : "simple",
          estimatedTime: count >= 100 ? "1-2 days" : "2-4 hours",
          steps: [
            "Define automation trigger",
            "Map action steps",
            "Create automation rule",
            "Test with sample data",
            "Deploy and monitor",
          ],
        },
        patterns: [{
          type: "action_frequency",
          frequency: count,
          trend: "stable",
        }],
      });
    }

    return suggestions;
  }

  /**
   * Analyze UI patterns
   */
  private analyzeUIPatterns(stats: UsageStats): EvolutionSuggestion[] {
    const suggestions: EvolutionSuggestion[] = [];

    // Find high-traffic pages that could be optimized
    const highTraffic = stats.highTrafficAreas.slice(0, 5);
    const bottlenecks = stats.bottlenecks.slice(0, 3);

    for (const bottleneck of bottlenecks) {
      if (bottleneck.averageDuration > 2000) {
        suggestions.push({
          id: `evolve_ui_${bottleneck.page}`,
          type: "ui_change",
          title: `Optimize "${bottleneck.page}" page`,
          description: `This page takes ${(bottleneck.averageDuration / 1000).toFixed(1)}s to load on average. Consider lazy loading, code splitting, or data optimization.`,
          rationale: `Slow page load (${(bottleneck.averageDuration / 1000).toFixed(1)}s) impacts user experience, especially with ${bottleneck.eventCount} page views.`,
          expectedImpact: bottleneck.averageDuration > 5000 ? "high" : "medium",
          confidence: 0.8,
          evidence: [
            `${(bottleneck.averageDuration / 1000).toFixed(1)}s average load time`,
            `${bottleneck.eventCount} page views`,
          ],
          implementation: {
            complexity: "medium",
            estimatedTime: "4-6 hours",
            steps: [
              "Profile page performance",
              "Identify slow components",
              "Implement lazy loading",
              "Optimize data fetching",
              "Add loading states",
            ],
          },
          patterns: [{
            type: "page_performance",
            frequency: bottleneck.eventCount,
            trend: "stable",
          }],
        });
      }
    }

    return suggestions;
  }

  /**
   * Analyze feature patterns
   */
  private analyzeFeaturePatterns(stats: UsageStats): EvolutionSuggestion[] {
    const suggestions: EvolutionSuggestion[] = [];

    // Find search patterns that might indicate missing features
    const searchQueries = stats.searchQueries.slice(-100);
    const queryCounts: Record<string, number> = {};
    
    for (const query of searchQueries) {
      const normalized = query.toLowerCase().trim();
      queryCounts[normalized] = (queryCounts[normalized] || 0) + 1;
    }

    const frequentSearches = Object.entries(queryCounts)
      .filter(([, count]) => count >= 5)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);

    for (const [query, count] of frequentSearches) {
      suggestions.push({
        id: `evolve_feature_${query.replace(/\s+/g, "_")}`,
        type: "feature",
        title: `Add feature for "${query}"`,
        description: `Users search for "${query}" ${count} times. Consider adding a dedicated feature or improving discoverability.`,
        rationale: `Frequent searches (${count} times) suggest users are looking for functionality that may not exist or is hard to find.`,
        expectedImpact: count >= 10 ? "high" : "medium",
        confidence: Math.min(count / 20, 0.8),
        evidence: [`${count} search queries`],
        implementation: {
          complexity: "complex",
          estimatedTime: "1-2 weeks",
          steps: [
            "Research user needs",
            "Design feature",
            "Implement feature",
            "Add to navigation",
            "Test and gather feedback",
          ],
        },
        patterns: [{
          type: "search_frequency",
          frequency: count,
          trend: "stable",
        }],
      });
    }

    return suggestions;
  }

  /**
   * Get evolution summary
   */
  getEvolutionSummary(suggestions: EvolutionSuggestion[]): {
    total: number;
    byType: Record<string, number>;
    highImpact: number;
    readyToImplement: number; // High confidence + high impact
  } {
    const byType: Record<string, number> = {};
    let highImpact = 0;
    let readyToImplement = 0;

    for (const suggestion of suggestions) {
      byType[suggestion.type] = (byType[suggestion.type] || 0) + 1;
      if (suggestion.expectedImpact === "high") {
        highImpact++;
      }
      if (suggestion.expectedImpact === "high" && suggestion.confidence >= 0.7) {
        readyToImplement++;
      }
    }

    return {
      total: suggestions.length,
      byType,
      highImpact,
      readyToImplement,
    };
  }
}

// Global instance
export const evolutionEngine = new EvolutionEngine();
