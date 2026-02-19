export type OutboundPlatform = "youtube" | "instagram" | "tiktok" | "twitter" | "linkedin" | "generic";

export type OutboundStatus = "queued" | "sending" | "sent" | "failed";

export type OutboundScheduleMode = "sendNow" | "schedule";

export type OutboundItemContent = {
  text: string;
  mediaRef?: string | null;
};

export type OutboundItem = {
  id: string;
  platform: OutboundPlatform;
  content: OutboundItemContent;
  formattedText: string;
  cloneVoice: string;
  persona: string;
  epochId: string;
  intent: string;
  scheduleMode: OutboundScheduleMode;
  scheduledAt: string; // ISO
  status: OutboundStatus;
  externalId?: string;
  errorCode?: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
};

export type EnqueueOutboundItemSpec = {
  platforms: OutboundPlatform[];
  content: OutboundItemContent;
  cloneVoice: string;
  persona?: string;
  epochId?: string;
  intent?: string;
  scheduleMode: OutboundScheduleMode;
  scheduledAt?: string;
};
