import { publish } from "@/lib/sovereigns/event-bus";
import type { GtmCampaignSubjectType } from "./gtm-campaign-types";

export function gtmCampaignStarted(input: {
  campaignId: string;
  instanceId: string;
  subjectType: GtmCampaignSubjectType;
  subjectId: string;
}) {
  publish({
    sovereign: "broadcast",
    type: "gtm.campaign.started",
    severity: "info",
    payload: { ...input, at: Date.now() },
    tags: ["gtm", "campaign"],
  });
}

export function gtmCampaignStepScheduled(input: {
  instanceId: string;
  stepId: string;
  outboundItemIds?: string[];
  scheduledAt: number;
}) {
  publish({
    sovereign: "broadcast",
    type: "gtm.campaign.step.scheduled",
    severity: "info",
    payload: { ...input, at: Date.now() },
    tags: ["gtm", "campaign"],
  });
}

export function gtmCampaignStepCompleted(input: { instanceId: string; stepId: string }) {
  publish({
    sovereign: "broadcast",
    type: "gtm.campaign.step.completed",
    severity: "info",
    payload: { ...input, at: Date.now() },
    tags: ["gtm", "campaign"],
  });
}

export function gtmCampaignCompleted(input: { campaignId: string; instanceId: string }) {
  publish({
    sovereign: "broadcast",
    type: "gtm.campaign.completed",
    severity: "info",
    payload: { ...input, at: Date.now() },
    tags: ["gtm", "campaign"],
  });
}

export function gtmCampaignCancelled(input: { campaignId: string; instanceId: string; reason: string }) {
  publish({
    sovereign: "broadcast",
    type: "gtm.campaign.cancelled",
    severity: "warning",
    payload: { ...input, at: Date.now() },
    tags: ["gtm", "campaign"],
  });
}
