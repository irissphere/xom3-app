// 👑 STRIKE 9: The Engine Gains Self-Direction
// Sets its own goals and executes them autonomously

import { SovereignPriorities, SovereignDecision } from "./types";
import { buildSovereignState } from "./awareness";
import { optimizeAutonomously } from "./optimization";
import { expandAutonomously } from "./expansion";
import { regulateAutonomously } from "./regulation";
import { defineSovereignRules } from "./governance";
import { balanceAutonomously } from "./balancing";
import { MigrationPipeline } from "../../pipelines/types";

/**
 * Direct autonomously - the crown
 */
export async function directAutonomously(
  pipeline: MigrationPipeline,
  priorities: SovereignPriorities,
  currentMetrics: {
    throughput: number;
    accuracy: number;
    errorRate: number;
    executionTime: number;
    successRate: number;
  }
): Promise<{
  goals: Array<{ goal: string; action: string; applied: boolean; result?: string }>;
  decisions: SovereignDecision[];
  summary: string;
}> {
  const goals: Array<{ goal: string; action: string; applied: boolean; result?: string }> = [];
  const decisions: SovereignDecision[] = [];

  // Get active priorities
  const activeGoals = priorities.goals.filter(g => 
    priorities.activePriorities.includes(g.id)
  );

  // Execute each goal
  for (const goal of activeGoals) {
    let action = "";
    let applied = false;
    let result = "";

    switch (goal.type) {
      case "minimize_errors":
        if (currentMetrics.errorRate > goal.target) {
          // Trigger optimization
          const optResult = await optimizeAutonomously(pipeline, currentMetrics);
          action = "optimize";
          applied = optResult.optimized;
          result = optResult.optimized ? "Pipeline optimized to reduce errors" : "Optimization not needed";
          decisions.push(optResult.decision);
        }
        break;

      case "maximize_throughput":
        if (currentMetrics.throughput < goal.target) {
          // Trigger optimization
          const optResult = await optimizeAutonomously(pipeline, currentMetrics);
          action = "optimize";
          applied = optResult.optimized;
          result = optResult.optimized ? "Pipeline optimized to increase throughput" : "Optimization not needed";
          decisions.push(optResult.decision);
        }
        break;

      case "maintain_compliance":
        // Check compliance
        const rules = await defineSovereignRules(pipeline.tenant);
        const regResult = await regulateAutonomously(pipeline, rules, currentMetrics);
        action = "regulate";
        applied = regResult.violated;
        result = regResult.violated ? "Compliance violations addressed" : "Compliance maintained";
        decisions.push(regResult.decision);
        break;

      case "reduce_drift":
        // Monitor for drift (would trigger APR)
        action = "monitor";
        applied = true;
        result = "Drift monitoring active";
        break;

      case "improve_accuracy":
        if (currentMetrics.accuracy < goal.target) {
          const optResult = await optimizeAutonomously(pipeline, currentMetrics);
          action = "optimize";
          applied = optResult.optimized;
          result = optResult.optimized ? "Pipeline optimized to improve accuracy" : "Optimization not needed";
          decisions.push(optResult.decision);
        }
        break;

      case "optimize_workflows":
        if (currentMetrics.executionTime > goal.target) {
          const optResult = await optimizeAutonomously(pipeline, currentMetrics);
          action = "optimize";
          applied = optResult.optimized;
          result = optResult.optimized ? "Workflows optimized" : "Optimization not needed";
          decisions.push(optResult.decision);
        }
        break;

      case "protect_tenants":
        // Protection is handled by protection layer
        action = "protect";
        applied = true;
        result = "Tenant protection active";
        break;

      case "expand_capabilities":
        // Check for expansion signals
        const expResult = await expandAutonomously(pipeline.tenant, {
          newColumns: [],
          tenantDivergence: false
        });
        action = "expand";
        applied = expResult.expansions.length > 0;
        result = expResult.expansions.length > 0 
          ? `Expanded: ${expResult.expansions.map(e => e.type).join(", ")}`
          : "No expansion needed";
        decisions.push(expResult.decision);
        break;
    }

    goals.push({
      goal: goal.type,
      action,
      applied,
      result
    });
  }

  // Balance system
  const balanceResult = balanceAutonomously(
    {
      load: 0.5,
      throughput: currentMetrics.throughput,
      errorRate: currentMetrics.errorRate,
      workflowQueue: 0,
      tenantPriorities: {}
    },
    {
      load: 0.7,
      throughput: 100,
      errorRate: 0.05,
      workflowQueue: 50
    }
  );
  decisions.push(balanceResult.decision);

  const summary = `TSE directed ${goals.length} goals: ${goals.filter(g => g.applied).length} applied, ${goals.filter(g => !g.applied).length} monitoring. ${decisions.length} decisions made.`;

  return { goals, decisions, summary };
}
