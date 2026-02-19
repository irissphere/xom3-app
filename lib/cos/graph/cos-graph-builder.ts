import type { SceneGraph } from "./cos-graph-types";

export const cosSceneGraphs: SceneGraph[] = [
  {
    id: "launch-graph",
    name: "Launch Graph",
    description: "Launch scene drives demo branch and stabilization after launch completes.",
    triggers: [{ eventType: "productCreated" }],
    nodes: [
      { nodeId: "N1", sceneId: "product-launch" },
      { nodeId: "N2", sceneId: "operator-demo" },
      { nodeId: "N3", sceneId: "stabilization" },
    ],
    edges: [
      // Branch: if operator enters demo mode at any point after launch begins, run demo in parallel.
      { fromNodeId: "N1", toNodeId: "N2", eventGate: "operator.enterDemoMode" },
      // When launch completes, go to stabilization.
      { fromNodeId: "N1", toNodeId: "N3" },
      // After demo completes, also go to stabilization (idempotent: N3 won’t start twice).
      { fromNodeId: "N2", toNodeId: "N3", eventGate: "cos.scene.completed" },
    ],
    entryNodes: ["N1"],
    exitNodes: ["N3"],
  },
  {
    id: "operator-graph",
    name: "Operator Graph",
    description: "Demo → ritual scene → GTM campaign scene (canonical placeholder).",
    triggers: [{ eventType: "operator.enterDemoMode" }],
    nodes: [
      { nodeId: "N1", sceneId: "operator-demo" },
      // COS-2 subscene wrappers can reference COS-1 scenes; placeholder uses product-launch for now.
      { nodeId: "N2", sceneId: "product-launch", conditions: { flag: "demoRitualActive" } },
      { nodeId: "N3", sceneId: "product-launch", conditions: { flag: "ritualCompleted" } },
    ],
    edges: [
      { fromNodeId: "N1", toNodeId: "N2" },
      { fromNodeId: "N2", toNodeId: "N3", eventGate: "ritual.completed" },
    ],
    entryNodes: ["N1"],
    exitNodes: ["N3"],
  },
  {
    id: "parallel-launch-graph",
    name: "Parallel Launch Graph",
    description: "Launch scene fan-out into parallel optimization and amplification, then rejoin.",
    triggers: [{ eventType: "productCreated" }],
    nodes: [
      { nodeId: "N1", sceneId: "product-launch" },
      { nodeId: "N2", sceneId: "stabilization", parallelGroup: "P1" }, // placeholder: Funnel Optimization Scene
      { nodeId: "N3", sceneId: "operator-demo", parallelGroup: "P1" }, // placeholder: Broadcast Amplification Scene
    ],
    edges: [
      { fromNodeId: "N1", toNodeId: "N2" },
      { fromNodeId: "N1", toNodeId: "N3" },
      // Rejoin: once both P1 nodes complete, run launch scene again (demo canon loop).
      { fromNodeId: "N2", toNodeId: "N1", eventGate: "cos.graph.parallelGroup.completed" },
      { fromNodeId: "N3", toNodeId: "N1", eventGate: "cos.graph.parallelGroup.completed" },
    ],
    entryNodes: ["N1"],
    exitNodes: ["N1"],
  },
  {
    id: "ds-1-activation-graph",
    name: "Awakening of the Director Sovereign (Graph Form)",
    description:
      "COS-2 graph embodiment of the DS-1 activation ritual. Parallel sensory binding + preflight posture checks + convergence into the activation seal.",
    triggers: [{ eventType: "operator.ds1.activate" }],
    nodes: [
      // Invocation (entry)
      { nodeId: "N1", sceneId: "ds-1.activation:invocation" },

      // Branch A — Sensory binding (linear)
      { nodeId: "N2", sceneId: "ds-1.activation:bindEars" },
      { nodeId: "N3", sceneId: "ds-1.activation:seatDirector" },
      { nodeId: "N4", sceneId: "ds-1.activation:lightStaff" },
      { nodeId: "N5", sceneId: "ds-1.activation:bindLoop" },

      // Branch B — Preflight readiness (parallel group P_DS1_PREFLIGHT)
      { nodeId: "P1", sceneId: "ds-1.activation:checkTenant", parallelGroup: "P_DS1_PREFLIGHT" },
      { nodeId: "P2", sceneId: "ds-1.activation:checkGtm", parallelGroup: "P_DS1_PREFLIGHT" },
      { nodeId: "P3", sceneId: "ds-1.activation:checkCrm", parallelGroup: "P_DS1_PREFLIGHT" },
      { nodeId: "P4", sceneId: "ds-1.activation:checkSocial", parallelGroup: "P_DS1_PREFLIGHT" },
      { nodeId: "P5", sceneId: "ds-1.activation:checkCos", parallelGroup: "P_DS1_PREFLIGHT" },

      // Convergence + final ascent
      { nodeId: "N6", sceneId: "ds-1.activation:openEye" },
      { nodeId: "N7", sceneId: "ds-1.activation:declareMandate" },
      { nodeId: "N8", sceneId: "ds-1.activation:activationSeal" },
    ],
    edges: [
      // Invocation fans out: sensory binding begins AND preflight begins in parallel.
      { fromNodeId: "N1", toNodeId: "N2" },
      { fromNodeId: "N1", toNodeId: "P1" },
      { fromNodeId: "N1", toNodeId: "P2" },
      { fromNodeId: "N1", toNodeId: "P3" },
      { fromNodeId: "N1", toNodeId: "P4" },
      { fromNodeId: "N1", toNodeId: "P5" },

      // Branch A linear chain
      { fromNodeId: "N2", toNodeId: "N3" },
      { fromNodeId: "N3", toNodeId: "N4" },
      { fromNodeId: "N4", toNodeId: "N5" },

      // Convergence gate: after the sensory loop node finishes, wait for preflight parallelGroup completion.
      // Note: eventGate is coarse by event type; DS-1 graph instances are protected by fromNodeId gating.
      { fromNodeId: "N5", toNodeId: "N6", eventGate: "cos.graph.parallelGroup.completed" },

      // Final ascent
      { fromNodeId: "N6", toNodeId: "N7" },
      { fromNodeId: "N7", toNodeId: "N8" },
    ],
    entryNodes: ["N1"],
    exitNodes: ["N8"],
  },
];

export function getSceneGraph(id: string) {
  return cosSceneGraphs.find((g) => g.id === id) || null;
}
