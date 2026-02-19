import { subscribe, type SovereignEvent } from "@/lib/sovereigns/event-bus";
import { enqueueOutboundItem } from "@/lib/gtm/outbound";
import { gtmCampaigns } from "./gtm-campaign-registry";
import type { GtmCampaign, GtmCampaignEntryEvent, GtmCampaignInstance } from "./gtm-campaign-types";
import { createCampaignInstance, findCampaignStepByOutboundItemId, updateCampaignInstance } from "./gtm-campaign-state";
import { gtmCampaignCompleted, gtmCampaignStarted, gtmCampaignStepCompleted, gtmCampaignStepScheduled } from "./gtm-campaign-signals";

type GlobalGuard = {
  __xom3_gtm_campaigns_bound__?: boolean;
  __xom3_gtm_campaigns_unsub__?: (() => void) | null;
};

function g(): GlobalGuard {
  return globalThis as any;
}

function matchCampaign(c: GtmCampaign, evt: GtmCampaignEntryEvent) {
  return c.entryTriggers.some((t) => t.eventType === evt.eventType && t.source === evt.source);
}

function templateToStubText(input: { templateId?: string; campaign: GtmCampaign; evt: GtmCampaignEntryEvent; stepId: string }) {
  const id = input.templateId || `${input.campaign.id}.${input.stepId}`;
  const name = input.campaign.name;
  const subj = `${input.evt.subjectType}:${input.evt.subjectId}`;
  return `[${name}] ${id} • subject=${subj}`;
}

function scheduleCampaign(campaign: GtmCampaign, evt: GtmCampaignEntryEvent) {
  const startedAt = evt.at;
  const instanceDraft: Omit<GtmCampaignInstance, "instanceId"> = {
    campaignId: campaign.id,
    subjectType: evt.subjectType,
    subjectId: evt.subjectId,
    startedAt,
    status: "active",
    steps: campaign.steps.map((s) => ({
      stepId: s.stepId,
      actionType: s.actionType,
      status: "pending",
    })),
  };

  const inst = createCampaignInstance(instanceDraft);
  gtmCampaignStarted({
    campaignId: campaign.id,
    instanceId: inst.instanceId,
    subjectType: evt.subjectType,
    subjectId: evt.subjectId,
  });

  for (const step of campaign.steps) {
    const scheduledAt = startedAt + step.offsetFromStartMs;
    const stepIdx = inst.steps.findIndex((x) => x.stepId === step.stepId);
    if (stepIdx < 0) continue;

    if (step.actionType === "outboundPost") {
      const platforms = step.platforms || ["generic"];
      const persona = step.personaOverride || campaign.persona;
      const cloneVoice = step.cloneVoiceOverride || campaign.cloneVoice;
      const text = templateToStubText({ templateId: step.contentTemplateId, campaign, evt, stepId: step.stepId });

      const enq = enqueueOutboundItem({
        platforms,
        content: { text, mediaRef: null },
        persona,
        cloneVoice,
        intent: "gtm",
        scheduleMode: "schedule",
        scheduledAt: new Date(scheduledAt).toISOString(),
      });

      inst.steps[stepIdx] = {
        ...inst.steps[stepIdx],
        status: "scheduled",
        scheduledAt,
        outboundItemIds: enq.items.map((i) => i.id),
      };

      gtmCampaignStepScheduled({
        instanceId: inst.instanceId,
        stepId: step.stepId,
        outboundItemIds: enq.items.map((i) => i.id),
        scheduledAt,
      });
      updateCampaignInstance(inst.instanceId, { steps: inst.steps });
      continue;
    }

    // Non-outbound steps are recorded but not executed in this strike.
    inst.steps[stepIdx] = { ...inst.steps[stepIdx], status: "scheduled", scheduledAt };
    gtmCampaignStepScheduled({ instanceId: inst.instanceId, stepId: step.stepId, scheduledAt });
    updateCampaignInstance(inst.instanceId, { steps: inst.steps });
  }

  return inst;
}

function maybeCompleteCampaign(inst: GtmCampaignInstance) {
  if (inst.status !== "active") return;
  const allDone = inst.steps.every((s) => s.status === "sent" || s.status === "skipped");
  if (!allDone) return;
  updateCampaignInstance(inst.instanceId, { status: "completed", completedAt: Date.now() });
  gtmCampaignCompleted({ campaignId: inst.campaignId, instanceId: inst.instanceId });
}

function handleOutboundResult(event: SovereignEvent) {
  if (event.type !== "gtm.outbound.sent" && event.type !== "gtm.outbound.failed") return;
  const itemId = String(event.payload?.itemId || "");
  if (!itemId) return;

  const found = findCampaignStepByOutboundItemId(itemId);
  if (!found) return;

  const inst = found.instance;
  const idx = inst.steps.findIndex((s) => s.stepId === found.stepId);
  if (idx < 0) return;

  const nextStatus = event.type === "gtm.outbound.sent" ? "sent" : "failed";
  const nextSteps = inst.steps.slice();
  nextSteps[idx] = {
    ...nextSteps[idx],
    status: nextStatus as any,
    completedAt: Date.now(),
    errorCode: nextStatus === "failed" ? String(event.payload?.errorCode || "outbound_failed") : undefined,
  };

  const updated = updateCampaignInstance(inst.instanceId, {
    steps: nextSteps,
    lastError: nextStatus === "failed" ? { at: Date.now(), code: String(event.payload?.errorCode || "outbound_failed") } : inst.lastError,
  });

  gtmCampaignStepCompleted({ instanceId: inst.instanceId, stepId: found.stepId });
  if (updated) maybeCompleteCampaign(updated);
}

export function ingestCampaignEntry(evt: GtmCampaignEntryEvent) {
  const matches = gtmCampaigns.filter((c) => matchCampaign(c, evt));
  const started: GtmCampaignInstance[] = [];
  for (const campaign of matches) {
    started.push(scheduleCampaign(campaign, evt));
  }
  return { startedCount: started.length, instances: started };
}

export function ensureGtmCampaignsBound() {
  const gg = g();
  if (gg.__xom3_gtm_campaigns_bound__) return;
  gg.__xom3_gtm_campaigns_bound__ = true;

  gg.__xom3_gtm_campaigns_unsub__ = subscribe((event) => {
    try {
      handleOutboundResult(event);
    } catch {
      // passive lane
    }
  });
}
