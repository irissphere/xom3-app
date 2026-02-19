// Broadcast Engine - Auto-Posting Engine (Layer 2)
// Distributes content across platforms with scheduling, cross-posting, and tracking

import { BroadcastPost, Platform, PostRequest } from "./types";
import { preparePostForPlatform, generateTrackingLink } from "./content-engine";
import { preparePlatformVariant, prepareAllPlatformVariants } from "./content-prep";
import { buildAllScheduleRecommendations, determinePostingOrder } from "./smart-scheduler";
import { storePost, updatePostStatus, getPost } from "./store";
import { emitSignal } from "@/lib/uoi/signals";

export interface PostingResult {
  platform: Platform;
  success: boolean;
  postId?: string;
  platformPostId?: string; // The ID returned by the platform
  url?: string;
  error?: string;
  postedAt?: string;
}

export interface CrossPostResult {
  postId: string;
  results: Record<Platform, PostingResult>;
  totalSuccess: number;
  totalFailed: number;
  postedAt: string;
}

/**
 * Platform-specific posting configurations
 */
const PLATFORM_CONFIGS: Record<Platform, {
  maxCaptionLength: number;
  maxHashtags: number;
  supportsVideo: boolean;
  supportsImage: boolean;
  supportsCarousel: boolean;
  requiresDescription: boolean;
  apiEndpoint?: string;
}> = {
  youtube: {
    maxCaptionLength: 5000,
    maxHashtags: 0, // YouTube doesn't use hashtags in captions
    supportsVideo: true,
    supportsImage: false,
    supportsCarousel: false,
    requiresDescription: true,
    apiEndpoint: "https://www.googleapis.com/youtube/v3/videos"
  },
  tiktok: {
    maxCaptionLength: 2200,
    maxHashtags: 100,
    supportsVideo: true,
    supportsImage: false,
    supportsCarousel: false,
    requiresDescription: false,
    apiEndpoint: "https://open.tiktokapis.com/v2/post/publish/"
  },
  instagram: {
    maxCaptionLength: 2200,
    maxHashtags: 30,
    supportsVideo: true,
    supportsImage: true,
    supportsCarousel: true,
    requiresDescription: false,
    apiEndpoint: "https://graph.instagram.com/v18.0"
  },
  facebook: {
    maxCaptionLength: 63206,
    maxHashtags: 0,
    supportsVideo: true,
    supportsImage: true,
    supportsCarousel: true,
    requiresDescription: false,
    apiEndpoint: "https://graph.facebook.com/v18.0"
  },
  linkedin: {
    maxCaptionLength: 3000,
    maxHashtags: 0,
    supportsVideo: true,
    supportsImage: true,
    supportsCarousel: false,
    requiresDescription: false,
    apiEndpoint: "https://api.linkedin.com/v2"
  },
  twitter: {
    maxCaptionLength: 280,
    maxHashtags: 0,
    supportsVideo: true,
    supportsImage: true,
    supportsCarousel: false,
    requiresDescription: false,
    apiEndpoint: "https://api.twitter.com/2/tweets"
  },
  shorts: {
    maxCaptionLength: 5000,
    maxHashtags: 0,
    supportsVideo: true,
    supportsImage: false,
    supportsCarousel: false,
    requiresDescription: true,
    apiEndpoint: "https://www.googleapis.com/youtube/v3/videos"
  },
  reels: {
    maxCaptionLength: 2200,
    maxHashtags: 30,
    supportsVideo: true,
    supportsImage: false,
    supportsCarousel: false,
    requiresDescription: false,
    apiEndpoint: "https://graph.instagram.com/v18.0"
  }
};

/**
 * Post to YouTube
 * Uses OAuth 2.0 Bearer token from token storage
 * Note: YouTube API requires video file upload - text posts not supported
 */
async function postToYouTube(
  post: BroadcastPost,
  credentials: Record<string, string>
): Promise<PostingResult> {
  try {
    // Get access token from OAuth storage
    const tenantId = credentials.tenantId || "default";
    const { getAccessToken } = await import("@/lib/oauth/token-storage");
    
    let accessToken = credentials.accessToken;
    if (!accessToken) {
      accessToken = await getAccessToken(tenantId, "youtube") || "";
    }
    
    if (!accessToken) {
      return {
        platform: "youtube",
        success: false,
        error: "YouTube not connected. Please connect your Google account first.",
        postedAt: new Date().toISOString()
      };
    }

    // YouTube doesn't support text-only posts via API
    // Check if we have video media
    if (!post.mediaUrl || !post.mediaUrl.includes('.mp4')) {
      return {
        platform: "youtube",
        success: false,
        error: "YouTube requires video upload. Text posts not supported via API.",
        postedAt: new Date().toISOString()
      };
    }

    const prepared = preparePostForPlatform(post, "youtube");
    const videoTitle = post.content.substring(0, 100);
    const videoDescription = prepared.description || prepared.caption || post.content;
    const tags = prepared.hashtags?.slice(0, 10) || [];

    // Initialize resumable upload
    const metadata = {
      snippet: {
        title: videoTitle,
        description: videoDescription,
        tags: tags,
        categoryId: "22", // People & Blogs
      },
      status: {
        privacyStatus: "public",
        embeddable: true,
      },
    };

    const initResponse = await fetch(
      "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(metadata),
      }
    );

    if (!initResponse.ok) {
      const errorData = await initResponse.json().catch(() => ({}));
      return {
        platform: "youtube",
        success: false,
        error: errorData?.error?.message || `YouTube API error: ${initResponse.status}`,
        postedAt: new Date().toISOString()
      };
    }

    // For now, return success for init - actual video upload requires the video file
    // In production, you would continue with the upload URL
    const uploadUrl = initResponse.headers.get("Location");
    
    console.log(`[Broadcast] YouTube upload initialized for: ${post.id}, upload URL ready`);

    return {
      platform: "youtube",
      success: false,
      error: "YouTube video upload initialized but video file upload not yet implemented. Use /api/social/youtube/upload for full uploads.",
      postedAt: new Date().toISOString()
    };

  } catch (error: any) {
    console.error(`[Broadcast] Error posting to YouTube:`, error);

    return {
      platform: "youtube",
      success: false,
      error: error.message || "Failed to post to YouTube",
      postedAt: new Date().toISOString()
    };
  }
}

/**
 * Post to TikTok
 * Uses TikTok Content Posting API with OAuth 2.0
 * Requires video content - TikTok doesn't support text-only posts
 */
async function postToTikTok(
  post: BroadcastPost,
  credentials: Record<string, string>
): Promise<PostingResult> {
  try {
    const config = PLATFORM_CONFIGS.tiktok;
    const prepared = preparePostForPlatform(post, "tiktok");

    // Get access token from OAuth storage
    const tenantId = credentials.tenantId || "default";
    const { getAccessToken } = await import("@/lib/oauth/token-storage");
    
    let accessToken = credentials.accessToken;
    if (!accessToken) {
      accessToken = await getAccessToken(tenantId, "tiktok") || "";
    }
    
    if (!accessToken) {
      return {
        platform: "tiktok",
        success: false,
        error: "TikTok not connected. Please connect your TikTok account first.",
        postedAt: new Date().toISOString()
      };
    }

    // TikTok requires video content
    if (!post.mediaUrl || !post.mediaUrl.includes('.mp4')) {
      return {
        platform: "tiktok",
        success: false,
        error: "TikTok requires video content. Text or image posts not supported.",
        postedAt: new Date().toISOString()
      };
    }

    // TikTok Content Posting API v2
    // Step 1: Initialize upload
    const initResponse = await fetch("https://open.tiktokapis.com/v2/post/publish/video/init/", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        post_info: {
          title: prepared.caption.substring(0, config.maxCaptionLength),
          privacy_level: "PUBLIC_TO_EVERYONE",
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
        },
        source_info: {
          source: "PULL_FROM_URL",
          video_url: post.mediaUrl,
        },
      }),
    });

    if (!initResponse.ok) {
      const errorData = await initResponse.json().catch(() => ({}));
      return {
        platform: "tiktok",
        success: false,
        error: errorData?.error?.message || `TikTok API error: ${initResponse.status}`,
        postedAt: new Date().toISOString()
      };
    }

    const initData = await initResponse.json();
    const publishId = initData.data?.publish_id;

    if (!publishId) {
      return {
        platform: "tiktok",
        success: false,
        error: "TikTok upload initialization failed - no publish ID returned",
        postedAt: new Date().toISOString()
      };
    }

    console.log(`[Broadcast] TikTok video upload initiated: ${post.id} → ${publishId}`);

    // Note: TikTok processes videos asynchronously
    // You'd need to poll the status endpoint to confirm completion
    return {
      platform: "tiktok",
      success: true,
      platformPostId: publishId,
      url: `https://tiktok.com/@user/video/${publishId}`,
      postedAt: new Date().toISOString()
    };

  } catch (error: any) {
    console.error(`[Broadcast] Error posting to TikTok:`, error);

    return {
      platform: "tiktok",
      success: false,
      error: error.message || "Failed to post to TikTok",
      postedAt: new Date().toISOString()
    };
  }
}

/**
 * Post to Instagram
 * Uses Facebook/Meta OAuth 2.0 Bearer token from token storage
 * Requires Instagram Business Account connected to Facebook Page
 */
async function postToInstagram(
  post: BroadcastPost,
  credentials: Record<string, string>
): Promise<PostingResult> {
  try {
    const config = PLATFORM_CONFIGS.instagram;
    const prepared = preparePostForPlatform(post, "instagram");

    // Get access token from OAuth storage
    const tenantId = credentials.tenantId || "default";
    const { getAccessToken, getToken } = await import("@/lib/oauth/token-storage");
    
    let accessToken = credentials.accessToken;
    if (!accessToken) {
      accessToken = await getAccessToken(tenantId, "instagram") || "";
    }
    
    if (!accessToken) {
      return {
        platform: "instagram",
        success: false,
        error: "Instagram not connected. Please connect your Instagram Business account first.",
        postedAt: new Date().toISOString()
      };
    }

    // Get Instagram account ID from token storage
    const token = await getToken(tenantId, "instagram");
    const instagramAccountId = credentials.instagramAccountId || token?.platformUserId;
    
    if (!instagramAccountId) {
      return {
        platform: "instagram",
        success: false,
        error: "Instagram Business account ID not found. Please reconnect your account.",
        postedAt: new Date().toISOString()
      };
    }

    // Instagram requires media - no text-only posts
    if (!post.mediaUrl) {
      return {
        platform: "instagram",
        success: false,
        error: "Instagram requires media (image or video). Text-only posts not supported.",
        postedAt: new Date().toISOString()
      };
    }

    // Step 1: Create media container
    const containerUrl = `https://graph.facebook.com/v18.0/${instagramAccountId}/media`;

    const containerBody: any = {
      caption: prepared.caption.substring(0, config.maxCaptionLength),
      access_token: accessToken,
    };

    // Handle different media types
    if (post.mediaUrl.includes('.mp4')) {
      containerBody.media_type = 'VIDEO';
      containerBody.video_url = post.mediaUrl;
    } else {
      containerBody.media_type = 'IMAGE';
      containerBody.image_url = post.mediaUrl;
    }

    const containerResponse = await fetch(containerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(containerBody),
    });

    if (!containerResponse.ok) {
      const error = await containerResponse.text();
      throw new Error(`Instagram container creation failed: ${error}`);
    }

    const containerData = await containerResponse.json();
    const creationId = containerData.id;

    // Step 2: Publish the container
    const publishUrl = `https://graph.facebook.com/v18.0/${instagramAccountId}/media_publish`;

    const publishResponse = await fetch(publishUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: creationId,
        access_token: accessToken,
      }),
    });

    if (!publishResponse.ok) {
      const error = await publishResponse.text();
      throw new Error(`Instagram publish failed: ${error}`);
    }

    const publishData = await publishResponse.json();
    const mediaId = publishData.id;

    console.log(`[Broadcast] Successfully posted to Instagram: ${post.id} → ${mediaId}`);

    return {
      platform: "instagram",
      success: true,
      platformPostId: mediaId,
      url: `https://instagram.com/p/${mediaId}`,
      postedAt: new Date().toISOString()
    };

  } catch (error: any) {
    console.error(`[Broadcast] Error posting to Instagram:`, error);

    return {
      platform: "instagram",
      success: false,
      error: error.message || "Failed to post to Instagram",
      postedAt: new Date().toISOString()
    };
  }
}

/**
 * Post to Facebook
 * Uses Facebook/Meta OAuth 2.0 Bearer token from token storage
 * Posts to Facebook Page (requires Page access token)
 */
async function postToFacebook(
  post: BroadcastPost,
  credentials: Record<string, string>
): Promise<PostingResult> {
  try {
    const config = PLATFORM_CONFIGS.facebook;
    const prepared = preparePostForPlatform(post, "facebook");

    // Get access token from OAuth storage
    const tenantId = credentials.tenantId || "default";
    const { getAccessToken, getToken } = await import("@/lib/oauth/token-storage");
    
    let accessToken = credentials.accessToken;
    if (!accessToken) {
      accessToken = await getAccessToken(tenantId, "facebook") || "";
    }
    
    if (!accessToken) {
      return {
        platform: "facebook",
        success: false,
        error: "Facebook not connected. Please connect your Facebook account first.",
        postedAt: new Date().toISOString()
      };
    }

    // Get Facebook Page ID from token storage
    const token = await getToken(tenantId, "facebook");
    const pageId = credentials.pageId || token?.platformUserId;
    
    if (!pageId) {
      return {
        platform: "facebook",
        success: false,
        error: "Facebook Page ID not found. Please reconnect your Facebook Page.",
        postedAt: new Date().toISOString()
      };
    }

    // Post to Facebook page feed
    const feedUrl = `https://graph.facebook.com/v18.0/${pageId}/feed`;

    const postBody: any = {
      access_token: accessToken,
      message: prepared.caption.substring(0, config.maxCaptionLength),
    };

    // Add link if available
    if (prepared.trackingLink) {
      postBody.link = prepared.trackingLink;
    }

    // Add media if available
    if (post.mediaUrl) {
      if (post.mediaUrl.includes('.mp4')) {
        // For videos, use the videos endpoint
        const videoUrl = `https://graph.facebook.com/v18.0/${pageId}/videos`;

        const videoResponse = await fetch(videoUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            access_token: accessToken,
            description: prepared.caption.substring(0, config.maxCaptionLength),
            file_url: post.mediaUrl,
          }),
        });

        if (!videoResponse.ok) {
          const error = await videoResponse.text();
          throw new Error(`Facebook video upload failed: ${error}`);
        }

        const videoData = await videoResponse.json();

        console.log(`[Broadcast] Successfully posted video to Facebook: ${post.id} → ${videoData.id}`);

        return {
          platform: "facebook",
          success: true,
          platformPostId: videoData.id,
          url: `https://facebook.com/${pageId}/videos/${videoData.id}`,
          postedAt: new Date().toISOString()
        };
      } else {
        // For images, use photos endpoint
        const photoUrl = `https://graph.facebook.com/v18.0/${pageId}/photos`;

        const photoResponse = await fetch(photoUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            access_token: accessToken,
            message: prepared.caption.substring(0, config.maxCaptionLength),
            url: post.mediaUrl,
          }),
        });

        if (!photoResponse.ok) {
          const error = await photoResponse.text();
          throw new Error(`Facebook photo upload failed: ${error}`);
        }

        const photoData = await photoResponse.json();

        console.log(`[Broadcast] Successfully posted photo to Facebook: ${post.id} → ${photoData.id}`);

        return {
          platform: "facebook",
          success: true,
          platformPostId: photoData.id,
          url: `https://facebook.com/${pageId}/posts/${photoData.id}`,
          postedAt: new Date().toISOString()
        };
      }
    }

    // Text-only post
    const response = await fetch(feedUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(postBody),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Facebook post failed: ${error}`);
    }

    const data = await response.json();
    const postId = data.id;

    console.log(`[Broadcast] Successfully posted to Facebook: ${post.id} → ${postId}`);

    return {
      platform: "facebook",
      success: true,
      platformPostId: postId,
      url: `https://facebook.com/permalink.php?story_fbid=${postId.split('_')[1]}&id=${pageId}`,
      postedAt: new Date().toISOString()
    };

  } catch (error: any) {
    console.error(`[Broadcast] Error posting to Facebook:`, error);

    return {
      platform: "facebook",
      success: false,
      error: error.message || "Failed to post to Facebook",
      postedAt: new Date().toISOString()
    };
  }
}

/**
 * Post to LinkedIn
 * Uses OAuth 2.0 Bearer token from token storage
 */
async function postToLinkedIn(
  post: BroadcastPost,
  credentials: Record<string, string>
): Promise<PostingResult> {
  try {
    const config = PLATFORM_CONFIGS.linkedin;
    const prepared = preparePostForPlatform(post, "linkedin");

    // Get access token from OAuth storage
    const tenantId = credentials.tenantId || "default";
    const { getAccessToken, getToken } = await import("@/lib/oauth/token-storage");
    
    let accessToken = credentials.accessToken;
    if (!accessToken) {
      accessToken = await getAccessToken(tenantId, "linkedin") || "";
    }
    
    if (!accessToken) {
      return {
        platform: "linkedin",
        success: false,
        error: "LinkedIn not connected. Please connect your LinkedIn account first.",
        postedAt: new Date().toISOString()
      };
    }

    // Get LinkedIn user/person ID from token storage
    const token = await getToken(tenantId, "linkedin");
    const personId = credentials.personId || token?.platformUserId;
    
    if (!personId) {
      return {
        platform: "linkedin",
        success: false,
        error: "LinkedIn user ID not found. Please reconnect your LinkedIn account.",
        postedAt: new Date().toISOString()
      };
    }

    // LinkedIn UGC API endpoint
    const apiUrl = 'https://api.linkedin.com/v2/ugcPosts';

    const postBody: any = {
      author: `urn:li:person:${personId}`,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: {
            text: prepared.caption.substring(0, config.maxCaptionLength)
          },
          shareMediaCategory: post.mediaUrl ? "ARTICLE" : "NONE"
        }
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
      }
    };

    // Add media if available
    if (post.mediaUrl) {
      // First, register the media
      const mediaResponse = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0'
        },
        body: JSON.stringify({
          registerUploadRequest: {
            recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
            owner: `urn:li:person:${personId}`,
            serviceRelationships: [{
              relationshipType: 'OWNER',
              identifier: 'urn:li:userGeneratedContent'
            }]
          }
        })
      });

      if (mediaResponse.ok) {
        const mediaData = await mediaResponse.json();
        postBody.specificContent["com.linkedin.ugc.ShareContent"].media = [{
          status: "READY",
          description: { text: prepared.caption.substring(0, 100) },
          media: mediaData.value.asset,
          title: { text: post.content.substring(0, 100) }
        }];
      }
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0'
      },
      body: JSON.stringify(postBody),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`LinkedIn post failed: ${error}`);
    }

    const data = await response.json();
    const postId = data.id;

    console.log(`[Broadcast] Successfully posted to LinkedIn: ${post.id} → ${postId}`);

    return {
      platform: "linkedin",
      success: true,
      platformPostId: postId,
      url: `https://linkedin.com/feed/update/${postId}`,
      postedAt: new Date().toISOString()
    };

  } catch (error: any) {
    console.error(`[Broadcast] Error posting to LinkedIn:`, error);

    return {
      platform: "linkedin",
      success: false,
      error: error.message || "Failed to post to LinkedIn",
      postedAt: new Date().toISOString()
    };
  }
}

/**
 * Post to Twitter/X
 * Uses OAuth 2.0 Bearer token from token storage
 */
async function postToTwitter(
  post: BroadcastPost,
  credentials: Record<string, string>
): Promise<PostingResult> {
  try {
    const config = PLATFORM_CONFIGS.twitter;
    const prepared = preparePostForPlatform(post, "twitter");

    // Get access token from OAuth storage (OAuth 2.0 Bearer)
    const tenantId = credentials.tenantId || "default";
    const { getAccessToken } = await import("@/lib/oauth/token-storage");
    
    let accessToken = credentials.accessToken;
    if (!accessToken) {
      accessToken = await getAccessToken(tenantId, "twitter") || "";
    }
    
    if (!accessToken) {
      return {
        platform: "twitter",
        success: false,
        error: "Twitter not connected. Please connect your Twitter account first.",
        postedAt: new Date().toISOString()
      };
    }

    // Prepare tweet text
    const tweetText = prepared.caption.substring(0, config.maxCaptionLength);

    // Post tweet using Twitter API v2 with Bearer token
    const response = await fetch("https://api.twitter.com/2/tweets", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: tweetText }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData?.detail || 
                          errorData?.errors?.[0]?.message || 
                          `Twitter API error: ${response.status}`;
      
      console.error("[Broadcast] Twitter post failed:", errorMessage, errorData);
      
      return {
        platform: "twitter",
        success: false,
        error: errorMessage,
        postedAt: new Date().toISOString()
      };
    }

    const data = await response.json();
    const tweetId = data.data?.id;

    console.log(`[Broadcast] Successfully posted to Twitter: ${post.id} → ${tweetId}`);

    return {
      platform: "twitter",
      success: true,
      platformPostId: tweetId,
      url: `https://twitter.com/i/web/status/${tweetId}`,
      postedAt: new Date().toISOString()
    };

  } catch (error: any) {
    console.error(`[Broadcast] Error posting to Twitter:`, error);

    return {
      platform: "twitter",
      success: false,
      error: error.message || "Failed to post to Twitter",
      postedAt: new Date().toISOString()
    };
  }
}

/**
 * Post to platform (router)
 */
export async function postToPlatform(
  post: BroadcastPost,
  platform: Platform,
  credentials: Record<string, string>
): Promise<PostingResult> {
  try {
    // Validate platform support
    const config = PLATFORM_CONFIGS[platform];
    if (!config) {
      return {
        platform,
        success: false,
        error: `Platform ${platform} not supported`
      };
    }
    
    // Route to platform-specific handler
    switch (platform) {
      case "youtube":
      case "shorts":
        return await postToYouTube(post, credentials);
      case "tiktok":
        return await postToTikTok(post, credentials);
      case "instagram":
      case "reels":
        return await postToInstagram(post, credentials);
      case "facebook":
        return await postToFacebook(post, credentials);
      case "linkedin":
        return await postToLinkedIn(post, credentials);
      case "twitter":
        return await postToTwitter(post, credentials);
      default:
        return {
          platform,
          success: false,
          error: `Platform ${platform} not implemented`
        };
    }
  } catch (error: any) {
    console.error(`[Broadcast] Error posting to ${platform}:`, error);
    return {
      platform,
      success: false,
      error: error.message || "Unknown error"
    };
  }
}

/**
 * Cross-post to multiple platforms (enhanced with content prep and smart scheduling)
 */
export async function crossPost(
  post: BroadcastPost,
  platforms: Platform[],
  credentials: Record<Platform, Record<string, string>>,
  options?: {
    useSmartScheduling?: boolean;
    engagementData?: Record<Platform, {
      byHour: Record<number, number>;
      byDay: Record<number, number>;
    }>;
  }
): Promise<CrossPostResult> {
  const results: Record<string, PostingResult> = {};
  
  // Prepare platform variants (auto-formatting)
  const variants = prepareAllPlatformVariants(post, platforms);
  
  // Determine posting order (smart scheduling)
  let postingOrder = platforms;
  if (options?.useSmartScheduling) {
    const { buildAllScheduleRecommendations, determinePostingOrder } = await import("./smart-scheduler");
    const recommendations = buildAllScheduleRecommendations(
      platforms,
      undefined,
      options.engagementData
    );
    postingOrder = determinePostingOrder(recommendations);
  }
  
  // Post to platforms in optimal order (sequential for better tracking)
  for (const platform of postingOrder) {
    const variant = variants.find(v => v.platform === platform);
    if (!variant) continue;
    
    // Create platform-specific post with variant
    const platformPost: BroadcastPost = {
      ...post,
      content: variant.caption,
      metadata: {
        ...post.metadata,
        description: variant.description,
        hashtags: variant.hashtags,
        cta: variant.cta,
        trackingLink: variant.metadata.trackingLink,
        utmParams: variant.metadata.utmParams,
        funnelId: variant.metadata.funnelId
      }
    };
    
    const result = await postToPlatform(platformPost, platform, credentials[platform] || {});
    results[platform] = result;
    
    // Small delay between posts for better tracking
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  const totalSuccess = Object.values(results).filter(r => r.success).length;
  const totalFailed = Object.values(results).filter(r => !r.success).length;
  const postedAt = new Date().toISOString();
  
  // Update post status
  if (totalSuccess > 0) {
    updatePostStatus(post.id, "posted");
    
    // Store platform post IDs
    const platformPostIds: Record<string, string> = {};
    const platformUrls: Record<string, string> = {};
    
    for (const [platform, result] of Object.entries(results)) {
      if (result.success && result.platformPostId) {
        platformPostIds[platform] = result.platformPostId;
      }
      if (result.success && result.url) {
        platformUrls[platform] = result.url;
      }
    }
    
    // Update post metadata
    const updatedPost = getPost(post.id);
    if (updatedPost) {
      updatedPost.metadata = {
        ...updatedPost.metadata,
        platformPostIds,
        platformUrls
      };
      storePost(updatedPost);
    }
    
    // Emit signal
    emitSignal({
      source: "broadcast_engine",
      type: "content_posted",
      payload: {
        postId: post.id,
        platforms: platforms.filter(p => results[p]?.success),
        successCount: totalSuccess,
        failedCount: totalFailed
      },
      priority: "medium"
    });
  } else {
    updatePostStatus(post.id, "failed");
  }
  
  return {
    postId: post.id,
    results: results as Record<Platform, PostingResult>,
    totalSuccess,
    totalFailed,
    postedAt
  };
}

/**
 * Schedule post for future posting
 */
export function schedulePost(
  post: BroadcastPost,
  scheduledAt: string
): BroadcastPost {
  const scheduled = {
    ...post,
    scheduledAt,
    status: "scheduled" as const
  };
  
  storePost(scheduled);
  
  emitSignal({
    source: "broadcast_engine",
    type: "content_scheduled",
    payload: {
      postId: post.id,
      scheduledAt,
      platforms: post.platforms
    },
    priority: "low"
  });
  
  return scheduled;
}

/**
 * Process scheduled posts (call from cron job)
 */
export async function processScheduledPosts(
  credentials: Record<Platform, Record<string, string>>
): Promise<{
  processed: number;
  posted: number;
  failed: number;
}> {
  // In production, query database for scheduled posts
  // For now, this is a placeholder
  const now = new Date().toISOString();
  
  // Get scheduled posts (would query DB in production)
  // const scheduledPosts = await db.query(`
  //   SELECT * FROM broadcast_posts
  //   WHERE status = 'scheduled'
  //   AND scheduled_at <= $1
  // `, [now]);
  
  const processed = 0;
  const posted = 0;
  const failed = 0;
  
  // Process each scheduled post
  // for (const post of scheduledPosts) {
  //   try {
  //     const result = await crossPost(post, post.platforms, credentials);
  //     if (result.totalSuccess > 0) {
  //       posted++;
  //     } else {
  //       failed++;
  //     }
  //   } catch (error) {
  //     failed++;
  //   }
  //   processed++;
  // }
  
  return { processed, posted, failed };
}

/**
 * Retry failed post
 */
export async function retryPost(
  postId: string,
  platform: Platform,
  credentials: Record<string, string>
): Promise<PostingResult> {
  const post = getPost(postId);
  if (!post) {
    return {
      platform,
      success: false,
      error: "Post not found"
    };
  }
  
  return await postToPlatform(post, platform, credentials);
}
