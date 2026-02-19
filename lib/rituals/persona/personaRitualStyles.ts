import { getPersona } from "@/lib/sovereigns/personas";

export type PersonaRitualStyle = {
  sovereignId: string;
  glyph: string;
  color: string;
  signature: "sentinel" | "herald" | "conductor" | "pulsekeeper" | "observer" | "architect" | "default";
  arcWidth: number; // multiplier
  pulseMs: number; // timing hint
};

const FALLBACK: PersonaRitualStyle = {
  sovereignId: "system",
  glyph: "✦",
  color: "#f15bb5",
  signature: "default",
  arcWidth: 1,
  pulseMs: 900,
};

export function getPersonaRitualStyle(sovereignId: string): PersonaRitualStyle {
  const persona = getPersona(sovereignId);
  if (!persona) return { ...FALLBACK, sovereignId };

  const signature =
    sovereignId === "hse" ? "sentinel" :
    sovereignId === "broadcast" ? "herald" :
    sovereignId === "rituals" ? "conductor" :
    sovereignId === "sync" ? "pulsekeeper" :
    sovereignId === "uoi" ? "observer" :
    sovereignId === "system" ? "architect" :
    "default";

  return {
    sovereignId,
    glyph: persona.glyph,
    color: persona.color,
    signature,
    arcWidth:
      signature === "sentinel" ? 1.35 :
      signature === "architect" ? 1.2 :
      signature === "herald" ? 1.15 :
      1,
    pulseMs:
      signature === "sentinel" ? 1150 :
      signature === "pulsekeeper" ? 800 :
      signature === "observer" ? 700 :
      signature === "architect" ? 900 :
      900,
  };
}
