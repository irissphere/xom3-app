import { publish } from "@/lib/sovereigns/event-bus";
import type { ConstellationEpoch } from "@/lib/constellation/epochs";
import { getEpochTransition } from "./epochTransitionRegistry";

export async function runEpochTransition(input: {
  from: ConstellationEpoch | null;
  to: ConstellationEpoch;
  changedAt: number;
  reason?: string;
  sourceEventId?: string;
}) {
  const t = getEpochTransition(input.from?.id || null, input.to.id);
  const payload = {
    from: input.from,
    to: input.to,
    changedAt: input.changedAt,
    reason: input.reason || "epoch_change",
    transition: t,
  };

  publish({
    sovereign: "cockpit",
    type: "operator.epoch.transition",
    severity: "info",
    payload,
    tags: ["epoch", "transition", "operator"],
    parentEventId: input.sourceEventId,
  });

  // Optional: emit a tiny “micro-ritual” cinematic event (UI-only consumption).
  publish({
    sovereign: "rituals",
    type: "epoch.transition.cinematic",
    severity: "info",
    payload: {
      glyph: (t?.glyph || input.to.glyph) as string,
      color: (t?.color || input.to.color) as string,
      ceremonyStyle: (t?.ceremonyStyle || "pulse") as string,
      durationMs: (t?.durationMs || 1800) as number,
      fromEpoch: input.from?.id || null,
      toEpoch: input.to.id,
    },
    tags: ["epoch", "cinematic"],
    parentEventId: input.sourceEventId,
  });
}
