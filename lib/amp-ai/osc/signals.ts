// 🌌 STRIKE 7: Replace Notifications With Signals
// Vibrations in the continuum instead of messages

import { Signal } from "./types";

/**
 * Create signal in continuum
 */
export function createSignal(
  type: Signal["type"],
  source: string,
  target: string | "field",
  payload: any,
  frequency: number = 1.0,
  amplitude: number = 1.0
): Signal {
  return {
    id: `signal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    frequency,
    amplitude,
    source,
    target,
    payload,
    propagation: {
      velocity: 1.0,
      attenuation: 0.1 // Signal strength decreases over distance
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * Propagate signal through continuum
 */
export function propagateSignal(signal: Signal, distance: number): Signal {
  // Signal amplitude decreases with distance
  signal.amplitude = Math.max(0, signal.amplitude - (signal.propagation.attenuation * distance));
  return signal;
}

/**
 * Detect signal at target
 */
export function detectSignal(signal: Signal, target: string): boolean {
  if (signal.target === "field" || signal.target === target) {
    return signal.amplitude > 0.1; // Minimum amplitude to detect
  }
  return false;
}

/**
 * Create alert signal
 */
export function createAlertSignal(
  source: string,
  message: string,
  severity: "low" | "medium" | "high" | "critical"
): Signal {
  const amplitude = severity === "critical" ? 1.0 :
                   severity === "high" ? 0.8 :
                   severity === "medium" ? 0.6 : 0.4;

  return createSignal(
    "alert",
    source,
    "field",
    { message, severity },
    2.0, // Higher frequency for alerts
    amplitude
  );
}

/**
 * Create prediction signal
 */
export function createPredictionSignal(
  source: string,
  prediction: any
): Signal {
  return createSignal(
    "predict",
    source,
    "field",
    { prediction },
    0.5, // Lower frequency for predictions
    0.7
  );
}

/**
 * Create harmonization signal
 */
export function createHarmonizationSignal(
  source: string,
  harmonization: any
): Signal {
  return createSignal(
    "harmonize",
    source,
    "field",
    { harmonization },
    1.0,
    0.9
  );
}
