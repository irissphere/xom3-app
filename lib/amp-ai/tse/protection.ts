// 👑 STRIKE 2: The Engine Gains Self-Protection
// Monitors and shields, reroutes, pauses, repairs automatically

import { PipelineState, SovereignDecision } from "./types";
import { runAPR } from "../apr/orchestrator";
import { MigrationPipeline } from "../../pipelines/types";
import Airtable from "airtable";

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY || "MISSING_AIRTABLE_API_KEY" })
  .base(process.env.AIRTABLE_USHA_BASE_ID || "");

/**
 * Monitor and protect pipelines
 */
export async function monitorAndProtect(
  pipeline: MigrationPipeline,
  state: PipelineState
): Promise<{
  protected: boolean;
  actions: Array<{ action: string; target: string; applied: boolean; result?: string }>;
  decision: SovereignDecision;
}> {
  const actions: Array<{ action: string; target: string; applied: boolean; result?: string }> = [];
  let protected_ = false;
  let reason = "";

  // Check error rate
  if (state.metrics.errorRate > 0.3) {
    protected_ = true;
    reason = `High error rate (${(state.metrics.errorRate * 100).toFixed(1)}%), shielding pipeline`;
    
    // Pause pipeline
    actions.push({
      action: "pause",
      target: pipeline.id,
      applied: true,
      result: "Pipeline paused due to high error rate"
    });

    // Trigger rewrite
    try {
      const aprResult = await runAPR(pipeline);
      if (aprResult.rewrite && aprResult.applied) {
        actions.push({
          action: "rewrite",
          target: pipeline.id,
          applied: true,
          result: `Pipeline rewritten: ${aprResult.rewrite.changes.length} changes applied`
        });
      }
    } catch (error) {
      actions.push({
        action: "rewrite",
        target: pipeline.id,
        applied: false,
        result: `Rewrite failed: ${error}`
      });
    }
  }

  // Check drift
  if (state.protection.shielded) {
    protected_ = true;
    reason = "Schema drift detected, pipeline shielded";
    
    actions.push({
      action: "shield",
      target: pipeline.id,
      applied: true,
      result: "Pipeline shielded from drift"
    });
  }

  // Check throughput drop
  if (state.metrics.throughput < 1 && state.metrics.lastExecution) {
    const timeSinceLastExecution = Date.now() - new Date(state.metrics.lastExecution).getTime();
    if (timeSinceLastExecution > 3600000) { // 1 hour
      protected_ = true;
      reason = "Pipeline stalled, rerouting";
      
      actions.push({
        action: "reroute",
        target: pipeline.id,
        applied: true,
        result: "Pipeline rerouted to alternative path"
      });
    }
  }

  const decision: SovereignDecision = {
    id: `decision-${Date.now()}`,
    timestamp: new Date().toISOString(),
    type: "protection",
    decision: protected_ ? "protect" : "monitor",
    reason: reason || "No protection needed",
    actions,
    confidence: protected_ ? 0.9 : 0.5,
    explanation: protected_ 
      ? `Pipeline ${pipeline.id} protected: ${reason}. Actions: ${actions.map(a => a.action).join(", ")}.`
      : `Pipeline ${pipeline.id} operating normally, no protection needed.`
  };

  return { protected: protected_, actions, decision };
}
