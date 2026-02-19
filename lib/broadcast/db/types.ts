// Broadcast Engine Database Types
// TypeScript types matching the database schema

export interface BroadcastPost {
  id: string;
  platform: string;
  content_id?: string;
  title?: string;
  caption?: string;
  description?: string;
  hashtags?: string[];
  thumbnail_url?: string;
  video_url?: string;
  media_url?: string;
  scheduled_at?: Date | string;
  posted_at?: Date | string;
  status: "draft" | "scheduled" | "posted" | "failed";
  trend_id?: string;
  funnel_tag?: string;
  campaign_id?: string;
  metadata?: Record<string, any>;
  engagement_metrics?: {
    likes?: number;
    comments?: number;
    shares?: number;
    saves?: number;
    views?: number;
    follows?: number;
    mentions?: number;
    dms?: number;
    replies?: number;
  };
  created_at: Date | string;
  updated_at: Date | string;
}

export interface BroadcastSignalRaw {
  id: string;
  platform: string;
  signal_type: string;
  raw_payload: Record<string, any>;
  timestamp: Date | string;
  created_at: Date | string;
}

export interface BroadcastSignalNormalized {
  id: string;
  platform: string;
  signal_type: string;
  user_id?: string;
  username?: string;
  content?: string;
  sentiment?: "positive" | "negative" | "neutral";
  keywords?: string[];
  engagement_value?: number;
  timestamp: Date | string;
  post_id?: string;
  raw_signal_id?: string;
  metadata?: Record<string, any>;
  created_at: Date | string;
}

export interface BroadcastLead {
  id: string;
  user_id?: string;
  username?: string;
  platform: string;
  lead_score: number;
  lead_tier: "hot" | "warm" | "interested" | "cold" | "noise";
  lead_type?: string;
  urgency: "high" | "medium" | "low";
  intent_score: number;
  engagement_score: number;
  behavior_score: number;
  identity_score: number;
  trend_score: number;
  first_seen_at: Date | string;
  last_seen_at: Date | string;
  source_post_id?: string;
  source_signal_id?: string;
  status: "new" | "warm" | "cold" | "converted" | "ignored";
  client_id?: string;
  agent_id?: string;
  pipeline_stage?: string;
  metadata?: Record<string, any>;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface BroadcastTrend {
  id: string;
  trend_type: "breakout" | "sustained" | "seasonal" | "micro";
  platform?: string;
  keyword?: string;
  audio_id?: string;
  hashtag?: string;
  topic?: string;
  velocity: number;
  momentum: number;
  relevance: number;
  opportunity: number;
  volume?: number;
  detected_at: Date | string;
  expires_at?: Date | string;
  peak_platform?: string;
  spreading?: boolean;
  cross_platform?: boolean;
  metadata?: Record<string, any>;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface BroadcastFunnelEvent {
  id: string;
  lead_id: string;
  event_type: "created_client" | "moved_stage" | "assigned_agent" | "created_task" | "logged_interaction";
  pipeline_stage?: string;
  old_stage?: string;
  new_stage?: string;
  agent_id?: string;
  client_id?: string;
  task_id?: string;
  interaction_id?: string;
  metadata?: Record<string, any>;
  timestamp: Date | string;
  created_at: Date | string;
}

export interface BroadcastWorkerJob {
  id: string;
  job_type: "posting" | "scraping" | "trend" | "lead" | "funnel" | "cleanup";
  queue_name: string;
  task_type: string;
  payload: Record<string, any>;
  priority: "high" | "medium" | "low";
  status: "pending" | "running" | "failed" | "completed";
  attempts: number;
  max_attempts: number;
  scheduled_at?: Date | string;
  started_at?: Date | string;
  completed_at?: Date | string;
  failed_at?: Date | string;
  error?: string;
  metadata?: Record<string, any>;
  created_at: Date | string;
  updated_at: Date | string;
}

// Analytics Views
export interface BroadcastPostPerformance {
  id: string;
  platform: string;
  status: string;
  posted_at?: Date | string;
  signal_count: number;
  lead_count: number;
  hot_leads: number;
  warm_leads: number;
  avg_lead_score?: number;
  max_lead_score?: number;
}

export interface BroadcastPlatformPerformance {
  platform: string;
  total_posts: number;
  total_leads: number;
  avg_lead_score?: number;
  hot_leads: number;
  converted_leads: number;
}

export interface BroadcastTrendPerformance {
  id: string;
  trend_type: string;
  keyword?: string;
  velocity: number;
  opportunity: number;
  posts_generated: number;
  leads_generated: number;
  avg_lead_score?: number;
}

export interface BroadcastAgentPerformance {
  agent_id: string;
  leads_assigned: number;
  leads_converted: number;
  avg_lead_score?: number;
  avg_response_hours?: number;
}
