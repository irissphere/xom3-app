export type ConstellationEpoch = {
  id: string;
  name: string;
  description: string;
  color: string;
  glyph: string;
};

export const constellationEpochs: ConstellationEpoch[] = [
  {
    id: "activation",
    name: "Activation Epoch",
    description: "The constellation awakens and establishes its sovereign structure.",
    color: "#00f5d4",
    glyph: "\u2727",
  },
  {
    id: "stabilization",
    name: "Stabilization Epoch",
    description: "Health, posture, and sync pulses stabilize into predictable rhythms.",
    color: "#9b5de5",
    glyph: "\u2301",
  },
  {
    id: "expansion",
    name: "Expansion Epoch",
    description: "New lanes, chambers, and sovereign capabilities come online.",
    color: "#f15bb5",
    glyph: "\u2726",
  },
  {
    id: "gtm",
    name: "GTM Epoch",
    description: "CRM/Broadcast surfaces activate for real-world use.",
    color: "#fee440",
    glyph: "\u2691",
  },
  {
    id: "ritual",
    name: "Ritual Epoch",
    description: "Rituals become cinematic, choreographed, and persona-driven.",
    color: "#ff6b6b",
    glyph: "\u2739",
  },
  {
    id: "operator",
    name: "Operator Epoch",
    description: "Operator mode + intent inference shape the cockpit experience.",
    color: "#00bbf9",
    glyph: "\u25C9",
  },
];
