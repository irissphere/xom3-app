import { enqueueOutboundItem } from "@/lib/gtm/outbound";
import { ensureGtmCampaignsBound, getGtmCampaignById, ingestCampaignEntry } from "@/lib/gtm/campaigns";
import { createPost } from "@/lib/social/store";
import { emitPostCreated, emitPostScheduled } from "@/lib/social/signals";
import { updateLead, appendTimelineEvent } from "@/lib/intakecrm/store/intakecrm-store";
import { triggerRitual } from "@/lib/rituals/engine";
import { startScene } from "@/lib/cos";
import { startGraph } from "@/lib/cos/graph";
import type { OrchestrationAction, OrchestrationEvent } from "../orchestration-types";
import { renderOrchestrationTemplate } from "./orchestration-templates";
import { emitOrchestrationSignal } from "./orchestration-signals";

function safeString(v: any): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function resolveLeadId(evt: OrchestrationEvent) {
  return safeString(evt.payload?.leadId || evt.payload?.subject?.id || "");
}

function resolveTaskId(evt: OrchestrationEvent) {
  return safeString(evt.payload?.taskId || "");
}

function asTenantCarrier(tenantId: string) {
  return `orchestration:${tenantId}`;
}

function asCampaignSubjectId(tenantId: string, leadId?: string) {
  const base = leadId && leadId.trim().length ? leadId.trim() : "generic";
  return `${tenantId}:${base}`;
}

function mapToCampaignEntry(evt: OrchestrationEvent): { eventType: any; source: any } {
  // Minimal mapping; campaign engine accepts any string unions but runtime is string-based.
  if (evt.eventType === "intakecrm.lead.created") return { eventType: "contactCreated", source: "leadGen" };
  if (evt.eventType === "revenue.loop.triggered") return { eventType: "formSubmitted", source: "generic" };
  return { eventType: "formSubmitted", source: "generic" };
}

export async function executeOrchestrationAction(action: OrchestrationAction, evt: OrchestrationEvent) {
  const tenantId = evt.tenantId;
  const leadId = resolveLeadId(evt) || undefined;
  const taskId = resolveTaskId(evt) || undefined;

  if (action.type === "emit_signal") {
    emitOrchestrationSignal({
      tenantId,
      type: action.signalType,
      priority: "low",
      payload: { triggerEventType: evt.eventType, leadId, taskId },
    });
    return { ok: true, output: { emitted: action.signalType } };
  }

  if (action.type === "start_campaign") {
    ensureGtmCampaignsBound();
    const campaign = getGtmCampaignById(action.campaignId);
    if (!campaign) return { ok: false, error: "campaign_not_found" };
    const entry = mapToCampaignEntry(evt);
    const subjectType = leadId ? "contact" : "generic";
    const subjectId = asCampaignSubjectId(tenantId, leadId);
    const res = ingestCampaignEntry({
      eventType: entry.eventType,
      source: entry.source,
      subjectType,
      subjectId,
      at: Date.now(),
      payload: { tenantId, triggerEventType: evt.eventType, leadId, taskId },
    } as any);
    return { ok: true, output: { campaignId: action.campaignId, startedCount: res.startedCount, subjectId } };
  }

  if (action.type === "enqueue_outbound") {
    const text = renderOrchestrationTemplate(action.templateId, { tenantId, leadId, taskId, eventType: evt.eventType });
    const enq = enqueueOutboundItem({
      platforms: ["linkedin", "twitter"],
      content: { text, mediaRef: null },
      persona: "broadcast",
      cloneVoice: "operator_plain",
      intent: asTenantCarrier(tenantId),
      scheduleMode: "sendNow",
    } as any);
    return { ok: true, output: { count: enq.count, itemIds: enq.items.map((i) => i.id) } };
  }

  if (action.type === "enqueue_social") {
    const platform = safeString(action.platform) || "twitter";
    const content = renderOrchestrationTemplate(action.templateId, { tenantId, leadId, taskId, eventType: evt.eventType });
    const scheduledAt = new Date().toISOString();
    const post = createPost({
      platform: platform as any,
      content,
      status: "scheduled",
      scheduledAt,
      clientId: tenantId,
      clientName: tenantId,
      campaignId: `orchestration:${evt.eventType}`,
      createdBy: "orchestration",
    });
    emitPostCreated(post);
    emitPostScheduled(post);
    return { ok: true, output: { postId: post.id, platform, scheduledAt } };
  }

  if (action.type === "update_lead_posture") {
    if (!leadId) return { ok: false, error: "leadId_required" };
    const updated = updateLead(tenantId, leadId, { posture: safeString(action.posture) } as any);
    if (!updated) return { ok: false, error: "lead_not_found" };
    return { ok: true, output: { leadId, posture: updated.posture } };
  }

  if (action.type === "append_crm_timeline") {
    if (!leadId) return { ok: false, error: "leadId_required" };
    const evtType = safeString(action.timelineType) || "orchestration.event";
    const event = await appendTimelineEvent(tenantId, leadId, {
      type: evtType,
      payload: { source: evt.source, orchestrationEventType: evt.eventType, ...evt.payload },
    });
    if (!event) return { ok: false, error: "lead_not_found" };
    return { ok: true, output: { leadId, eventId: event.eventId, type: event.type } };
  }

  if (action.type === "start_ritual") {
    const run = await triggerRitual(action.ritualId, { source: { type: "operator" } });
    return { ok: true, output: { ritualId: action.ritualId, runId: run.id, status: run.status } };
  }

  if (action.type === "start_scene") {
    const scene = await startScene(action.sceneId, { sourceEvent: { type: evt.eventType, payload: { ...evt.payload, subject: { type: "lead", id: asCampaignSubjectId(tenantId, leadId) } } } });
    return { ok: true, output: { sceneId: action.sceneId, instanceId: scene.instanceId, status: scene.status } };
  }

  if (action.type === "start_graph") {
    const inst = await startGraph(action.graphId, { subject: { type: "lead", id: asCampaignSubjectId(tenantId, leadId) }, flags: { triggerEventType: evt.eventType } });
    return { ok: true, output: { graphId: action.graphId, instanceId: inst.instanceId, status: inst.status } };
  }

  return { ok: false, error: "unsupported_action" };
}
