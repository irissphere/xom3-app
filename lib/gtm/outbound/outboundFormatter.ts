import type { OutboundPlatform } from "./types";
import { getPersona } from "@/lib/sovereigns/personas";
import { getCloneVoice } from "./cloneVoiceRegistry";

const PLATFORM_LIMITS: Record<OutboundPlatform, number> = {
  twitter: 280,
  linkedin: 3000,
  instagram: 2200,
  tiktok: 2200,
  youtube: 5000,
  generic: 8000,
};

function clampText(text: string, max: number) {
  const t = String(text || "").trim();
  if (t.length <= max) return t;
  // Keep room for ellipsis.
  return t.slice(0, Math.max(0, max - 1)).trimEnd() + "…";
}

function normalizeWhitespace(text: string, platform: OutboundPlatform) {
  let t = String(text || "").replace(/\r\n/g, "\n").trim();
  if (platform === "twitter") {
    // Twitter favors compact single-line copy.
    t = t.replace(/\n{2,}/g, "\n").replace(/\n/g, " ").replace(/\s{2,}/g, " ");
  } else {
    t = t.replace(/\n{3,}/g, "\n\n");
  }
  return t;
}

function applyPersonaLayer(input: { text: string; personaId: string }) {
  const persona = getPersona(input.personaId);
  if (!persona) return input.text;
  // Identity first: subtle glyph prefix so operator can feel persona without heavy flavor.
  return `${persona.glyph} ${input.text}`.trim();
}

function applyCloneVoiceLayer(input: { text: string; cloneVoiceId: string }) {
  const voice = getCloneVoice(input.cloneVoiceId);
  if (voice.style === "plain") return input.text;
  if (voice.style === "founder") {
    return input.text.replace(/\s+$/g, "").trim();
  }
  // mythic: keep it light; no roleplay, no likeness.
  return input.text.replace(/\s+$/g, "").trim();
}

function applyEpochLayer(input: { text: string; epochId: string }) {
  // Temporal flavor last (very light).
  if (input.epochId === "gtm") return input.text;
  if (input.epochId === "ritual") return input.text;
  return input.text;
}

export function formatOutboundText(input: {
  platform: OutboundPlatform;
  text: string;
  personaId: string;
  cloneVoiceId: string;
  epochId: string;
}) {
  const max = PLATFORM_LIMITS[input.platform] || 2000;
  let t = normalizeWhitespace(input.text, input.platform);
  t = applyPersonaLayer({ text: t, personaId: input.personaId });
  t = applyCloneVoiceLayer({ text: t, cloneVoiceId: input.cloneVoiceId });
  t = applyEpochLayer({ text: t, epochId: input.epochId });
  t = clampText(t, max);
  return t;
}
