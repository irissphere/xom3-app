import type { PredictiveReflex } from "./types";

export const predictiveReflexes: PredictiveReflex[] = [
  {
    id: "pr1-system-degradation",
    source: "system",
    description: "If system risk > 0.7, run stabilization ritual",
    condition: (signal) => signal.risk > 0.7,
    action: "ritual:system_stabilize",
  },
  {
    id: "pr2-hse-anomaly-risk",
    source: "hse",
    description: "If HSE predicts anomaly escalation, run anomaly-prep ritual",
    condition: (signal) => signal.predictedState === "error",
    action: "ritual:anomaly_preparation",
  },
];
