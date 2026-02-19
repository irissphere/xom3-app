import { publish, subscribe, type SovereignEvent } from "@/lib/sovereigns/event-bus";
import { orchestrationPolicies } from "./cos-brain-policies";
import type { CosBrainPostureSnapshot, CosBrainRoutingContext, OrchestrationPolicy, PolicyCondition } from "./cos-brain-types";
import { getBrainContext, setBrainContext } from "./cos-brain-state";
import { cosScenes } from "@/lib/cos";
import { cosSceneGraphs, startGraph } from "@/lib/cos/graph";
import { getCurrentEpoch } from "@/lib/constellation/epochs";

type GlobalGuard = {
  __xom3_cos_brain_bound__?: boolean;
  __xom3_cos_brain_unsub__?: (() => void) | null;
};

function g(): GlobalGuard {
  return globalThis as any;
}

function cmp(cond: PolicyCondition, actual: any) {
  const v = cond.value;
  switch (cond.comparator) {
    case "truthy":
      return Boolean(actual);
    case "eq":
      return actual === v;
    case "neq":
      return actual !== v;
    case "gt":
      return Number(actual) > Number(v);
    case "gte":
      return Number(actual) >= Number(v);
    case "lt":
      return Number(actual) < Number(v);
    case "lte":
      return Number(actual) <= Number(v);
    case "includes":
      return Array.isArray(actual) ? actual.includes(v) : String(actual || "").includes(String(v));
    default:
      return false;
  }
}

function resolveFeature(posture: CosBrainPostureSnapshot, cond: PolicyCondition) {
  if (cond.source === "epochs" && cond.key === "epochId") return posture.epochId;
  if (cond.source === "operator" && cond.key === "operatorIntent") return posture.operatorIntent;
  if (cond.source === "gtm" && cond.key === "outboundTotal") return posture.outbound.total;
  if (cond.source === "gtm" && cond.key === "outboundQueued") return posture.outbound.queued;
  if (cond.source === "campaigns" && cond.key === "activeCampaignCount") return posture.campaigns.activeCount;
  if (cond.source === "funnels" && cond.key === "conversionRate") return posture.funnels.conversionRate;
  if (cond.source === "rituals" && cond.key === "runningRitualCount") return posture.rituals.runningCount;
  return undefined;
}

function evaluatePolicy(policy: OrchestrationPolicy, posture: CosBrainPostureSnapshot) {
  return policy.conditions.every((c) => cmp(c, resolveFeature(posture, c)));
}

async function snapshotPosture(): Promise<CosBrainPostureSnapshot> {
  const at = Date.now();
  const epoch = getCurrentEpoch().current;

  // Outbound counts (GTM-2.x)
  let outbound = { total: 0, queued: 0, sending: 0, sent: 0, failed: 0 };
  try {
    const { getOutboundQueueCounts } = await import("@/lib/gtm/outbound");
    const c = getOutboundQueueCounts();
    outbound = { total: c.total, queued: c.queued, sending: c.sending, sent: c.sent, failed: c.failed };
  } catch {
    // ignore
  }

  // Campaign posture (GTM-3) - best-effort
  let campaigns = { activeCount: 0 };
  try {
    const { getCampaignSummary } = await import("@/lib/gtm/campaigns");
    const summary = getCampaignSummary();
    campaigns.activeCount = summary.reduce((acc: number, s: any) => acc + (s.activeCount || 0), 0);
  } catch {
    // ignore
  }

  // Funnel posture (GTM-3) - placeholder until funnel lane exposes conversion
  const funnels = { conversionRate: null as number | null };

  // Ritual posture (RAE-1 engine) - best-effort: running rituals = runs with status running
  let rituals = { runningCount: 0 };
  try {
    const { getRitualRuns } = await import("@/lib/rituals/engine");
    rituals.runningCount = getRitualRuns(80).filter((r) => r.status === "running").length;
  } catch {
    // ignore
  }

  // Operator intent (OIA-1) - best-effort
  let operatorIntent: string | null = null;
  try {
    const { getCurrentIntent } = await import("@/lib/operator/intent");
    operatorIntent = getCurrentIntent()?.intent || null;
  } catch {
    operatorIntent = null;
  }

  return { at, epochId: epoch.id, operatorIntent, outbound, campaigns, funnels, rituals };
}

function emitBrainEvaluated(posture: CosBrainPostureSnapshot, activePolicies: CosBrainRoutingContext["activePolicies"]) {
  publish({
    sovereign: "cockpit",
    type: "cos.brain.evaluated",
    severity: "info",
    payload: { posture, activePolicies, at: Date.now() },
    tags: ["cos", "brain"],
  });
}

function emitRoutingApplied(entity: "scene" | "graph", choice: string, candidates: string[], ctx: CosBrainRoutingContext) {
  publish({
    sovereign: "cockpit",
    type: "cos.brain.routing.applied",
    severity: "info",
    payload: { entity, choice, candidates, hints: ctx.routingHints, at: Date.now() },
    tags: ["cos", "brain"],
  });
}

export async function evaluateCosBrain() {
  const posture = await snapshotPosture();

  const base: CosBrainRoutingContext = {
    ...getBrainContext(),
    posture,
    lastEvaluationAt: Date.now(),
    routingHints: {},
    sceneWeights: {},
    graphWeights: {},
    activePolicies: [],
  };

  for (const policy of orchestrationPolicies) {
    const matched = evaluatePolicy(policy, posture);
    base.activePolicies.push({ policyId: policy.id, matched });
    if (!matched) continue;

    for (const a of policy.actions) {
      if (a.kind === "boostScene") base.sceneWeights[a.sceneId] = (base.sceneWeights[a.sceneId] || 0) + a.weightDelta;
      if (a.kind === "suppressScene") base.sceneWeights[a.sceneId] = (base.sceneWeights[a.sceneId] || 0) - Math.abs(a.weightDelta);
      if (a.kind === "boostGraph") base.graphWeights[a.graphId] = (base.graphWeights[a.graphId] || 0) + a.weightDelta;
      if (a.kind === "suppressGraph") base.graphWeights[a.graphId] = (base.graphWeights[a.graphId] || 0) - Math.abs(a.weightDelta);
      if (a.kind === "preferCrew") base.routingHints["preferCrew"] = a.crewId;
      if (a.kind === "setRoutingHint") base.routingHints[a.key] = a.value;
    }
  }

  // Normalize: ensure known ids exist with 0 weight so UI is stable.
  for (const s of cosScenes) if (base.sceneWeights[s.id] === undefined) base.sceneWeights[s.id] = 0;
  for (const g of cosSceneGraphs) if (base.graphWeights[g.id] === undefined) base.graphWeights[g.id] = 0;

  setBrainContext(base);
  emitBrainEvaluated(posture, base.activePolicies);
  return base;
}

export function getSceneRoutingWeights() {
  return getBrainContext().sceneWeights;
}
export function getGraphRoutingWeights() {
  return getBrainContext().graphWeights;
}
export function getRoutingHints() {
  return getBrainContext().routingHints;
}

function chooseByWeight<T extends { id: string }>(candidates: T[], weights: Record<string, number>) {
  let best: T | null = null;
  let bestW = -Infinity;
  for (const c of candidates) {
    const w = weights[c.id] ?? 0;
    if (w > bestW) {
      bestW = w;
      best = c;
    }
  }
  return best || candidates[0] || null;
}

async function onTriggerEvent(event: SovereignEvent) {
  // Candidate graphs for this event
  const candidates = cosSceneGraphs.filter((g) => g.triggers?.some((t) => t.eventType === event.type));
  if (candidates.length === 0) return;

  // Refresh posture at trigger time (fast heuristic)
  const ctx = await evaluateCosBrain();
  const chosen = chooseByWeight(candidates, ctx.graphWeights);
  if (!chosen) return;

  emitRoutingApplied("graph", chosen.id, candidates.map((c) => c.id), ctx);
  await startGraph(chosen.id, { subject: event.payload?.subject, flags: { triggerEvent: event.type } });
}

export function ensureCosBrainBound() {
  const gg = g();
  if (gg.__xom3_cos_brain_bound__) return;
  gg.__xom3_cos_brain_bound__ = true;

  gg.__xom3_cos_brain_unsub__ = subscribe((event) => {
    // Re-evaluate on key signals (lightweight, best-effort)
    if (
      event.type.startsWith("gtm.") ||
      event.type.startsWith("ritual.") ||
      event.type === "constellation.epoch.changed" ||
      event.type.startsWith("operator.")
    ) {
      void evaluateCosBrain().catch(() => {});
    }

    // Adaptive routing: only for known trigger events (graph selection).
    if (event.type === "productCreated" || event.type === "operator.enterDemoMode") {
      void onTriggerEvent(event).catch(() => {});
    }
  });
}
