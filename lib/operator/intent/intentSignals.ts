import type { IntentSignal, OperatorIntent } from "./types";

export function signal(type: OperatorIntent, weight: number, source?: string): IntentSignal {
  return { type, weight, source };
}

export const IntentSignals = {
  navigation: (weight = 2, source = "navigation") => signal("navigation", weight, source),
  analysis: (weight = 2, source = "analysis") => signal("analysis", weight, source),
  ritual: (weight = 4, source = "ritual") => signal("ritual", weight, source),
  debug: (weight = 3, source = "debug") => signal("debug", weight, source),
  demo: (weight = 2, source = "demo") => signal("demo", weight, source),
  gtm: (weight = 3, source = "gtm") => signal("gtm", weight, source),
  build: (weight = 2, source = "build") => signal("build", weight, source),
  idle: (weight = 1, source = "idle") => signal("idle", weight, source),
};
