// UOI Signals - All system signals normalized

import { UOISignal } from "./contract";
import { broadcastHseEvent } from "@/lib/hse/stream";

export interface NormalizedSignal {
  source: string;
  type: string;
  severity: number;
  payload: any;
  timestamp: number;
}

const signalQueue: UOISignal[] = [];
const signalHandlers: Map<string, (signal: UOISignal) => void> = new Map();

/**
 * Normalize signal to UOI format
 */
export function normalizeSignal(raw: any): NormalizedSignal {
  return {
    source: raw.source || "unknown",
    type: raw.type || "unknown",
    severity: raw.severity || raw.priority === "critical" ? 10 : raw.priority === "high" ? 7 : raw.priority === "medium" ? 4 : 1,
    payload: raw.payload || raw,
    timestamp: raw.timestamp || Date.now()
  };
}

/**
 * Emit signal to UOI
 */
export function emitSignal(
  signal: Omit<UOISignal, "id" | "timestamp" | "priority"> & {
    priority?: UOISignal["priority"];
    /**
     * Back-compat alias used across older modules.
     * Mapped to priority if `priority` is not provided.
     */
    severity?: "info" | "low" | "medium" | "high" | "critical";
    /**
     * Optional override; accepts either epoch ms or ISO string.
     */
    timestamp?: number | string;
    /**
     * Optional override; if omitted we generate a stable id.
     */
    id?: string;
  }
): UOISignal {
  const priority: UOISignal["priority"] =
    signal.priority ??
    (signal.severity === "critical"
      ? "critical"
      : signal.severity === "high"
        ? "high"
        : signal.severity === "medium"
          ? "medium"
          : "low");

  const timestamp =
    typeof signal.timestamp === "string"
      ? signal.timestamp
      : typeof signal.timestamp === "number"
        ? new Date(signal.timestamp).toISOString()
        : new Date().toISOString();

  const fullSignal: UOISignal = {
    source: signal.source,
    type: signal.type,
    payload: signal.payload,
    priority,
    id: signal.id ?? `signal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp,
  };

  signalQueue.push(fullSignal);

  // Notify handlers
  signalHandlers.forEach(handler => {
    try {
      handler(fullSignal);
    } catch (error) {
      console.error("[UOI] Signal handler error:", error);
    }
  });

  // Broadcast signal to HSE stream (for real-time signal logs)
  broadcastHseEvent({
    type: "signal",
    timestamp: Date.now(),
    signal: {
      source: fullSignal.source,
      type: fullSignal.type,
      priority: fullSignal.priority,
      payload: fullSignal.payload,
      timestamp: fullSignal.timestamp
    }
  });

  return fullSignal;
}

/**
 * Register signal handler
 */
export function onSignal(handler: (signal: UOISignal) => void): () => void {
  const id = Math.random().toString(36).substr(2, 9);
  signalHandlers.set(id, handler);

  return () => {
    signalHandlers.delete(id);
  };
}

/**
 * Get pending signals
 */
export function getPendingSignals(): UOISignal[] {
  return [...signalQueue];
}

export function getSignalQueueState(): { pending: number } {
  return { pending: signalQueue.length };
}

/**
 * Clear processed signals
 */
export function clearSignals(ids: string[]): void {
  const idSet = new Set(ids);
  const before = signalQueue.length;
  signalQueue.splice(0, signalQueue.length, ...signalQueue.filter(s => !idSet.has(s.id)));
}

export function flushSignals(): number {
  const count = signalQueue.length;
  signalQueue.length = 0;
  return count;
}

/**
 * Get signals by type
 */
export function getSignalsByType(type: UOISignal["type"]): UOISignal[] {
  return signalQueue.filter(s => s.type === type);
}

/**
 * Get critical signals
 */
export function getCriticalSignals(): UOISignal[] {
  return signalQueue.filter(s => s.priority === "critical" || s.priority === "high");
}
