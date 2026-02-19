/**
 * LinkedIn Publisher
 * Posts to LinkedIn using LinkedIn Marketing/Share API
 * AKV: Social Sovereign - LinkedIn Lane
 */

import { getAccessToken, getToken, markTokenUsed } from "@/lib/oauth/token-storage";

export interface LinkedInPostResult {
  success: boolean;
  postId?: string;
  postUrl?: string;
  error?: string;
}

export interface LinkedInPostOptions {
  tenantId?: string;
  mediaUrl?: string;
  articleUrl?: string;
  visibility?: "PUBLIC" | "CONNECTIONS";
}

/**
 * Post to LinkedIn
 */
export async function postToLinkedIn(
  content: string,
  options: LinkedInPostOptions = {}
): Promise<LinkedInPostResult> {
  const tenantId = options.tenantId || "default";

  try {
    // Get access token
    const accessToken = await getAccessToken(tenantId, "linkedin");
    if (!accessToken) {
      return {
        success: false,
        error: "LinkedIn not connected. Please connect your LinkedIn account first.",
      };
    }

    // Get LinkedIn user/person ID from token storage
    const token = await getToken(tenantId, "linkedin");
    const personId = token?.platformUserId;

    if (!personId) {
      return {
        success: false,
        error: "LinkedIn user ID not found. Please reconnect your LinkedIn account.",
      };
    }

    // Build post payload using LinkedIn UGC API
    const postPayload: any = {
      author: `urn:li:person:${personId}`,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: {
            text: content.substring(0, 3000), // LinkedIn limit
          },
          shareMediaCategory: options.mediaUrl || options.articleUrl ? "ARTICLE" : "NONE",
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": options.visibility || "PUBLIC",
      },
    };

    // Add article/link if provided
    if (options.articleUrl) {
      postPayload.specificContent["com.linkedin.ugc.ShareContent"].media = [
        {
          status: "READY",
          originalUrl: options.articleUrl,
        },
      ];
    }

    // Post using LinkedIn UGC API
    const response = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(postPayload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage =
        errorData?.message ||
        errorData?.error ||
        `LinkedIn API error: ${response.status}`;

      console.error("[LinkedIn] Post failed:", errorMessage, errorData);

      return {
        success: false,
        error: errorMessage,
      };
    }

    const data = await response.json();
    const postId = data.id;

    // Mark token as used
    await markTokenUsed(tenantId, "linkedin");

    console.log("[LinkedIn] Post published successfully:", postId);

    return {
      success: true,
      postId,
      postUrl: `https://linkedin.com/feed/update/${postId}`,
    };
  } catch (error: any) {
    console.error("[LinkedIn] Post error:", error);
    return {
      success: false,
      error: error.message || "Failed to post to LinkedIn",
    };
  }
}

/**
 * Get authenticated user info
 */
export async function getLinkedInUser(
  tenantId: string = "default"
): Promise<{ success: boolean; user?: any; error?: string }> {
  const accessToken = await getAccessToken(tenantId, "linkedin");
  if (!accessToken) {
    return { success: false, error: "LinkedIn not connected" };
  }

  try {
    const response = await fetch("https://api.linkedin.com/v2/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      return { success: false, error: `Failed to get user: ${response.status}` };
    }

    const data = await response.json();
    return {
      success: true,
      user: {
        id: data.id,
        firstName: data.localizedFirstName,
        lastName: data.localizedLastName,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Types are already exported above