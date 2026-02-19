import { MemoryStore } from "../memoryStore";
import type { SovereignPostureMemory } from "../types";

export const sovereignPostureMemory = new MemoryStore<SovereignPostureMemory>("sovereign-posture");

export function recordSovereignPosture(input: { id: string; posture: string }) {
  if (!input?.id || !input?.posture) return;
  sovereignPostureMemory.record({
    id: input.id,
    posture: input.posture,
  });
}
