/**
 * SpaceBaddie Scheduled Post Processor
 * POST /api/spacebaddie/social/schedule/process
 * 
 * Processes due scheduled posts - should be called by cron every 5 minutes
 * AKV: SpaceBaddie Sovereign - Scheduler Processor
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60; // 1 minute max

const YOUTUBE_UPLOAD_API = "https://www.googleapis.com/upload/youtube/v3";

/**
 * Refresh an expired YouTube access token using the refresh token.
 * Returns the new access token or null on failure.
 */
async function refreshAccessToken(
  adminSupabase: ReturnType<typeof getSupabaseAdminClient>,
  userId: string,
  platform: string,
  refreshToken: string
): Promise<string | null> {
  if (!refreshToken) {
    console.warn(`[Scheduler] No refresh token for ${platform}`);
    return null;
  }

  try {
    if (platform === "youtube") {
      const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

      if (!clientId || !clientSecret) {
        console.error("[Scheduler] Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET");
        return null;
      }

      console.log(`[Scheduler] Refreshing YouTube token for user ${userId}...`);
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
        console.error(`[Scheduler] YouTube token refresh failed (${response.status}):`, errText);
        return null;
      }

      const data = await response.json();

      if (!data.access_token) {
        console.error("[Scheduler] YouTube refresh returned no access_token:", data);
        return null;
      }

      // Persist the refreshed token and new expiry
      const expiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString();
      const { error: updateError } = await adminSupabase
        .from("spacebaddie_social_connections")
        .update({
          access_token_hash: data.access_token,
          token_expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .eq("platform", platform)
        .eq("tenant", "spacebaddie");

      if (updateError) {
        console.error("[Scheduler] Failed to save refreshed token:", updateError);
      } else {
        console.log(`[Scheduler] YouTube token refreshed, expires at ${expiresAt}`);
      }

      return data.access_token;
    }

    // Other platforms not yet supported for refresh
    return null;
  } catch (err: any) {
    console.error(`[Scheduler] Token refresh error:`, err.message);
    return null;
  }
}

/**
 * Resolve a valid access token for a given user+platform.
 * If the stored token is expired, attempts a refresh automatically.
 */
async function resolveAccessToken(
  adminSupabase: ReturnType<typeof getSupabaseAdminClient>,
  userId: string,
  platform: string
): Promise<string | null> {
  const { data: connection } = await adminSupabase
    .from("spacebaddie_social_connections")
    .select("access_token_hash, refresh_token_hash, token_expires_at")
    .eq("user_id", userId)
    .eq("platform", platform)
    .eq("tenant", "spacebaddie")
    .eq("status", "connected")
    .single();

  if (!connection) {
    return null;
  }

  const { access_token_hash, refresh_token_hash, token_expires_at } = connection;

  // Check if token is expired or about to expire (5-minute buffer)
  const isExpired =
    token_expires_at && new Date(token_expires_at).getTime() < Date.now() + 5 * 60 * 1000;

  if (isExpired || !access_token_hash) {
    console.log(
      `[Scheduler] Token ${isExpired ? "expired" : "missing"} for ${platform}, refreshing...`
    );
    if (refresh_token_hash) {
      return await refreshAccessToken(adminSupabase, userId, platform, refresh_token_hash);
    }
    console.warn(`[Scheduler] No refresh token available for ${platform}`);
    return null;
  }

  return access_token_hash;
}

/**
 * Process a single post to YouTube
 */
async function postToYouTube(
  accessToken: string,
  post: any
): Promise<{ success: boolean; postId?: string; postUrl?: string; error?: string }> {
  try {
    // Parse caption for title and description
    // Actual column: post.caption (not content_text), post.video_url (not content_url)
    const caption = post.caption || "";
    const lines = caption.split("\n");
    const title = lines[0] || "SpaceBaddie Video";
    const description = lines.slice(1).join("\n").trim() || "";

    // Parse hashtags from the hashtags column
    const hashtagStr = post.hashtags || "";
    const tags = hashtagStr
      ? hashtagStr.split(/[#,\s]+/).filter((t: string) => t.trim())
      : ["SpaceBaddie"];

    const ytMetadata = {
      snippet: {
        title,
        description,
        tags,
        categoryId: "22",
      },
      status: {
        privacyStatus: "public",
        madeForKids: false,
        selfDeclaredMadeForKids: false,
      },
    };

    // Initialize upload
    const initResponse = await fetch(
      `${YOUTUBE_UPLOAD_API}/videos?uploadType=resumable&part=snippet,status`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "X-Upload-Content-Type": "video/*",
        },
        body: JSON.stringify(ytMetadata),
      }
    );

    if (!initResponse.ok) {
      const errorData = await initResponse.json().catch(() => ({}));
      return {
        success: false,
        error: errorData?.error?.message || `Upload init failed: ${initResponse.status}`,
      };
    }

    const uploadUrl = initResponse.headers.get("Location");
    if (!uploadUrl) {
      return { success: false, error: "No upload URL returned" };
    }

    // Fetch the video (column: video_url)
    if (!post.video_url) {
      return { success: false, error: "No video URL" };
    }

    console.log("[Scheduler] Fetching video from:", post.video_url);
    const videoResponse = await fetch(post.video_url);
    if (!videoResponse.ok) {
      return { success: false, error: `Failed to fetch video: ${videoResponse.status}` };
    }

    const videoBuffer = await videoResponse.arrayBuffer();
    console.log("[Scheduler] Video size:", videoBuffer.byteLength, "bytes");

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
        error: errorData?.error?.message || `Upload failed: ${uploadResponse.status}`,
      };
    }

    const videoData = await uploadResponse.json();
    return {
      success: true,
      postId: videoData.id,
      postUrl: `https://www.youtube.com/watch?v=${videoData.id}`,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * POST /api/spacebaddie/social/schedule/process
 * Process due scheduled posts
 * 
 * Optional query params:
 * - secret: Authorization secret (for cron jobs)
 * - limit: Max posts to process (default 10)
 */
export async function POST(req: NextRequest) {
  try {
    // Simple auth check for cron jobs
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET || process.env.OPERATOR_KEY;
    
    // Allow internal calls or calls with correct secret
    const isAuthorized = 
      authHeader === `Bearer ${cronSecret}` ||
      req.headers.get("x-vercel-cron") === "1" || // Vercel Cron
      process.env.NODE_ENV === "development";

    if (!isAuthorized && cronSecret) {
      return NextResponse.json({
        ok: false,
        error: "Unauthorized",
      }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "10");

    const adminSupabase = getSupabaseAdminClient();
    const now = new Date().toISOString();

    // Find posts that are due (scheduled_at <= now and status = queued)
    const { data: duePosts, error: fetchError } = await adminSupabase
      .from("spacebaddie_post_queue")
      .select("*, spacebaddie_social_connections!inner(access_token_hash, platform)")
      .eq("status", "queued")
      .lte("scheduled_at", now)
      .limit(limit);

    if (fetchError) {
      console.error("[Scheduler] Fetch error:", fetchError);
      // Try simpler query without join
      const { data: simplePosts } = await adminSupabase
        .from("spacebaddie_post_queue")
        .select("*")
        .eq("status", "queued")
        .lte("scheduled_at", now)
        .limit(limit);
      
      if (!simplePosts || simplePosts.length === 0) {
        return NextResponse.json({
          ok: true,
          processed: 0,
          message: "No posts due",
        });
      }

      // Process each post
      const results: { postId: string; success: boolean; error?: string }[] = [];

      for (const post of simplePosts) {
        // Each post row is for a single platform (column: platform, singular)
        const platform = post.platform;
        if (!platform) {
          results.push({ postId: post.id, success: false, error: "No platform set" });
          continue;
        }

        // Resolve a valid access token (auto-refreshes if expired)
        const accessToken = await resolveAccessToken(adminSupabase, post.user_id, platform);

        if (!accessToken) {
          results.push({
            postId: post.id,
            success: false,
            error: `No valid ${platform} token (expired or not connected)`,
          });
          // Mark failed so we don't retry endlessly
          await adminSupabase
            .from("spacebaddie_post_queue")
            .update({ status: "failed", error_message: `No valid ${platform} token` })
            .eq("id", post.id);
          continue;
        }

        // Mark as posting
        await adminSupabase
          .from("spacebaddie_post_queue")
          .update({ status: "posting" })
          .eq("id", post.id);

        let result;
        if (platform === "youtube") {
          result = await postToYouTube(accessToken, post);
        } else {
          result = { success: false, error: `${platform} not implemented` };
        }

        // Update post status
        await adminSupabase
          .from("spacebaddie_post_queue")
          .update({
            status: result.success ? "posted" : "failed",
            posted_at: result.success ? now : null,
            post_id: result.success ? result.postId : null,
            post_url: result.success ? result.postUrl : null,
            error_message: result.error || null,
            retry_count: result.success ? post.retry_count : (post.retry_count || 0) + 1,
          })
          .eq("id", post.id);

        results.push({
          postId: post.id,
          success: result.success,
          error: result.error,
        });
      }

      const successCount = results.filter(r => r.success).length;
      
      return NextResponse.json({
        ok: true,
        processed: results.length,
        successful: successCount,
        failed: results.length - successCount,
        results,
      });
    }

    if (!duePosts || duePosts.length === 0) {
      return NextResponse.json({
        ok: true,
        processed: 0,
        message: "No posts due",
      });
    }

    return NextResponse.json({
      ok: true,
      processed: duePosts.length,
      message: `Found ${duePosts.length} posts to process`,
    });

  } catch (err: any) {
    console.error("[Scheduler Process] Error:", err);
    return NextResponse.json({
      ok: false,
      error: err.message,
    }, { status: 500 });
  }
}

/**
 * GET /api/spacebaddie/social/schedule/process
 * Check scheduler status
 */
export async function GET(req: NextRequest) {
  try {
    const adminSupabase = getSupabaseAdminClient();
    const now = new Date().toISOString();

    // Count pending posts
    const { count: dueCount } = await adminSupabase
      .from("spacebaddie_post_queue")
      .select("*", { count: "exact", head: true })
      .eq("status", "queued")
      .lte("scheduled_at", now);

    const { count: queuedCount } = await adminSupabase
      .from("spacebaddie_post_queue")
      .select("*", { count: "exact", head: true })
      .eq("status", "queued");

    return NextResponse.json({
      ok: true,
      status: "ready",
      duePosts: dueCount || 0,
      queuedPosts: queuedCount || 0,
      timestamp: now,
    });

  } catch (err: any) {
    return NextResponse.json({
      ok: false,
      error: err.message,
    }, { status: 500 });
  }
}
