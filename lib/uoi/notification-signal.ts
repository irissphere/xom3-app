// UOI Notification Signal Emitter
// Unified way for notifications to talk to UOI

import { uoiHeartbeat } from "@/lib/uoi/heartbeat";
import { emitSignal } from "@/lib/uoi/signals";
import { pushHistory } from "@/lib/hse/history-store";

/**
 * Emit a notification signal to UOI
 * 
 * @param type - Signal type (sent, failed, retry, alert_storm, suppressed, escalated, etc.)
 * @param severity - Severity level (1-10)
 * @param payload - Signal payload data
 */
export function emitNotificationSignal(type: string, severity: number, payload: any = {}) {
  try {
    // Store in signal queue (for HSE to read)
    emitSignal({
      source: "notification",
      type: type as any,
      payload,
      priority: severity >= 7 ? "high" : severity >= 4 ? "medium" : "low"
    });
    
    // Also process via heartbeat (stores in memory)
    uoiHeartbeat({
      source: "notification",
      type,
      severity,
      payload
    });

    // Push to history store
    const historyValue = type === "failed" ? 1 :
                        type === "alert_storm" ? severity / 10 :
                        type === "sent" ? 0 :
                        severity / 10;

    pushHistory({
      timestamp: Date.now(),
      subsystem: "notifications",
      type: type,
      value: historyValue
    });
  } catch (error) {
    // Don't fail notification if UOI signal fails
    console.error(`[UOI] Failed to emit notification signal: ${type}`, error);
  }
}
