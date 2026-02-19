import { MemoryStore } from "../memoryStore";
import type { ReflexMemory } from "../types";

export const reflexMemory = new MemoryStore<ReflexMemory>("reflex");

export function recordReflexActivation(reflex: { sourceSovereign: string; targetSovereign: string; type: string }) {
  if (!reflex?.sourceSovereign || !reflex?.targetSovereign || !reflex?.type) return;
  reflexMemory.record({
    source: reflex.sourceSovereign,
    target: reflex.targetSovereign,
    type: reflex.type,
  });
}
