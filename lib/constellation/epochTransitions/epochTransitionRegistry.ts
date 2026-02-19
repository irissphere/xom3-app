export type EpochTransition = {
  fromEpoch: string;
  toEpoch: string;
  glyph: string;
  color: string;
  description: string;
  ceremonyStyle: "pulse" | "ripple" | "flare" | "crown-shift";
  durationMs: number;
};

export const epochTransitions: EpochTransition[] = [
  {
    fromEpoch: "activation",
    toEpoch: "stabilization",
    glyph: "\u2301",
    color: "#9b5de5",
    description: "The constellation settles into steady rhythm.",
    ceremonyStyle: "pulse",
    durationMs: 1800,
  },
  {
    fromEpoch: "stabilization",
    toEpoch: "expansion",
    glyph: "\u2726",
    color: "#f15bb5",
    description: "New chambers awaken; capacity expands.",
    ceremonyStyle: "flare",
    durationMs: 2200,
  },
  {
    fromEpoch: "expansion",
    toEpoch: "gtm",
    glyph: "\u2691",
    color: "#fee440",
    description: "Outreach surfaces activate; signals turn outward.",
    ceremonyStyle: "ripple",
    durationMs: 2200,
  },
  {
    fromEpoch: "gtm",
    toEpoch: "ritual",
    glyph: "\u2739",
    color: "#ff6b6b",
    description: "Time becomes ceremony; rituals take the stage.",
    ceremonyStyle: "flare",
    durationMs: 2600,
  },
  {
    fromEpoch: "ritual",
    toEpoch: "operator",
    glyph: "\u25C9",
    color: "#00bbf9",
    description: "The crown turns; the cockpit aligns to the operator.",
    ceremonyStyle: "crown-shift",
    durationMs: 2400,
  },
];

export function getEpochTransition(fromEpoch: string | null, toEpoch: string) {
  if (!fromEpoch) return null;
  return epochTransitions.find((t) => t.fromEpoch === fromEpoch && t.toEpoch === toEpoch) || null;
}
