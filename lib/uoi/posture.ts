// UOI Posture Decision - Interprets system state into sovereign stance
// Simple but honest: evaluates risk, drift, queues, anomalies, health

import { HseState } from "@/app/hse/types";
import { getPostureOverride } from "@/lib/hse/control-state";
import { 
  isInheritanceModeActive, 
  recordPostureTransition,
  predictOperatorAction 
} from "@/lib/hse/inheritance";

type PostureInput = {
  subsystems: HseState["subsystems"];
  riskVectors: HseState["riskVectors"];
  driftVectors: HseState["driftVectors"];
  queuePressure: HseState["queuePressure"];
  anomalyClusters: HseState["anomalyClusters"];
};

let lastPosture: HseState["sovereignPosture"] | null = null;

export function decidePosture(input: PostureInput): HseState["sovereignPosture"] {
  // Check for operator override first
  const override = getPostureOverride();
  if (override) {
    // INHERITANCE MODE: Track posture transition if inheritance is active
    if (isInheritanceModeActive() && lastPosture && lastPosture !== override) {
      recordPostureTransition("auren", { // TODO: Get actual operator
        from: lastPosture,
        to: override,
        trigger: "operator_override",
      });
    }
    lastPosture = override;
    return override;
  }

  const { subsystems, riskVectors, driftVectors, queuePressure, anomalyClusters } = input;

  const maxRisk =
    riskVectors.length > 0 ? Math.max(...riskVectors.map(v => v.value)) : 0;

  const maxDrift =
    driftVectors.length > 0 ? Math.max(...driftVectors.map(v => v.value)) : 0;

  const maxQueue =
    queuePressure.length > 0 ? Math.max(...queuePressure.map(v => v.value)) : 0;

  const totalErrors = Object.values(subsystems).reduce(
    (sum, s) => sum + (s.errors ?? 0),
    0
  );

  const maxSeverity =
    anomalyClusters.length > 0
      ? Math.max(...anomalyClusters.map(c => c.severity))
      : 0;

  // Critical: high risk/drift + severe anomalies + growing queues
  if (maxSeverity >= 8 || (maxRisk > 0.8 && maxQueue > 0.7)) {
    return "recovery";
  }

  // Protective: elevated risk, drift, or anomalies
  if (maxRisk > 0.5 || maxDrift > 0.3 || maxSeverity >= 5) {
    return "protective";
  }

  // Aggressive: low risk, low drift, low queues, healthy subsystems
  const avgHealth =
    Object.values(subsystems).reduce(
      (sum, s) => sum + (s.health ?? 1),
      0
    ) / Math.max(Object.keys(subsystems).length, 1);

  if (avgHealth > 0.9 && maxRisk < 0.2 && maxDrift < 0.1 && maxQueue < 0.05 && totalErrors === 0) {
    return "aggressive";
  }

  // Default: normal
  const newPosture = "normal";
  
  // INHERITANCE MODE: Track posture transition if inheritance is active
  if (isInheritanceModeActive() && lastPosture && lastPosture !== newPosture) {
    recordPostureTransition("auren", { // TODO: Get actual operator
      from: lastPosture,
      to: newPosture,
      trigger: "system_decision",
    });
  }
  
  lastPosture = newPosture;
  return newPosture;
}
