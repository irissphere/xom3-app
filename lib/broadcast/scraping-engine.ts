// Broadcast Engine - Scraping & Ingestion Engine
// Captures engagement signals from platforms

import { ScrapedEngagement, Platform, EngagementMetrics, BroadcastPost } from "./types";

/**
 * Scrape comments from platform
 */
export async function scrapeComments(
  postId: string,
  platform: Platform,
  since?: string
): Promise<ScrapedEngagement[]> {
  try {
    console.log(`[Broadcast] Scraping comments for ${postId} on ${platform}${since ? ` since ${since}` : ""}`);

    switch (platform) {
      case "youtube":
        return await scrapeYouTubeComments(postId, since);
      case "twitter":
        return await scrapeTwitterComments(postId, since);
      case "instagram":
        return await scrapeInstagramComments(postId, since);
      case "facebook":
        return await scrapeFacebookComments(postId, since);
      case "tiktok":
        return await scrapeTikTokComments(postId, since);
      case "linkedin":
        return await scrapeLinkedInComments(postId, since);
      default:
        console.warn(`[Broadcast] Unsupported platform for comment scraping: ${platform}`);
        return [];
    }
  } catch (error: any) {
    console.error(`[Broadcast] Error scraping comments for ${platform}:`, error);
    return [];
  }
}

/**
 * Scrape likes/reactions
 */
export async function scrapeLikes(
  postId: string,
  platform: Platform,
  since?: string
): Promise<ScrapedEngagement[]> {
  try {
    console.log(`[Broadcast] Scraping likes for ${postId} on ${platform}`);

    switch (platform) {
      case "youtube":
        return await scrapeYouTubeLikes(postId, since);
      case "twitter":
        return await scrapeTwitterLikes(postId, since);
      case "instagram":
        return await scrapeInstagramLikes(postId, since);
      case "facebook":
        return await scrapeFacebookLikes(postId, since);
      case "tiktok":
        return await scrapeTikTokLikes(postId, since);
      case "linkedin":
        return await scrapeLinkedInLikes(postId, since);
      default:
        console.warn(`[Broadcast] Unsupported platform for likes scraping: ${platform}`);
        return [];
    }
  } catch (error: any) {
    console.error(`[Broadcast] Error scraping likes for ${platform}:`, error);
    return [];
  }
}

/**
 * Scrape shares
 */
export async function scrapeShares(
  postId: string,
  platform: Platform,
  since?: string
): Promise<ScrapedEngagement[]> {
  console.log(`[Broadcast] Scraping shares for ${postId} on ${platform}`);
  await new Promise(resolve => setTimeout(resolve, 500));
  return [];
}

/**
 * Scrape DMs
 */
export async function scrapeDMs(
  platform: Platform,
  since?: string
): Promise<ScrapedEngagement[]> {
  console.log(`[Broadcast] Scraping DMs for ${platform}`);
  await new Promise(resolve => setTimeout(resolve, 500));
  return [];
}

/**
 * Scrape mentions
 */
export async function scrapeMentions(
  platform: Platform,
  since?: string
): Promise<ScrapedEngagement[]> {
  console.log(`[Broadcast] Scraping mentions for ${platform}`);
  await new Promise(resolve => setTimeout(resolve, 500));
  return [];
}

/**
 * Scrape analytics (views, saves, follows, watch time, retention)
 */
export async function scrapeAnalytics(
  postId: string,
  platform: Platform
): Promise<EngagementMetrics & {
  watchTime?: number; // seconds
  averageWatchPercentage?: number; // 0-100
  retentionCurve?: number[]; // percentage at each 10% interval
}> {
  // Placeholder - integrate with:
  // - YouTube Analytics API
  // - TikTok Analytics API
  // - Instagram Insights API
  // - Facebook Insights API
  // - LinkedIn Analytics API
  // - Twitter Analytics API
  
  console.log(`[Broadcast] Scraping analytics for ${postId} on ${platform}`);
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return {
    likes: 0,
    comments: 0,
    shares: 0,
    saves: 0,
    views: 0,
    follows: 0,
    mentions: 0,
    dms: 0,
    replies: 0,
    lastScrapedAt: new Date().toISOString(),
    watchTime: 0,
    averageWatchPercentage: 0,
    retentionCurve: [100, 95, 90, 85, 80, 75, 70, 65, 60, 55] // Placeholder curve
  };
}

/**
 * Scrape all engagement for a post
 */
export async function scrapePostEngagement(
  postId: string,
  platform: Platform,
  since?: string
): Promise<{
  engagements: ScrapedEngagement[];
  metrics: EngagementMetrics & {
    watchTime?: number;
    averageWatchPercentage?: number;
    retentionCurve?: number[];
  };
}> {
  const [comments, likes, shares, dms, mentions] = await Promise.all([
    scrapeComments(postId, platform, since),
    scrapeLikes(postId, platform, since),
    scrapeShares(postId, platform, since),
    scrapeDMs(platform, since),
    scrapeMentions(platform, since)
  ]);
  
  const analytics = await scrapeAnalytics(postId, platform);
  
  const allEngagements = [
    ...comments,
    ...likes,
    ...shares,
    ...dms,
    ...mentions
  ];
  
  // Store raw signals for audit
  const { storeRawSignal } = await import("./signal-store");
  for (const engagement of allEngagements) {
    storeRawSignal(platform, {
      type: engagement.type,
      content: engagement.content,
      userId: engagement.userId,
      username: engagement.username,
      timestamp: engagement.timestamp
    });
  }
  
  return {
    engagements: allEngagements,
    metrics: analytics
  };
}

/**
 * Calculate engagement deltas (new since last scrape)
 */
export function calculateEngagementDeltas(
  oldMetrics: EngagementMetrics,
  newMetrics: EngagementMetrics
): Partial<EngagementMetrics> {
  return {
    likes: Math.max(0, newMetrics.likes - (oldMetrics.likes || 0)),
    comments: Math.max(0, newMetrics.comments - (oldMetrics.comments || 0)),
    shares: Math.max(0, newMetrics.shares - (oldMetrics.shares || 0)),
    saves: Math.max(0, newMetrics.saves - (oldMetrics.saves || 0)),
    views: Math.max(0, newMetrics.views - (oldMetrics.views || 0)),
    follows: Math.max(0, newMetrics.follows - (oldMetrics.follows || 0)),
    mentions: Math.max(0, newMetrics.mentions - (oldMetrics.mentions || 0)),
    dms: Math.max(0, newMetrics.dms - (oldMetrics.dms || 0)),
    replies: Math.max(0, newMetrics.replies - (oldMetrics.replies || 0))
  };
}

/**
 * Perform sentiment analysis on engagement
 */
export function analyzeSentiment(content: string): {
  sentiment: "positive" | "neutral" | "negative";
  score: number; // -1 to 1
} {
  // Simple keyword-based sentiment (in production, use NLP library)
  const positiveWords = ["love", "great", "amazing", "awesome", "helpful", "thanks", "thank", "perfect", "excellent"];
  const negativeWords = ["hate", "terrible", "awful", "bad", "worst", "disappointed", "frustrated"];

  const lower = content.toLowerCase();
  const positiveCount = positiveWords.filter(word => lower.includes(word)).length;
  const negativeCount = negativeWords.filter(word => lower.includes(word)).length;

  if (positiveCount > negativeCount) {
    return { sentiment: "positive", score: Math.min(1, positiveCount / 10) };
  } else if (negativeCount > positiveCount) {
    return { sentiment: "negative", score: Math.max(-1, -negativeCount / 10) };
  }

  return { sentiment: "neutral", score: 0 };
}

// ============================================================================
// Platform-Specific Scraping Implementations
// ============================================================================

/**
 * Scrape YouTube comments
 */
async function scrapeYouTubeComments(postId: string, since?: string): Promise<ScrapedEngagement[]> {
  // Get access token for YouTube API
  const { getAccessToken } = await import("@/lib/oauth/token-storage");
  const accessToken = await getAccessToken("demo-user", "youtube"); // TODO: Get from context

  if (!accessToken) {
    console.warn("[Broadcast] No YouTube access token available");
    return [];
  }

  const { google } = await import('googleapis');
  const youtube = google.youtube('v3');

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });

  try {
    const response = await youtube.commentThreads.list({
      auth: oauth2Client,
      part: ['snippet'],
      videoId: postId,
      maxResults: 100,
      order: 'relevance',
    });

    return (response.data.items || []).map((item: any) => ({
      id: item.id,
      postId: postId,
      platform: "youtube" as Platform,
      type: "comment" as const,
      content: item.snippet.topLevelComment.snippet.textDisplay,
      userId: item.snippet.topLevelComment.snippet.authorChannelId?.value,
      username: item.snippet.topLevelComment.snippet.authorDisplayName,
      timestamp: item.snippet.topLevelComment.snippet.publishedAt,
      metadata: {
        commentId: item.snippet.topLevelComment.id,
        videoId: postId,
      }
    }));
  } catch (error) {
    console.error("[Broadcast] YouTube comment scraping failed:", error);
    return [];
  }
}

/**
 * Scrape Twitter comments (replies)
 */
async function scrapeTwitterComments(postId: string, since?: string): Promise<ScrapedEngagement[]> {
  const accessToken = await import("@/lib/oauth/token-storage").then(m => m.getAccessToken("demo-user", "twitter"));

  if (!accessToken) {
    console.warn("[Broadcast] No Twitter access token available");
    return [];
  }

  const { TwitterApi } = await import('twitter-api-v2');
  const twitterClient = new TwitterApi({ appKey: process.env.TWITTER_CLIENT_ID!, appSecret: process.env.TWITTER_CLIENT_SECRET! });
  const userClient = twitterClient.readOnly;

  try {
    const response = await userClient.v2.search(`conversation_id:${postId}`, {
      max_results: 100,
      'tweet.fields': ['author_id', 'created_at', 'public_metrics', 'text'],
      'user.fields': ['username', 'name'],
    });

    const engagements: ScrapedEngagement[] = [];

    for (const tweet of (response.data as unknown as any[]) || []) {
      if (tweet.id === postId) continue; // Skip the original tweet

      const author = response.includes?.users?.find(u => u.id === tweet.author_id);

      engagements.push({
        id: tweet.id,
        postId: postId,
        platform: "twitter" as Platform,
        type: "comment" as const,
        content: tweet.text,
        userId: tweet.author_id,
        username: author?.name || 'Unknown',
        timestamp: tweet.created_at!,
        metadata: {
          tweetId: tweet.id,
          conversationId: postId,
        }
      });
    }

    return engagements;
  } catch (error) {
    console.error("[Broadcast] Twitter comment scraping failed:", error);
    return [];
  }
}

/**
 * Scrape Instagram comments
 */
async function scrapeInstagramComments(postId: string, since?: string): Promise<ScrapedEngagement[]> {
  const accessToken = await import("@/lib/oauth/token-storage").then(m => m.getAccessToken("demo-user", "instagram"));

  if (!accessToken) {
    console.warn("[Broadcast] No Instagram access token available");
    return [];
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${postId}/comments?fields=id,text,username,timestamp,like_count&access_token=${accessToken}`
    );

    if (!response.ok) {
      console.error(`[Broadcast] Instagram API error: ${response.status}`);
      return [];
    }

    const data = await response.json();

    return (data.data || []).map((comment: any) => ({
      id: comment.id,
      postId: postId,
      platform: "instagram" as Platform,
      type: "comment" as const,
      content: comment.text,
      userId: comment.id.split('_')[0], // Extract user ID
      username: comment.username,
      timestamp: comment.timestamp,
      metadata: {
        commentId: comment.id,
        mediaId: postId,
      }
    }));
  } catch (error) {
    console.error("[Broadcast] Instagram comment scraping failed:", error);
    return [];
  }
}

/**
 * Scrape Facebook comments
 */
async function scrapeFacebookComments(postId: string, since?: string): Promise<ScrapedEngagement[]> {
  const accessToken = await import("@/lib/oauth/token-storage").then(m => m.getAccessToken("demo-user", "facebook"));

  if (!accessToken) {
    console.warn("[Broadcast] No Facebook access token available");
    return [];
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${postId}/comments?fields=id,message,from,created_time,like_count&access_token=${accessToken}`
    );

    if (!response.ok) {
      console.error(`[Broadcast] Facebook API error: ${response.status}`);
      return [];
    }

    const data = await response.json();

    return (data.data || []).map((comment: any) => ({
      id: comment.id,
      postId: postId,
      platform: "facebook" as Platform,
      type: "comment" as const,
      content: comment.message,
      userId: comment.from?.id,
      username: comment.from?.name || 'Unknown',
      timestamp: comment.created_time,
      metadata: {
        commentId: comment.id,
        postId: postId,
      }
    }));
  } catch (error) {
    console.error("[Broadcast] Facebook comment scraping failed:", error);
    return [];
  }
}

/**
 * Scrape TikTok comments
 */
async function scrapeTikTokComments(postId: string, since?: string): Promise<ScrapedEngagement[]> {
  const accessToken = await import("@/lib/oauth/token-storage").then(m => m.getAccessToken("demo-user", "tiktok"));

  if (!accessToken) {
    console.warn("[Broadcast] No TikTok access token available");
    return [];
  }

  try {
    const response = await fetch(
      `https://open.tiktokapis.com/v2/research/video/comment/list/?video_id=${postId}&max_count=100`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error(`[Broadcast] TikTok API error: ${response.status}`);
      return [];
    }

    const data = await response.json();

    return (data.data?.comments || []).map((comment: any) => ({
      id: comment.id,
      postId: postId,
      platform: "tiktok" as Platform,
      type: "comment" as const,
      content: comment.text,
      userId: comment.user?.id,
      username: comment.user?.display_name || 'Unknown',
      timestamp: comment.create_time,
      metadata: {
        commentId: comment.id,
        videoId: postId,
      }
    }));
  } catch (error) {
    console.error("[Broadcast] TikTok comment scraping failed:", error);
    return [];
  }
}

/**
 * Scrape LinkedIn comments
 */
async function scrapeLinkedInComments(postId: string, since?: string): Promise<ScrapedEngagement[]> {
  const accessToken = await import("@/lib/oauth/token-storage").then(m => m.getAccessToken("demo-user", "linkedin"));

  if (!accessToken) {
    console.warn("[Broadcast] No LinkedIn access token available");
    return [];
  }

  try {
    const response = await fetch(
      `https://api.linkedin.com/v2/socialActions/${postId}/comments`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
        },
      }
    );

    if (!response.ok) {
      console.error(`[Broadcast] LinkedIn API error: ${response.status}`);
      return [];
    }

    const data = await response.json();

    return (data.elements || []).map((comment: any) => ({
      id: comment.id,
      postId: postId,
      platform: "linkedin" as Platform,
      type: "comment" as const,
      content: comment.message?.text || '',
      userId: comment.actor?.urn,
      username: comment.actor?.name?.text || 'Unknown',
      timestamp: comment.created?.time,
      metadata: {
        commentId: comment.id,
        postId: postId,
      }
    }));
  } catch (error) {
    console.error("[Broadcast] LinkedIn comment scraping failed:", error);
    return [];
  }
}

// Stub implementations for missing functions
// TODO: Implement actual scraping logic

async function scrapeYouTubeLikes(postId: string, since?: string): Promise<ScrapedEngagement[]> {
  console.log(`[Broadcast] YouTube likes scraping not implemented for ${postId}`);
  return [];
}

async function scrapeTwitterLikes(postId: string, since?: string): Promise<ScrapedEngagement[]> {
  console.log(`[Broadcast] Twitter likes scraping not implemented for ${postId}`);
  return [];
}

async function scrapeInstagramLikes(postId: string, since?: string): Promise<ScrapedEngagement[]> {
  console.log(`[Broadcast] Instagram likes scraping not implemented for ${postId}`);
  return [];
}

async function scrapeFacebookLikes(postId: string, since?: string): Promise<ScrapedEngagement[]> {
  console.log(`[Broadcast] Facebook likes scraping not implemented for ${postId}`);
  return [];
}

async function scrapeTikTokLikes(postId: string, since?: string): Promise<ScrapedEngagement[]> {
  console.log(`[Broadcast] TikTok likes scraping not implemented for ${postId}`);
  return [];
}

async function scrapeLinkedInLikes(postId: string, since?: string): Promise<ScrapedEngagement[]> {
  console.log(`[Broadcast] LinkedIn likes scraping not implemented for ${postId}`);
  return [];
}
