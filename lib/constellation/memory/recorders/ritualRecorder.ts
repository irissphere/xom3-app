import { MemoryStore } from "../memoryStore";
import type { RitualMemory } from "../types";

export const ritualMemory = new MemoryStore<RitualMemory>("ritual");

export function recordRitualStep(step: { ritualId: string; step: string; sovereign?: string }) {
  if (!step?.ritualId || !step?.step) return;
  ritualMemory.record({
    ritualId: step.ritualId,
    step: step.step,
    sovereign: step.sovereign,
  });
}
