import { publish, type SovereignEvent, type SovereignId } from "@/lib/sovereigns/event-bus";

export function publishReflexChainSignal(input: {
  type:
    | "constellation.reflex.chain.started"
    | "constellation.reflex.chain.propagated"
    | "constellation.reflex.chain.completed"
    | "constellation.reflex.chain.failed";
  severity?: "info" | "warning" | "error";
  payload: any;
  parentEventId?: string;
}) {
  return publish({
    sovereign: "cockpit",
    type: input.type,
    severity: input.severity || "info",
    payload: input.payload,
    tags: ["reflex-chain", "constellation"],
    parentEventId: input.parentEventId,
  });
}

export function publishReflexChainCinematic(input: {
  runId: string;
  chainId: string;
  stepIndex: number;
  from: SovereignId;
  to: SovereignId;
  color: string;
  glyph: string;
  intensity: number;
  delayMs: number;
  epochId: string;
  parentEventId?: string;
}) {
  const svg = buildGlyphSvg(input.glyph, input.color);
  return publish({
    sovereign: "cockpit",
    type: "reflex.chain.cinematic",
    severity: "info",
    payload: {
      runId: input.runId,
      chainId: input.chainId,
      stepIndex: input.stepIndex,
      from: input.from,
      to: input.to,
      intensity: input.intensity,
      color: input.color,
      glyph: input.glyph,
      glyphSvg: svg,
      delayMs: input.delayMs,
      epochId: input.epochId,
      at: Date.now(),
    },
    tags: ["reflex-chain", "cinematic"],
    parentEventId: input.parentEventId,
  });
}

function buildGlyphSvg(glyph: string, color: string) {
  // Minimal inline SVG for overlay consumption (UI-only).
  const safeGlyph = String(glyph || "").slice(0, 6);
  const safeColor = String(color || "#94a3b8");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><circle cx="24" cy="24" r="18" fill="rgba(0,0,0,0.55)" stroke="${safeColor}" stroke-width="2"/><text x="24" y="29" text-anchor="middle" font-size="18" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace" fill="${safeColor}">${safeGlyph}</text></svg>`;
}
