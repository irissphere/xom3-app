// Broadcast Engine - Content Output Engine
// Auto-posts content across platforms

import { BroadcastPost, PostRequest, Platform } from "./types";

/**
 * Generate caption from content
 */
export function generateCaption(content: string, metadata?: { hashtags?: string[]; cta?: string }): string {
  let caption = content;
  
  if (metadata?.hashtags && metadata.hashtags.length > 0) {
    caption += "\n\n" + metadata.hashtags.map(tag => `#${tag}`).join(" ");
  }
  
  if (metadata?.cta) {
    caption += "\n\n" + metadata.cta;
  }
  
  return caption;
}

/**
 * Generate hashtags from content
 */
export function generateHashtags(content: string, count: number = 5): string[] {
  // Simple keyword extraction (in production, use NLP)
  const keywords = content
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 3)
    .filter(word => !["the", "and", "for", "are", "but", "not", "you", "all", "can", "her", "was", "one", "our", "out", "day", "get", "has", "him", "his", "how", "its", "may", "new", "now", "old", "see", "two", "way", "who", "boy", "did", "its", "let", "put", "say", "she", "too", "use"].includes(word));
  
  // Remove duplicates and take top N
  const unique = Array.from(new Set(keywords));
  return unique.slice(0, count).map(word => word.replace(/[^a-z0-9]/g, ""));
}

/**
 * Generate description from content
 */
export function generateDescription(content: string, maxLength: number = 200): string {
  if (content.length <= maxLength) return content;
  return content.substring(0, maxLength - 3) + "...";
}

/**
 * Generate CTA from context
 */
export function generateCTA(context?: { platform?: Platform; postType?: string }): string {
  const ctas = [
    "Learn more at xom3.io",
    "Get started today → xom3.io",
    "Schedule a consultation",
    "DM for more info",
    "Visit our website",
    "Book a call"
  ];
  
  // Platform-specific CTAs
  if (context?.platform === "linkedin") {
    return "Connect with us to learn more";
  }
  
  if (context?.platform === "instagram" || context?.platform === "tiktok") {
    return "Link in bio 👆";
  }
  
  return ctas[Math.floor(Math.random() * ctas.length)];
}

/**
 * Generate tracking link
 */
export function generateTrackingLink(baseUrl: string, postId: string, platform: Platform): string {
  return `${baseUrl}/track?post=${postId}&platform=${platform}&t=${Date.now()}`;
}

/**
 * Prepare post for platform
 */
export function preparePostForPlatform(
  post: BroadcastPost,
  platform: Platform
): {
  caption: string;
  description?: string;
  hashtags: string[];
  cta?: string;
  trackingLink?: string;
} {
  const caption = generateCaption(
    post.content,
    {
      hashtags: post.metadata.hashtags || generateHashtags(post.content),
      cta: post.metadata.cta || generateCTA({ platform })
    }
  );
  
  const description = post.metadata.description || generateDescription(post.content);
  const hashtags = post.metadata.hashtags || generateHashtags(post.content);
  const cta = post.metadata.cta || generateCTA({ platform });
  const trackingLink = post.metadata.trackingLink || generateTrackingLink(
    process.env.NEXT_PUBLIC_BASE_URL || "https://xom3.io",
    post.id,
    platform
  );
  
  return {
    caption,
    description,
    hashtags,
    cta,
    trackingLink
  };
}

/**
 * Post to platform (placeholder - integrate with actual platform APIs)
 */
export async function postToPlatform(
  post: BroadcastPost,
  platform: Platform,
  credentials: Record<string, string>
): Promise<{ success: boolean; postId?: string; error?: string }> {
  // This is a placeholder - in production, integrate with:
  // - YouTube Data API v3
  // - TikTok Business API
  // - Instagram Graph API
  // - Facebook Graph API
  // - LinkedIn API
  // - Twitter API v2
  // - etc.
  
  const prepared = preparePostForPlatform(post, platform);
  
  console.log(`[Broadcast] Posting to ${platform}:`, {
    caption: prepared.caption.substring(0, 100) + "...",
    hashtags: prepared.hashtags,
    mediaUrl: post.mediaUrl
  });
  
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return {
    success: true,
    postId: `platform_${platform}_${Date.now()}`
  };
}

/**
 * Cross-post to multiple platforms
 */
export async function crossPost(
  post: BroadcastPost,
  platforms: Platform[],
  credentials: Record<Platform, Record<string, string>>
): Promise<Record<Platform, { success: boolean; postId?: string; error?: string }>> {
  const results: Record<string, any> = {};
  
  for (const platform of platforms) {
    try {
      const result = await postToPlatform(post, platform, credentials[platform] || {});
      results[platform] = result;
    } catch (error: any) {
      results[platform] = {
        success: false,
        error: error.message
      };
    }
  }
  
  return results as Record<Platform, { success: boolean; postId?: string; error?: string }>;
}
