/**
 * SpaceBaddie Content Series API
 * /api/spacebaddie/series
 * 
 * Manages autonomous content series for zero-intervention content generation
 * AKV: SpaceBaddie Sovereign - Series Lane
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export interface ContentSeries {
  seriesId: string;
  title: string;
  description?: string;
  storyArc?: string;
  characterPersona?: string;
  contentStyle: string;
  profileId?: string;
  avatarImageUrl?: string;
  voiceId?: string;
  voiceStyle: string;
  totalEpisodes: number;
  currentEpisode: number;
  episodeDuration: number;
  aspectRatio: string;
  frequency: string;
  frequencyCustomHours?: number;
  platforms: string[];
  postTimeUtc: string;
  status: string;
  nextEpisodeAt?: string;
  lastEpisodeAt?: string;
  totalViews: number;
  totalEngagement: number;
  createdAt: string;
}

interface CreateSeriesRequest {
  title: string;
  description?: string;
  storyArc?: string;
  characterPersona?: string;
  contentStyle?: string;
  profileId?: string;
  avatarImageUrl?: string;
  voiceId?: string;
  voiceStyle?: string;
  totalEpisodes?: number;
  episodeDuration?: number;
  aspectRatio?: string;
  frequency?: string;
  frequencyCustomHours?: number;
  platforms?: string[];
  postTimeUtc?: string;
  timezone?: string; // IANA timezone e.g. "America/New_York"
  backgroundScene?: string; // Background scene ID for video generation
  voiceGender?: 'male' | 'female'; // Voice gender preference
  autoStart?: boolean;
}

/**
 * GET /api/spacebaddie/series
 * List all series for the authenticated user
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
    const status = searchParams.get("status"); // active, draft, completed, all
    const limit = parseInt(searchParams.get("limit") || "20");

    const adminSupabase = getSupabaseAdminClient();
    
    let query = adminSupabase
      .from("spacebaddie_content_series")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    const { data: series, error: fetchError } = await query;

    if (fetchError) {
      console.error("[Series] Fetch error:", fetchError);
      return NextResponse.json({
        ok: false,
        error: "Failed to fetch series",
      }, { status: 500 });
    }

    const formattedSeries = (series || []).map(formatSeries);

    // Get counts by status
    const { data: counts } = await adminSupabase
      .from("spacebaddie_content_series")
      .select("status")
      .eq("user_id", user.id);

    const statusCounts = {
      draft: 0,
      active: 0,
      paused: 0,
      completed: 0,
      failed: 0,
    };

    (counts || []).forEach(c => {
      if (c.status in statusCounts) {
        statusCounts[c.status as keyof typeof statusCounts]++;
      }
    });

    return NextResponse.json({
      ok: true,
      series: formattedSeries,
      counts: statusCounts,
      total: (counts || []).length,
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
 * POST /api/spacebaddie/series
 * Create a new content series
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

    const body: CreateSeriesRequest = await req.json();
    
    // Validation
    if (!body.title) {
      return NextResponse.json({
        ok: false,
        error: "Title is required",
      }, { status: 400 });
    }

    if (!body.storyArc && !body.characterPersona) {
      return NextResponse.json({
        ok: false,
        error: "Either storyArc or characterPersona is required for content generation",
      }, { status: 400 });
    }

    if (!body.profileId && !body.avatarImageUrl) {
      return NextResponse.json({
        ok: false,
        error: "Either profileId or avatarImageUrl is required",
      }, { status: 400 });
    }

    const adminSupabase = getSupabaseAdminClient();
    const now = new Date().toISOString();

    // Calculate next episode time if auto-starting
    let nextEpisodeAt: string | null = null;
    let status = "draft";
    
    const userTimezone = body.timezone || "America/New_York";

    if (body.autoStart) {
      status = "active";
      nextEpisodeAt = calculateNextEpisodeTime(
        body.frequency || "daily",
        body.postTimeUtc || "14:00:00",
        body.frequencyCustomHours,
        userTimezone
      );
    }

    const { data: series, error: insertError } = await adminSupabase
      .from("spacebaddie_content_series")
      .insert({
        user_id: user.id,
        tenant: "spacebaddie",
        title: body.title,
        description: body.description,
        story_arc: body.storyArc,
        character_persona: body.characterPersona,
        content_style: body.contentStyle || "storytelling",
        profile_id: body.profileId,
        avatar_image_url: body.avatarImageUrl,
        voice_id: body.voiceId,
        voice_style: body.voiceStyle || "engaging",
        total_episodes: body.totalEpisodes || 10,
        current_episode: 0,
        episode_duration_seconds: body.episodeDuration || 30,
        aspect_ratio: body.aspectRatio || "9:16",
        frequency: body.frequency || "daily",
        frequency_custom_hours: body.frequencyCustomHours,
        platforms: body.platforms || ["youtube"],
        post_time_utc: body.postTimeUtc || "14:00:00",
        status,
        next_episode_at: nextEpisodeAt,
        story_context: {
          timezone: body.timezone || "America/New_York",
          backgroundScene: body.backgroundScene || null,
          cinematicScene: body.cinematicScene || false,
          voiceGender: body.voiceGender || null,
          episodeOutlines: [],
          characterDevelopment: [],
          plotPoints: [],
        },
        episode_summaries: [],
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (insertError) {
      console.error("[Series] Insert error:", insertError);
      return NextResponse.json({
        ok: false,
        error: "Failed to create series",
        details: insertError.message,
      }, { status: 500 });
    }

    console.log("[Series] Created:", series.series_id, "Status:", status);

    return NextResponse.json({
      ok: true,
      series: formatSeries(series),
      message: body.autoStart 
        ? `Series created and activated! First episode will generate at ${nextEpisodeAt}`
        : "Series created as draft. Activate it to start generating episodes.",
    });

  } catch (err: any) {
    console.error("[Series] POST error:", err);
    return NextResponse.json({
      ok: false,
      error: err.message,
    }, { status: 500 });
  }
}

/**
 * Format database row to API response
 */
function formatSeries(row: any): ContentSeries {
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
    totalViews: row.total_views || 0,
    totalEngagement: row.total_engagement || 0,
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
 * postTimeLocal is the user's desired posting time in THEIR timezone.
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
