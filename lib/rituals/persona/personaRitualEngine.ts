import { getPersonaRitualStyle } from "./personaRitualStyles";

type Arc = { id?: string; from: string; to: string; intensity?: number; color?: string };
type Glyph = { id: string; ritualId: string; step: string; svg: string; sovereign?: string; color?: string };

export function applyPersonaToRitualStep(input: {
  ritualId: string;
  step: string;
  sovereign?: string;
  arcs?: Arc[];
  glyph?: Glyph | null;
  at: number;
}) {
  const sovereign = input.sovereign || "system";
  const style = getPersonaRitualStyle(sovereign);

  const arcs = (input.arcs || []).map((a) => {
    const styleForArc = getPersonaRitualStyle(a.to || sovereign);
    return {
      ...a,
      // persona color dominates (still additive)
      color: styleForArc.color,
      intensity: Math.max(0.3, Math.min(1, (a.intensity ?? 0.7) * styleForArc.arcWidth)),
    };
  });

  const glyphs: Glyph[] = [];
  if (input.glyph) {
    glyphs.push({ ...input.glyph, color: style.color });
  }

  // Persona glyph trail (lightweight): drop one extra glyph marker per step.
  glyphs.push({
    id: `${input.ritualId}_${input.at}_${sovereign}`,
    ritualId: input.ritualId,
    step: `persona.${style.signature}`,
    svg: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><text x="12" y="16" text-anchor="middle" font-size="14" fill="currentColor">${style.glyph}</text></svg>`,
    sovereign,
    color: style.color,
  });

  return {
    ...input,
    arcs,
    glyphs,
    persona: {
      sovereignId: sovereign,
      glyph: style.glyph,
      color: style.color,
      signature: style.signature,
      pulseMs: style.pulseMs,
    },
  };
}
