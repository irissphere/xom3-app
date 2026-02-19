/**
 * Twitter/X Social Connector
 */

export interface TwitterPostParams {
  text: string;
  mediaId?: string;
  accessToken: string;
  accessTokenSecret: string;
}

export interface TwitterPostResult {
  success: boolean;
  tweetId?: string;
  error?: string;
}

const TWITTER_API_BASE = 'https://api.twitter.com/2';

/**
 * Post a tweet (with optional media)
 */
export async function postToTwitter(params: TwitterPostParams): Promise<TwitterPostResult> {
  const { text, mediaId, accessToken } = params;

  try {
    const body: Record<string, unknown> = { text };
    if (mediaId) {
      body.media = { media_ids: [mediaId] };
    }

    const response = await fetch(`${TWITTER_API_BASE}/tweets`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    const data = await response.json();
    return { success: true, tweetId: data.data?.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Upload media to Twitter (for video)
 * Note: Twitter video upload is complex and requires chunked upload
 */
export async function uploadTwitterMedia(
  videoUrl: string,
  accessToken: string
): Promise<{ mediaId?: string; error?: string }> {
  // Simplified - real implementation needs chunked upload
  // Twitter requires: INIT -> APPEND (chunks) -> FINALIZE -> STATUS
  console.log('Twitter video upload requires chunked upload implementation');
  return { error: 'Video upload not yet implemented' };
}

export async function getTwitterAnalytics(tweetId: string, accessToken: string): Promise<{
  impressions?: number;
  likes?: number;
  retweets?: number;
  replies?: number;
}> {
  const response = await fetch(
    `${TWITTER_API_BASE}/tweets/${tweetId}?tweet.fields=public_metrics`,
    {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    }
  );

  const data = await response.json();
  const metrics = data.data?.public_metrics;

  return {
    impressions: metrics?.impression_count,
    likes: metrics?.like_count,
    retweets: metrics?.retweet_count,
    replies: metrics?.reply_count,
  };
}
