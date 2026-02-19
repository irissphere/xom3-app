/**
 * SpaceBaddie Social Posting API
 * POST /api/spacebaddie/social/post
 * 
 * Posts content to connected social platforms
 * AKV: SpaceBaddie Sovereign - Social Posting Lane
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";
const YOUTUBE_UPLOAD_API = "https://www.googleapis.com/upload/youtube/v3";

interface PostRequest {
  platform: "youtube" | "tiktok" | "instagram" | "twitter" | "facebook" | "linkedin";
  type: "video" | "text" | "image";
  title?: string;
  description?: string;
  content?: string;
  videoUrl?: string; // URL to video file (from studio, storage, etc.)
  tags?: string[];
  privacy?: "public" | "private" | "unlisted";
  scheduledTime?: string; // ISO date for scheduled publish
}

interface PostResult {
  success: boolean;
  platform: string;
  postId?: string;
  postUrl?: string;
  error?: string;
}

/**
 * Get access token from spacebaddie_social_connections
 * 
 * Uses a lenient check: if we have tokens (access or refresh), try to use them.
 * Only reject if explicitly "disconnected" or no tokens at all.
 */
async function getAccessTokenFromDB(userId: string, platform: string): Promise<string | null> {
  const adminSupabase = getSupabaseAdminClient();
  
  const { data, error } = await adminSupabase
    .from("spacebaddie_social_connections")
    .select("access_token_hash, token_expires_at, refresh_token_hash, status, metadata")
    .eq("user_id", userId)
    .eq("platform", platform)
    .eq("tenant", "spacebaddie")
    .single();

  if (error || !data) {
    console.error(`[Social Post] No connection found for ${platform}:`, error);
    return null;
  }

  // Only reject if explicitly disconnected
  if (data.status === "disconnected") {
    console.error(`[Social Post] ${platform} explicitly disconnected`);
    return null;
  }

  const accessToken = data.access_token_hash;
  const refreshToken = data.refresh_token_hash;

  // No tokens at all means not connected
  if (!accessToken && !refreshToken) {
    console.error(`[Social Post] ${platform} has no tokens stored`);
    return null;
  }

  // Check if token is expired
  const isExpired = data.token_expires_at && new Date(data.token_expires_at) < new Date();
  
  if (isExpired || !accessToken) {
    console.log(`[Social Post] ${platform} token ${isExpired ? 'expired' : 'missing'}, attempting refresh...`);
    // Try to refresh the token
    const refreshed = await refreshAccessToken(userId, platform, refreshToken);
    if (refreshed) {
      // Also update status to connected if it was stale
      if (data.status !== "connected") {
        await adminSupabase
          .from("spacebaddie_social_connections")
          .update({ status: "connected", updated_at: new Date().toISOString() })
          .eq("user_id", userId)
          .eq("platform", platform)
          .eq("tenant", "spacebaddie");
      }
      return refreshed;
    }
    console.error(`[Social Post] ${platform} token expired/missing and refresh failed`);
    // Mark as expired in DB
    await adminSupabase
      .from("spacebaddie_social_connections")
      .update({ status: "expired", error_message: "Token expired and refresh failed", updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("platform", platform)
      .eq("tenant", "spacebaddie");
    return null;
  }

  return accessToken;
}

/**
 * Trim env vars to prevent CRLF/whitespace issues
 */
function safeEnv(key: string): string {
  return (process.env[key] || '').trim();
}

/**
 * Refresh an expired access token
 */
async function refreshAccessToken(userId: string, platform: string, refreshToken: string | null): Promise<string | null> {
  try {
    if (platform === "youtube") {
      if (!refreshToken) {
        console.warn(`[Social Post] No refresh token for YouTube, cannot refresh`);
        return null;
      }
      const clientId = safeEnv('GOOGLE_CLIENT_ID') || safeEnv('YOUTUBE_CLIENT_ID');
      const clientSecret = safeEnv('GOOGLE_CLIENT_SECRET') || safeEnv('YOUTUBE_CLIENT_SECRET');
      
      if (!clientId || !clientSecret) {
        console.error("[Social Post] YouTube refresh failed: missing GOOGLE_CLIENT_ID/SECRET env vars");
        return null;
      }

      console.log(`[Social Post] Refreshing YouTube token for user ${userId}...`);
      const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`[Social Post] YouTube token refresh failed (${response.status}):`, errText);
        return null;
      }

      const data = await response.json();
      
      if (!data.access_token) {
        console.error("[Social Post] YouTube refresh returned no access_token:", data);
        return null;
      }

      // Update the token in database
      const adminSupabase = getSupabaseAdminClient();
      const { error: updateError } = await adminSupabase
        .from("spacebaddie_social_connections")
        .update({
          access_token_hash: data.access_token,
          token_expires_at: data.expires_in 
            ? new Date(Date.now() + data.expires_in * 1000).toISOString()
            : null,
          status: "connected",
          error_message: null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .eq("platform", platform)
        .eq("tenant", "spacebaddie");

      if (updateError) {
        console.error("[Social Post] Failed to save refreshed token:", updateError);
      } else {
        console.log(`[Social Post] YouTube token refreshed successfully for user ${userId}`);
      }

      return data.access_token;
    }

    if (platform === "facebook") {
      // Facebook long-lived tokens (~60 days) cannot be refreshed; no refresh_token in Meta's flow.
      console.warn(`[Social Post] Facebook token expired. Long-lived tokens last ~60 days; user must reconnect at /spacebaddie/automation`);
      return null;
    }

    if (platform === "linkedin") {
      // LinkedIn access tokens (~60 days) do not provide refresh in this OAuth flow.
      console.warn(`[Social Post] LinkedIn token expired. User must reconnect at /spacebaddie/automation`);
      return null;
    }

    if (!refreshToken) {
      console.warn(`[Social Post] No refresh token for ${platform}, cannot refresh`);
      return null;
    }
    // Other platforms: no refresh support yet
    console.warn(`[Social Post] Token refresh not implemented for ${platform}`);
    return null;
  } catch (err) {
    console.error(`[Social Post] Token refresh error for ${platform}:`, err);
    return null;
  }
}

// ─── Platform-specific posting functions ───

/**
 * Post video to Instagram (via Meta Graph API / Reels)
 * Requires: Facebook Login with instagram_content_publish, pages_show_list
 * The access token must be a Page token with IG account connected
 */
async function postToInstagram(
  accessToken: string,
  params: PostRequest,
  userId: string,
): Promise<PostResult> {
  try {
    // Step 1: Get Facebook Pages linked to this user
    const pagesRes = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?access_token=${accessToken}`,
    );
    const pagesData = await pagesRes.json();

    if (pagesData.error) {
      return { success: false, platform: "instagram", error: `Meta API error: ${pagesData.error.message}` };
    }

    const pages = pagesData.data || [];
    if (pages.length === 0) {
      return { success: false, platform: "instagram", error: "No Facebook Page found. Connect a Page with an Instagram Business account." };
    }

    // Use first page - get its Instagram Business Account
    const pageToken = pages[0].access_token;
    const pageId = pages[0].id;

    const igRes = await fetch(
      `https://graph.facebook.com/v18.0/${pageId}?fields=instagram_business_account&access_token=${pageToken}`,
    );
    const igData = await igRes.json();

    if (!igData.instagram_business_account?.id) {
      return { success: false, platform: "instagram", error: "No Instagram Business account linked to your Facebook Page. Link one in Facebook Settings." };
    }

    const igAccountId = igData.instagram_business_account.id;

    // Step 2: Create media container
    const caption = [
      params.title || "",
      params.description || "",
      (params.tags || []).map(t => `#${t}`).join(" "),
    ].filter(Boolean).join("\n\n");

    if (params.type === "video" && params.videoUrl) {
      // Create Reel container
      const createRes = await fetch(
        `https://graph.facebook.com/v18.0/${igAccountId}/media`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            media_type: "REELS",
            video_url: params.videoUrl,
            caption,
            access_token: pageToken,
          }),
        },
      );
      const createData = await createRes.json();
      if (createData.error) {
        return { success: false, platform: "instagram", error: createData.error.message };
      }

      const containerId = createData.id;

      // Step 3: Wait for processing (poll up to 60s)
      let status = "IN_PROGRESS";
      for (let i = 0; i < 12; i++) {
        await new Promise(r => setTimeout(r, 5000));
        const statusRes = await fetch(
          `https://graph.facebook.com/v18.0/${containerId}?fields=status_code&access_token=${pageToken}`,
        );
        const statusData = await statusRes.json();
        status = statusData.status_code;
        if (status === "FINISHED") break;
        if (status === "ERROR") {
          return { success: false, platform: "instagram", error: "Instagram video processing failed" };
        }
      }

      if (status !== "FINISHED") {
        return { success: false, platform: "instagram", error: "Instagram video processing timed out" };
      }

      // Step 4: Publish
      const publishRes = await fetch(
        `https://graph.facebook.com/v18.0/${igAccountId}/media_publish`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            creation_id: containerId,
            access_token: pageToken,
          }),
        },
      );
      const publishData = await publishRes.json();
      if (publishData.error) {
        return { success: false, platform: "instagram", error: publishData.error.message };
      }

      const mediaId = publishData.id;
      // Get permalink
      const linkRes = await fetch(
        `https://graph.facebook.com/v18.0/${mediaId}?fields=permalink&access_token=${pageToken}`,
      );
      const linkData = await linkRes.json();

      return {
        success: true,
        platform: "instagram",
        postId: mediaId,
        postUrl: linkData.permalink || `https://www.instagram.com/`,
      };
    } else {
      return { success: false, platform: "instagram", error: "Instagram currently supports video/reel uploads only" };
    }
  } catch (err: any) {
    console.error("[Instagram] Post error:", err);
    return { success: false, platform: "instagram", error: err.message };
  }
}

/**
 * Post video to Facebook Page (via Meta Graph API)
 */
async function postToFacebook(
  accessToken: string,
  params: PostRequest,
): Promise<PostResult> {
  try {
    // Step 1: Get user's Pages
    const pagesRes = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?access_token=${accessToken}`,
    );
    const pagesData = await pagesRes.json();

    if (pagesData.error) {
      return { success: false, platform: "facebook", error: `Meta API error: ${pagesData.error.message}` };
    }

    const pages = pagesData.data || [];
    if (pages.length === 0) {
      return { success: false, platform: "facebook", error: "No Facebook Page found. Create a Page to post content." };
    }

    const pageToken = pages[0].access_token;
    const pageId = pages[0].id;

    const description = [
      params.title || "",
      params.description || "",
      (params.tags || []).map(t => `#${t}`).join(" "),
    ].filter(Boolean).join("\n\n");

    if (params.type === "video" && params.videoUrl) {
      // Upload video to Page
      const uploadRes = await fetch(
        `https://graph-video.facebook.com/v18.0/${pageId}/videos`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            file_url: params.videoUrl,
            title: params.title || "SpaceBaddie Video",
            description,
            access_token: pageToken,
          }),
        },
      );
      const uploadData = await uploadRes.json();

      if (uploadData.error) {
        return { success: false, platform: "facebook", error: uploadData.error.message };
      }

      return {
        success: true,
        platform: "facebook",
        postId: uploadData.id,
        postUrl: `https://www.facebook.com/${pageId}/videos/${uploadData.id}`,
      };
    } else {
      // Text post
      const postRes = await fetch(
        `https://graph.facebook.com/v18.0/${pageId}/feed`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: description,
            access_token: pageToken,
          }),
        },
      );
      const postData = await postRes.json();

      if (postData.error) {
        return { success: false, platform: "facebook", error: postData.error.message };
      }

      return {
        success: true,
        platform: "facebook",
        postId: postData.id,
        postUrl: `https://www.facebook.com/${postData.id}`,
      };
    }
  } catch (err: any) {
    console.error("[Facebook] Post error:", err);
    return { success: false, platform: "facebook", error: err.message };
  }
}

/**
 * Post to TikTok (Content Posting API)
 */
async function postToTikTok(
  accessToken: string,
  params: PostRequest,
): Promise<PostResult> {
  try {
    if (params.type !== "video" || !params.videoUrl) {
      return { success: false, platform: "tiktok", error: "TikTok requires a video" };
    }

    // Step 1: Get creator info
    const infoRes = await fetch("https://open.tiktokapis.com/v2/post/publish/creator_info/query/", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });
    const infoData = await infoRes.json();

    if (infoData.error?.code) {
      return { success: false, platform: "tiktok", error: `TikTok API: ${infoData.error.message}` };
    }

    // Step 2: Initialize video upload (pull from URL)
    const caption = [
      params.title || "",
      params.description || "",
      (params.tags || []).map(t => `#${t}`).join(" "),
    ].filter(Boolean).join(" ");

    const initRes = await fetch("https://open.tiktokapis.com/v2/post/publish/video/init/", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        post_info: {
          title: caption.substring(0, 150),
          privacy_level: "PUBLIC_TO_EVERYONE",
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
        },
        source_info: {
          source: "PULL_FROM_URL",
          video_url: params.videoUrl,
        },
      }),
    });

    const initData = await initRes.json();

    if (initData.error?.code) {
      return { success: false, platform: "tiktok", error: `TikTok publish error: ${initData.error.message}` };
    }

    const publishId = initData.data?.publish_id;

    return {
      success: true,
      platform: "tiktok",
      postId: publishId || "processing",
      postUrl: "https://www.tiktok.com",
    };
  } catch (err: any) {
    console.error("[TikTok] Post error:", err);
    return { success: false, platform: "tiktok", error: err.message };
  }
}

/**
 * Post to Twitter/X (API v2)
 */
async function postToTwitter(
  accessToken: string,
  params: PostRequest,
): Promise<PostResult> {
  try {
    const tweetText = [
      params.title || "",
      params.description || "",
      (params.tags || []).map(t => `#${t}`).join(" "),
    ].filter(Boolean).join("\n").substring(0, 280);

    if (params.type === "video" && params.videoUrl) {
      // Step 1: Upload video via Twitter media upload API (v1.1)
      // First, download the video
      const videoRes = await fetch(params.videoUrl);
      if (!videoRes.ok) {
        return { success: false, platform: "twitter", error: `Failed to fetch video: ${videoRes.status}` };
      }
      const videoBuffer = await videoRes.arrayBuffer();
      const videoSize = videoBuffer.byteLength;

      // INIT
      const initRes = await fetch("https://upload.twitter.com/1.1/media/upload.json", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          command: "INIT",
          total_bytes: videoSize.toString(),
          media_type: "video/mp4",
          media_category: "tweet_video",
        }),
      });
      const initData = await initRes.json();

      if (!initData.media_id_string) {
        return { success: false, platform: "twitter", error: "Twitter media upload init failed" };
      }
      const mediaId = initData.media_id_string;

      // APPEND (single chunk for simplicity)
      const formData = new FormData();
      formData.append("command", "APPEND");
      formData.append("media_id", mediaId);
      formData.append("segment_index", "0");
      formData.append("media_data", Buffer.from(videoBuffer).toString("base64"));

      await fetch("https://upload.twitter.com/1.1/media/upload.json", {
        method: "POST",
        headers: { "Authorization": `Bearer ${accessToken}` },
        body: formData,
      });

      // FINALIZE
      const finRes = await fetch("https://upload.twitter.com/1.1/media/upload.json", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          command: "FINALIZE",
          media_id: mediaId,
        }),
      });
      const finData = await finRes.json();

      // Wait for processing if needed
      if (finData.processing_info) {
        let checkAfter = finData.processing_info.check_after_secs || 5;
        for (let i = 0; i < 12; i++) {
          await new Promise(r => setTimeout(r, checkAfter * 1000));
          const statusRes = await fetch(
            `https://upload.twitter.com/1.1/media/upload.json?command=STATUS&media_id=${mediaId}`,
            { headers: { "Authorization": `Bearer ${accessToken}` } },
          );
          const statusData = await statusRes.json();
          if (statusData.processing_info?.state === "succeeded") break;
          if (statusData.processing_info?.state === "failed") {
            return { success: false, platform: "twitter", error: "Twitter video processing failed" };
          }
          checkAfter = statusData.processing_info?.check_after_secs || 5;
        }
      }

      // Step 2: Create tweet with media
      const tweetRes = await fetch("https://api.twitter.com/2/tweets", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: tweetText,
          media: { media_ids: [mediaId] },
        }),
      });
      const tweetData = await tweetRes.json();

      if (tweetData.errors || tweetData.detail) {
        return { success: false, platform: "twitter", error: tweetData.detail || tweetData.errors?.[0]?.message || "Tweet failed" };
      }

      const tweetId = tweetData.data?.id;
      return {
        success: true,
        platform: "twitter",
        postId: tweetId,
        postUrl: `https://x.com/i/status/${tweetId}`,
      };
    } else {
      // Text-only tweet
      const tweetRes = await fetch("https://api.twitter.com/2/tweets", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: tweetText }),
      });
      const tweetData = await tweetRes.json();

      if (tweetData.errors || tweetData.detail) {
        return { success: false, platform: "twitter", error: tweetData.detail || tweetData.errors?.[0]?.message || "Tweet failed" };
      }

      const tweetId = tweetData.data?.id;
      return {
        success: true,
        platform: "twitter",
        postId: tweetId,
        postUrl: `https://x.com/i/status/${tweetId}`,
      };
    }
  } catch (err: any) {
    console.error("[Twitter] Post error:", err);
    return { success: false, platform: "twitter", error: err.message };
  }
}

/**
 * Post to LinkedIn (Marketing API)
 */
async function postToLinkedIn(
  accessToken: string,
  params: PostRequest,
): Promise<PostResult> {
  try {
    // Step 1: Get user profile URN
    const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { "Authorization": `Bearer ${accessToken}` },
    });
    const profileData = await profileRes.json();
    const personUrn = `urn:li:person:${profileData.sub}`;

    const commentary = [
      params.title || "",
      params.description || "",
      (params.tags || []).map(t => `#${t}`).join(" "),
    ].filter(Boolean).join("\n\n");

    if (params.type === "video" && params.videoUrl) {
      // Register video upload
      const registerRes = await fetch("https://api.linkedin.com/v2/assets?action=registerUpload", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          registerUploadRequest: {
            recipes: ["urn:li:digitalmediaRecipe:feedshare-video"],
            owner: personUrn,
            serviceRelationships: [{
              relationshipType: "OWNER",
              identifier: "urn:li:userGeneratedContent",
            }],
          },
        }),
      });
      const registerData = await registerRes.json();

      if (!registerData.value) {
        return { success: false, platform: "linkedin", error: "LinkedIn video registration failed" };
      }

      const uploadUrl = registerData.value.uploadMechanism?.["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"]?.uploadUrl;
      const asset = registerData.value.asset;

      if (!uploadUrl) {
        return { success: false, platform: "linkedin", error: "No upload URL from LinkedIn" };
      }

      // Download and upload video
      const videoRes = await fetch(params.videoUrl);
      const videoBuffer = await videoRes.arrayBuffer();

      await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/octet-stream",
        },
        body: videoBuffer,
      });

      // Create post with video
      const postRes = await fetch("https://api.linkedin.com/v2/ugcPosts", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify({
          author: personUrn,
          lifecycleState: "PUBLISHED",
          specificContent: {
            "com.linkedin.ugc.ShareContent": {
              shareCommentary: { text: commentary },
              shareMediaCategory: "VIDEO",
              media: [{
                status: "READY",
                media: asset,
                title: { text: params.title || "SpaceBaddie Video" },
              }],
            },
          },
          visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
        }),
      });
      const postData = await postRes.json();

      if (postData.serviceErrorCode || postData.status >= 400) {
        return { success: false, platform: "linkedin", error: postData.message || "LinkedIn post failed" };
      }

      const activityId = (postData.id || "").replace("urn:li:ugcPost:", "").replace("urn:li:share:", "");
      return {
        success: true,
        platform: "linkedin",
        postId: postData.id,
        postUrl: `https://www.linkedin.com/feed/update/urn:li:activity:${activityId}`,
      };
    } else {
      // Text post
      const postRes = await fetch("https://api.linkedin.com/v2/ugcPosts", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify({
          author: personUrn,
          lifecycleState: "PUBLISHED",
          specificContent: {
            "com.linkedin.ugc.ShareContent": {
              shareCommentary: { text: commentary },
              shareMediaCategory: "NONE",
            },
          },
          visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
        }),
      });
      const postData = await postRes.json();

      if (postData.serviceErrorCode || postData.status >= 400) {
        return { success: false, platform: "linkedin", error: postData.message || "LinkedIn post failed" };
      }

      return {
        success: true,
        platform: "linkedin",
        postId: postData.id,
        postUrl: `https://www.linkedin.com/feed/`,
      };
    }
  } catch (err: any) {
    console.error("[LinkedIn] Post error:", err);
    return { success: false, platform: "linkedin", error: err.message };
  }
}

/**
 * Upload video to YouTube
 */
async function postToYouTube(
  accessToken: string,
  params: PostRequest
): Promise<PostResult> {
  try {
    // Step 1: Initialize resumable upload
    const metadata = {
      snippet: {
        title: params.title || "SpaceBaddie Video",
        description: params.description || "",
        tags: params.tags || ["SpaceBaddie", "AI", "avatar"],
        categoryId: "22", // People & Blogs
      },
      status: {
        privacyStatus: params.privacy || "private",
        madeForKids: false,
        selfDeclaredMadeForKids: false,
      },
    };

    // If scheduled, add publishAt
    if (params.scheduledTime && params.privacy === "private") {
      (metadata.status as any).publishAt = params.scheduledTime;
    }

    // Initialize upload session
    const initResponse = await fetch(
      `${YOUTUBE_UPLOAD_API}/videos?uploadType=resumable&part=snippet,status`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "X-Upload-Content-Type": "video/*",
        },
        body: JSON.stringify(metadata),
      }
    );

    if (!initResponse.ok) {
      const errorData = await initResponse.json().catch(() => ({}));
      return {
        success: false,
        platform: "youtube",
        error: errorData?.error?.message || `Upload init failed: ${initResponse.status}`,
      };
    }

    const uploadUrl = initResponse.headers.get("Location");
    if (!uploadUrl) {
      return { success: false, platform: "youtube", error: "No upload URL returned" };
    }

    // Step 2: Fetch the video from URL and upload
    if (!params.videoUrl) {
      return { success: false, platform: "youtube", error: "Video URL required for YouTube upload" };
    }

    console.log("[YouTube] Fetching video from:", params.videoUrl);
    const videoResponse = await fetch(params.videoUrl);
    if (!videoResponse.ok) {
      return { success: false, platform: "youtube", error: `Failed to fetch video: ${videoResponse.status}` };
    }

    const videoBuffer = await videoResponse.arrayBuffer();
    console.log("[YouTube] Video size:", videoBuffer.byteLength, "bytes");

    // Upload the video
    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "video/*",
        "Content-Length": videoBuffer.byteLength.toString(),
      },
      body: videoBuffer,
    });

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json().catch(() => ({}));
      return {
        success: false,
        platform: "youtube",
        error: errorData?.error?.message || `Upload failed: ${uploadResponse.status}`,
      };
    }

    const videoData = await uploadResponse.json();
    const videoId = videoData.id;

    console.log("[YouTube] Video uploaded successfully:", videoId);

    return {
      success: true,
      platform: "youtube",
      postId: videoId,
      postUrl: `https://www.youtube.com/watch?v=${videoId}`,
    };
  } catch (err: any) {
    console.error("[YouTube] Upload error:", err);
    return { success: false, platform: "youtube", error: err.message };
  }
}

/**
 * POST /api/spacebaddie/social/post
 * Post content to a social platform
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        ok: false,
        error: "Authentication required",
      }, { status: 401 });
    }

    const body: PostRequest = await req.json();
    const { platform, type, title, description, content, videoUrl, tags, privacy, scheduledTime } = body;

    if (!platform) {
      return NextResponse.json({
        ok: false,
        error: "Platform is required",
      }, { status: 400 });
    }

    // Get access token from database (handles refresh automatically)
    const accessToken = await getAccessTokenFromDB(user.id, platform);
    if (!accessToken) {
      // Check if there's a connection at all (for better error messages)
      const adminSupabase = getSupabaseAdminClient();
      const { data: conn } = await adminSupabase
        .from("spacebaddie_social_connections")
        .select("status, refresh_token_hash")
        .eq("user_id", user.id)
        .eq("platform", platform)
        .eq("tenant", "spacebaddie")
        .single();

      const errorMsg = !conn
        ? `${platform} not connected. Please connect your account first.`
        : conn.status === "disconnected"
          ? `${platform} was disconnected. Please reconnect your account.`
          : `${platform} session expired. Please reconnect your account to continue posting.`;

      return NextResponse.json({
        ok: false,
        error: errorMsg,
        code: !conn ? "NOT_CONNECTED" : "TOKEN_EXPIRED",
      }, { status: 400 });
    }

    let result: PostResult;

    switch (platform) {
      case "youtube":
        if (type !== "video") {
          return NextResponse.json({
            ok: false,
            error: "YouTube only supports video uploads via API",
          }, { status: 400 });
        }
        result = await postToYouTube(accessToken, body);
        break;

      case "tiktok":
        if (type !== "video") {
          return NextResponse.json({ ok: false, error: "TikTok only supports video uploads" }, { status: 400 });
        }
        result = await postToTikTok(accessToken, body);
        break;

      case "instagram":
        result = await postToInstagram(accessToken, body, user.id);
        break;

      case "twitter":
        result = await postToTwitter(accessToken, body);
        break;

      case "facebook":
        result = await postToFacebook(accessToken, body);
        break;

      case "linkedin":
        result = await postToLinkedIn(accessToken, body);
        break;

      default:
        return NextResponse.json({
          ok: false,
          error: `Unsupported platform: ${platform}`,
        }, { status: 400 });
    }

    // Update usage in database
    if (result.success) {
      const adminSupabase = getSupabaseAdminClient();
      const today = new Date().toISOString().split("T")[0];
      
      // Get current posts_today
      const { data: connection } = await adminSupabase
        .from("spacebaddie_social_connections")
        .select("posts_today, last_reset_date")
        .eq("user_id", user.id)
        .eq("platform", platform)
        .eq("tenant", "spacebaddie")
        .single();

      const needsReset = connection?.last_reset_date !== today;
      const newPostsToday = needsReset ? 1 : (connection?.posts_today || 0) + 1;

      await adminSupabase
        .from("spacebaddie_social_connections")
        .update({
          posts_today: newPostsToday,
          last_post_at: new Date().toISOString(),
          last_reset_date: today,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .eq("platform", platform)
        .eq("tenant", "spacebaddie");
    }

    return NextResponse.json({
      ok: result.success,
      ...result,
    }, { status: result.success ? 200 : 500 });

  } catch (err: any) {
    console.error("[Social Post] Error:", err);
    return NextResponse.json({
      ok: false,
      error: err.message || "Failed to post",
    }, { status: 500 });
  }
}

/**
 * GET /api/spacebaddie/social/post
 * Get posting status/limits for user
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        ok: false,
        error: "Authentication required",
      }, { status: 401 });
    }

    const adminSupabase = getSupabaseAdminClient();
    const { data: connections } = await adminSupabase
      .from("spacebaddie_social_connections")
      .select("platform, status, daily_limit, posts_today, last_reset_date")
      .eq("user_id", user.id)
      .eq("tenant", "spacebaddie");

    const today = new Date().toISOString().split("T")[0];
    
    const platforms = (connections || []).map(c => ({
      platform: c.platform,
      connected: c.status === "connected",
      postsToday: c.last_reset_date === today ? (c.posts_today || 0) : 0,
      dailyLimit: c.daily_limit || 3,
      canPost: c.status === "connected" && 
        (c.last_reset_date !== today || (c.posts_today || 0) < (c.daily_limit || 3)),
    }));

    return NextResponse.json({
      ok: true,
      platforms,
    });

  } catch (err: any) {
    console.error("[Social Post] GET error:", err);
    return NextResponse.json({
      ok: false,
      error: err.message,
    }, { status: 500 });
  }
}
