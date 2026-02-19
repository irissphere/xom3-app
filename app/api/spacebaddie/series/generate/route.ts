/**
 * SpaceBaddie Episode Generator API
 * POST /api/spacebaddie/series/generate
 * 
 * Generates the next episode in a series:
 * 1. AI writes script continuing the story
 * 2. HeyGen creates the video
 * 3. Auto-schedules for posting
 * 
 * AKV: SpaceBaddie Sovereign - Episode Generator Lane
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60; // Script + video generation can take time

interface GenerateRequest {
  seriesId: string;
  forceEpisode?: number; // Optional: generate a specific episode number
}

/**
 * POST /api/spacebaddie/series/generate
 * Generate the next episode in a series
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // Allow cron/system calls
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET || process.env.OPERATOR_KEY;
    const isSystem = authHeader === `Bearer ${cronSecret}` || req.headers.get("x-vercel-cron") === "1";

    if (!isSystem && (authError || !user)) {
      return NextResponse.json({
        ok: false,
        error: "Authentication required",
      }, { status: 401 });
    }

    const body: GenerateRequest = await req.json();
    const { seriesId, forceEpisode } = body;

    if (!seriesId) {
      return NextResponse.json({
        ok: false,
        error: "seriesId is required",
      }, { status: 400 });
    }

    const adminSupabase = getSupabaseAdminClient();
    const origin = new URL(req.url).origin;

    // Fetch series
    const { data: series, error: seriesError } = await adminSupabase
      .from("spacebaddie_content_series")
      .select("*")
      .eq("series_id", seriesId)
      .single();

    if (seriesError || !series) {
      return NextResponse.json({
        ok: false,
        error: "Series not found",
      }, { status: 404 });
    }

    // Check if series is active (unless forced)
    if (!isSystem && series.status !== "active" && !forceEpisode) {
      return NextResponse.json({
        ok: false,
        error: `Series is ${series.status}, not active`,
      }, { status: 400 });
    }

    // Check if series is complete
    if (series.current_episode >= series.total_episodes) {
      return NextResponse.json({
        ok: false,
        error: "Series is complete",
      }, { status: 400 });
    }

    const episodeNumber = forceEpisode || (series.current_episode + 1);

    // Check if episode already exists
    const { data: existingEpisode } = await adminSupabase
      .from("spacebaddie_series_episodes")
      .select("episode_id, status")
      .eq("series_id", seriesId)
      .eq("episode_number", episodeNumber)
      .single();

    if (existingEpisode && !["failed", "pending_script"].includes(existingEpisode.status)) {
      return NextResponse.json({
        ok: false,
        error: `Episode ${episodeNumber} already exists with status: ${existingEpisode.status}`,
      }, { status: 400 });
    }

    // Get avatar image URL
    let avatarImageUrl = series.avatar_image_url;
    console.log("[Generate] Series data:", {
      seriesId,
      avatarImageUrl: series.avatar_image_url,
      profileId: series.profile_id,
    });

    if (!avatarImageUrl && series.profile_id) {
      const { data: profile } = await adminSupabase
        .from("spacebaddie_avatar_profiles")
        .select("avatar_image_urls, config")
        .eq("profile_id", series.profile_id)
        .single();
      
      if (profile?.avatar_image_urls?.length > 0) {
        avatarImageUrl = profile.avatar_image_urls[0];
      }
    }

    if (!avatarImageUrl) {
      return NextResponse.json({
        ok: false,
        error: "No avatar image configured for this series. Please upload an avatar image in the series settings.",
      }, { status: 400 });
    }

    console.log("[Generate] Using avatar URL:", avatarImageUrl);

    // Verify the image is accessible
    try {
      const imgCheck = await fetch(avatarImageUrl, { method: 'HEAD' });
      if (!imgCheck.ok) {
        console.error("[Generate] Avatar image not accessible:", imgCheck.status);
        return NextResponse.json({
          ok: false,
          error: `Avatar image not accessible (${imgCheck.status}). Please re-upload the image.`,
        }, { status: 400 });
      }
      console.log("[Generate] Avatar image verified accessible");
    } catch (imgErr) {
      console.error("[Generate] Avatar image check failed:", imgErr);
      // Continue anyway - HeyGen might be able to access it
    }

    // Create or update episode record
    const now = new Date().toISOString();
    const episodeId = existingEpisode?.episode_id || undefined;
    
    const { data: episode, error: episodeError } = await adminSupabase
      .from("spacebaddie_series_episodes")
      .upsert({
        episode_id: episodeId,
        series_id: seriesId,
        user_id: series.user_id,
        episode_number: episodeNumber,
        status: "generating_script",
        created_at: existingEpisode ? undefined : now,
        updated_at: now,
      }, { onConflict: "series_id,episode_number" })
      .select()
      .single();

    if (episodeError) {
      console.error("[Generate] Episode create error:", episodeError);
      return NextResponse.json({
        ok: false,
        error: "Failed to create episode record",
      }, { status: 500 });
    }

    console.log(`[Generate] Starting episode ${episodeNumber} for series ${seriesId}`);

    // ========================================
    // STEP 1: Generate Script with AI
    // ========================================
    let script: string;
    let scriptSummary: string;
    
    try {
      const scriptResult = await generateEpisodeScript(origin, {
        seriesTitle: series.title,
        storyArc: series.story_arc,
        characterPersona: series.character_persona,
        contentStyle: series.content_style,
        episodeNumber,
        totalEpisodes: series.total_episodes,
        previousSummaries: series.episode_summaries || [],
        storyContext: series.story_context,
        targetDuration: series.episode_duration_seconds,
      });
      
      script = scriptResult.script;
      scriptSummary = scriptResult.summary;
      
      // Update episode with script
      await adminSupabase
        .from("spacebaddie_series_episodes")
        .update({
          script,
          script_summary: scriptSummary,
          status: "pending_video",
          updated_at: new Date().toISOString(),
        })
        .eq("episode_id", episode.episode_id);

      console.log(`[Generate] Script generated for episode ${episodeNumber}`);
    } catch (scriptError: any) {
      await adminSupabase
        .from("spacebaddie_series_episodes")
        .update({
          status: "failed",
          error_message: `Script generation failed: ${scriptError.message}`,
          updated_at: new Date().toISOString(),
        })
        .eq("episode_id", episode.episode_id);

      return NextResponse.json({
        ok: false,
        error: `Script generation failed: ${scriptError.message}`,
      }, { status: 500 });
    }

    // ========================================
    // STEP 2: Generate Video with HeyGen
    // ========================================
    let videoJobId: string;
    
    try {
      await adminSupabase
        .from("spacebaddie_series_episodes")
        .update({ status: "generating_video", updated_at: new Date().toISOString() })
        .eq("episode_id", episode.episode_id);

      // Include background scene from series story_context if configured
      const backgroundScene = series.story_context?.backgroundScene || undefined;
      const voiceGender = series.story_context?.voiceGender || undefined;
      const cinematicScene = series.story_context?.cinematicScene || false;

      const videoRes = await fetch(`${origin}/api/spacebaddie/video`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: avatarImageUrl,
          script,
          voiceId: series.voice_id,
          voiceStyle: series.voice_style || "engaging",
          voiceGender: voiceGender,
          aspectRatio: series.aspect_ratio || "9:16",
          userId: series.user_id,
          seriesId,
          episodeId: episode.episode_id,
          backgroundScene: backgroundScene,
          cinematicScene: cinematicScene,
          provider: cinematicScene ? 'fal-avatar' : undefined,
        }),
      });

      const videoData = await videoRes.json();
      
      if (!videoData.jobId) {
        throw new Error(videoData.error || "Video generation failed");
      }

      videoJobId = videoData.jobId;

      await adminSupabase
        .from("spacebaddie_series_episodes")
        .update({
          video_job_id: videoJobId,
          status: "pending_schedule",
          updated_at: new Date().toISOString(),
        })
        .eq("episode_id", episode.episode_id);

      console.log(`[Generate] Video job ${videoJobId} created for episode ${episodeNumber}`);
    } catch (videoError: any) {
      await adminSupabase
        .from("spacebaddie_series_episodes")
        .update({
          status: "failed",
          error_message: `Video generation failed: ${videoError.message}`,
          updated_at: new Date().toISOString(),
        })
        .eq("episode_id", episode.episode_id);

      return NextResponse.json({
        ok: false,
        error: `Video generation failed: ${videoError.message}`,
        episodeId: episode.episode_id,
        scriptGenerated: true,
      }, { status: 500 });
    }

    // ========================================
    // STEP 3: Save scheduling metadata on the episode
    // The actual post queue entry is created when the video completes
    // (in the episode status handler), so we always have a video URL.
    // ========================================
    try {
      const userTimezone = series.story_context?.timezone || 'America/New_York';
      const scheduledTime = calculateScheduledTime(series.frequency, series.post_time_utc, userTimezone);

      await adminSupabase
        .from("spacebaddie_series_episodes")
        .update({
          scheduled_at: scheduledTime,
          status: "pending_video",
          updated_at: new Date().toISOString(),
        })
        .eq("episode_id", episode.episode_id);

      // Update series context and next episode time
      const newContext = {
        ...(series.story_context || {}),
        lastEpisodeSummary: scriptSummary,
        lastGeneratedAt: now,
      };

      const nextEpisodeAt = episodeNumber < series.total_episodes
        ? calculateNextEpisodeTime(series.frequency, series.post_time_utc, userTimezone)
        : null;

      await adminSupabase
        .from("spacebaddie_content_series")
        .update({
          story_context: newContext,
          next_episode_at: nextEpisodeAt,
          updated_at: new Date().toISOString(),
        })
        .eq("series_id", seriesId);

      console.log(`[Generate] Episode ${episodeNumber} video pending, will post at ${scheduledTime} once video is ready`);

    } catch (scheduleError: any) {
      console.error("[Generate] Schedule metadata error:", scheduleError);
    }

    return NextResponse.json({
      ok: true,
      episode: {
        episodeId: episode.episode_id,
        episodeNumber,
        script,
        scriptSummary,
        videoJobId,
        status: "pending_video",
      },
      message: `Episode ${episodeNumber} of ${series.total_episodes} generated! Video is processing and will be posted once ready.`,
    });

  } catch (err: any) {
    console.error("[Generate] Error:", err);
    return NextResponse.json({
      ok: false,
      error: err.message,
    }, { status: 500 });
  }
}

/**
 * Generate episode script using AI
 */
async function generateEpisodeScript(
  origin: string,
  params: {
    seriesTitle: string;
    storyArc?: string;
    characterPersona?: string;
    contentStyle: string;
    episodeNumber: number;
    totalEpisodes: number;
    previousSummaries: string[];
    storyContext: any;
    targetDuration: number;
  }
): Promise<{ script: string; summary: string }> {
  const {
    seriesTitle,
    storyArc,
    characterPersona,
    contentStyle,
    episodeNumber,
    totalEpisodes,
    previousSummaries,
    targetDuration,
  } = params;

  // Build context from previous episodes
  const previousContext = previousSummaries.length > 0
    ? `Previous episodes:\n${previousSummaries.map((s, i) => `Episode ${i + 1}: ${s}`).join("\n")}`
    : "This is the first episode.";

  // Calculate story position
  const isFirst = episodeNumber === 1;
  const isLast = episodeNumber === totalEpisodes;
  const isMidpoint = episodeNumber === Math.ceil(totalEpisodes / 2);

  let storyBeat = "Continue the story naturally.";
  if (isFirst) storyBeat = "Introduce the character and hook the audience.";
  if (isMidpoint) storyBeat = "This is the midpoint - raise the stakes or introduce a twist.";
  if (isLast) storyBeat = "This is the finale - bring the story to a satisfying conclusion.";

  // Build prompt for script generation
  const prompt = `You are writing Episode ${episodeNumber} of ${totalEpisodes} for "${seriesTitle}".

CHARACTER/PERSONA: ${characterPersona || "A charismatic content creator"}

STORY ARC: ${storyArc || "An engaging journey that keeps viewers coming back"}

CONTENT STYLE: ${contentStyle}

${previousContext}

STORY BEAT: ${storyBeat}

Write a ${targetDuration}-second video script. The script should:
- Be spoken directly to camera (first person)
- Feel natural and conversational
- Continue the story from previous episodes
- End with a hook to make viewers want the next episode
- Be exactly the right length for ${targetDuration} seconds of speaking

Return ONLY the script text, nothing else.`;

  // Use the avatar script API
  const response = await fetch(`${origin}/api/avatar/script`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      topic: prompt,
      tone: contentStyle === "comedy" ? "humorous" : "engaging",
      duration: targetDuration,
    }),
  });

  if (!response.ok) {
    console.error(`[Script] API returned ${response.status}`);
    throw new Error(`Script API returned ${response.status}`);
  }

  let data;
  try {
    const text = await response.text();
    data = text ? JSON.parse(text) : null;
  } catch (parseErr) {
    console.error('[Script] JSON parse error:', parseErr);
    throw new Error('Script API returned invalid JSON');
  }

  const script = data?.script || (Array.isArray(data?.scripts) ? data.scripts[0] : null);

  if (!script) {
    // Fallback script
    const fallback = isFirst
      ? `Hey everyone! Welcome to ${seriesTitle}. I'm so excited to start this journey with you. ${storyArc || "We're going to have an amazing time together."} Make sure to stick around because this is just the beginning!`
      : `Welcome back to ${seriesTitle}, episode ${episodeNumber}! ${storyArc || "Let's continue where we left off."} Don't forget to check out the next episode!`;
    
    return {
      script: fallback,
      summary: `Episode ${episodeNumber}: ${isFirst ? "Introduction" : "Continuation"} of ${seriesTitle}`,
    };
  }

  // Generate summary
  const summary = script.length > 100
    ? script.substring(0, 100) + "..."
    : script;

  return { script, summary };
}

/**
 * Convert a local time (HH:MM) in a given IANA timezone to the next
 * occurrence as a UTC ISO string.
 *
 * Example: postTimeLocal "14:00", timezone "America/New_York"
 *  - During EST (UTC-5) -> 19:00 UTC
 *  - During EDT (UTC-4) -> 18:00 UTC
 * This correctly handles DST automatically.
 */
function localTimeToNextUtc(postTimeLocal: string, timezone: string): Date {
  const [hours, minutes] = (postTimeLocal || "14:00").split(":").map(Number);
  const now = new Date();

  // Build a date string for "today at HH:MM" in the user's timezone.
  // We iterate day-by-day starting from today until we find a future time.
  for (let dayOffset = 0; dayOffset <= 1; dayOffset++) {
    const candidate = new Date(now);
    candidate.setDate(candidate.getDate() + dayOffset);

    // Format the candidate date parts in the user's timezone
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(candidate);

    const y = parts.find(p => p.type === "year")!.value;
    const m = parts.find(p => p.type === "month")!.value;
    const d = parts.find(p => p.type === "day")!.value;

    // Construct an ISO-like string and parse it in the target timezone
    // by using the timezone offset at that moment.
    const localStr = `${y}-${m}-${d}T${String(hours).padStart(2, "0")}:${String(minutes || 0).padStart(2, "0")}:00`;

    // Use Intl to find the UTC offset for this specific moment in the timezone
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
      hour12: false,
      timeZoneName: "shortOffset",
    });

    // Parse the target time by computing the difference
    // Create a temporary date at the desired local time, then adjust
    const tempDate = new Date(localStr + "Z"); // Treat as UTC first
    const utcStr = formatter.format(tempDate);

    // More reliable: use the built-in TZ support
    // Construct the date using a known approach
    const targetLocal = new Date(
      Date.UTC(Number(y), Number(m) - 1, Number(d), hours, minutes || 0, 0)
    );

    // Get what time it is in the user's TZ at that UTC moment
    const inTz = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric", minute: "numeric", hour12: false,
    }).format(targetLocal);
    const [tzH, tzM] = inTz.split(":").map(Number);

    // The difference between desired local time and what the TZ shows
    // tells us the offset correction needed
    const diffMinutes = (hours * 60 + (minutes || 0)) - (tzH * 60 + tzM);
    const corrected = new Date(targetLocal.getTime() + diffMinutes * 60 * 1000);

    if (corrected > now) {
      return corrected;
    }
  }

  // Fallback: tomorrow at the specified time (use simple UTC offset)
  const fallback = new Date(now);
  fallback.setDate(fallback.getDate() + 1);
  fallback.setUTCHours(hours, minutes || 0, 0, 0);
  return fallback;
}

/**
 * Calculate when to schedule the post, respecting the user's timezone.
 * postTimeLocal is the user's desired posting time in THEIR timezone (e.g. "14:00").
 * timezone is an IANA timezone string (e.g. "America/New_York").
 */
function calculateScheduledTime(frequency: string, postTimeLocal: string, timezone: string): string {
  const base = localTimeToNextUtc(postTimeLocal, timezone);

  // For hourly, ignore the post time and just schedule next hour
  if (frequency === "hourly") {
    const now = new Date();
    const next = new Date(now);
    next.setMinutes(0, 0, 0);
    next.setHours(next.getHours() + 1);
    return next.toISOString();
  }

  // For weekly, if the next occurrence is today/tomorrow, push it a week
  if (frequency === "weekly") {
    const now = new Date();
    // If base is within the next 24h, it's this week's slot - push to next week
    if (base.getTime() - now.getTime() < 24 * 60 * 60 * 1000) {
      base.setDate(base.getDate() + 7);
    }
  }

  return base.toISOString();
}

/**
 * Calculate next episode generation time (2 hours before post time)
 */
function calculateNextEpisodeTime(frequency: string, postTimeLocal: string, timezone: string): string {
  const scheduled = new Date(calculateScheduledTime(frequency, postTimeLocal, timezone));
  
  // Generate 2 hours before scheduled post time
  scheduled.setHours(scheduled.getHours() - 2);
  
  return scheduled.toISOString();
}
