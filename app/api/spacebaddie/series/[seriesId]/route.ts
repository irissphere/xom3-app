/**
 * SpaceBaddie Content Series - Individual Series API
 * /api/spacebaddie/series/[seriesId]
 * 
 * Get, update, or delete a specific series
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{ seriesId: string }>;
}

/**
 * GET /api/spacebaddie/series/[seriesId]
 * Get a specific series with its episodes
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { seriesId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        ok: false,
        error: "Authentication required",
      }, { status: 401 });
    }

    const adminSupabase = getSupabaseAdminClient();

    // Get series
    const { data: series, error: seriesError } = await adminSupabase
      .from("spacebaddie_content_series")
      .select("*")
      .eq("series_id", seriesId)
      .eq("user_id", user.id)
      .single();

    if (seriesError || !series) {
      return NextResponse.json({
        ok: false,
        error: "Series not found",
      }, { status: 404 });
    }

    // Get episodes
    const { data: episodes } = await adminSupabase
      .from("spacebaddie_series_episodes")
      .select("*")
      .eq("series_id", seriesId)
      .order("episode_number", { ascending: true });

    // Format series with episodes included
    const formattedSeries = formatSeries(series);
    formattedSeries.episodes = (episodes || []).map(formatEpisode);

    return NextResponse.json({
      ok: true,
      series: formattedSeries,
    });

  } catch (err: any) {
    console.error("[Series] GET error:", err);
    return NextResponse.json({
      ok: false,
      error: err.message,
    }, { status: 500 });
  }
}

/**
 * PATCH /api/spacebaddie/series/[seriesId]
 * Update a series (including activate/pause/resume)
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { seriesId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        ok: false,
        error: "Authentication required",
      }, { status: 401 });
    }

    const body = await req.json();
    const adminSupabase = getSupabaseAdminClient();

    // Verify ownership
    const { data: existing } = await adminSupabase
      .from("spacebaddie_content_series")
      .select("status, frequency, post_time_utc, frequency_custom_hours, story_context")
      .eq("series_id", seriesId)
      .eq("user_id", user.id)
      .single();

    if (!existing) {
      return NextResponse.json({
        ok: false,
        error: "Series not found",
      }, { status: 404 });
    }

    // Build update object
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    // If timezone is being updated, store it in story_context
    if (body.timezone) {
      const currentContext = existing.story_context || {};
      updates.story_context = { ...currentContext, timezone: body.timezone };
    }

    const userTimezone = body.timezone || existing.story_context?.timezone || "America/New_York";

    // Handle status changes
    if (body.status) {
      updates.status = body.status;
      
      // If activating, set next episode time
      if (body.status === "active" && existing.status !== "active") {
        updates.next_episode_at = calculateNextEpisodeTime(
          body.frequency || existing.frequency,
          body.postTimeUtc || existing.post_time_utc,
          body.frequencyCustomHours || existing.frequency_custom_hours,
          userTimezone
        );
      }
    }

    // Allow updating these fields
    const allowedFields = [
      "title", "description", "story_arc", "character_persona", "content_style",
      "profile_id", "avatar_image_url", "voice_id", "voice_style",
      "total_episodes", "episode_duration_seconds", "aspect_ratio",
      "frequency", "frequency_custom_hours", "platforms", "post_time_utc"
    ];

    for (const field of allowedFields) {
      const camelCase = field.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      if (body[camelCase] !== undefined) {
        updates[field] = body[camelCase];
      }
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    const { data: updated, error: updateError } = await adminSupabase
      .from("spacebaddie_content_series")
      .update(updates)
      .eq("series_id", seriesId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (updateError) {
      console.error("[Series] Update error:", updateError);
      return NextResponse.json({
        ok: false,
        error: "Failed to update series",
      }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      series: formatSeries(updated),
      message: body.status === "active" 
        ? `Series activated! Next episode at ${updates.next_episode_at}`
        : "Series updated",
    });

  } catch (err: any) {
    console.error("[Series] PATCH error:", err);
    return NextResponse.json({
      ok: false,
      error: err.message,
    }, { status: 500 });
  }
}

/**
 * DELETE /api/spacebaddie/series/[seriesId]
 * Delete a series and all its episodes
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { seriesId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        ok: false,
        error: "Authentication required",
      }, { status: 401 });
    }

    const adminSupabase = getSupabaseAdminClient();

    // Delete series (episodes will cascade due to foreign key)
    const { error: deleteError } = await adminSupabase
      .from("spacebaddie_content_series")
      .delete()
      .eq("series_id", seriesId)
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("[Series] Delete error:", deleteError);
      return NextResponse.json({
        ok: false,
        error: "Failed to delete series",
      }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      message: "Series deleted",
    });

  } catch (err: any) {
    console.error("[Series] DELETE error:", err);
    return NextResponse.json({
      ok: false,
      error: err.message,
    }, { status: 500 });
  }
}

/**
 * Format series for API response
 */
function formatSeries(row: any) {
  return {
    seriesId: row.series_id,
    title: row.title,
    description: row.description,
    storyArc: row.story_arc,
    characterPersona: row.character_persona,
    contentStyle: row.content_style,
    profileId: row.profile_id,
    avatarImageUrl: row.avatar_image_url,
    voiceId: row.voice_id,
    voiceStyle: row.voice_style,
    totalEpisodes: row.total_episodes,
    currentEpisode: row.current_episode,
    episodeDuration: row.episode_duration_seconds,
    aspectRatio: row.aspect_ratio,
    frequency: row.frequency,
    frequencyCustomHours: row.frequency_custom_hours,
    platforms: row.platforms || [],
    postTimeUtc: row.post_time_utc,
    status: row.status,
    nextEpisodeAt: row.next_episode_at,
    lastEpisodeAt: row.last_episode_at,
    storyContext: row.story_context,
    episodeSummaries: row.episode_summaries || [],
    totalViews: row.total_views || 0,
    totalEngagement: row.total_engagement || 0,
    createdAt: row.created_at,
  };
}

/**
 * Format episode for API response
 */
function formatEpisode(row: any) {
  return {
    episodeId: row.episode_id,
    seriesId: row.series_id,
    episodeNumber: row.episode_number,
    title: row.title,
    script: row.script,
    scriptSummary: row.script_summary,
    videoJobId: row.video_job_id,
    videoUrl: row.video_url,
    thumbnailUrl: row.thumbnail_url,
    durationSeconds: row.duration_seconds,
    postId: row.post_id,
    scheduledAt: row.scheduled_at,
    postedAt: row.posted_at,
    status: row.status,
    errorMessage: row.error_message,
    views: row.views,
    likes: row.likes,
    comments: row.comments,
    engagement: row.engagement_rate,
    createdAt: row.created_at,
  };
}

/**
 * Convert a local time (HH:MM) in a given IANA timezone to the next
 * occurrence as a UTC Date.
 */
function localTimeToNextUtc(postTimeLocal: string, timezone: string): Date {
  const [hours, minutes] = (postTimeLocal || "14:00").split(":").map(Number);
  const now = new Date();

  for (let dayOffset = 0; dayOffset <= 1; dayOffset++) {
    const candidate = new Date(now);
    candidate.setDate(candidate.getDate() + dayOffset);

    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric", month: "2-digit", day: "2-digit",
    }).formatToParts(candidate);

    const y = parts.find(p => p.type === "year")!.value;
    const m = parts.find(p => p.type === "month")!.value;
    const d = parts.find(p => p.type === "day")!.value;

    const targetLocal = new Date(
      Date.UTC(Number(y), Number(m) - 1, Number(d), hours, minutes || 0, 0)
    );

    const inTz = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric", minute: "numeric", hour12: false,
    }).format(targetLocal);
    const [tzH, tzM] = inTz.split(":").map(Number);

    const diffMinutes = (hours * 60 + (minutes || 0)) - (tzH * 60 + tzM);
    const corrected = new Date(targetLocal.getTime() + diffMinutes * 60 * 1000);

    if (corrected > now) {
      return corrected;
    }
  }

  const fallback = new Date(now);
  fallback.setDate(fallback.getDate() + 1);
  fallback.setUTCHours(hours, minutes || 0, 0, 0);
  return fallback;
}

/**
 * Calculate the next episode generation time, respecting the user's timezone.
 */
function calculateNextEpisodeTime(
  frequency: string,
  postTimeLocal: string,
  customHours?: number,
  timezone: string = "America/New_York"
): string {
  const now = new Date();

  if (frequency === "hourly") {
    const next = new Date(now);
    next.setMinutes(0, 0, 0);
    next.setHours(next.getHours() + 1);
    return next.toISOString();
  }

  if (frequency === "custom" && customHours) {
    return new Date(now.getTime() + customHours * 60 * 60 * 1000).toISOString();
  }

  let next = localTimeToNextUtc(postTimeLocal, timezone);

  if (frequency === "weekly") {
    if (next.getTime() - now.getTime() < 24 * 60 * 60 * 1000) {
      next.setDate(next.getDate() + 7);
    }
  }

  return next.toISOString();
}
