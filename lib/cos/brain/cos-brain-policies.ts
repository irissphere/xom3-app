import type { OrchestrationPolicy } from "./cos-brain-types";

export const orchestrationPolicies: OrchestrationPolicy[] = [
  {
    id: "high-gtm-posture",
    name: "High GTM Posture Policy",
    description: "When GTM intent is high during GTM epoch, bias toward launch + outbound heavy orchestration.",
    scope: "global",
    conditions: [
      { source: "epochs", key: "epochId", comparator: "eq", value: "gtm" },
      { source: "operator", key: "operatorIntent", comparator: "eq", value: "gtm" },
    ],
    actions: [
      { kind: "boostScene", sceneId: "product-launch", weightDelta: 2.0 },
      { kind: "boostGraph", graphId: "launch-graph", weightDelta: 1.5 },
      { kind: "boostGraph", graphId: "parallel-launch-graph", weightDelta: 1.0 },
      { kind: "setRoutingHint", key: "focus", value: "gtm" },
    ],
  },
  {
    id: "low-conversion",
    name: "Low Conversion Policy",
    description: "When conversion dips, bias optimization scenes and reduce broadcast-only loops.",
    scope: "graph",
    conditions: [{ source: "funnels", key: "conversionRate", comparator: "lt", value: 0.12 }],
    actions: [
      { kind: "boostGraph", graphId: "parallel-launch-graph", weightDelta: 1.0 },
      { kind: "suppressScene", sceneId: "operator-demo", weightDelta: 0.5 },
      { kind: "setRoutingHint", key: "optimization", value: true },
    ],
  },
  {
    id: "operator-demo-focus",
    name: "Operator Demo Focus Policy",
    description: "When operator intent is demo, prioritize demo graph and minimize background GTM.",
    scope: "global",
    conditions: [{ source: "operator", key: "operatorIntent", comparator: "eq", value: "demo" }],
    actions: [
      { kind: "boostScene", sceneId: "operator-demo", weightDelta: 2.0 },
      { kind: "boostGraph", graphId: "operator-graph", weightDelta: 2.5 },
      { kind: "suppressGraph", graphId: "parallel-launch-graph", weightDelta: 1.0 },
      { kind: "setRoutingHint", key: "focus", value: "demo" },
    ],
  },
];
