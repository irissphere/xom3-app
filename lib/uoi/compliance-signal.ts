// UOI Compliance Signal Emitter
// Unified way for compliance to talk to UOI

import { uoiHeartbeat } from "@/lib/uoi/heartbeat";
import { emitSignal } from "@/lib/uoi/signals";
import { pushHistory } from "@/lib/hse/history-store";

/**
 * Emit a compliance signal to UOI
 * 
 * @param type - Signal type (compliance_check, compliance_violation, compliance_resolved, etc.)
 * @param severity - Severity level (1-10)
 * @param payload - Signal payload data
 */
export function emitComplianceSignal(type: string, severity: number, payload: any = {}) {
  try {
    // Store in signal queue (for HSE to read)
    emitSignal({
      source: "compliance",
      type: type as any,
      payload,
      priority: severity >= 7 ? "high" : severity >= 4 ? "medium" : "low"
    });
    
    // Also process via heartbeat (stores in memory)
    uoiHeartbeat({
      source: "compliance",
      type,
      severity,
      payload
    });

    // Push to history store
    const historyValue = type === "rule_violation" ? 1 :
                        type === "compliance_error" ? severity / 10 :
                        type === "rule_pass" ? 0 :
                        severity / 10;

    pushHistory({
      timestamp: Date.now(),
      subsystem: "compliance",
      type: type,
      value: historyValue
    });
  } catch (error) {
    // Don't fail compliance if UOI signal fails
    console.error(`[UOI] Failed to emit compliance signal: ${type}`, error);
  }
}
