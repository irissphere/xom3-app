export type LeadPosture = "new" | "working" | "closed";

export type LeadTimelineEvent = {
  eventId: string;
  type: string;
  timestamp: string; // ISO
  payload?: any;
};

export type Lead = {
  leadId: string;
  tenantId: string;
  airtableId?: string; // Opus 1 record ID (when leadId is opus1_xxx)
  name?: string;
  email?: string;
  phone?: string;
  source?: string;
  posture: LeadPosture;
  assignedTo?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  timeline: LeadTimelineEvent[];
  /** Opus 1 activity counts */
  messagesSent?: number | null;
  totalCallAttempts?: number | null;
  responseCount?: number | null;
};
