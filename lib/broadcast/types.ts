// Broadcast Engine - Type Definitions
// The system that turns content → attention → leads → pipeline → revenue

export type Platform = 
  | "youtube"
  | "tiktok"
  | "instagram"
  | "facebook"
  | "linkedin"
  | "twitter"
  | "shorts"
  | "reels";

export interface BroadcastPost {
  id: string;
  content: string;
  mediaUrl?: string;
  platforms: Platform[];
  scheduledAt?: string;
  postedAt?: string;
  status: "draft" | "scheduled" | "posted" | "failed";
  metadata: {
    caption?: string;
    hashtags?: string[];
    description?: string;
    cta?: string;
    trackingLink?: string;
    thumbnailUrl?: string;
    utmParams?: Record<string, string>;
    funnelId?: string;
    platformPostIds?: Record<string, string>;
    platformUrls?: Record<string, string>;
    campaignId?: string;
  };
  engagement?: EngagementMetrics;
  createdAt: string;
  updatedAt: string;
}

export interface EngagementMetrics {
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  views: number;
  follows: number;
  mentions: number;
  dms: number;
  replies: number;
  lastScrapedAt?: string;
}

export interface ScrapedEngagement {
  id: string;
  postId: string;
  platform: Platform;
  type: "comment" | "like" | "share" | "save" | "follow" | "mention" | "dm" | "reply";
  userId?: string;
  username?: string;
  content?: string;
  timestamp: string;
  metadata: Record<string, any>;
}

export interface LeadSignal {
  id: string;
  source: "comment" | "dm" | "mention" | "email" | "link_click" | "high_engagement" | "repeat_viewer" | "profile_visit" | "keyword";
  platform: Platform;
  postId?: string;
  userId?: string;
  username?: string;
  content: string;
  intent: string;
  score: number; // 0-100
  type: "hot" | "warm" | "cold";
  urgency: "high" | "medium" | "low";
  sentiment?: any;
  keywords?: string[];
  detectedAt: string;
  metadata: Record<string, any>;
}

export interface DetectedLead {
  id: string;
  leadSignal: LeadSignal;
  clientId?: string; // If already exists in system
  email?: string;
  phone?: string;
  name?: string;
  assignedAgentId?: string;
  funnelStage: "New Lead" | "Contacted" | "Qualified" | "Proposal" | "Closed";
  createdAt: string;
  updatedAt: string;
}

export interface FunnelIntegration {
  leadId: string;
  clientId: string;
  agentId?: string;
  taskId?: string;
  hpeStage: "Prospect" | "Intake" | "Active" | "Compliance" | "Closed";
  hseState?: string;
  uoiSignalEmitted: boolean;
  airtableSynced: boolean;
  createdAt: string;
}

export interface PostRequest {
  content: string;
  mediaUrl?: string;
  platforms: Platform[];
  scheduledAt?: string;
  metadata?: {
    caption?: string;
    hashtags?: string[];
    description?: string;
    cta?: string;
    trackingLink?: string;
    thumbnailUrl?: string;
  };
}

export interface ScrapeRequest {
  postId?: string;
  platform?: Platform;
  since?: string; // ISO timestamp
}

export interface LeadDetectionRequest {
  engagementId: string;
  force?: boolean;
}

export interface FunnelRequest {
  leadId: string;
  autoAssign?: boolean;
}
