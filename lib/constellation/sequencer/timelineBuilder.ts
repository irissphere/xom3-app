import type { TimelineEvent } from "./types";

type MemorySnapshot = {
  sovereignPosture: any[];
  sovereignHealth: any[];
  events: any[];
  reflexes: any[];
  rituals: any[];
};

export function buildTimeline(memory: MemorySnapshot): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  const push = (type: string, entry: any) => {
    const at = Number(entry?.at);
    if (!Number.isFinite(at)) return;
    events.push({
      at,
      type,
      payload: entry?.data ?? entry,
    });
  };

  (memory.sovereignPosture || []).forEach((e: any) => push("posture", e));
  (memory.sovereignHealth || []).forEach((e: any) => push("health", e));
  (memory.events || []).forEach((e: any) => push("event", e));
  (memory.reflexes || []).forEach((e: any) => push("reflex", e));
  (memory.rituals || []).forEach((e: any) => push("ritual", e));

  return events.sort((a, b) => a.at - b.at);
}
