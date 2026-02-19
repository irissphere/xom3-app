// HSE Signals - Emit state signals to UOI

import { GlobalState, StateShift } from "./types";
import { getGlobalState } from "./state";

export type HSEStateSignal = 
  | { type: "state_update"; payload: { state: GlobalState; changes: string[] } }
  | { type: "state_anomaly"; payload: { anomaly: any; severity: string; affectedAreas: string[] } }
  | { type: "state_shift"; payload: StateShift }
  | { type: "state_risk"; payload: { risk: number; level: string; recommendations: string[] } }
  | { type: "state_recovery"; payload: { recovery: any; duration: number; metrics: object } };

const signalHandlers: Map<string, (signal: HSEStateSignal) => void> = new Map();

/**
 * Emit state signal to UOI
 */
export function emitStateSignal(signal: HSEStateSignal): void {
  signalHandlers.forEach(handler => {
    try {
      handler(signal);
    } catch (error) {
      console.error("[HSE] Error in signal handler:", error);
    }
  });
}

/**
 * Register signal handler
 */
export function onStateSignal(handler: (signal: HSEStateSignal) => void): () => void {
  const id = Math.random().toString(36).substr(2, 9);
  signalHandlers.set(id, handler);
  
  return () => {
    signalHandlers.delete(id);
  };
}

/**
 * Emit state update signal
 */
export function emitStateUpdate(changes: string[]): void {
  const state = getGlobalState();
  if (state) {
    emitStateSignal({
      type: "state_update",
      payload: {
        state,
        changes,
      },
    });
  }
}

/**
 * Emit state anomaly signal
 */
export function emitStateAnomaly(anomaly: any, severity: string, affectedAreas: string[]): void {
  emitStateSignal({
    type: "state_anomaly",
    payload: {
      anomaly,
      severity,
      affectedAreas,
    },
  });
}

/**
 * Emit state shift signal
 */
export function emitStateShift(shift: StateShift): void {
  emitStateSignal({
    type: "state_shift",
    payload: shift,
  });
}

/**
 * Emit state risk signal
 */
export function emitStateRisk(risk: number, level: string, recommendations: string[]): void {
  emitStateSignal({
    type: "state_risk",
    payload: {
      risk,
      level,
      recommendations,
    },
  });
}

/**
 * Emit state recovery signal
 */
export function emitStateRecovery(recovery: any, duration: number, metrics: object): void {
  emitStateSignal({
    type: "state_recovery",
    payload: {
      recovery,
      duration,
      metrics,
    },
  });
}
