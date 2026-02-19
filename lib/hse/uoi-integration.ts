// HSE ↔ UOI Feedback Loop Integration
// This module connects HSE state signals to UOI and vice versa

import { emitSignal } from "@/lib/uoi/signals";
import { emitStateSignal, emitStateUpdate, emitStateAnomaly } from "./signals";
import { queryState, queryAnomalies } from "./query";
import { getGlobalState } from "./state";
import { UOISignal } from "@/lib/uoi/contract";

/**
 * Send HSE state updates to UOI
 */
export function sendHSEStateToUOI(): void {
  const state = getGlobalState();
  if (!state) return;

  // Send subsystem health signals to UOI
  Object.entries(state.subsystems).forEach(([name, health]) => {
    if (health.errors > 0) {
      emitSignal({
        source: `hse-${name}`,
        type: "error",
        payload: {
          subsystem: name,
          errors: health.errors,
          successRate: health.successRate,
        },
        priority: health.errors > 10 ? "high" : "medium",
      });
    }

    if (health.load > 0.8) {
      emitSignal({
        source: `hse-${name}`,
        type: "capacity",
        payload: {
          subsystem: name,
          load: health.load,
        },
        priority: health.load > 0.9 ? "high" : "medium",
      });
    }

    if (health.drift > 0.1) {
      emitSignal({
        source: `hse-${name}`,
        type: "drift",
        payload: {
          subsystem: name,
          drift: health.drift,
        },
        priority: health.drift > 0.3 ? "high" : "medium",
      });
    }
  });

  // Send risk vector signals
  if (state.vectors.risk.aggregate_risk > 0.5) {
    emitSignal({
      source: "hse-global",
      type: "risk",
      payload: {
        risk: state.vectors.risk.aggregate_risk,
        level: state.vectors.risk.aggregate_risk > 0.7 ? "critical" : "high",
      },
      priority: state.vectors.risk.aggregate_risk > 0.7 ? "critical" : "high",
    });
  }

  // Send anomaly signals
  const anomalies = queryAnomalies();
  anomalies.forEach(anomaly => {
    if (anomaly.severity === "critical" || anomaly.severity === "high") {
      emitSignal({
        source: "hse-anomaly-detector",
        type: "anomaly",
        payload: {
          anomaly: anomaly.id,
          severity: anomaly.severity,
          affectedAreas: anomaly.affectedAreas,
        },
        priority: anomaly.severity === "critical" ? "critical" : "high",
      });
    }
  });
}

/**
 * Receive UOI directives and update HSE state
 */
export function receiveUOIDirective(directive: { target: string; action: string; reason?: string }): void {
  // Emit state update signal
  emitStateUpdate([`uoi_directive_${directive.action}_${directive.target}`]);

  // If directive affects a subsystem, update HSE state accordingly
  const state = getGlobalState();
  if (!state) return;

  // Update subsystem state based on directive
  const target = directive.target.toLowerCase();
  if (state.subsystems[target as keyof typeof state.subsystems]) {
    // State will be updated by the directive handler
    emitStateSignal({
      type: "state_update",
      payload: {
        state,
        changes: [`directive_${directive.action}_applied_to_${target}`],
      },
    });
  }
}

/**
 * Initialize HSE ↔ UOI feedback loop
 */
export function initializeHSEUOILoop(): void {
  // Set up periodic HSE → UOI signal emission
  setInterval(() => {
    sendHSEStateToUOI();
  }, 5000); // Every 5 seconds

  // Register UOI signal handler for HSE updates
  // This would be called from UOI when it processes signals
}
