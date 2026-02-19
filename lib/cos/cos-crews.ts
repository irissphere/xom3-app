import type { CosCrew } from "./cos-types";

export const cosCrews: CosCrew[] = [
  {
    id: "launch",
    name: "Launch Crew",
    members: ["gtm.outbound", "gtm.campaigns", "rituals", "hud", "epochs"],
    persona: "broadcast",
    epochTags: ["expansion", "gtm"],
  },
  {
    id: "demo",
    name: "Demo Crew",
    members: ["hud", "rituals", "constellation.reflexChains", "gtm.outbound"],
    persona: "uoi",
    epochTags: ["operator"],
  },
  {
    id: "stabilization",
    name: "Stabilization Crew",
    members: ["hud", "epochs", "constellation.reflexChains"],
    persona: "system",
    epochTags: ["stabilization"],
  },
];

export function getCrew(id: string) {
  return cosCrews.find((c) => c.id === id) || null;
}
