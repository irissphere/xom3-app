// Broadcast Engine - Content Prep Module
// Auto-formats content for each platform (the formatting intelligence)

import { Platform, BroadcastPost } from "./types";

export interface PlatformVariant {
  platform: Platform;
  content: string;
  caption: string;
  description?: string;
  hashtags: string[];
  cta: string;
  thumbnailUrl?: string;
  mediaUrl?: string;
  metadata: {
    aspectRatio: string; // "9:16", "16:9", "1:1", "4:5"
    maxLength: number;
    trackingLink: string;
    utmParams: Record<string, string>;
    funnelId?: string;
  };
}

/**
 * Platform-specific configurations
 */
const PLATFORM_CONFIGS: Record<Platform, {
  aspectRatio: string;
  maxCaptionLength: number;
  maxHashtags: number;
  supportsVideo: boolean;
  supportsImage: boolean;
  supportsCarousel: boolean;
  tone: "professional" | "casual" | "engaging" | "informative";
  ctaStyle: "direct" | "soft" | "question";
}> = {
  youtube: {
    aspectRatio: "16:9",
    maxCaptionLength: 5000,
    maxHashtags: 0,
    supportsVideo: true,
    supportsImage: false,
    supportsCarousel: false,
    tone: "informative",
    ctaStyle: "direct"
  },
  shorts: {
    aspectRatio: "9:16",
    maxCaptionLength: 5000,
    maxHashtags: 0,
    supportsVideo: true,
    supportsImage: false,
    supportsCarousel: false,
    tone: "engaging",
    ctaStyle: "soft"
  },
  tiktok: {
    aspectRatio: "9:16",
    maxCaptionLength: 2200,
    maxHashtags: 100,
    supportsVideo: true,
    supportsImage: false,
    supportsCarousel: false,
    tone: "casual",
    ctaStyle: "soft"
  },
  instagram: {
    aspectRatio: "9:16",
    maxCaptionLength: 2200,
    maxHashtags: 30,
    supportsVideo: true,
    supportsImage: true,
    supportsCarousel: true,
    tone: "engaging",
    ctaStyle: "soft"
  },
  reels: {
    aspectRatio: "9:16",
    maxCaptionLength: 2200,
    maxHashtags: 30,
    supportsVideo: true,
    supportsImage: false,
    supportsCarousel: false,
    tone: "engaging",
    ctaStyle: "soft"
  },
  facebook: {
    aspectRatio: "16:9",
    maxCaptionLength: 63206,
    maxHashtags: 0,
    supportsVideo: true,
    supportsImage: true,
    supportsCarousel: true,
    tone: "engaging",
    ctaStyle: "direct"
  },
  linkedin: {
    aspectRatio: "16:9",
    maxCaptionLength: 3000,
    maxHashtags: 0,
    supportsVideo: true,
    supportsImage: true,
    supportsCarousel: true,
    tone: "professional",
    ctaStyle: "direct"
  },
  twitter: {
    aspectRatio: "16:9",
    maxCaptionLength: 280,
    maxHashtags: 0,
    supportsVideo: true,
    supportsImage: true,
    supportsCarousel: false,
    tone: "casual",
    ctaStyle: "direct"
  }
};

/**
 * Format caption for platform
 */
export function formatCaptionForPlatform(
  content: string,
  platform: Platform,
  hashtags?: string[],
  cta?: string
): string {
  const config = PLATFORM_CONFIGS[platform];
  let caption = content;
  
  // Truncate to max length
  if (caption.length > config.maxCaptionLength) {
    caption = caption.substring(0, config.maxCaptionLength - 3) + "...";
  }
  
  // Add hashtags (if supported)
  if (config.maxHashtags > 0 && hashtags && hashtags.length > 0) {
    const platformHashtags = hashtags.slice(0, config.maxHashtags);
    caption += "\n\n" + platformHashtags.map(tag => `#${tag.replace(/\s+/g, "")}`).join(" ");
  }
  
  // Add CTA
  if (cta) {
    caption += "\n\n" + cta;
  }
  
  return caption;
}

/**
 * Format description for platform
 */
export function formatDescriptionForPlatform(
  content: string,
  platform: Platform,
  trackingLink?: string
): string {
  const config = PLATFORM_CONFIGS[platform];
  let description = content;
  
  // Truncate to max length
  if (description.length > config.maxCaptionLength) {
    description = description.substring(0, config.maxCaptionLength - 3) + "...";
  }
  
  // Add tracking link (for YouTube, LinkedIn)
  if (trackingLink && (platform === "youtube" || platform === "linkedin")) {
    description += "\n\n" + trackingLink;
  }
  
  return description;
}

/**
 * Generate tracking link with UTM parameters
 */
export function generateTrackingLink(
  baseUrl: string,
  postId: string,
  platform: Platform,
  metadata?: {
    funnelId?: string;
    campaignId?: string;
    contentId?: string;
  }
): string {
  const params = new URLSearchParams({
    post: postId,
    platform,
    t: Date.now().toString()
  });
  
  if (metadata?.funnelId) {
    params.set("funnel", metadata.funnelId);
  }
  
  if (metadata?.campaignId) {
    params.set("campaign", metadata.campaignId);
  }
  
  if (metadata?.contentId) {
    params.set("content", metadata.contentId);
  }
  
  return `${baseUrl}/track?${params.toString()}`;
}

/**
 * Generate UTM parameters
 */
export function generateUTMParams(
  postId: string,
  platform: Platform,
  metadata?: {
    funnelId?: string;
    campaignId?: string;
    contentId?: string;
  }
): Record<string, string> {
  return {
    utm_source: platform,
    utm_medium: "social",
    utm_campaign: metadata?.campaignId || "broadcast",
    utm_content: postId,
    utm_term: metadata?.funnelId || "organic"
  };
}

/**
 * Prepare content variant for platform
 */
export function preparePlatformVariant(
  post: BroadcastPost,
  platform: Platform,
  baseUrl: string = "https://xom3.io"
): PlatformVariant {
  const config = PLATFORM_CONFIGS[platform];
  
  // Format caption
  const caption = formatCaptionForPlatform(
    post.content,
    platform,
    post.metadata.hashtags,
    post.metadata.cta
  );
  
  // Format description (for platforms that support it)
  const description = config.maxCaptionLength > 1000 
    ? formatDescriptionForPlatform(post.content, platform)
    : undefined;
  
  // Generate tracking link
  const trackingLink = generateTrackingLink(baseUrl, post.id, platform, {
    funnelId: post.metadata.funnelId,
    campaignId: post.metadata.campaignId,
    contentId: post.id
  });
  
  // Generate UTM parameters
  const utmParams = generateUTMParams(post.id, platform, {
    funnelId: post.metadata.funnelId,
    campaignId: post.metadata.campaignId,
    contentId: post.id
  });
  
  return {
    platform,
    content: post.content,
    caption,
    description,
    hashtags: post.metadata.hashtags || [],
    cta: post.metadata.cta || "",
    thumbnailUrl: post.metadata.thumbnailUrl,
    mediaUrl: post.mediaUrl,
    metadata: {
      aspectRatio: config.aspectRatio,
      maxLength: config.maxCaptionLength,
      trackingLink,
      utmParams,
      funnelId: post.metadata.funnelId
    }
  };
}

/**
 * Prepare content variants for all platforms
 */
export function prepareAllPlatformVariants(
  post: BroadcastPost,
  platforms: Platform[],
  baseUrl: string = "https://xom3.io"
): PlatformVariant[] {
  return platforms.map(platform => 
    preparePlatformVariant(post, platform, baseUrl)
  );
}
