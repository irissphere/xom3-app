// TSE Orchestrator - The Crown
// Coordinates all sovereign strikes

import { SovereignRules, SovereignPriorities, SovereignState, SovereignDecision } from "./types";
import { defineSovereignRules, defineSovereignPriorities } from "./governance";
import { monitorAndProtect } from "./protection";
import { optimizeAutonomously } from "./optimization";
import { expandAutonomously } from "./expansion";
import { regulateAutonomously } from "./regulation";
import { balanceAutonomously } from "./balancing";
import { buildSovereignState } from "./awareness";
import { directAutonomously } from "./direction";
import { explainSovereignDecision, generateSovereignSummary } from "./explainer";
import { MigrationPipeline } from "../../pipelines/types";

/**
 * Run complete TSE sovereign cycle
 */
export async function runTSE(
  pipeline: MigrationPipeline,
  execution?: {
    status: string;
    rowsProcessed: number;
    rowsFailed: number;
    executionTime: number;
  }
): Promise<{
  rules: SovereignRules;
  priorities: SovereignPriorities;
  state: SovereignState;
  decisions: SovereignDecision[];
  summary: string;
}> {
  const decisions: SovereignDecision[] = [];

  // STRIKE 1: Self-Governance
  const rules = await defineSovereignRules(pipeline.tenant);
  const priorities = await defineSovereignPriorities(pipeline.tenant);

  // STRIKE 7: Self-Awareness
  const state = await buildSovereignState(pipeline.tenant);

  // Calculate current metrics
  const currentMetrics = {
    throughput: execution && execution.executionTime > 0
      ? (execution.rowsProcessed / execution.executionTime) * 1000
      : 0,
    accuracy: execution && execution.rowsProcessed > 0
      ? 1 - (execution.rowsFailed / execution.rowsProcessed)
      : 0,
    errorRate: execution && execution.rowsProcessed > 0
      ? execution.rowsFailed / execution.rowsProcessed
      : 0,
    executionTime: execution?.executionTime || 0,
    successRate: execution && execution.rowsProcessed > 0
      ? 1 - (execution.rowsFailed / execution.rowsProcessed)
      : 0
  };

  // STRIKE 2: Self-Protection
  const pipelineState = state.pipelines.find(p => p.id === pipeline.id) || {
    id: pipeline.id,
    tenant: pipeline.tenant,
    status: "active" as const,
    metrics: {
      throughput: currentMetrics.throughput,
      accuracy: currentMetrics.accuracy,
      errorRate: currentMetrics.errorRate,
      lastExecution: new Date().toISOString()
    },
    protection: {
      shielded: false,
      rerouted: false,
      paused: false
    }
  };

  const protectionResult = await monitorAndProtect(pipeline, pipelineState);
  decisions.push(protectionResult.decision);

  // STRIKE 3: Self-Optimization
  const optimizationResult = await optimizeAutonomously(pipeline, currentMetrics);
  decisions.push(optimizationResult.decision);

  // STRIKE 4: Self-Expansion
  const expansionResult = await expandAutonomously(pipeline.tenant, {
    newColumns: [],
    tenantDivergence: false
  });
  decisions.push(expansionResult.decision);

  // STRIKE 5: Self-Regulation
  const regulationResult = await regulateAutonomously(pipeline, rules, currentMetrics);
  decisions.push(regulationResult.decision);

  // STRIKE 6: Self-Balancing
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

  // STRIKE 9: Self-Direction
  const directionResult = await directAutonomously(pipeline, priorities, currentMetrics);
  decisions.push(...directionResult.decisions);

  // STRIKE 8: Self-Explanation
  const summary = generateSovereignSummary(decisions);

  return {
    rules,
    priorities,
    state,
    decisions,
    summary
  };
}
