// Broadcast Sovereign - Outbound announcements, rituals, operator-to-system messaging
// Truthful by default: dispatch uses Slack if configured, otherwise records simulated dispatch.

import { sendSlackNotification } from "@/lib/integrations/slack";
import { emitAutomationEvent, emitErrorEvent } from "@/lib/cockpit/activity-events";
import { publish } from "@/lib/sovereigns/event-bus";

export type BroadcastPosture = "idle" | "running" | "error" | "draining";
export type BroadcastPriority = "high" | "medium" | "low";
export type BroadcastChannel = "slack" | "internal";

export type BroadcastMessage = {
  id: string;
  channel: BroadcastChannel;
  priority: BroadcastPriority;
  title: string;
  body: string;
  createdAt: string;
  status: "queued" | "dispatched" | "failed";
  dispatchedAt?: string;
  error?: string;
  metadata?: Record<string, any>;
};

type DispatchResult = {
  id: string;
  ok: boolean;
  channel: BroadcastChannel;
  dispatchedAt: string;
  error?: string;
};

let started = false;
let startedAt: string | null = null;
let lastTickAt: string | null = null;
let lastError: string | null = null;
let draining = false;
let intervalMs: number | null = null;
let kernelRunning = false;

const queue: BroadcastMessage[] = [];
const dispatchLog: Array<{ tickAt: string; result: DispatchResult; message: BroadcastMessage }> = [];
const MAX_QUEUE = 5000;
const MAX_LOG = 2000;

function pushLog(entry: { tickAt: string; result: DispatchResult; message: BroadcastMessage }) {
  dispatchLog.push(entry);
  if (dispatchLog.length > MAX_LOG) dispatchLog.shift();
}

function derivePosture(): BroadcastPosture {
  if (lastError) return "error";
  if (draining) return "draining";
  if (kernelRunning) return "running";
  return "idle";
}

export function startBroadcastSovereign(nextIntervalMs: number = 5000) {
  if (!started) {
    started = true;
    startedAt = new Date().toISOString();
    draining = false;
    kernelRunning = true;
    emitAutomationEvent("broadcast-sovereign", "triggered", { startedAt });
  }

  intervalMs = nextIntervalMs;
  kernelRunning = true;
  // Delegate scheduling to kernel sovereign instance (fire-and-forget).
  void import("@/lib/sovereigns/registry")
    .then(({ startSovereign }) => startSovereign("broadcast", { intervalMs: nextIntervalMs }))
    .catch(() => {});

  emitAutomationEvent("broadcast-sovereign", "success", { intervalMs: nextIntervalMs });
}

export function stopBroadcastSovereign() {
  draining = true;
  kernelRunning = false;
  void import("@/lib/sovereigns/registry")
    .then(({ sovereigns }) => sovereigns.broadcast.stop())
    .catch(() => {});
}

export function setBroadcastIntervalMs(next: number) {
  intervalMs = next;
}

// Kernel tick: dispatch at most 1 queued message per tick.
export async function broadcastQueueTick() {
  try {
    lastTickAt = new Date().toISOString();
    lastError = null;
    const next = queue.find((m) => m.status === "queued");
    if (next) {
      const result = await dispatchMessage(next.id);
      return { tickAt: lastTickAt, dispatched: true, result };
    }
    return { tickAt: lastTickAt, dispatched: false };
  } catch (err) {
    lastTickAt = new Date().toISOString();
    lastError = err instanceof Error ? err.message : "unknown_error";
    emitErrorEvent(lastError, "broadcast", { surface: "broadcast-sovereign" });
    throw err;
  }
}
export function enqueueBroadcast(input: {
  channel?: BroadcastChannel;
  priority?: BroadcastPriority;
  title: string;
  body: string;
  metadata?: Record<string, any>;
}): BroadcastMessage {
  const message: BroadcastMessage = {
    id: `bcast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    channel: input.channel || "internal",
    priority: input.priority || "medium",
    title: input.title,
    body: input.body,
    createdAt: new Date().toISOString(),
    status: "queued",
    metadata: input.metadata,
  };

  queue.push(message);

  // Keep queue bounded (drop oldest queued first).
  if (queue.length > MAX_QUEUE) {
    queue.splice(0, queue.length - MAX_QUEUE);
  }

  // Priority sort (high → low) without destroying FIFO inside each priority.
  const order: Record<BroadcastPriority, number> = { high: 3, medium: 2, low: 1 };
  queue.sort((a, b) => order[b.priority] - order[a.priority] || a.createdAt.localeCompare(b.createdAt));

  emitAutomationEvent("broadcast-queue", "triggered", {
    messageId: message.id,
    channel: message.channel,
    priority: message.priority,
  });
  publish({
    sovereign: "broadcast",
    type: "broadcast.queue.enqueued",
    severity: "info",
    payload: { messageId: message.id, channel: message.channel, priority: message.priority, title: message.title },
    tags: ["interlink", "broadcast", "queue"],
  });

  return message;
}

export function getBroadcastQueue(limit: number = 80) {
  const items = [...queue].reverse().slice(0, limit);
  const counts = queue.reduce(
    (acc, m) => {
      acc.total++;
      acc[m.status]++;
      return acc;
    },
    { total: 0, queued: 0, dispatched: 0, failed: 0 } as Record<string, number>
  );

  return { items, counts };
}

export function flushBroadcastQueue(): number {
  const count = queue.length;
  queue.length = 0;
  return count;
}

export function getBroadcastStatus() {
  return {
    started,
    startedAt,
    posture: derivePosture(),
    eventLoopStatus: {
      running: kernelRunning,
      intervalMs,
      lastTickAt,
      lastError,
      logSize: dispatchLog.length,
    },
    queue: {
      pending: queue.filter((m) => m.status === "queued").length,
      total: queue.length,
    },
  };
}

export function getBroadcastLog(limit: number = 60) {
  return dispatchLog.slice(-limit);
}

export async function dispatchMessage(id: string): Promise<DispatchResult> {
  const message = queue.find((m) => m.id === id);
  const tickAt = new Date().toISOString();

  if (!message) {
    return { id, ok: false, channel: "internal", dispatchedAt: tickAt, error: "message_not_found" };
  }

  if (message.status !== "queued") {
    return { id, ok: true, channel: message.channel, dispatchedAt: tickAt };
  }

  try {
    let ok = true;
    let error: string | undefined;

    if (message.channel === "slack") {
      const sent = await sendSlackNotification(`${message.title}\n${message.body}`, "info");
      ok = sent;
      if (!sent) {
        error = "slack_not_configured_or_failed";
      }
    }

    message.status = ok ? "dispatched" : "failed";
    message.dispatchedAt = tickAt;
    message.error = ok ? undefined : error;

    const result: DispatchResult = {
      id: message.id,
      ok,
      channel: message.channel,
      dispatchedAt: tickAt,
      error,
    };

    pushLog({ tickAt, result, message: { ...message } });

    emitAutomationEvent("broadcast-dispatch", ok ? "success" : "error", {
      messageId: message.id,
      channel: message.channel,
      priority: message.priority,
      ok,
      error,
    });
    publish({
      sovereign: "broadcast",
      type: ok ? "broadcast.dispatch.success" : "broadcast.dispatch.failed",
      severity: ok ? "info" : "error",
      payload: { messageId: message.id, channel: message.channel, priority: message.priority, ok, error },
      tags: ["interlink", "broadcast", "dispatch", ...(ok ? [] : ["error"])],
    });

    // Broadcast → UOI/System/HSE: reflex triggers (metadata-driven, safe + optional)
    // This intentionally uses dynamic imports to avoid hard dependency cycles.
    try {
      const reflex = message.metadata?.reflex;
      if (ok && reflex && typeof reflex === "object") {
        const type = String(reflex.type || "");

        if (type === "uoi.start") {
          const { ensureUoiStarted } = await import("@/lib/uoi");
          ensureUoiStarted();
        } else if (type === "system.start") {
          const { startSystemSovereign } = await import("@/lib/system/system-sovereign");
          startSystemSovereign(5000);
        } else if (type === "broadcast.start") {
          startBroadcastSovereign(5000);
        } else if (type === "hse.snapshot") {
          const { queryState, initializeGlobalState, isHSEInitialized } = await import("@/lib/hse");
          if (!isHSEInitialized()) initializeGlobalState();
          const state = queryState();
          enqueueBroadcast({
            channel: "internal",
            priority: "low",
            title: "HSE snapshot",
            body: `risk=${state?.stability?.risk_level || "unknown"} • stability=${state?.stability?.overall_stability ?? "--"} • anomalies=${state?.anomalies?.length ?? 0}`,
            metadata: { interlink: true, origin: "broadcast", reflex: "hse.snapshot", state: state || null },
          });
        } else if (type === "uoi.testDirective") {
          const { ensureHandlersInitialized, createDirective, executeDirectiveNow } = await import("@/lib/uoi");
          ensureHandlersInitialized();
          const directiveType = String(reflex.directiveType || "TRIGGER_ALERT");
          const target = String(reflex.target || "operator");
          const reason = String(reflex.reason || "Broadcast reflex: uoi.testDirective");
          const directive = createDirective(directiveType as any, target, { reflex: true }, reason);
          await executeDirectiveNow(directive);
        }
      }
    } catch (reflexErr) {
      const msg = reflexErr instanceof Error ? reflexErr.message : "reflex_error";
      emitErrorEvent(msg, "broadcast", { surface: "broadcast-sovereign", phase: "reflex" });
    }

    return result;
  } catch (err) {
    const error = err instanceof Error ? err.message : "unknown_error";
    message.status = "failed";
    message.error = error;
    message.dispatchedAt = tickAt;
    lastError = error;
    emitErrorEvent(error, "broadcast", { messageId: message.id });

    const result: DispatchResult = {
      id: message.id,
      ok: false,
      channel: message.channel,
      dispatchedAt: tickAt,
      error,
    };

    pushLog({ tickAt, result, message: { ...message } });
    publish({
      sovereign: "broadcast",
      type: "broadcast.dispatch.error",
      severity: "error",
      payload: { messageId: message.id, channel: message.channel, priority: message.priority, error },
      tags: ["interlink", "broadcast", "dispatch", "error"],
    });
    return result;
  }
}
