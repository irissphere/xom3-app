// Sovereign Event Bus - in-memory constellation channel
// Publishes events, retains bounded history, notifies subscribers, triggers reflex engine non-blocking.

import { emitAutomationEvent, emitErrorEvent } from "@/lib/cockpit/activity-events";
import { enqueueBroadcast } from "@/lib/broadcast/broadcast-sovereign";
import { processReflex } from "./reflex-table";

export type SovereignId = "uoi" | "system" | "broadcast" | "hse" | "sync" | "rituals" | "cockpit";
export type SovereignSeverity = "info" | "warning" | "error";

export type SovereignEvent = {
  id: string;
  sovereign: SovereignId;
  type: string;
  severity: SovereignSeverity;
  timestamp: string; // ISO for consistency with the rest of the cockpit
  payload: any;
  parentEventId?: string;
  tags?: string[];
};

const HISTORY_MAX = 300;

type EventBusState = {
  history: SovereignEvent[];
  subscribers: Set<(event: SovereignEvent) => void>;
  seq: number;
};

function busState(): EventBusState {
  const g = globalThis as any;
  if (!g.__xom3_event_bus_state__) {
    g.__xom3_event_bus_state__ = {
      history: [] as SovereignEvent[],
      subscribers: new Set<(event: SovereignEvent) => void>(),
      seq: 0,
    } satisfies EventBusState;
  }
  return g.__xom3_event_bus_state__ as EventBusState;
}

function nextId() {
  const s = busState();
  s.seq += 1;
  return `sev_${Date.now()}_${s.seq}`;
}

function pushHistory(evt: SovereignEvent) {
  const s = busState();
  s.history.unshift(evt);
  if (s.history.length > HISTORY_MAX) s.history.pop();
}

function timelineMirror(evt: SovereignEvent) {
  // Mirror into cockpit activity stream (so /api/timeline picks it up without special wiring).
  emitAutomationEvent("sovereign-event-bus", "success", {
    sovereign: evt.sovereign,
    type: evt.type,
    severity: evt.severity,
    eventId: evt.id,
  });

  // Optional: mirror into Broadcast for high-severity events (truthful: slack may fail if not configured).
  if (evt.severity === "error") {
    enqueueBroadcast({
      channel: "slack",
      priority: "high",
      title: `Sovereign event: ${evt.sovereign}`,
      body: `${evt.type}\n${typeof evt.payload === "string" ? evt.payload : JSON.stringify(evt.payload)}`,
      metadata: { interlink: true, origin: "event-bus", eventId: evt.id, sovereign: evt.sovereign, type: evt.type },
    });
  }
}

export function getSovereignEventHistory(limit = 200): SovereignEvent[] {
  const s = busState();
  return s.history.slice(0, Math.max(1, Math.min(300, limit)));
}

export function subscribe(handler: (event: SovereignEvent) => void): () => void {
  const s = busState();
  s.subscribers.add(handler);
  return () => s.subscribers.delete(handler);
}

export function publish(event: Omit<SovereignEvent, "id" | "timestamp">): SovereignEvent {
  const full: SovereignEvent = {
    ...event,
    id: nextId(),
    timestamp: new Date().toISOString(),
  };

  pushHistory(full);

  const s = busState();
  for (const handler of Array.from(s.subscribers)) {
    try {
      handler(full);
    } catch (err) {
      emitErrorEvent(err instanceof Error ? err.message : "event_bus_subscriber_error", "system", {
        surface: "sovereign-event-bus",
        eventId: full.id,
      });
    }
  }

  try {
    timelineMirror(full);
  } catch (err) {
    emitErrorEvent(err instanceof Error ? err.message : "event_bus_timeline_mirror_error", "system", {
      surface: "sovereign-event-bus",
      eventId: full.id,
    });
  }

  // Reflex engine must be non-blocking.
  queueMicrotask(() => {
    try {
      processReflex(full);
    } catch (err) {
      emitErrorEvent(err instanceof Error ? err.message : "reflex_engine_error", "system", {
        surface: "sovereign-event-bus",
        eventId: full.id,
      });
    }
  });

  return full;
}
