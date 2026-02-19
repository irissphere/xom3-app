// UOI Analytics Signal Emitter
// Unified way for analytics to talk to UOI

import { uoiHeartbeat } from "@/lib/uoi/heartbeat";
import { emitSignal } from "@/lib/uoi/signals";
import { pushHistory } from "@/lib/hse/history-store";

/**
 * Emit an analytics signal to UOI
 * 
 * @param type - Signal type (trend_detected, anomaly, prediction_risk, model_drift, model_error, metric_critical, etc.)
 * @param severity - Severity level (1-10)
 * @param payload - Signal payload data
 */
export function emitAnalyticsSignal(type: string, severity: number, payload: any = {}) {
  try {
    // Store in signal queue (for HSE to read)
    emitSignal({
      source: "analytics",
      type: type as any,
      payload,
      priority: severity >= 7 ? "high" : severity >= 4 ? "medium" : "low"
    });
    
    // Also process via heartbeat (stores in memory)
    uoiHeartbeat({
      source: "analytics",
      type,
      severity,
      payload
    });

    // Push to history store
    const historyValue = type === "model_drift" ? (payload.driftAmount || payload.drift || payload.magnitude || 0) :
                        type === "prediction_risk" ? (payload.risk || severity / 10) :
                        type === "anomaly" || type === "model_error" ? severity / 10 :
                        type === "metric_critical" ? 1 :
                        severity / 10;

    pushHistory({
      timestamp: Date.now(),
      subsystem: "analytics",
      type: type,
      value: historyValue
    });
  } catch (error) {
    // Don't fail analytics if UOI signal fails
    console.error(`[UOI] Failed to emit analytics signal: ${type}`, error);
  }
}
