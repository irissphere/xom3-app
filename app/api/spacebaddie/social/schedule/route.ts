/**
 * SpaceBaddie Content Scheduler API
 * /api/spacebaddie/social/schedule
 * 
 * Manages scheduled posts in the post queue
 * AKV: SpaceBaddie Sovereign - Content Scheduler Lane
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface SchedulePostRequest {
  contentType: "video" | "image" | "text";
  contentText?: string;
  contentUrl?: string;
  thumbnailUrl?: string;
  platforms: string[];
  scheduledTime: string; // ISO date string
  timezone?: string; // IANA timezone e.g. "America/New_York"
  tags?: string[];
  sourceJobId?: string;
  sourceType?: "studio" | "mobile" | "import" | "manual";
}

interface ScheduledPost {
  postId: string;
  contentType: string;
  contentText?: string;
  contentUrl?: string;
  thumbnailUrl?: string;
  platforms: string[];
  scheduledTime: string;
  status: string;
  tags?: string[];
  createdAt: string;
}

/**
 * GET /api/spacebaddie/social/schedule
 * List scheduled posts for the user
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

    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get("status"); // queued, posted, failed, all
    const limit = parseInt(searchParams.get("limit") || "20");

    const adminSupabase = getSupabaseAdminClient();
    
    let query = adminSupabase
      .from("spacebaddie_post_queue")
      .select("*")
      .eq("user_id", user.id)
      .order("scheduled_at", { ascending: true })
      .limit(limit);

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    const { data: posts, error: fetchError } = await query;

    if (fetchError) {
      console.error("[Scheduler] Fetch error:", fetchError);
      return NextResponse.json({
        ok: false,
        error: "Failed to fetch scheduled posts",
      }, { status: 500 });
    }

    const formattedPosts: ScheduledPost[] = (posts || []).map((p: any) => ({
      postId: p.id,
      contentType: p.platform_settings?.content_type || "video",
      contentText: p.caption,
      contentUrl: p.video_url,
      thumbnailUrl: p.platform_settings?.thumbnail_url || null,
      platforms: [p.platform],
      scheduledTime: p.scheduled_at,
      status: p.status,
      tags: (p.hashtags || "").split(/[#\s]+/).filter((t: string) => t),
      createdAt: p.created_at,
      postedAt: p.posted_at,
      errorMessage: p.error_message,
    }));

    // Get counts by status
    const { data: counts } = await adminSupabase
      .from("spacebaddie_post_queue")
      .select("status")
      .eq("user_id", user.id)
      .eq("tenant", "spacebaddie");

    const statusCounts = {
      queued: 0,
      posting: 0,
      posted: 0,
      failed: 0,
      cancelled: 0,
    };

    (counts || []).forEach(c => {
      if (c.status in statusCounts) {
        statusCounts[c.status as keyof typeof statusCounts]++;
      }
    });

    return NextResponse.json({
      ok: true,
      posts: formattedPosts,
      counts: statusCounts,
      total: (counts || []).length,
    });

  } catch (err: any) {
    console.error("[Scheduler] GET error:", err);
    return NextResponse.json({
      ok: false,
      error: err.message,
    }, { status: 500 });
  }
}

/**
 * POST /api/spacebaddie/social/schedule
 * Schedule a new post
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

    const body: SchedulePostRequest = await req.json();
    const { 
      contentType, 
      contentText, 
      contentUrl, 
      thumbnailUrl, 
      platforms, 
      scheduledTime, 
      timezone,
      tags,
      sourceJobId,
      sourceType 
    } = body;

    const userTimezone = timezone || "America/New_York";

    // Validation
    if (!platforms || platforms.length === 0) {
      return NextResponse.json({
        ok: false,
        error: "At least one platform is required",
      }, { status: 400 });
    }

    if (!scheduledTime) {
      return NextResponse.json({
        ok: false,
        error: "Scheduled time is required",
      }, { status: 400 });
    }

    // Validate scheduled time is in the future
    const scheduleDate = new Date(scheduledTime);
    if (scheduleDate <= new Date()) {
      return NextResponse.json({
        ok: false,
        error: "Scheduled time must be in the future",
      }, { status: 400 });
    }

    if (contentType === "video" && !contentUrl) {
      return NextResponse.json({
        ok: false,
        error: "Video URL is required for video posts",
      }, { status: 400 });
    }

    const adminSupabase = getSupabaseAdminClient();
    const now = new Date().toISOString();

    // Insert one row per platform (table uses singular `platform` column)
    // Actual columns: id, user_id, episode_id, project_id, video_url,
    // caption, hashtags, platform, platform_settings, scheduled_at,
    // timezone, status, posted_at, post_url, post_id, error_message, retry_count
    const insertRows = (platforms || []).map((plat: string) => ({
      id: crypto.randomUUID(),
      user_id: user.id,
      video_url: contentUrl || "",
      caption: contentText || null,
      hashtags: (tags || []).map((t: string) => `#${t}`).join(" ") || null,
      platform: plat,
      platform_settings: {
        source_job_id: sourceJobId || null,
        source_type: sourceType || "manual",
        content_type: contentType || "video",
        thumbnail_url: thumbnailUrl || null,
      },
      scheduled_at: scheduledTime,
      timezone: userTimezone,
      status: "queued",
    }));

    const { data: posts, error: insertError } = await adminSupabase
      .from("spacebaddie_post_queue")
      .insert(insertRows)
      .select();

    if (insertError) {
      console.error("[Scheduler] Insert error:", insertError);
      return NextResponse.json({
        ok: false,
        error: "Failed to schedule post: " + insertError.message,
      }, { status: 500 });
    }

    const post = posts?.[0];
    console.log("[Scheduler] Post scheduled:", post?.id, "for", scheduledTime);

    return NextResponse.json({
      ok: true,
      post: {
        postId: post?.id,
        contentType: post?.platform_settings?.content_type || "video",
        platforms: [post?.platform],
        scheduledTime: post?.scheduled_at,
        status: post?.status,
      },
      message: `Post scheduled for ${new Date(scheduledTime).toLocaleString()}`,
    });

  } catch (err: any) {
    console.error("[Scheduler] POST error:", err);
    return NextResponse.json({
      ok: false,
      error: err.message,
    }, { status: 500 });
  }
}

/**
 * DELETE /api/spacebaddie/social/schedule
 * Cancel a scheduled post
 */
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        ok: false,
        error: "Authentication required",
      }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const postId = searchParams.get("postId");

    if (!postId) {
      return NextResponse.json({
        ok: false,
        error: "Post ID is required",
      }, { status: 400 });
    }

    const adminSupabase = getSupabaseAdminClient();

    // Verify the post belongs to the user and is cancellable
    const { data: post } = await adminSupabase
      .from("spacebaddie_post_queue")
      .select("status")
      .eq("id", postId)
      .eq("user_id", user.id)
      .single();

    if (!post) {
      return NextResponse.json({
        ok: false,
        error: "Post not found",
      }, { status: 404 });
    }

    if (post.status !== "queued") {
      return NextResponse.json({
        ok: false,
        error: `Cannot cancel post with status: ${post.status}`,
      }, { status: 400 });
    }

    // Update status to cancelled
    const { error: updateError } = await adminSupabase
      .from("spacebaddie_post_queue")
      .update({ status: "cancelled" })
      .eq("id", postId)
      .eq("user_id", user.id);

    if (updateError) {
      console.error("[Scheduler] Cancel error:", updateError);
      return NextResponse.json({
        ok: false,
        error: "Failed to cancel post",
      }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      message: "Post cancelled",
    });

  } catch (err: any) {
    console.error("[Scheduler] DELETE error:", err);
    return NextResponse.json({
      ok: false,
      error: err.message,
    }, { status: 500 });
  }
}

/**
 * PATCH /api/spacebaddie/social/schedule
 * Update a scheduled post (reschedule)
 */
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        ok: false,
        error: "Authentication required",
      }, { status: 401 });
    }

    const body = await req.json();
    const { postId, scheduledTime, platforms, contentText, tags } = body;

    if (!postId) {
      return NextResponse.json({
        ok: false,
        error: "Post ID is required",
      }, { status: 400 });
    }

    const adminSupabase = getSupabaseAdminClient();

    // Verify the post belongs to the user and is editable
    const { data: post } = await adminSupabase
      .from("spacebaddie_post_queue")
      .select("status")
      .eq("id", postId)
      .eq("user_id", user.id)
      .single();

    if (!post) {
      return NextResponse.json({
        ok: false,
        error: "Post not found",
      }, { status: 404 });
    }

    if (post.status !== "queued") {
      return NextResponse.json({
        ok: false,
        error: `Cannot edit post with status: ${post.status}`,
      }, { status: 400 });
    }

    // Build update object (actual columns: scheduled_at, platform, caption, hashtags)
    const updates: Record<string, any> = {};

    if (scheduledTime) {
      const scheduleDate = new Date(scheduledTime);
      if (scheduleDate <= new Date()) {
        return NextResponse.json({
          ok: false,
          error: "Scheduled time must be in the future",
        }, { status: 400 });
      }
      updates.scheduled_at = scheduledTime;
    }

    if (contentText !== undefined) {
      updates.caption = contentText;
    }

    if (tags) {
      updates.hashtags = tags.map((t: string) => `#${t}`).join(" ");
    }

    const { error: updateError } = await adminSupabase
      .from("spacebaddie_post_queue")
      .update(updates)
      .eq("id", postId)
      .eq("user_id", user.id);

    if (updateError) {
      console.error("[Scheduler] Update error:", updateError);
      return NextResponse.json({
        ok: false,
        error: "Failed to update post",
      }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      message: "Post updated",
    });

  } catch (err: any) {
    console.error("[Scheduler] PATCH error:", err);
    return NextResponse.json({
      ok: false,
      error: err.message,
    }, { status: 500 });
  }
}
