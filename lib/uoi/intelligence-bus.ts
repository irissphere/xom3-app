// UOI 3: Shared Intelligence Bus
// Single channel for all predictive/adaptive/optimization signals

import { IntelligenceSignal, UnifiedDataModel } from "./types";

/**
 * Publish signal to intelligence bus
 */
export function publishSignal(
  source: string,
  type: IntelligenceSignal["type"],
  payload: any,
  priority: IntelligenceSignal["priority"] = "medium"
): IntelligenceSignal {
  return {
    id: `signal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    source,
    type,
    payload,
    priority,
    timestamp: new Date().toISOString(),
    consumed: false,
    consumedBy: []
  };
}

/**
 * Consume signal from intelligence bus
 */
export function consumeSignal(
  signal: IntelligenceSignal,
  consumer: string
): IntelligenceSignal {
  signal.consumed = true;
  if (!signal.consumedBy.includes(consumer)) {
    signal.consumedBy.push(consumer);
  }
  return signal;
}

/**
 * Route signal to appropriate consumers
 */
export function routeSignal(
  signal: IntelligenceSignal,
  model: UnifiedDataModel
): string[] {
  const consumers: string[] = [];

  switch (signal.type) {
    case "prediction":
      // Route to all domains that can act on predictions
      consumers.push("migration", "workflow", "compliance");
      break;

    case "adaptation":
      // Route to domains that need to adapt
      consumers.push("migration", "workflow");
      break;

    case "optimization":
      // Route to all domains
      consumers.push("migration", "workflow", "compliance", "analytics");
      break;

    case "pattern":
      // Route to domains that can learn from patterns
      consumers.push("migration", "analytics", "compliance");
      break;

    case "anomaly":
      // Route to domains that need to respond
      consumers.push("migration", "compliance", "workflow");
      break;
  }

  return consumers;
}

/**
 * Aggregate signals for cross-domain insights
 */
export function aggregateSignals(
  signals: IntelligenceSignal[]
): {
  predictions: IntelligenceSignal[];
  adaptations: IntelligenceSignal[];
  optimizations: IntelligenceSignal[];
  patterns: IntelligenceSignal[];
  anomalies: IntelligenceSignal[];
} {
  return {
    predictions: signals.filter(s => s.type === "prediction"),
    adaptations: signals.filter(s => s.type === "adaptation"),
    optimizations: signals.filter(s => s.type === "optimization"),
    patterns: signals.filter(s => s.type === "pattern"),
    anomalies: signals.filter(s => s.type === "anomaly")
  };
}
