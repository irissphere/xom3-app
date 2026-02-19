/**
 * Social + YouTube Lane Types
 * 
 * Core contracts for the social content management system.
 * Supports Twitter, Instagram, YouTube, LinkedIn, TikTok.
 */

// ============================================================
// Platform Types
// ============================================================

export type SocialPlatform = 
  | "twitter"
  | "instagram"
  | "youtube"
  | "linkedin"
  | "tiktok"
  | "facebook";

export type PostStatus = 
  | "draft"
  | "scheduled"
  | "publishing"
  | "published"
  | "failed"
  | "cancelled";

export type YouTubeVisibility = "public" | "unlisted" | "private";

export type YouTubeCategory = 
  | "Film & Animation"
  | "Autos & Vehicles"
  | "Music"
  | "Pets & Animals"
  | "Sports"
  | "Travel & Events"
  | "Gaming"
  | "People & Blogs"
  | "Comedy"
  | "Entertainment"
  | "News & Politics"
  | "Howto & Style"
  | "Education"
  | "Science & Technology"
  | "Nonprofits & Activism";

// ============================================================
// Social Post Types
// ============================================================

export interface SocialPost {
  id: string;
  platform: SocialPlatform;
  content: string;
  status: PostStatus;
  scheduledAt?: string;
  publishedAt?: string;
  link?: string;
  
  // CRM Connection
  clientId?: string;
  clientName?: string;
  campaignId?: string;
  
  // Media
  mediaUrls?: string[];
  thumbnailUrl?: string;
  
  // Platform-specific data
  platformPostId?: string;
  platformLink?: string;
  
  // Engagement metrics
  engagement?: {
    likes?: number;
    comments?: number;
    shares?: number;
    views?: number;
    clicks?: number;
  };
  
  // Audit
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  errorMessage?: string;
  retryCount?: number;
}

// ============================================================
// YouTube Video Types
// ============================================================

export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  tags: string[];
  category: YouTubeCategory;
  visibility: YouTubeVisibility;
  
  // Media
  videoUrl?: string;
  thumbnailUrl?: string;
  thumbnailFile?: File;
  
  // Status
  status: PostStatus;
  uploadProgress?: number;
  processingStatus?: "pending" | "processing" | "complete" | "failed";
  
  // YouTube IDs
  youtubeVideoId?: string;
  youtubeLink?: string;
  
  // CRM Connection
  clientId?: string;
  clientName?: string;
  campaignId?: string;
  
  // Scheduling
  scheduledAt?: string;
  publishedAt?: string;
  
  // Engagement
  engagement?: {
    views?: number;
    likes?: number;
    dislikes?: number;
    comments?: number;
    shares?: number;
    watchTimeMinutes?: number;
    averageViewDuration?: string;
  };
  
  // Audit
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  errorMessage?: string;
}

// ============================================================
// Social Queue Types
// ============================================================

export interface SocialQueueItem {
  id: string;
  type: "post" | "video";
  platform: SocialPlatform;
  content: string;
  status: PostStatus;
  scheduledAt?: string;
  link?: string;
  clientId?: string;
  clientName?: string;
  thumbnailUrl?: string;
  createdAt: string;
}

export interface SocialQueueFilters {
  platform?: SocialPlatform;
  status?: PostStatus;
  clientId?: string;
  dateRange?: {
    start: string;
    end: string;
  };
}

// ============================================================
// Preview Types
// ============================================================

export interface TwitterPreviewData {
  content: string;
  mediaUrls?: string[];
  authorName?: string;
  authorHandle?: string;
  authorAvatar?: string;
  timestamp?: string;
}

export interface InstagramPreviewData {
  content: string;
  mediaUrls: string[];
  authorName?: string;
  authorAvatar?: string;
  likes?: number;
  timestamp?: string;
}

export interface YouTubePreviewData {
  title: string;
  description: string;
  thumbnailUrl?: string;
  channelName?: string;
  channelAvatar?: string;
  views?: number;
  duration?: string;
  timestamp?: string;
}

// ============================================================
// CRM Integration Types
// ============================================================

export interface SocialCrmClient {
  id: string;
  name: string;
  company?: string;
  email?: string;
  socialHandles?: {
    twitter?: string;
    instagram?: string;
    youtube?: string;
    linkedin?: string;
  };
  totalPosts?: number;
  lastPostAt?: string;
}

export interface SocialCampaign {
  id: string;
  name: string;
  clientId: string;
  platforms: SocialPlatform[];
  status: "active" | "paused" | "completed";
  startDate: string;
  endDate?: string;
  postsCount?: number;
  engagement?: {
    totalReach?: number;
    totalEngagements?: number;
    averageEngagementRate?: number;
  };
}

// ============================================================
// Signal Types
// ============================================================

export type SocialSignalType = 
  | "post_created"
  | "post_scheduled"
  | "post_published"
  | "post_failed"
  | "post_cancelled"
  | "video_uploaded"
  | "video_scheduled"
  | "video_published"
  | "video_failed"
  | "queue_pressure"
  | "engagement_spike"
  | "engagement_drop";

export interface SocialSignalPayload {
  signalType: SocialSignalType;
  platform?: SocialPlatform;
  postId?: string;
  videoId?: string;
  clientId?: string;
  errorMessage?: string;
  metrics?: Record<string, number>;
  timestamp: string;
}

// ============================================================
// API Response Types
// ============================================================

export interface SocialApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface SocialQueueResponse {
  items: SocialQueueItem[];
  total: number;
  page: number;
  pageSize: number;
  filters?: SocialQueueFilters;
}

export interface SocialStatsResponse {
  totalPosts: number;
  scheduled: number;
  published: number;
  failed: number;
  byPlatform: Record<SocialPlatform, number>;
  recentEngagement: {
    totalReach: number;
    totalEngagements: number;
    averageEngagementRate: number;
  };
}
