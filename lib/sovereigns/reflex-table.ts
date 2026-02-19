// Reflex Table - constellation reflexes (event → action)
// Kept intentionally small and safe: try/catch around each reflex; actions are best-effort.

import type { SovereignEvent } from "./event-bus";
import { enqueueBroadcast } from "@/lib/broadcast/broadcast-sovereign";
import { ensureUoiStarted, ensureHandlersInitialized, createDirective, executeDirectiveNow } from "@/lib/uoi";
import { startSystemSovereign } from "@/lib/system/system-sovereign";
import { initializeGlobalState, isHSEInitialized, queryState } from "@/lib/hse";
import { emitErrorEvent } from "@/lib/cockpit/activity-events";

type ReflexHandler = (event: SovereignEvent) => void | Promise<void>;

type ReflexRule = {
  type: string;
  handler: ReflexHandler;
};

export function getReflexEdges(): Array<{ type: string; source: string; target: string; label?: string }> {
  // Visual map-only metadata. This does not change reflex behavior.
  return [
    { type: "system.anomaly", source: "hse", target: "broadcast", label: "anomaly → alert" },
    { type: "system.anomaly", source: "system", target: "broadcast", label: "anomaly → alert" },
    { type: "hse.posture.changed", source: "hse", target: "rituals", label: "protective → support" },
    { type: "hse.posture.changed", source: "hse", target: "broadcast", label: "posture → advisory" },
    { type: "system.posture.changed", source: "system", target: "rituals", label: "error → recovery" },
    { type: "broadcast.ritual.trigger", source: "broadcast", target: "rituals", label: "trigger → ritual" },
    { type: "broadcast.ritual.trigger", source: "broadcast", target: "uoi", label: "trigger → directive" },
    { type: "broadcast.sync", source: "broadcast", target: "system", label: "sync → start" },
    { type: "broadcast.sync", source: "broadcast", target: "uoi", label: "sync → start" },
    { type: "broadcast.sync", source: "broadcast", target: "hse", label: "sync → init" },
    { type: "sync.pulse", source: "sync", target: "broadcast", label: "pulse → align" },
    { type: "sync.pulse", source: "sync", target: "system", label: "pulse → align" },
    { type: "sync.pulse", source: "sync", target: "uoi", label: "pulse → align" },
    { type: "sync.pulse", source: "sync", target: "hse", label: "pulse → align" },
  ];
}

const reflexes: ReflexRule[] = [
  // System anomaly → broadcast alert
  {
    type: "system.anomaly",
    handler: async (event) => {
      if (event.severity === "info") return;
      enqueueBroadcast({
        channel: event.severity === "error" ? "slack" : "internal",
        priority: event.severity === "error" ? "high" : "medium",
        title: "System anomaly detected",
        body: typeof event.payload === "string" ? event.payload : JSON.stringify(event.payload),
        metadata: { interlink: true, reflex: true, sourceEventId: event.id, from: "system" },
      });
    },
  },
  // HSE posture shift → broadcast advisory
  {
    type: "hse.posture.changed",
    handler: async (event) => {
      const posture = event.payload?.to || event.payload?.posture;
      if (!posture) return;
      if (posture !== "protective" && posture !== "recovery") return;

      if (posture === "protective") {
        const { triggerRitual } = await import("@/lib/rituals/engine");
        await triggerRitual("operator.support", { source: { type: "reflex", eventId: event.id }, sourceEvent: event });
      }

      enqueueBroadcast({
        channel: posture === "recovery" ? "slack" : "internal",
        priority: posture === "recovery" ? "high" : "medium",
        title: "HSE posture advisory",
        body: `HSE posture=${posture}`,
        metadata: { interlink: true, reflex: true, sourceEventId: event.id, posture },
      });
    },
  },
  // System posture shift → recovery ritual (on error)
  {
    type: "system.posture.changed",
    handler: async (event) => {
      const to = event.payload?.to || event.payload?.posture;
      if (to !== "error") return;
      const { triggerRitual } = await import("@/lib/rituals/engine");
      await triggerRitual("system.recovery", { source: { type: "reflex", eventId: event.id }, sourceEvent: event });
    },
  },
  // Broadcast ritual trigger → UOI directive
  {
    type: "broadcast.ritual.trigger",
    handler: async (event) => {
      const ritualKey = typeof event.payload?.ritualKey === "string" ? event.payload.ritualKey : null;
      if (ritualKey) {
        const { triggerRitual } = await import("@/lib/rituals/engine");
        await triggerRitual(ritualKey, { source: { type: "reflex", eventId: event.id }, sourceEvent: event });
        return;
      }

      ensureHandlersInitialized();
      const directiveType = (event.payload?.directiveType || "TRIGGER_ALERT") as any;
      const target = String(event.payload?.target || "operator");
      const reason = String(event.payload?.reason || "Broadcast ritual trigger");
      const directive = createDirective(directiveType, target, { reflex: true, sourceEventId: event.id }, reason);
      await executeDirectiveNow(directive);
    },
  },
  // Broadcast sync pulse → start sovereigns (best-effort)
  {
    type: "broadcast.sync",
    handler: async (_event) => {
      ensureUoiStarted();
      startSystemSovereign(5000);
      if (!isHSEInitialized()) initializeGlobalState();
      const state = queryState();
      enqueueBroadcast({
        channel: "internal",
        priority: "low",
        title: "Constellation sync pulse",
        body: `HSE risk=${state?.stability?.risk_level || "unknown"} • anomalies=${state?.anomalies?.length ?? 0}`,
        metadata: { interlink: true, reflex: true, origin: "broadcast", type: "broadcast.sync" },
      });
    },
  },
  // Sync pulse sovereign → constellation alignment (best-effort)
  {
    type: "sync.pulse",
    handler: async (event) => {
      // Ensure the core sovereigns are at least ignited.
      ensureUoiStarted();
      startSystemSovereign(5000);
      if (!isHSEInitialized()) initializeGlobalState();

      // Snapshot HSE posture to include in the alignment note.
      const state = queryState();
      const risk = state?.stability?.risk_level || "unknown";
      const anomalies = state?.anomalies?.length ?? 0;

      enqueueBroadcast({
        channel: "internal",
        priority: "low",
        title: "Sync pulse (constellation alignment)",
        body: `pulse=${event.payload?.pulseId || event.id} • HSE risk=${risk} • anomalies=${anomalies}`,
        metadata: { interlink: true, reflex: true, sourceEventId: event.id, origin: "sync", type: "sync.pulse" },
      });
    },
  },
];

export async function processReflex(event: SovereignEvent): Promise<void> {
  const matching = reflexes.filter((r) => r.type === event.type);
  if (matching.length === 0) return;

  for (const rule of matching) {
    try {
      await rule.handler(event);
    } catch (err) {
      emitErrorEvent(err instanceof Error ? err.message : "reflex_handler_error", "system", {
        surface: "reflex-table",
        eventType: event.type,
        eventId: event.id,
      });
    }
  }
}
