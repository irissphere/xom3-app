import { onSignal, getPendingSignals } from "@/lib/uoi/signals";
import { subscribe, getSovereignEventHistory, type SovereignEvent } from "@/lib/sovereigns/event-bus";
import { getOutboundItem } from "@/lib/gtm/outbound/outboundLedger";
import type { OrchestrationEvent, OrchestrationTriggerSource } from "./orchestration-types";
import { listOrchestrationTriggers } from "./state/orchestration-triggers-store";
import { conditionsPass } from "./actions/orchestration-conditions";
import { executeOrchestrationAction } from "./actions/orchestration-actions";
import { createOrchestrationInstance, patchOrchestrationAction, completeOrchestrationInstance, failOrchestrationInstance } from "./state/orchestration-state";
import { emitOrchestrationSignal } from "./actions/orchestration-signals";

type GlobalGuard = {
  __xom3_orchestration_bound__?: boolean;
  __xom3_orchestration_unsub_uoi__?: (() => void) | null;
  __xom3_orchestration_unsub_bus__?: (() => void) | null;
  __xom3_orchestration_seen__?: Set<string>;
};

function g(): GlobalGuard {
  const gg = globalThis as any;
  gg.__xom3_orchestration_seen__ = gg.__xom3_orchestration_seen__ || new Set<string>();
  return gg as any;
}

function safeString(v: any): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function tenantFromIntent(intent: string | undefined | null) {
  const s = safeString(intent);
  if (!s) return null;
  if (s.startsWith("orchestration:")) return s.slice("orchestration:".length) || null;
  if (s.startsWith("tenant:")) return s.slice("tenant:".length) || null;
  return null;
}

function normalizeUoiSignal(signal: any): OrchestrationEvent | null {
  const rawType = safeString(signal?.type);
  const rawSource = safeString(signal?.source);
  const payload = signal?.payload || {};

  // Social lane emits generic UOI types and includes signalType inside payload.
  if (rawSource === "social-lane") {
    const st = safeString(payload?.signalType);
    const tenantId = safeString(payload?.clientId || payload?.tenantId || payload?.tenant || "");
    if (!tenantId) return null;

    if (st === "post_published") {
      return { tenantId, source: "social", eventType: "social.post.sent", timestamp: safeString(signal?.timestamp) || new Date().toISOString(), payload, raw: signal };
    }
    return null;
  }

  const tenantId = safeString(payload?.tenantId || payload?.tenant || "");
  if (!tenantId) return null;

  if (rawType.startsWith("intakecrm.")) return { tenantId, source: "crm", eventType: rawType, timestamp: safeString(signal?.timestamp) || new Date().toISOString(), payload, raw: signal };
  if (rawType.startsWith("revenue.loop.")) return { tenantId, source: "revenue-loop", eventType: rawType, timestamp: safeString(signal?.timestamp) || new Date().toISOString(), payload, raw: signal };
  if (rawType.startsWith("orchestration.")) return { tenantId, source: "gtm", eventType: rawType, timestamp: safeString(signal?.timestamp) || new Date().toISOString(), payload, raw: signal };

  return null;
}

function inferTenantFromOutboundEvent(event: SovereignEvent) {
  const itemId = safeString(event.payload?.itemId || "");
  if (!itemId) return null;
  const item = getOutboundItem(itemId);
  if (!item) return null;
  return tenantFromIntent(item.intent);
}

function normalizeSovereignEvent(event: SovereignEvent): OrchestrationEvent | null {
  const type = safeString(event?.type);
  const payload = event?.payload || {};

  if (type.startsWith("gtm.outbound.")) {
    const tenantId = safeString(payload?.tenantId || inferTenantFromOutboundEvent(event) || "");
    if (!tenantId) return null;
    return { tenantId, source: "gtm", eventType: type, timestamp: safeString(event?.timestamp) || new Date().toISOString(), payload, raw: event };
  }

  if (type.startsWith("gtm.campaign.")) {
    // Campaign events do not carry tenantId; infer from subjectId if it uses tenant carrier (tenant:leadId).
    const subjectId = safeString(payload?.subjectId || "");
    const tenantId = subjectId.includes(":") ? subjectId.split(":")[0] : "";
    if (!tenantId) return null;
    return { tenantId, source: "gtm", eventType: type, timestamp: safeString(event?.timestamp) || new Date().toISOString(), payload, raw: event };
  }

  return null;
}

function seenKey(input: { kind: "uoi" | "bus"; id: string }) {
  return `${input.kind}:${input.id}`;
}

async function processEvent(evt: OrchestrationEvent) {
  const triggers = listOrchestrationTriggers(evt.tenantId).filter((t) => t.enabled && t.eventType === evt.eventType);
  if (triggers.length === 0) return;

  for (const trig of triggers) {
    if (!conditionsPass(trig.conditions, evt)) continue;

    const inst = createOrchestrationInstance({
      triggerId: trig.triggerId,
      tenantId: evt.tenantId,
      eventType: evt.eventType,
      actionTypes: trig.actions.map((a) => a.type),
    });

    emitOrchestrationSignal({
      tenantId: evt.tenantId,
      type: "orchestration.triggered",
      priority: "low",
      payload: { instanceId: inst.instanceId, triggerId: trig.triggerId, eventType: evt.eventType, source: evt.source },
    });

    try {
      for (let i = 0; i < trig.actions.length; i += 1) {
        const action = trig.actions[i]!;
        const actionState = inst.actions[i]!;
        const res = await executeOrchestrationAction(action, evt);
        if (!res.ok) {
          patchOrchestrationAction({ instanceId: inst.instanceId, actionId: actionState.actionId, status: "failed", error: res.error });
          emitOrchestrationSignal({
            tenantId: evt.tenantId,
            type: "orchestration.error",
            priority: "high",
            payload: { instanceId: inst.instanceId, triggerId: trig.triggerId, eventType: evt.eventType, actionType: action.type, error: res.error },
          });
          failOrchestrationInstance(inst.instanceId, res.error);
          throw new Error(res.error);
        }

        patchOrchestrationAction({ instanceId: inst.instanceId, actionId: actionState.actionId, status: "completed", output: res.output });
        emitOrchestrationSignal({
          tenantId: evt.tenantId,
          type: "orchestration.action.completed",
          priority: "low",
          payload: { instanceId: inst.instanceId, triggerId: trig.triggerId, actionType: action.type },
        });
      }

      completeOrchestrationInstance(inst.instanceId);
    } catch {
      // instance already marked failed
    }
  }
}

function ingestUoi(signal: any) {
  const id = safeString(signal?.id || "");
  if (!id) return;
  const gg = g();
  const key = seenKey({ kind: "uoi", id });
  if (gg.__xom3_orchestration_seen__!.has(key)) return;
  gg.__xom3_orchestration_seen__!.add(key);

  const evt = normalizeUoiSignal(signal);
  if (!evt) return;
  void processEvent(evt).catch(() => {});
}

function ingestBus(event: SovereignEvent) {
  const id = safeString(event?.id || "");
  if (!id) return;
  const gg = g();
  const key = seenKey({ kind: "bus", id });
  if (gg.__xom3_orchestration_seen__!.has(key)) return;
  gg.__xom3_orchestration_seen__!.add(key);

  const evt = normalizeSovereignEvent(event);
  if (!evt) return;
  void processEvent(evt).catch(() => {});
}

export function ensureOrchestrationBound() {
  const gg = g();
  if (gg.__xom3_orchestration_bound__) return;
  gg.__xom3_orchestration_bound__ = true;

  // Backfill UOI pending signals (best-effort)
  try {
    for (const s of getPendingSignals()) ingestUoi(s as any);
  } catch {
    // ignore
  }

  // Backfill event-bus history (best-effort)
  try {
    for (const e of getSovereignEventHistory(200)) ingestBus(e);
  } catch {
    // ignore
  }

  gg.__xom3_orchestration_unsub_uoi__ = onSignal((signal) => ingestUoi(signal as any));
  gg.__xom3_orchestration_unsub_bus__ = subscribe((event) => ingestBus(event));
}

export function getOrchestrationStatus() {
  const gg = g();
  return { bound: Boolean(gg.__xom3_orchestration_bound__) };
}
