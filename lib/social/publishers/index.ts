/**
 * Social Publishers Index
 * Unified interface for posting to all platforms
 * AKV: Social Sovereign - Publisher Lane
 */

import { postTweet, TwitterPostResult } from "./twitter";
import { getYouTubeChannel, uploadYouTubeVideo, YouTubeUploadResult } from "./youtube";
import { postToLinkedIn, LinkedInPostResult } from "./linkedin";
import type { SocialPlatform } from "../types";

export { postTweet } from "./twitter";
export {
  getYouTubeChannel,
  uploadYouTubeVideo,
  listYouTubeVideos
} from "./youtube";
export { postToLinkedIn, getLinkedInUser } from "./linkedin";

export interface PublishResult {
  success: boolean;
  platform: SocialPlatform;
  postId?: string;
  postUrl?: string;
  error?: string;
}

export interface PublishOptions {
  tenantId?: string;
  mediaUrls?: string[];
  articleUrl?: string;
}

/**
 * Publish content to a specific platform
 */
export async function publishToPlatform(
  platform: SocialPlatform,
  content: string,
  options: PublishOptions = {}
): Promise<PublishResult> {
  const tenantId = options.tenantId || "default";

  switch (platform) {
    case "twitter": {
      const result = await postTweet(content, { tenantId });
      return {
        success: result.success,
        platform,
        postId: result.tweetId,
        postUrl: result.tweetUrl,
        error: result.error,
      };
    }

    case "linkedin": {
      const result = await postToLinkedIn(content, { 
        tenantId,
        articleUrl: options.articleUrl,
      });
      return {
        success: result.success,
        platform,
        postId: result.postId,
        postUrl: result.postUrl,
        error: result.error,
      };
    }

    case "youtube": {
      // YouTube doesn't support text-only posts via API
      // Community posts aren't available via API
      return {
        success: false,
        platform,
        error: "YouTube requires video upload. Text posts (Community) are not supported via API.",
      };
    }

    case "instagram": {
      // Instagram requires media (image/video)
      return {
        success: false,
        platform,
        error: "Instagram requires media. Text-only posts not supported.",
      };
    }

    case "facebook": {
      // Facebook page posting - to be implemented
      return {
        success: false,
        platform,
        error: "Facebook posting not yet implemented. Connect Facebook first.",
      };
    }

    case "tiktok": {
      // TikTok requires video
      return {
        success: false,
        platform,
        error: "TikTok requires video upload. Text posts not supported.",
      };
    }

    default:
      return {
        success: false,
        platform,
        error: `Unknown platform: ${platform}`,
      };
  }
}

// Legacy alias for backwards compatibility
export const publishToplatform = publishToPlatform;

/**
 * Publish content to multiple platforms at once
 */
export async function publishToMultiplePlatforms(
  platforms: SocialPlatform[],
  content: string,
  options: PublishOptions = {}
): Promise<PublishResult[]> {
  const results = await Promise.all(
    platforms.map((platform) => publishToplatform(platform, content, options))
  );
  return results;
}

/**
 * Check which platforms support text-only posting
 */
export function supportsTextPost(platform: SocialPlatform): boolean {
  return ["twitter", "linkedin", "facebook"].includes(platform);
}

/**
 * Check which platforms require media
 */
export function requiresMedia(platform: SocialPlatform): boolean {
  return ["instagram", "tiktok", "youtube"].includes(platform);
}


