// UOI Directive Effectiveness Tracking - Directives become smarter over time
// Evolution mode: Directives become experience-driven

import { isEvolutionActive, recordDirectiveImprovement } from "./evolution";
import { UOIDirective } from "./contract";

export interface DirectiveOutcome {
  directiveId: string;
  directiveType: string;
  target: string;
  action: string;
  timestamp: string;
  outcome: "success" | "partial" | "failure" | "no_effect";
  metricsBefore: Record<string, number>;
  metricsAfter: Record<string, number>;
  improvement: number; // -1 to 1, negative = worse, positive = better
}

// Track directive outcomes
const directiveOutcomes: DirectiveOutcome[] = [];

/**
 * Record directive outcome
 * EVOLUTION MODE: Tracks effectiveness of directives to learn from experience
 */
export function recordDirectiveOutcome(
  directive: UOIDirective,
  outcome: DirectiveOutcome["outcome"],
  metricsBefore: Record<string, number>,
  metricsAfter: Record<string, number>
): DirectiveOutcome {
  const improvement = calculateImprovement(metricsBefore, metricsAfter);
  
  const outcomeRecord: DirectiveOutcome = {
    directiveId: directive.id,
    directiveType: directive.type,
    target: directive.target,
    action: directive.payload?.action || "unknown",
    timestamp: new Date().toISOString(),
    outcome,
    metricsBefore,
    metricsAfter,
    improvement,
  };
  
  directiveOutcomes.push(outcomeRecord);
  
  // Keep only last 500 outcomes
  if (directiveOutcomes.length > 500) {
    directiveOutcomes.shift();
  }
  
  return outcomeRecord;
}

/**
 * Calculate improvement from metrics
 */
function calculateImprovement(
  before: Record<string, number>,
  after: Record<string, number>
): number {
  // Simple improvement calculation: average of normalized improvements
  const improvements: number[] = [];
  
  Object.keys(before).forEach(key => {
    if (after[key] !== undefined) {
      const beforeVal = before[key];
      const afterVal = after[key];
      
      if (beforeVal !== 0) {
        // Normalized improvement: (after - before) / before
        const improvement = (afterVal - beforeVal) / Math.abs(beforeVal);
        improvements.push(improvement);
      }
    }
  });
  
  return improvements.length > 0
    ? improvements.reduce((a, b) => a + b, 0) / improvements.length
    : 0;
}

/**
 * Analyze directive effectiveness
 * EVOLUTION MODE: Identifies which directives work best and proposes improvements
 */
export function analyzeDirectiveEffectiveness(): Array<{
  directiveType: string;
  target: string;
  currentAction: string;
  proposedAction: string;
  effectiveness: number;
  reason: string;
}> {
  if (!isEvolutionActive() || directiveOutcomes.length < 10) {
    return [];
  }
  
  const improvements: Array<{
    directiveType: string;
    target: string;
    currentAction: string;
    proposedAction: string;
    effectiveness: number;
    reason: string;
  }> = [];
  
  // Group outcomes by directive type and target
  const byDirective: Record<string, DirectiveOutcome[]> = {};
  directiveOutcomes.forEach(outcome => {
    const key = `${outcome.directiveType}-${outcome.target}`;
    if (!byDirective[key]) byDirective[key] = [];
    byDirective[key].push(outcome);
  });
  
  // Analyze each directive type
  Object.keys(byDirective).forEach(key => {
    const outcomes = byDirective[key];
    if (outcomes.length < 5) return; // Need at least 5 outcomes
    
    const avgImprovement = outcomes.reduce((sum, o) => sum + o.improvement, 0) / outcomes.length;
    const successRate = outcomes.filter(o => o.outcome === "success").length / outcomes.length;
    
    // If effectiveness is low, propose improvement
    if (avgImprovement < 0.1 && successRate < 0.6) {
      const [directiveType, target] = key.split("-");
      const currentAction = outcomes[0].action;
      const proposedAction = proposeBetterAction(directiveType, target, currentAction, outcomes);
      
      if (proposedAction && proposedAction !== currentAction) {
        improvements.push({
          directiveType,
          target,
          currentAction,
          proposedAction,
          effectiveness: Math.abs(avgImprovement) + (1 - successRate), // Higher effectiveness = bigger improvement needed
          reason: `Low effectiveness (${(avgImprovement * 100).toFixed(1)}% improvement, ${(successRate * 100).toFixed(1)}% success rate). Proposing alternative action.`,
        });
      }
    }
  });
  
  return improvements;
}

/**
 * Propose better action based on outcomes
 */
function proposeBetterAction(
  directiveType: string,
  target: string,
  currentAction: string,
  outcomes: DirectiveOutcome[]
): string | null {
  // Analyze which actions worked best for similar situations
  const successfulOutcomes = outcomes.filter(o => o.outcome === "success" || o.improvement > 0.2);
  
  if (successfulOutcomes.length === 0) {
    // No successful outcomes, try alternative actions
    switch (directiveType) {
      case "REBALANCE_WORKFLOW":
        if (currentAction === "rebalance") {
          return "throttle_upstream";
        }
        break;
      case "PAUSE_PIPELINE":
        if (currentAction === "pause") {
          return "throttle";
        }
        break;
      case "REWRITE_MAPPING":
        if (currentAction === "rewriteMapping") {
          return "incremental_update";
        }
        break;
    }
  } else {
    // Use action from most successful outcome
    const bestOutcome = successfulOutcomes.sort((a, b) => b.improvement - a.improvement)[0];
    if (bestOutcome.action !== currentAction) {
      return bestOutcome.action;
    }
  }
  
  return null;
}

/**
 * Apply directive improvements
 */
export async function applyDirectiveImprovements(
  improvements: Array<{
    directiveType: string;
    target: string;
    currentAction: string;
    proposedAction: string;
    effectiveness: number;
    reason: string;
  }>
): Promise<number> {
  if (!isEvolutionActive() || improvements.length === 0) {
    return 0;
  }
  
  let applied = 0;
  
  for (const improvement of improvements) {
    // Only apply high-effectiveness improvements
    if (improvement.effectiveness < 0.3) {
      continue;
    }
    
    try {
      recordDirectiveImprovement(
        improvement.directiveType,
        improvement.target,
        improvement.currentAction,
        improvement.proposedAction,
        improvement.effectiveness,
        improvement.reason
      );
      
      applied++;
    } catch (error) {
      console.error(`[UOI] Failed to record directive improvement:`, error);
    }
  }
  
  return applied;
}

/**
 * Get directive effectiveness stats
 */
export function getDirectiveEffectivenessStats(): {
  totalDirectives: number;
  successRate: number;
  avgImprovement: number;
  mostEffective: string;
  leastEffective: string;
} {
  if (directiveOutcomes.length === 0) {
    return {
      totalDirectives: 0,
      successRate: 0,
      avgImprovement: 0,
      mostEffective: "N/A",
      leastEffective: "N/A",
    };
  }
  
  const successRate = directiveOutcomes.filter(o => o.outcome === "success").length / directiveOutcomes.length;
  const avgImprovement = directiveOutcomes.reduce((sum, o) => sum + o.improvement, 0) / directiveOutcomes.length;
  
  // Group by directive type
  const byType: Record<string, { count: number; avgImprovement: number }> = {};
  directiveOutcomes.forEach(o => {
    if (!byType[o.directiveType]) {
      byType[o.directiveType] = { count: 0, avgImprovement: 0 };
    }
    byType[o.directiveType].count++;
    byType[o.directiveType].avgImprovement += o.improvement;
  });
  
  Object.keys(byType).forEach(type => {
    byType[type].avgImprovement /= byType[type].count;
  });
  
  const sorted = Object.entries(byType).sort((a, b) => b[1].avgImprovement - a[1].avgImprovement);
  const mostEffective = sorted.length > 0 ? sorted[0][0] : "N/A";
  const leastEffective = sorted.length > 0 ? sorted[sorted.length - 1][0] : "N/A";
  
  return {
    totalDirectives: directiveOutcomes.length,
    successRate,
    avgImprovement,
    mostEffective,
    leastEffective,
  };
}
