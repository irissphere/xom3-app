import type { CosScene } from "./cos-types";

const HOUR = 60 * 60 * 1000;

export const cosScenes: CosScene[] = [
  {
    id: "product-launch",
    name: "Product Launch Scene",
    description: "Ritual → campaign → outbound → HUD posture → reminder.",
    crewId: "launch",
    triggers: [{ eventType: "productCreated" }],
    steps: [
      { stepId: "ritual", type: "startRitual", params: { ritualKey: "product_launch_ritual" } },
      { stepId: "campaign", type: "startCampaign", params: { campaignId: "launch" } },
      {
        stepId: "announce",
        type: "enqueueOutbound",
        params: { platforms: ["twitter", "linkedin"], text: "[COS] Product launch announcement", persona: "broadcast", cloneVoice: "operator_plain", scheduleMode: "sendNow" },
      },
      { stepId: "hud", type: "setHudState", params: { state: "launchMode" } },
      { stepId: "wait", type: "waitForDuration", params: { durationMs: 72 * HOUR } },
      {
        stepId: "reminder",
        type: "enqueueOutbound",
        params: { platforms: ["twitter", "linkedin"], text: "[COS] Product launch reminder", persona: "broadcast", cloneVoice: "operator_plain", scheduleMode: "sendNow" },
      },
      { stepId: "seal", type: "emitSignal", params: { type: "cos.scene.completed", payload: { scene: "product-launch" } } },
    ],
  },
  {
    id: "operator-demo",
    name: "Operator Demo Scene",
    description: "HUD demo posture → ritual ignition → signal seal.",
    crewId: "demo",
    triggers: [{ eventType: "operator.enterDemoMode" }],
    steps: [
      { stepId: "hud", type: "setHudState", params: { state: "demoMode" } },
      { stepId: "ritual", type: "startRitual", params: { ritualKey: "demo_ritual" } },
      { stepId: "seal", type: "emitSignal", params: { type: "cos.demo.started", payload: { scene: "operator-demo" } } },
    ],
  },
  {
    id: "stabilization",
    name: "Stabilization Scene",
    description: "Request Stabilization epoch → calm HUD posture → signal seal.",
    crewId: "stabilization",
    triggers: [{ eventType: "system.lowActivity" }],
    steps: [
      { stepId: "epoch", type: "setEpoch", params: { epochId: "stabilization" } },
      { stepId: "hud", type: "setHudState", params: { state: "calm" } },
      { stepId: "seal", type: "emitSignal", params: { type: "cos.stabilization.started", payload: { scene: "stabilization" } } },
    ],
  },
  // ============================================================
  // DS-1 — Director Sovereign (Activation Scenes)
  // ============================================================
  {
    id: "ds-1.activation:invocation",
    name: "DS-1 Invocation",
    description: "The Operator calls DS‑1 into awareness.",
    crewId: "demo",
    triggers: [],
    steps: [
      {
        stepId: "director.invocation.started",
        type: "emitSignal",
        params: { type: "director.invocation.started", payload: { scene: "ds-1.activation:invocation" } },
      },
      {
        stepId: "hud",
        type: "setHudState",
        params: { state: "directorInvocation" },
      },
    ],
  },
  {
    id: "ds-1.activation:bindEars",
    name: "DS-1 Bind the Ears",
    description: "DS‑1 binds to the constellation’s sensory field.",
    crewId: "demo",
    triggers: [],
    steps: [
      { stepId: "director.binding.sensory", type: "emitSignal", params: { type: "director.binding.sensory", payload: { sources: ["intakecrm", "gtm.outbound", "gtm.campaigns", "social", "revenue-loop", "cos", "rituals"] } } },
    ],
  },
  {
    id: "ds-1.activation:seatDirector",
    name: "DS-1 Seat the Director",
    description: "DS‑1 claims its throne above the lanes.",
    crewId: "demo",
    triggers: [],
    steps: [
      { stepId: "director.seated", type: "emitSignal", params: { type: "director.seated", payload: { state: "initialized" } } },
    ],
  },
  {
    id: "ds-1.activation:lightStaff",
    name: "DS-1 Light the Conductor’s Staff",
    description: "DS‑1 gains the ability to direct cross‑lane action.",
    crewId: "demo",
    triggers: [],
    steps: [
      {
        stepId: "director.actions.enabled",
        type: "emitSignal",
        params: {
          type: "director.actions.enabled",
          payload: {
            executors: [
              "start_campaign",
              "enqueue_outbound",
              "enqueue_social",
              "update_lead_posture",
              "append_crm_timeline",
              "start_ritual",
              "start_scene",
              "start_graph",
              "emit_signal",
            ],
          },
        },
      },
    ],
  },
  {
    id: "ds-1.activation:bindLoop",
    name: "DS-1 Bind the Feedback Loop",
    description: "DS‑1 binds the GTM ↔ CRM ↔ Social cycle.",
    crewId: "demo",
    triggers: [],
    steps: [
      {
        stepId: "director.loop.bound",
        type: "emitSignal",
        params: {
          type: "director.loop.bound",
          payload: { triggerGroups: ["crm_to_gtm", "crm_to_social", "gtm_to_crm", "social_to_crm", "revenue_to_gtm", "crm_to_cos"] },
        },
      },
    ],
  },
  {
    id: "ds-1.activation:openEye",
    name: "DS-1 Open the Director’s Eye",
    description: "DS‑1 perceives posture, momentum, and readiness.",
    crewId: "demo",
    triggers: [],
    steps: [
      { stepId: "director.eye.opened", type: "emitSignal", params: { type: "director.eye.opened", payload: { postureTargets: ["tenant", "gtm", "crm", "social", "cos", "epoch"] } } },
    ],
  },
  {
    id: "ds-1.activation:declareMandate",
    name: "DS-1 Declare the Mandate",
    description: "The Operator grants DS‑1 its sovereign purpose.",
    crewId: "demo",
    triggers: [],
    steps: [
      {
        stepId: "director.mandate.sealed",
        type: "emitSignal",
        params: {
          type: "director.mandate.sealed",
          payload: { mandate: ["hear_all_signals", "guide_motion", "unify_lanes", "amplify_momentum", "protect_operator_intent"] },
        },
      },
    ],
  },
  {
    id: "ds-1.activation:activationSeal",
    name: "DS-1 Activation Seal",
    description: "The ritual completes. DS‑1 awakens fully.",
    crewId: "demo",
    triggers: [],
    steps: [
      { stepId: "director.activated", type: "emitSignal", params: { type: "director.activated", payload: { phrase: "DS‑1 is awake. The cockpit now moves as one." } } },
    ],
  },
  // Preflight scenes (graph branch)
  {
    id: "ds-1.activation:checkTenant",
    name: "DS-1 Preflight — Tenant",
    description: "Preflight: tenant posture check (symbolic; no destructive reads).",
    crewId: "demo",
    triggers: [],
    steps: [{ stepId: "director.preflight.tenant", type: "emitSignal", params: { type: "director.preflight.tenant", payload: { ok: true } } }],
  },
  {
    id: "ds-1.activation:checkGtm",
    name: "DS-1 Preflight — GTM",
    description: "Preflight: GTM posture check (symbolic; no destructive reads).",
    crewId: "demo",
    triggers: [],
    steps: [{ stepId: "director.preflight.gtm", type: "emitSignal", params: { type: "director.preflight.gtm", payload: { ok: true } } }],
  },
  {
    id: "ds-1.activation:checkCrm",
    name: "DS-1 Preflight — CRM",
    description: "Preflight: CRM posture check (symbolic; no destructive reads).",
    crewId: "demo",
    triggers: [],
    steps: [{ stepId: "director.preflight.crm", type: "emitSignal", params: { type: "director.preflight.crm", payload: { ok: true } } }],
  },
  {
    id: "ds-1.activation:checkSocial",
    name: "DS-1 Preflight — Social",
    description: "Preflight: Social posture check (symbolic; no destructive reads).",
    crewId: "demo",
    triggers: [],
    steps: [{ stepId: "director.preflight.social", type: "emitSignal", params: { type: "director.preflight.social", payload: { ok: true } } }],
  },
  {
    id: "ds-1.activation:checkCos",
    name: "DS-1 Preflight — COS",
    description: "Preflight: COS posture check (symbolic; no destructive reads).",
    crewId: "demo",
    triggers: [],
    steps: [{ stepId: "director.preflight.cos", type: "emitSignal", params: { type: "director.preflight.cos", payload: { ok: true } } }],
  },
];

export function getScene(id: string) {
  return cosScenes.find((s) => s.id === id) || null;
}
