export * from "./types";
export { MemoryStore } from "./memoryStore";

export { eventMemory, recordEvent } from "./recorders/eventRecorder";
export { sovereignPostureMemory, recordSovereignPosture } from "./recorders/sovereignRecorder";
export { sovereignHealthMemory, recordSovereignHealth } from "./recorders/healthRecorder";
export { reflexMemory, recordReflexActivation } from "./recorders/reflexRecorder";
export { ritualMemory, recordRitualStep } from "./recorders/ritualRecorder";
export { ensureConstellationMemoryBound } from "./bind-constellation-memory";

export function groupEpochsById<T extends { id: string }>(epochs: { at: number; data: T }[]) {
  const grouped: Record<string, { at: number; data: T }[]> = {};
  for (const epoch of epochs) {
    const id = epoch?.data?.id;
    if (!id) continue;
    (grouped[id] ??= []).push(epoch);
  }
  return grouped;
}
