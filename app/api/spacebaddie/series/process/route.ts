/**
 * SpaceBaddie Series Processor (Cron)
 * POST /api/spacebaddie/series/process
 * 
 * Checks for series that need new episodes generated
 * Should be called by Vercel cron every 30 minutes
 * 
 * AKV: SpaceBaddie Sovereign - Series Cron Lane
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes - may need to generate multiple episodes

/**
 * POST /api/spacebaddie/series/process
 * Process all series that are due for new episodes
 */
export async function POST(req: NextRequest) {
  try {
    // Auth check for cron
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET || process.env.OPERATOR_KEY;
    
    const isAuthorized = 
      authHeader === `Bearer ${cronSecret}` ||
      req.headers.get("x-vercel-cron") === "1" ||
      process.env.NODE_ENV === "development";

    if (!isAuthorized && cronSecret) {
      return NextResponse.json({
        ok: false,
        error: "Unauthorized",
      }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "5");
    const dryRun = searchParams.get("dryRun") === "true";

    const adminSupabase = getSupabaseAdminClient();
    const now = new Date().toISOString();
    const origin = new URL(req.url).origin;

    // Find active series that are due for new episodes
    const { data: dueSeries, error: fetchError } = await adminSupabase
      .from("spacebaddie_content_series")
      .select("series_id, title, current_episode, total_episodes, user_id")
      .eq("status", "active")
      .lte("next_episode_at", now)
      .lt("current_episode", adminSupabase.rpc ? 
        adminSupabase.raw("total_episodes") : 999) // Series not complete
      .limit(limit);

    if (fetchError) {
      console.error("[Series Process] Fetch error:", fetchError);
      // Try simpler query
      const { data: simpleSeries } = await adminSupabase
        .from("spacebaddie_content_series")
        .select("series_id, title, current_episode, total_episodes, user_id, next_episode_at")
        .eq("status", "active")
        .limit(limit);

      // Filter manually
      const filtered = (simpleSeries || []).filter(s => 
        s.next_episode_at && 
        new Date(s.next_episode_at) <= new Date() &&
        s.current_episode < s.total_episodes
      );

      if (filtered.length === 0) {
        return NextResponse.json({
          ok: true,
          processed: 0,
          message: "No series due for new episodes",
        });
      }

      // Process filtered series
      const results = await processSeriesList(filtered, origin, dryRun, adminSupabase);
      
      return NextResponse.json({
        ok: true,
        processed: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results,
      });
    }

    if (!dueSeries || dueSeries.length === 0) {
      return NextResponse.json({
        ok: true,
        processed: 0,
        message: "No series due for new episodes",
      });
    }

    console.log(`[Series Process] Found ${dueSeries.length} series due for episodes`);

    if (dryRun) {
      return NextResponse.json({
        ok: true,
        dryRun: true,
        dueSeries: dueSeries.map(s => ({
          seriesId: s.series_id,
          title: s.title,
          nextEpisode: s.current_episode + 1,
          totalEpisodes: s.total_episodes,
        })),
        message: `Would process ${dueSeries.length} series`,
      });
    }

    const results = await processSeriesList(dueSeries, origin, dryRun, adminSupabase);

    return NextResponse.json({
      ok: true,
      processed: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
    });

  } catch (err: any) {
    console.error("[Series Process] Error:", err);
    return NextResponse.json({
      ok: false,
      error: err.message,
    }, { status: 500 });
  }
}

/**
 * Process a list of series
 */
async function processSeriesList(
  seriesList: any[],
  origin: string,
  dryRun: boolean,
  adminSupabase: any
): Promise<{ seriesId: string; title: string; success: boolean; error?: string; episodeNumber?: number }[]> {
  const results: { seriesId: string; title: string; success: boolean; error?: string; episodeNumber?: number }[] = [];

  for (const series of seriesList) {
    try {
      console.log(`[Series Process] Processing "${series.title}" (${series.series_id})`);

      // Call the generate endpoint
      const response = await fetch(`${origin}/api/spacebaddie/series/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.CRON_SECRET || process.env.OPERATOR_KEY}`,
        },
        body: JSON.stringify({
          seriesId: series.series_id,
        }),
      });

      const data = await response.json();

      if (data.ok) {
        results.push({
          seriesId: series.series_id,
          title: series.title,
          success: true,
          episodeNumber: data.episode?.episodeNumber,
        });
        console.log(`[Series Process] ✓ Generated episode ${data.episode?.episodeNumber} for "${series.title}"`);
      } else {
        results.push({
          seriesId: series.series_id,
          title: series.title,
          success: false,
          error: data.error,
        });
        console.error(`[Series Process] ✗ Failed "${series.title}":`, data.error);

        // If series failed, pause it to prevent repeated failures
        if (data.error?.includes("No avatar image") || data.error?.includes("complete")) {
          await adminSupabase
            .from("spacebaddie_content_series")
            .update({ 
              status: data.error?.includes("complete") ? "completed" : "paused",
              updated_at: new Date().toISOString(),
            })
            .eq("series_id", series.series_id);
        }
      }

    } catch (err: any) {
      results.push({
        seriesId: series.series_id,
        title: series.title,
        success: false,
        error: err.message,
      });
      console.error(`[Series Process] ✗ Error "${series.title}":`, err.message);
    }

    // Small delay between series to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return results;
}

/**
 * GET /api/spacebaddie/series/process
 * Check processor status and queue
 */
export async function GET(req: NextRequest) {
  try {
    const adminSupabase = getSupabaseAdminClient();
    const now = new Date().toISOString();

    // Count series by status
    const { data: statusCounts } = await adminSupabase
      .from("spacebaddie_content_series")
      .select("status");

    const counts: Record<string, number> = {
      active: 0,
      draft: 0,
      paused: 0,
      completed: 0,
      failed: 0,
    };

    (statusCounts || []).forEach((s: any) => {
      if (s.status in counts) counts[s.status]++;
    });

    // Count due series
    const { data: dueSeries } = await adminSupabase
      .from("spacebaddie_content_series")
      .select("series_id, title, current_episode, total_episodes, next_episode_at")
      .eq("status", "active")
      .lte("next_episode_at", now);

    const due = (dueSeries || []).filter((s: any) => 
      s.current_episode < s.total_episodes
    );

    // Get recent episode activity
    const { data: recentEpisodes } = await adminSupabase
      .from("spacebaddie_series_episodes")
      .select("episode_id, series_id, episode_number, status, created_at")
      .order("created_at", { ascending: false })
      .limit(10);

    return NextResponse.json({
      ok: true,
      status: "ready",
      timestamp: now,
      seriesCounts: counts,
      dueForGeneration: due.length,
      dueSeries: due.map((s: any) => ({
        seriesId: s.series_id,
        title: s.title,
        nextEpisode: s.current_episode + 1,
        overdueBy: Math.round((Date.now() - new Date(s.next_episode_at).getTime()) / 60000) + " minutes",
      })),
      recentActivity: (recentEpisodes || []).map((e: any) => ({
        episodeId: e.episode_id,
        episodeNumber: e.episode_number,
        status: e.status,
        createdAt: e.created_at,
      })),
    });

  } catch (err: any) {
    return NextResponse.json({
      ok: false,
      error: err.message,
    }, { status: 500 });
  }
}
