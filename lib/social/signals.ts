/**
 * Social Lane UOI Signal Emitters
 * 
 * Emits signals for post creation, scheduling, publishing, and failures.
 * All signals flow to the Unified Operational Intelligence layer.
 */

import { emitSignal } from "@/lib/uoi/signals";
import type { UOISignal } from "@/lib/uoi/contract";
import type { 
  SocialPlatform, 
  SocialSignalType, 
  SocialPost, 
  YouTubeVideo,
  PostStatus 
} from "./types";

// ============================================================
// Signal Source Identifier
// ============================================================

const SIGNAL_SOURCE = "social-lane";

// ============================================================
// Core Signal Emitters
// ============================================================

/**
 * Emit a social lane signal to UOI
 */
export function emitSocialSignal(
  signalType: SocialSignalType,
  payload: Record<string, unknown>,
  priority: UOISignal["priority"] = "medium"
): UOISignal {
  return emitSignal({
    source: SIGNAL_SOURCE,
    type: getUoiSignalType(signalType),
    priority,
    payload: {
      signalType,
      timestamp: new Date().toISOString(),
      ...payload
    }
  });
}

/**
 * Map social signal types to UOI signal types
 */
function getUoiSignalType(signalType: SocialSignalType): UOISignal["type"] {
  switch (signalType) {
    case "post_failed":
    case "video_failed":
      return "error";
    case "engagement_spike":
    case "engagement_drop":
      return "anomaly";
    case "queue_pressure":
      return "metric";
    default:
      return "event";
  }
}

// ============================================================
// Post Lifecycle Signals
// ============================================================

/**
 * Emit signal when a post is created
 */
export function emitPostCreated(post: SocialPost): UOISignal {
  return emitSocialSignal("post_created", {
    postId: post.id,
    platform: post.platform,
    clientId: post.clientId,
    clientName: post.clientName,
    hasMedia: (post.mediaUrls?.length || 0) > 0,
    contentLength: post.content.length
  }, "low");
}

/**
 * Emit signal when a post is scheduled
 */
export function emitPostScheduled(post: SocialPost): UOISignal {
  return emitSocialSignal("post_scheduled", {
    postId: post.id,
    platform: post.platform,
    clientId: post.clientId,
    clientName: post.clientName,
    scheduledAt: post.scheduledAt,
    scheduledInHours: post.scheduledAt 
      ? Math.round((new Date(post.scheduledAt).getTime() - Date.now()) / (1000 * 60 * 60))
      : null
  }, "medium");
}

/**
 * Emit signal when a post is published successfully
 */
export function emitPostPublished(post: SocialPost): UOISignal {
  return emitSocialSignal("post_published", {
    postId: post.id,
    platform: post.platform,
    clientId: post.clientId,
    clientName: post.clientName,
    platformPostId: post.platformPostId,
    platformLink: post.platformLink,
    publishedAt: post.publishedAt
  }, "low");
}

/**
 * Emit signal when a post fails
 */
export function emitPostFailed(post: SocialPost, errorMessage: string): UOISignal {
  return emitSocialSignal("post_failed", {
    postId: post.id,
    platform: post.platform,
    clientId: post.clientId,
    clientName: post.clientName,
    errorMessage,
    retryCount: post.retryCount || 0,
    wasScheduled: !!post.scheduledAt
  }, "high");
}

/**
 * Emit signal when a post is cancelled
 */
export function emitPostCancelled(post: SocialPost, reason?: string): UOISignal {
  return emitSocialSignal("post_cancelled", {
    postId: post.id,
    platform: post.platform,
    clientId: post.clientId,
    reason
  }, "low");
}

// ============================================================
// YouTube Video Signals
// ============================================================

/**
 * Emit signal when a video is uploaded
 */
export function emitVideoUploaded(video: YouTubeVideo): UOISignal {
  return emitSocialSignal("video_uploaded", {
    videoId: video.id,
    title: video.title,
    clientId: video.clientId,
    clientName: video.clientName,
    visibility: video.visibility,
    category: video.category,
    tagsCount: video.tags.length
  }, "medium");
}

/**
 * Emit signal when a video is scheduled
 */
export function emitVideoScheduled(video: YouTubeVideo): UOISignal {
  return emitSocialSignal("video_scheduled", {
    videoId: video.id,
    title: video.title,
    clientId: video.clientId,
    scheduledAt: video.scheduledAt,
    visibility: video.visibility
  }, "medium");
}

/**
 * Emit signal when a video is published
 */
export function emitVideoPublished(video: YouTubeVideo): UOISignal {
  return emitSocialSignal("video_published", {
    videoId: video.id,
    title: video.title,
    clientId: video.clientId,
    youtubeVideoId: video.youtubeVideoId,
    youtubeLink: video.youtubeLink,
    visibility: video.visibility,
    publishedAt: video.publishedAt
  }, "low");
}

/**
 * Emit signal when a video fails
 */
export function emitVideoFailed(video: YouTubeVideo, errorMessage: string): UOISignal {
  return emitSocialSignal("video_failed", {
    videoId: video.id,
    title: video.title,
    clientId: video.clientId,
    errorMessage,
    uploadProgress: video.uploadProgress,
    processingStatus: video.processingStatus
  }, "high");
}

// ============================================================
// Operational Signals
// ============================================================

/**
 * Emit signal when queue has pressure (many pending posts)
 */
export function emitQueuePressure(
  queueSize: number,
  threshold: number,
  platforms: SocialPlatform[]
): UOISignal {
  return emitSocialSignal("queue_pressure", {
    queueSize,
    threshold,
    platformsAffected: platforms,
    pressureRatio: queueSize / threshold
  }, queueSize > threshold * 1.5 ? "high" : "medium");
}

/**
 * Emit signal when engagement spikes
 */
export function emitEngagementSpike(
  platform: SocialPlatform,
  postId: string,
  metrics: {
    current: number;
    baseline: number;
    changePercent: number;
  }
): UOISignal {
  return emitSocialSignal("engagement_spike", {
    platform,
    postId,
    currentEngagement: metrics.current,
    baselineEngagement: metrics.baseline,
    changePercent: metrics.changePercent
  }, "medium");
}

/**
 * Emit signal when engagement drops significantly
 */
export function emitEngagementDrop(
  platform: SocialPlatform,
  clientId: string,
  metrics: {
    current: number;
    baseline: number;
    changePercent: number;
  }
): UOISignal {
  return emitSocialSignal("engagement_drop", {
    platform,
    clientId,
    currentEngagement: metrics.current,
    baselineEngagement: metrics.baseline,
    changePercent: metrics.changePercent
  }, "high");
}

// ============================================================
// Batch Signal Helpers
// ============================================================

/**
 * Emit signals for bulk post status changes
 */
export function emitBulkStatusChange(
  posts: SocialPost[],
  newStatus: PostStatus,
  reason?: string
): void {
  posts.forEach(post => {
    switch (newStatus) {
      case "scheduled":
        emitPostScheduled(post);
        break;
      case "published":
        emitPostPublished(post);
        break;
      case "cancelled":
        emitPostCancelled(post, reason);
        break;
      case "failed":
        emitPostFailed(post, reason || "Bulk operation failed");
        break;
    }
  });
}

// ============================================================
// Signal Summary for Audit
// ============================================================

export interface SocialSignalSummary {
  totalSignals: number;
  byType: Record<SocialSignalType, number>;
  byPlatform: Record<SocialPlatform, number>;
  lastSignalAt?: string;
  highPriorityCount: number;
}

/**
 * Generate signal summary for audit purposes
 * Note: In production, this would query from the signal store
 */
export function generateSignalSummary(): SocialSignalSummary {
  return {
    totalSignals: 0,
    byType: {
      post_created: 0,
      post_scheduled: 0,
      post_published: 0,
      post_failed: 0,
      post_cancelled: 0,
      video_uploaded: 0,
      video_scheduled: 0,
      video_published: 0,
      video_failed: 0,
      queue_pressure: 0,
      engagement_spike: 0,
      engagement_drop: 0
    },
    byPlatform: {
      twitter: 0,
      instagram: 0,
      youtube: 0,
      linkedin: 0,
      tiktok: 0,
      facebook: 0
    },
    highPriorityCount: 0
  };
}
