import type { SovereignId } from "@/lib/sovereigns/event-bus";

export type ReflexChainCanon = {
  id: string;
  name: string;
  rootTypes: string[];
  steps: SovereignId[]; // ordered propagation path
  baseDelayMs: number;
  cooldownMs: number;
  intensity: number; // 0-1
};

export const reflexChains: ReflexChainCanon[] = [
  {
    id: "crx-stabilization",
    name: "Stabilization Chain",
    rootTypes: ["hse.posture.changed", "system.posture.changed", "system.anomaly"],
    steps: ["hse", "system", "sync"],
    baseDelayMs: 260,
    cooldownMs: 3000,
    intensity: 0.95,
  },
  {
    id: "crx-broadcast",
    name: "Broadcast Chain",
    rootTypes: ["broadcast.sync", "broadcast.ritual.trigger"],
    steps: ["broadcast", "uoi", "rituals"],
    baseDelayMs: 240,
    cooldownMs: 3500,
    intensity: 0.9,
  },
  {
    id: "crx-operator",
    name: "Operator Chain",
    rootTypes: ["sync.pulse"],
    steps: ["sync", "system", "rituals"],
    baseDelayMs: 320,
    cooldownMs: 6500,
    intensity: 0.85,
  },
];

export function getReflexChainForRootType(type: string) {
  return reflexChains.find((c) => c.rootTypes.includes(type)) || null;
}
