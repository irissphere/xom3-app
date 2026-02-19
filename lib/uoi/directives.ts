// UOI Directive Selection - Chooses action based on posture and state
// Every frame, picks: who to focus on, what to do, why

import { HseState } from "@/app/hse/types";
import { areDirectivesFrozen, getManualDirective, clearManualDirective } from "@/lib/hse/control-state";

type DirectiveInput = {
  subsystems: HseState["subsystems"];
  posture: HseState["sovereignPosture"];
  riskVectors: HseState["riskVectors"];
  driftVectors: HseState["driftVectors"];
  queuePressure: HseState["queuePressure"];
  anomalyClusters: HseState["anomalyClusters"];
};

export function chooseDirective(input: DirectiveInput): HseState["currentDirective"] {
  // Check for frozen directives
  if (areDirectivesFrozen()) {
    return {
      target: "none",
      action: "frozen",
      reason: "Directive engine is temporarily frozen by operator override.",
    };
  }

  // Check for manual directive
  const manual = getManualDirective();
  if (manual) {
    // Clear it after use (one-time directive)
    clearManualDirective();
    return {
      target: manual.target,
      action: manual.action,
      reason: `[Operator override] ${manual.reason}`,
    };
  }

  const { subsystems, posture, riskVectors, driftVectors, queuePressure, anomalyClusters } = input;

  // Focus target: subsystem with highest queue / risk / drift / errors
  const scored = Object.entries(subsystems).map(([name, s]) => {
    const queueScore = (s.queue ?? 0) / 20;
    const errorScore = (s.errors ?? 0) / 10;
    const healthPenalty = 1 - (s.health ?? 1);

    const risk = riskVectors.find(v => v.subsystem === name)?.value ?? 0;
    const drift = driftVectors.find(v => v.subsystem === name)?.value ?? 0;
    const pressure = queuePressure.find(v => v.subsystem === name)?.value ?? 0;

    const score =
      queueScore +
      errorScore +
      healthPenalty +
      risk +
      drift +
      pressure / 50;

    return { name, score, s, risk, drift, pressure };
  });

  scored.sort((a, b) => b.score - a.score);
  const focus = scored[0];

  if (!focus || focus.score === 0) {
    return {
      target: "none",
      action: "observe",
      reason: "No significant pressure detected across subsystems."
    };
  }

  const target = focus.name;

  // Posture-driven action
  if (posture === "recovery") {
    return {
      target,
      action: "stabilize",
      reason: `Recovery posture: high instability detected around ${target}, prioritizing stability and error containment.`
    };
  }

  if (posture === "protective") {
    if (focus.risk > 0.5 || focus.drift > 0.3) {
      return {
        target,
        action: "limit",
        reason: `Protective posture: elevated risk/drift on ${target}, throttling and enforcing stricter controls.`
      };
    }

    return {
      target,
      action: "rebalance",
      reason: `Protective posture: rebalancing ${target} to prevent escalation under moderate pressure.`
    };
  }

  if (posture === "aggressive") {
    return {
      target,
      action: "optimize",
      reason: `Aggressive posture: low global risk, pushing ${target} for higher throughput and efficiency.`
    };
  }

  // Normal posture
  if (focus.pressure > 0.2 || (focus.s.queue ?? 0) > 20) {
    return {
      target,
      action: "rebalance",
      reason: `Normal posture: queue pressure on ${target} exceeds comfort threshold, rebalancing workloads.`
    };
  }

  if ((focus.s.errors ?? 0) > 0) {
    return {
      target,
      action: "inspect",
      reason: `Normal posture: errors detected on ${target}, triggering targeted inspection without global posture change.`
    };
  }

  return {
    target,
    action: "observe",
    reason: `Normal posture: no severe pressure, monitoring ${target} as main point of interest.`
  };
}
