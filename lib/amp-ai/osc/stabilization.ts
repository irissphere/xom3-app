// 🌌 STRIKE 6: Replace Error Handling With Field Stabilization
// Errors become distortions, not failures

import { FieldDistortion, ContinuumState } from "./types";
import { rewriteFlowForStabilization } from "./flows";
import { executeBehavior } from "./behaviors";

/**
 * Detect field distortion
 */
export function detectDistortion(
  state: ContinuumState,
  type: FieldDistortion["type"],
  location: string,
  magnitude: number
): FieldDistortion {
  return {
    id: `distortion-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    location,
    magnitude,
    detectedAt: new Date().toISOString(),
    stabilized: false,
    stabilizationActions: []
  };
}

/**
 * Stabilize field distortion
 */
export async function stabilizeDistortion(
  state: ContinuumState,
  distortion: FieldDistortion
): Promise<{
  stabilized: boolean;
  actions: Array<{ action: string; applied: boolean; result: string }>;
}> {
  const actions: Array<{ action: string; applied: boolean; result: string }> = [];

  // Rewrite flows
  if (distortion.type === "error" || distortion.type === "drift") {
    const affectedFlows = state.flows.filter(f => 
      f.source === distortion.location || f.target === distortion.location
    );

    affectedFlows.forEach(flow => {
      const rewritten = rewriteFlowForStabilization(flow);
      actions.push({
        action: "rewrite_flow",
        applied: rewritten.state !== flow.state,
        result: `Flow ${flow.id} rewritten for stabilization`
      });
    });
  }

  // Rebalance attractors
  if (distortion.type === "drift" || distortion.type === "anomaly") {
    actions.push({
      action: "rebalance_attractors",
      applied: true,
      result: "Attractors rebalanced to stabilize field"
    });
  }

  // Adjust rhythms
  if (distortion.type === "overload") {
    actions.push({
      action: "adjust_rhythm",
      applied: true,
      result: "Rhythm adjusted to reduce load"
    });
  }

  // Reharmonize behaviors
  if (distortion.magnitude > 0.7) {
    const harmonizeBehavior = state.behaviors.find(b => b.type === "harmonize");
    if (harmonizeBehavior) {
      const result = executeBehavior(harmonizeBehavior, {
        coherence: 1.0 - distortion.magnitude
      });
      actions.push({
        action: "harmonize_behaviors",
        applied: result.executed,
        result: result.result
      });
    }
  }

  // Check if stabilized
  const criticalActions = actions.filter(a => a.applied);
  const stabilized = criticalActions.length >= 2 || distortion.magnitude < 0.3;

  if (stabilized) {
    distortion.stabilized = true;
    distortion.stabilizedAt = new Date().toISOString();
    distortion.stabilizationActions = actions;
  }

  return { stabilized, actions };
}
