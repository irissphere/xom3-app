export type BroadcastPlatform = "instagram" | "twitter" | "linkedin" | "facebook" | "tiktok";

export type BroadcastPersona = "operator" | "founder" | "mythic" | "neutral" | string;

export type BroadcastDraft = {
  id?: string;
  text: string;
  persona: BroadcastPersona;
  tone: string;
  media: Array<{ id: string; url: string; type: "image" | "video" }>;
  metadata?: Record<string, any>;
};

export type BroadcastDraftUpdater = (patch: Partial<BroadcastDraft>) => void;
