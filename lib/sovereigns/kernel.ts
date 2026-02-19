import { publish as publishEventBus, type SovereignSeverity } from "@/lib/sovereigns/event-bus";

export type SovereignId =
  | "system"
  | "uoi"
  | "broadcast"
  | "hse"
  | "sync"
  | "rituals"
  | "cockpit"
  | string;

export type SovereignPosture = "idle" | "starting" | "running" | "error" | "draining" | "stopped";

export interface SovereignConfig {
  id: SovereignId;
  label: string;
  tick?: () => Promise<any> | any;
  intervalMs?: number;
  onError?: (err: unknown) => void;
  initialPosture?: SovereignPosture;
  autoStart?: boolean;
}

export interface SovereignStatus {
  id: SovereignId;
  label: string;
  posture: SovereignPosture;
  startedAt?: number;
  stoppedAt?: number;
  lastTickAt?: number;
  lastError?: { message: string; at: number };
  tickCount: number;
  tickHistory: { at: number; info?: any }[];
  errorHistory: { at: number; message: string }[];
  intervalMs: number | null;
  running: boolean;
}

export interface SovereignInstance {
  id: SovereignId;
  label: string;
  start(options?: { intervalMs?: number }): Promise<void>;
  stop(): Promise<void>;
  setPosture(p: SovereignPosture): void;
  getStatus(): SovereignStatus;
  publish(
    type: string,
    severity: SovereignSeverity,
    payload?: any,
    options?: { tags?: string[]; parentEventId?: string }
  ): void;
}

const DEFAULT_INTERVAL_MS = 1000;
const MAX_TICKS = 200;
const MAX_ERRORS = 50;

function toErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : "unknown_error";
}

export function createSovereign(config: SovereignConfig): SovereignInstance {
  let posture: SovereignPosture = config.initialPosture || "idle";
  let intervalHandle: NodeJS.Timeout | null = null;
  let intervalMs: number | null = null;
  let startedAt: number | undefined = undefined;
  let stoppedAt: number | undefined = undefined;

  let lastTickAt: number | undefined = undefined;
  let lastError: { message: string; at: number } | undefined = undefined;

  let tickCount = 0;
  const tickHistory: { at: number; info?: any }[] = [];
  const errorHistory: { at: number; message: string }[] = [];

  let inTick = false;
  let draining = false;

  function pushTick(info?: any) {
    const at = Date.now();
    tickHistory.unshift({ at, info });
    if (tickHistory.length > MAX_TICKS) tickHistory.pop();
    lastTickAt = at;
    tickCount += 1;
  }

  function pushError(message: string) {
    const at = Date.now();
    lastError = { message, at };
    errorHistory.unshift({ at, message });
    if (errorHistory.length > MAX_ERRORS) errorHistory.pop();
  }

  function publishLifecycle(type: string, severity: SovereignSeverity, payload?: any) {
    publishEventBus({
      sovereign: config.id as any,
      type,
      severity,
      payload,
      tags: ["kernel", "lifecycle", config.id],
    });
  }

  function setPosture(next: SovereignPosture) {
    if (posture === next) return;
    const from = posture;
    posture = next;
    publishLifecycle("sovereign.posture.changed", next === "error" ? "error" : "info", { from, to: next });
  }

  async function runTickOnce() {
    if (!config.tick) return;
    if (inTick) return;
    if (!intervalHandle) return;
    if (draining) return;

    inTick = true;
    try {
      const result = await config.tick();
      pushTick(result);
      // Optional lifecycle tick event (does not replace sovereign-specific events).
      publishLifecycle("sovereign.tick", "info", { tickAt: new Date().toISOString() });
      if (posture === "starting") setPosture("running");
    } catch (err) {
      const msg = toErrorMessage(err);
      pushError(msg);
      setPosture("error");
      try {
        config.onError?.(err);
      } catch {
        // ignore nested error
      }
      publishLifecycle("sovereign.error", "error", { message: msg });
    } finally {
      inTick = false;
    }
  }

  async function start(options?: { intervalMs?: number }) {
    if (intervalHandle) return;
    draining = false;
    stoppedAt = undefined;
    startedAt = startedAt ?? Date.now();

    setPosture("starting");
    intervalMs = options?.intervalMs ?? config.intervalMs ?? DEFAULT_INTERVAL_MS;

    // Schedule with setInterval, but execute tick work non-blocking via queueMicrotask.
    intervalHandle = setInterval(() => {
      queueMicrotask(() => {
        runTickOnce();
      });
    }, intervalMs);

    // Kick an immediate first tick.
    queueMicrotask(() => {
      runTickOnce();
    });
  }

  async function stop() {
    draining = true;
    setPosture("draining");
    if (intervalHandle) {
      clearInterval(intervalHandle);
      intervalHandle = null;
    }
    intervalMs = null;
    stoppedAt = Date.now();
    setPosture("stopped");
  }

  function getStatus(): SovereignStatus {
    return {
      id: config.id,
      label: config.label,
      posture,
      startedAt,
      stoppedAt,
      lastTickAt,
      lastError,
      tickCount,
      tickHistory: [...tickHistory],
      errorHistory: [...errorHistory],
      intervalMs,
      running: intervalHandle !== null,
    };
  }

  function publish(type: string, severity: SovereignSeverity, payload?: any, options?: { tags?: string[]; parentEventId?: string }) {
    publishEventBus({
      sovereign: config.id as any,
      type,
      severity,
      payload,
      tags: options?.tags,
      parentEventId: options?.parentEventId,
    });
  }

  const instance: SovereignInstance = {
    id: config.id,
    label: config.label,
    start,
    stop,
    setPosture,
    getStatus,
    publish,
  };

  if (config.autoStart) {
    queueMicrotask(() => {
      start().catch(() => {});
    });
  }

  return instance;
}
