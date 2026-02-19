// 🌌 STRIKE 2: Replace Pipelines With Flows
// Continuous propagation instead of discrete movement

import { Flow } from "./types";

/**
 * Create flow in continuum
 */
export function createFlow(
  source: string,
  target: string,
  data: any
): Flow {
  return {
    id: `flow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    source,
    target,
    data,
    propagation: {
      velocity: 1.0, // Normalized velocity
      direction: [source, target],
      intensity: 1.0,
      phase: 0.0
    },
    state: "propagating",
    createdAt: new Date().toISOString()
  };
}

/**
 * Propagate flow through continuum
 */
export function propagateFlow(flow: Flow, deltaTime: number): Flow {
  // Update phase based on velocity
  flow.propagation.phase += flow.propagation.velocity * deltaTime;

  // Flow reaches target when phase >= 1
  if (flow.propagation.phase >= 1.0) {
    flow.state = "resonating";
    flow.propagation.phase = 1.0;
  }

  return flow;
}

/**
 * Stabilize flow
 */
export function stabilizeFlow(flow: Flow): Flow {
  if (flow.state === "resonating") {
    flow.state = "stabilized";
  }
  return flow;
}

/**
 * Detect flow distortion
 */
export function detectFlowDistortion(flow: Flow): boolean {
  // Flow is distorted if intensity drops or phase becomes negative
  return flow.propagation.intensity < 0.5 || flow.propagation.phase < 0;
}

/**
 * Rewrite flow to stabilize
 */
export function rewriteFlowForStabilization(flow: Flow): Flow {
  if (detectFlowDistortion(flow)) {
    // Increase intensity
    flow.propagation.intensity = Math.min(1.0, flow.propagation.intensity + 0.2);
    
    // Reset phase if negative
    if (flow.propagation.phase < 0) {
      flow.propagation.phase = 0;
    }

    flow.state = "propagating";
  }

  return flow;
}
