// OSC Orchestrator - The Continuum
// Coordinates the unified intelligence field

import { ContinuumState } from "./types";
import { collapseSovereignsIntoContinuum, updateContinuumCoherence } from "./continuum";
import { createFlow, propagateFlow, stabilizeFlow } from "./flows";
import { initializeContinuumBehaviors, executeBehavior } from "./behaviors";
import { initializeContinuumAttractors, findBestAttractor } from "./attractors";
import { initializeRhythms, getActiveRhythm } from "./rhythms";
import { detectDistortion, stabilizeDistortion } from "./stabilization";
import { createAlertSignal, createPredictionSignal, createHarmonizationSignal } from "./signals";
import { initializeContinuumMemory, rememberPattern, rememberResolution } from "./memory";
import { initializeContinuumSovereignty, governContinuum } from "./sovereignty";
import { MigrationPipeline } from "../../pipelines/types";

/**
 * Run complete OSC continuum cycle
 */
export async function runOSC(
  pipeline?: MigrationPipeline,
  data?: any[]
): Promise<{
  state: ContinuumState;
  flows: any[];
  behaviors: any[];
  attractors: any[];
  rhythms: any[];
  distortions: any[];
  signals: any[];
  summary: string;
}> {
  // Initialize continuum
  let state = collapseSovereignsIntoContinuum();

  // Initialize components
  state.behaviors = initializeContinuumBehaviors();
  state.attractors = initializeContinuumAttractors();
  state.rhythms = initializeRhythms();
  state.memory = initializeContinuumMemory();
  state.sovereignty = initializeContinuumSovereignty();

  // Get active rhythm
  const activeRhythm = getActiveRhythm(state.rhythms);

  // Process data through attractors if provided
  if (data && data.length > 0) {
    data.forEach((row, idx) => {
      Object.entries(row).forEach(([key, value]) => {
        const attractor = findBestAttractor(state.attractors, key);
        if (attractor) {
          // Create flow from source to target via attractor
          const flow = createFlow(
            "source",
            attractor.type,
            { key, value, attractor: attractor.name }
          );
          state.flows.push(flow);
        }
      });
    });
  }

  // Propagate flows
  state.flows = state.flows.map(flow => {
    const propagated = propagateFlow(flow, 0.1);
    if (propagated.state === "resonating") {
      return stabilizeFlow(propagated);
    }
    return propagated;
  });

  // Execute behaviors based on active rhythm
  activeRhythm.behaviors.forEach(behaviorType => {
    const behavior = state.behaviors.find(b => b.type === behaviorType);
    if (behavior) {
      const context = {
        coherence: state.field.coherence,
        drift: 0.2,
        patternConfidence: 0.8
      };
      executeBehavior(behavior, context);
    }
  });

  // Detect and stabilize distortions
  const unstabilizedFlows = state.flows.filter(f => 
    f.state === "distorted" || (f.propagation.intensity < 0.5)
  );

  if (unstabilizedFlows.length > 0) {
    const distortion = detectDistortion(
      state,
      "error",
      "flow",
      unstabilizedFlows.length / state.flows.length
    );
    state.distortions.push(distortion);

    const stabilization = await stabilizeDistortion(state, distortion);
    if (stabilization.stabilized) {
      distortion.stabilized = true;
      distortion.stabilizedAt = new Date().toISOString();
      rememberResolution(state.memory, distortion.id, "flow_stabilization", true);
    }
  }

  // Create signals
  if (state.distortions.some(d => !d.stabilized)) {
    const alert = createAlertSignal(
      "continuum",
      "Field distortions detected",
      "high"
    );
    state.signals.push(alert);
  }

  // Update coherence
  state = updateContinuumCoherence(state, {
    flowStability: state.flows.filter(f => f.state === "stabilized").length / Math.max(1, state.flows.length),
    behaviorHarmony: 0.9,
    attractorAlignment: 1.0,
    distortionLevel: state.distortions.filter(d => !d.stabilized).length / Math.max(1, state.distortions.length)
  });

  // Govern continuum
  state.sovereignty = governContinuum(state);

  // Generate summary
  const summary = generateContinuumSummary(state);

  return {
    state,
    flows: state.flows,
    behaviors: state.behaviors,
    attractors: state.attractors,
    rhythms: state.rhythms,
    distortions: state.distortions,
    signals: state.signals,
    summary
  };
}

/**
 * Generate continuum summary
 */
function generateContinuumSummary(state: ContinuumState): string {
  const parts: string[] = [];

  parts.push("=== OSC Continuum Summary ===");
  parts.push("");

  parts.push(`Field State: ${state.field.state}`);
  parts.push(`Coherence: ${(state.field.coherence * 100).toFixed(1)}%`);
  parts.push(`Intensity: ${(state.field.intensity * 100).toFixed(1)}%`);
  parts.push("");

  parts.push(`Flows: ${state.flows.length} (${state.flows.filter(f => f.state === "stabilized").length} stabilized)`);
  parts.push(`Behaviors: ${state.behaviors.length} (${state.behaviors.filter(b => b.state === "active").length} active)`);
  parts.push(`Attractors: ${state.attractors.length} (${state.attractors.filter(a => a.state === "active").length} active)`);
  parts.push(`Rhythms: ${state.rhythms.length} (${getActiveRhythm(state.rhythms).cycle} active)`);
  parts.push("");

  parts.push(`Distortions: ${state.distortions.length} (${state.distortions.filter(d => !d.stabilized).length} unstabilized)`);
  parts.push(`Signals: ${state.signals.length}`);
  parts.push("");

  parts.push(`Sovereignty:`);
  parts.push(`  Coherence: ${(state.sovereignty.integrity.coherence * 100).toFixed(1)}%`);
  parts.push(`  Stability: ${(state.sovereignty.integrity.stability * 100).toFixed(1)}%`);
  parts.push(`  Expansion: ${(state.sovereignty.integrity.expansion * 100).toFixed(1)}%`);

  return parts.join("\n");
}
