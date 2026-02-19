import { computeRitualArcs } from "./ritualChoreography";
import { ritualGlyphs } from "./ritualGlyphs";
import { applyPersonaToRitualStep } from "@/lib/rituals/persona";

function id() {
  const anyCrypto = globalThis.crypto as Crypto | undefined;
  if (anyCrypto?.randomUUID) return anyCrypto.randomUUID();
  return `rc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function runRitualCinematics(payload: any) {
  const ritualId = String(payload?.ritualKey || payload?.ritualId || payload?.ritual || "unknown");
  const step = String(payload?.stepKind || payload?.step || payload?.type || payload?.event || payload?.status || payload?.kind || "step");

  // We map from event-bus truth to cinematic step names.
  // The SSE handler already passes ritual payload; here we derive a stable "step" string.
  const normalizedStep =
    payload?.kind === "ritual.started" || payload?.type === "ritual.started" ? "ritual.started" :
    payload?.kind === "ritual.completed" || payload?.type === "ritual.completed" ? "ritual.completed" :
    payload?.kind === "ritual.step.completed" || payload?.type === "ritual.step.completed" ? "ritual.step.completed" :
    payload?.kind === "ritual.step.failed" || payload?.type === "ritual.step.failed" ? "ritual.step.failed" :
    String(payload?.eventType || payload?.kind || payload?.type || step);

  const sovereign =
    payload?.kind === "broadcast.enqueue" ? "broadcast" :
    payload?.kind === "uoi.directive" ? "uoi" :
    payload?.kind === "sovereign.sync" ? "sync" :
    String(payload?.sovereign || payload?.targetSovereign || payload?.sourceSovereign || "system");

  const cinematicStep = {
    ritualId,
    step: normalizedStep,
    sovereign,
    at: Date.now(),
    nextSovereign: null as string | null,
  };

  const arcs = computeRitualArcs(cinematicStep);
  const glyphSvg = ritualGlyphs[normalizedStep] || ritualGlyphs.default;

  const base = {
    arcs,
    glyph: {
      id: id(),
      ritualId,
      step: normalizedStep,
      svg: glyphSvg,
      sovereign,
    },
    at: cinematicStep.at,
    ritualId,
    step: normalizedStep,
    sovereign,
  };

  // PRT-1: persona-driven ritual expression (purely additive to ritual.cinematic payload).
  return applyPersonaToRitualStep(base);
}
