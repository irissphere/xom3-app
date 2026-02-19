/**
 * Twitter/X Publisher
 * Posts tweets using Twitter API v2
 * AKV: Social Sovereign - Twitter Lane
 */

import { getAccessToken, markTokenUsed } from "@/lib/oauth/token-storage";

// Export the interface
export interface TwitterPostResult {
  success: boolean;
  tweetId?: string;
  tweetUrl?: string;
  error?: string;
}

export interface TwitterPostOptions {
  tenantId?: string;
  mediaIds?: string[];
  replyTo?: string;
  quoteTweetId?: string;
}

/**
 * Post a tweet to Twitter/X
 */
export async function postTweet(
  content: string,
  options: TwitterPostOptions = {}
): Promise<TwitterPostResult> {
  const tenantId = options.tenantId || "default";
  
  try {
    // Get access token
    const accessToken = await getAccessToken(tenantId, "twitter");
    if (!accessToken) {
      return {
        success: false,
        error: "Twitter not connected. Please connect your Twitter account first.",
      };
    }

    // Build tweet payload
    const tweetPayload: Record<string, any> = {
      text: content,
    };

    // Add media if provided
    if (options.mediaIds && options.mediaIds.length > 0) {
      tweetPayload.media = { media_ids: options.mediaIds };
    }

    // Add reply context if provided
    if (options.replyTo) {
      tweetPayload.reply = { in_reply_to_tweet_id: options.replyTo };
    }

    // Add quote tweet if provided
    if (options.quoteTweetId) {
      tweetPayload.quote_tweet_id = options.quoteTweetId;
    }

    // Post tweet using Twitter API v2
    const response = await fetch("https://api.twitter.com/2/tweets", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(tweetPayload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData?.detail || 
                          errorData?.errors?.[0]?.message || 
                          `Twitter API error: ${response.status}`;
      
      console.error("[Twitter] Post failed:", errorMessage, errorData);
      
      return {
        success: false,
        error: errorMessage,
      };
    }

    const data = await response.json();
    const tweetId = data.data?.id;

    // Mark token as used
    await markTokenUsed(tenantId, "twitter");

    console.log("[Twitter] Tweet posted successfully:", tweetId);

    return {
      success: true,
      tweetId,
      tweetUrl: `https://twitter.com/i/web/status/${tweetId}`,
    };
  } catch (error: any) {
    console.error("[Twitter] Post error:", error);
    return {
      success: false,
      error: error.message || "Failed to post tweet",
    };
  }
}

/**
 * Upload media to Twitter (for images/videos)
 * Note: Twitter v2 doesn't have media upload yet, uses v1.1 endpoint
 */
export async function uploadTwitterMedia(
  mediaData: Buffer,
  mediaType: string,
  tenantId: string = "default"
): Promise<{ success: boolean; mediaId?: string; error?: string }> {
  const accessToken = await getAccessToken(tenantId, "twitter");
  if (!accessToken) {
    return { success: false, error: "Twitter not connected" };
  }

  try {
    // Twitter media upload uses v1.1 API with OAuth 1.0a
    // For now, return error - media upload requires different auth
    return {
      success: false,
      error: "Media upload not yet implemented - requires OAuth 1.0a credentials",
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Delete a tweet
 */
export async function deleteTweet(
  tweetId: string,
  tenantId: string = "default"
): Promise<{ success: boolean; error?: string }> {
  const accessToken = await getAccessToken(tenantId, "twitter");
  if (!accessToken) {
    return { success: false, error: "Twitter not connected" };
  }

  try {
    const response = await fetch(`https://api.twitter.com/2/tweets/${tweetId}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData?.detail || `Failed to delete tweet: ${response.status}`,
      };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get authenticated user info
 */
export async function getTwitterUser(
  tenantId: string = "default"
): Promise<{ success: boolean; user?: any; error?: string }> {
  const accessToken = await getAccessToken(tenantId, "twitter");
  if (!accessToken) {
    return { success: false, error: "Twitter not connected" };
  }

  try {
    const response = await fetch(
      "https://api.twitter.com/2/users/me?user.fields=profile_image_url,username,name,description",
      {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      return { success: false, error: `Failed to get user: ${response.status}` };
    }

    const data = await response.json();
    return { success: true, user: data.data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Types are already exported above