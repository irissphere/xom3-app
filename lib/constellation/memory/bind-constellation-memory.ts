import { getSovereignEventHistory, subscribe, type SovereignEvent } from "@/lib/sovereigns/event-bus";
import { recordEvent } from "./recorders/eventRecorder";
import { recordSovereignHealth } from "./recorders/healthRecorder";
import { recordSovereignPosture } from "./recorders/sovereignRecorder";
import { recordReflexActivation } from "./recorders/reflexRecorder";
import { recordRitualStep } from "./recorders/ritualRecorder";
import { ensureReflexChainsBound } from "@/lib/constellation/reflexChains";

type GlobalGuard = {
  __xom3_constellation_memory_bound__?: boolean;
  __xom3_constellation_memory_unsub__?: (() => void) | null;
};

function g(): GlobalGuard {
  return globalThis as any;
}

function recordFromEvent(event: SovereignEvent) {
  recordEvent(event);
  recordSovereignHealth(event as any);

  if (event.type.endsWith(".posture.changed")) {
    const posture = String(event.payload?.to || event.payload?.posture || "");
    if (posture) recordSovereignPosture({ id: String(event.sovereign), posture });
  }

  if (event.tags?.includes("reflex")) {
    const kind = String(event.payload?.kind || "");
    const targetSovereign =
      kind === "broadcast.enqueue" ? "broadcast" :
      kind === "uoi.directive" ? "uoi" :
      kind === "sovereign.sync" ? "sync" :
      String(event.sovereign);
    recordReflexActivation({
      sourceSovereign: String(event.sovereign),
      targetSovereign: String(targetSovereign),
      type: String(event.type),
    });
  }

  if (event.tags?.includes("ritual")) {
    const ritualId = String(event.payload?.ritualKey || event.payload?.ritual || "unknown");
    const step = String(event.type);
    const sovereign =
      event.payload?.kind === "broadcast.enqueue" ? "broadcast" :
      event.payload?.kind === "uoi.directive" ? "uoi" :
      event.payload?.kind === "sovereign.sync" ? "sync" :
      String(event.sovereign);
    recordRitualStep({ ritualId, step, sovereign });
  }
}

export function ensureConstellationMemoryBound() {
  const gg = g();
  if (gg.__xom3_constellation_memory_bound__) return;
  gg.__xom3_constellation_memory_bound__ = true;

  // CRX-1: reflex chains should be available anywhere CM-1 is bound (purely additive).
  ensureReflexChainsBound();

  // Backfill from bounded history so CM-1 is non-empty even before an SSE client connects.
  const history = getSovereignEventHistory(300).slice().reverse();
  for (const evt of history) recordFromEvent(evt);

  gg.__xom3_constellation_memory_unsub__ = subscribe((event) => {
    try {
      recordFromEvent(event);
    } catch {
      // passive lane; ignore recorder failures
    }
  });
}
