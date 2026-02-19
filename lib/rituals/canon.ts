import type { RitualDefinition } from "./types";

export function registerCanonicalRituals(register: (def: RitualDefinition) => void) {
  const rituals: RitualDefinition[] = [
    {
      key: "morning.activation",
      name: "Morning Activation",
      description: "Ignite core sovereigns and announce readiness.",
      steps: [
        { kind: "sovereign.sync", params: { mode: "broadcast-sync", payload: { reason: "morning.activation" } } },
        {
          kind: "broadcast.enqueue",
          params: {
            channel: "internal",
            priority: "low",
            title: "Morning activation",
            body: "Core sovereign ignition invoked. Timeline is live; reflexes are armed.",
            metadata: { ritual: "morning.activation" },
          },
        },
      ],
    },
    {
      key: "nightly.closure",
      name: "Nightly Closure",
      description: "Close the operational day (soft closure; no destructive drains).",
      steps: [
        {
          kind: "broadcast.enqueue",
          params: {
            channel: "internal",
            priority: "low",
            title: "Nightly closure",
            body: "Soft closure invoked. Review queues and observatories before shutdown.",
            metadata: { ritual: "nightly.closure" },
          },
        },
      ],
    },
    {
      key: "system.recovery",
      name: "System Recovery",
      description: "Recovery ceremony triggered when System posture enters error.",
      steps: [
        {
          kind: "broadcast.enqueue",
          params: {
            channel: "slack",
            priority: "high",
            title: "System recovery ritual",
            body: "System entered error posture. Recovery ritual invoked.",
            metadata: { ritual: "system.recovery" },
          },
        },
        { kind: "sovereign.sync", params: { mode: "pulse", payload: { reason: "system.recovery" } } },
      ],
    },
    {
      key: "operator.support",
      name: "Operator Support",
      description: "Support ceremony triggered when HSE posture turns protective.",
      steps: [
        {
          kind: "broadcast.enqueue",
          params: {
            channel: "internal",
            priority: "medium",
            title: "Operator support ritual",
            body: "HSE posture is protective. Consider slowing cadence and reviewing anomalies.",
            metadata: { ritual: "operator.support" },
          },
        },
      ],
    },
    {
      key: "demo.sequence",
      name: "Demo Sequence",
      description: "Deterministic sequence to demonstrate constellation motion.",
      steps: [
        { kind: "sovereign.sync", params: { mode: "pulse", payload: { reason: "demo.sequence" } } },
        {
          kind: "broadcast.enqueue",
          params: {
            channel: "internal",
            priority: "low",
            title: "Demo sequence",
            body: "Demo sequence invoked. Watch /timeline live mode for pulses, reflexes, and interlink events.",
            metadata: { ritual: "demo.sequence" },
          },
        },
        {
          kind: "uoi.directive",
          params: {
            directiveType: "TRIGGER_ALERT",
            target: "operator",
            reason: "Demo sequence directive",
            metadata: { ritual: "demo.sequence", demo: true },
          },
        },
      ],
    },
    {
      key: "system_stabilize",
      name: "System Stabilize",
      description: "Pre-emptive stabilization ceremony (PR-1 / operator invoked).",
      steps: [
        {
          kind: "broadcast.enqueue",
          params: {
            channel: "internal",
            priority: "high",
            title: "System stabilize ritual",
            body: "Stabilization invoked. Review System posture, reduce volatility, and confirm heartbeat trends.",
            metadata: { ritual: "system_stabilize" },
          },
        },
        { kind: "sovereign.sync", params: { mode: "pulse", payload: { reason: "system_stabilize" } } },
      ],
    },
    {
      key: "anomaly_preparation",
      name: "Anomaly Preparation",
      description: "Prepare the constellation for expected anomaly escalation (PR-1).",
      steps: [
        {
          kind: "broadcast.enqueue",
          params: {
            channel: "internal",
            priority: "high",
            title: "Anomaly preparation ritual",
            body: "Prediction indicates escalation risk. Review HSE anomalies and posture, then run stabilizing actions.",
            metadata: { ritual: "anomaly_preparation" },
          },
        },
      ],
    },
  ];

  rituals.forEach(register);
}
