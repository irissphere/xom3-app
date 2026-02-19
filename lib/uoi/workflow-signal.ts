// UOI Workflow Signal Emitter
// Unified way for workflows to talk to UOI

import { uoiHeartbeat } from "@/lib/uoi/heartbeat";
import { emitSignal } from "@/lib/uoi/signals";
import { pushHistory } from "@/lib/hse/history-store";

/**
 * Emit a workflow signal to UOI
 * 
 * @param type - Signal type (workflow_start, workflow_complete, workflow_error, etc.)
 * @param severity - Severity level (1-10)
 * @param payload - Signal payload data
 */
export function emitWorkflowSignal(type: string, severity: number, payload: any = {}) {
  try {
    // Store in signal queue (for HSE to read)
    emitSignal({
      source: "workflow",
      type: type as any,
      payload,
      priority: severity >= 7 ? "high" : severity >= 4 ? "medium" : "low"
    });
    
    // Also process via heartbeat (stores in memory)
    uoiHeartbeat({
      source: "workflow",
      type,
      severity,
      payload
    });

    // Push to history store
    const historyValue = type.includes("error") ? 1 :
                        type === "queue_pressure" ? (payload.queueSize || payload.queueLength || 0) :
                        type === "workflow_sla_breach" || type === "bottleneck" ? severity / 10 :
                        severity / 10;

    pushHistory({
      timestamp: Date.now(),
      subsystem: "workflows",
      type: type,
      value: historyValue
    });
  } catch (error) {
    // Don't fail workflow if UOI signal fails
    console.error(`[UOI] Failed to emit workflow signal: ${type}`, error);
  }
}
