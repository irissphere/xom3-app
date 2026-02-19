import type { OutboundPlatform } from "@/lib/gtm/outbound/types";

export type GtmCampaignSubjectType = "contact" | "product" | "generic";

export type GtmCampaignEntryEventType =
  | "contactCreated"
  | "productCreated"
  | "formSubmitted"
  | "callBooked"
  | "orderCreated";

export type GtmCampaignEntrySource = "leadGen" | "ecommerce" | "manual" | "generic";

export type GtmCampaignEntryTrigger = {
  eventType: GtmCampaignEntryEventType;
  source: GtmCampaignEntrySource;
  filters?: Record<string, any>;
};

export type GtmCampaignStepActionType = "outboundPost" | "internalTask" | "tagContact" | "moveStage";

export type GtmCampaignStep = {
  stepId: string;
  offsetFromStartMs: number; // T+ offset
  actionType: GtmCampaignStepActionType;
  platforms?: OutboundPlatform[];
  contentTemplateId?: string;
  personaOverride?: string;
  cloneVoiceOverride?: string;
  conditions?: Record<string, any>;
};

export type GtmCampaign = {
  id: string;
  name: string;
  description: string;
  persona: string;
  cloneVoice: string;
  epochTags: string[];
  entryTriggers: GtmCampaignEntryTrigger[];
  steps: GtmCampaignStep[];
};

export type GtmCampaignInstanceStatus = "active" | "completed" | "cancelled";

export type GtmCampaignStepStatus = "pending" | "scheduled" | "sent" | "skipped" | "failed";

export type GtmCampaignInstance = {
  instanceId: string;
  campaignId: string;
  subjectType: GtmCampaignSubjectType;
  subjectId: string;
  startedAt: number;
  status: GtmCampaignInstanceStatus;
  completedAt?: number;
  cancelledAt?: number;
  cancelReason?: string;
  steps: Array<{
    stepId: string;
    actionType: GtmCampaignStepActionType;
    status: GtmCampaignStepStatus;
    scheduledAt?: number;
    completedAt?: number;
    outboundItemIds?: string[];
    errorCode?: string;
  }>;
  lastError?: { at: number; code: string };
};

export type GtmCampaignEntryEvent = {
  eventType: GtmCampaignEntryEventType;
  source: GtmCampaignEntrySource;
  subjectType: GtmCampaignSubjectType;
  subjectId: string;
  at: number;
  payload?: Record<string, any>;
};
