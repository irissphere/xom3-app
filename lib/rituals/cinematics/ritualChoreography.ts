import type { RitualArc, RitualCinematicStep } from "./types";

const RITUALS_COLOR = "#9b5de5";
const STEP_COLOR = "#f15bb5";
const COMPLETE_COLOR = "#00f5d4";

export function computeRitualArcs(step: RitualCinematicStep & { nextSovereign?: string | null }): RitualArc[] {
  const arcs: RitualArc[] = [];

  if (step.step === "ritual.started" || step.step === "started") {
    arcs.push({
      from: "rituals",
      to: step.sovereign ?? "system",
      intensity: 1,
      color: RITUALS_COLOR,
    });
  }

  if (step.step === "ritual.completed" || step.step === "completed") {
    arcs.push({
      from: step.sovereign ?? "system",
      to: "rituals",
      intensity: 0.55,
      color: COMPLETE_COLOR,
    });
  }

  if (step.step === "ritual.step.completed" || step.step === "step.completed") {
    arcs.push({
      from: step.sovereign ?? "rituals",
      to: step.nextSovereign ?? "system",
      intensity: 0.8,
      color: STEP_COLOR,
    });
  }

  return arcs;
}
