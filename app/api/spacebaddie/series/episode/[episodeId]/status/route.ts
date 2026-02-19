'use server';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * GET /api/spacebaddie/series/episode/[episodeId]/status
 * Check and update video status using the video job API.
 * When the video completes, creates a post in spacebaddie_post_queue
 * so the cron can pick it up and post to YouTube/etc.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { episodeId: string } }
) {
  const { episodeId } = await params;

  if (!episodeId) {
    return NextResponse.json({ ok: false, error: 'episodeId required' }, { status: 400 });
  }

  const adminSupabase = createAdminClient();

  // Get the episode (join with series for platforms/tags when video completes)
  const { data: episode, error: fetchError } = await adminSupabase
    .from('spacebaddie_series_episodes')
    .select('*, series:spacebaddie_content_series(series_id, title, platforms, user_id, story_context)')
    .eq('episode_id', episodeId)
    .single();

  if (fetchError || !episode) {
    console.log('[EpisodeStatus] Episode not found:', episodeId, fetchError);
    return NextResponse.json({ ok: false, error: 'Episode not found' }, { status: 404 });
  }

  console.log('[EpisodeStatus] Episode data:', {
    episodeId,
    status: episode.status,
    videoJobId: episode.video_job_id,
    videoUrl: episode.video_url,
  });

  // If already has video URL, return it
  if (episode.video_url) {
    return NextResponse.json({
      ok: true,
      status: 'completed',
      videoUrl: episode.video_url,
      message: 'Video is ready',
    });
  }

  if (!episode.video_job_id) {
    return NextResponse.json({
      ok: true,
      status: episode.status,
      videoJobId: null,
      message: 'No video job found for this episode. The video generation may not have started.',
    });
  }

  // Check video job status using the video API
  // NOTE: Must use parentheses to avoid operator precedence bug
  // (|| has higher precedence than ?:, so without parens the ternary
  //  would evaluate on the result of `origin || host.includes(...)`)
  const host = req.headers.get('host') || 'spacebaddie.com';
  const origin = host.includes('localhost')
    ? 'http://localhost:3000'
    : `https://${host}`;
  
  console.log(`[EpisodeStatus] Checking video job status: ${episode.video_job_id}`);
  
  try {
    const statusRes = await fetch(`${origin}/api/spacebaddie/video?jobId=${episode.video_job_id}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    let statusData = await statusRes.json();
    console.log('[EpisodeStatus] Video API response:', statusData);

    // If the video API couldn't find the job (cold-start wiped in-memory store),
    // fall back to checking the database directly for a completed video URL
    // or a heygen_video_id we can use to query HeyGen.
    if (!statusRes.ok || (!statusData.status && statusData.error)) {
      console.log('[EpisodeStatus] Video API returned error, trying DB fallback...');
      const { data: dbJob } = await adminSupabase
        .from('spacebaddie_video_jobs')
        .select('*')
        .eq('id', episode.video_job_id)
        .maybeSingle();

      if (dbJob) {
        console.log('[EpisodeStatus] Found job in DB:', {
          id: dbJob.id,
          status: dbJob.status,
          hasVideoUrl: !!dbJob.video_url,
          hasHeygenId: !!dbJob.heygen_video_id,
        });

        if (dbJob.status === 'completed' && dbJob.video_url) {
          // Video already completed - use the URL from the DB
          statusData = { status: 'completed', videoUrl: dbJob.video_url };
        } else if (dbJob.heygen_video_id) {
          // Try checking HeyGen/Hedra directly via the video API with the provider ID
          console.log('[EpisodeStatus] Retrying video API with heygenVideoId:', dbJob.heygen_video_id);
          const retryRes = await fetch(
            `${origin}/api/spacebaddie/video?jobId=${episode.video_job_id}&heygenVideoId=${dbJob.heygen_video_id}`,
            { method: 'GET', headers: { 'Content-Type': 'application/json' } },
          );
          statusData = await retryRes.json();
          console.log('[EpisodeStatus] Retry response:', statusData);
        } else if (dbJob.status === 'failed') {
          statusData = { status: 'failed', error: dbJob.error || 'Video generation failed' };
        }
      } else {
        // No DB record found either. Check if the job is stale (created > 30 min ago).
        // If so, the video is lost (in-memory store wiped, DB never saved).
        const createdAt = episode.created_at ? new Date(episode.created_at).getTime() : 0;
        const ageMs = Date.now() - createdAt;
        const STALE_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

        if (createdAt > 0 && ageMs > STALE_THRESHOLD_MS) {
          console.warn(
            `[EpisodeStatus] Job ${episode.video_job_id} is stale (${Math.round(ageMs / 60000)}min old) ` +
            `with no DB record. Marking episode as failed so user can regenerate.`
          );
          statusData = {
            status: 'failed',
            error: 'Video job was lost due to a server restart. Please regenerate this episode.',
          };
        }
      }
    }

    if (statusData.status === 'completed' && statusData.videoUrl) {
      const now = new Date().toISOString();

      // Video is ready - update episode
      await adminSupabase
        .from('spacebaddie_series_episodes')
        .update({
          video_url: statusData.videoUrl,
          status: episode.scheduled_at ? 'scheduled' : 'pending_schedule',
          updated_at: now,
        })
        .eq('episode_id', episodeId);

      // Create the post in the queue so the cron posts it to YouTube/etc.
      // Actual post_queue columns: id (UUID), user_id, episode_id, project_id,
      // video_url (NOT NULL), caption, hashtags, platform (NOT NULL, singular),
      // platform_settings (jsonb), scheduled_at (NOT NULL), timezone, status,
      // posted_at, post_url, post_id, error_message, retry_count, created_at
      const series = episode.series;
      if (series && episode.scheduled_at) {
        const targetPlatforms = series.platforms || ['youtube'];
        const userTimezone = series.story_context?.timezone || 'America/New_York';
        try {
          // Avoid duplicate posts: check if one already exists for this episode+platform combo
          const { data: existingPosts } = await adminSupabase
            .from('spacebaddie_post_queue')
            .select('id, platform')
            .eq('user_id', series.user_id)
            .eq('video_url', statusData.videoUrl);

          const existingPlatforms = new Set((existingPosts || []).map((p: any) => p.platform));

          const seriesTitle = series.title || 'SpaceBaddie Series';
          const scriptPreview = (episode.script || '').substring(0, 200);
          const caption = `${seriesTitle} - Episode ${episode.episode_number}\n\n${scriptPreview}...`;
          const hashtags = `#${seriesTitle.toLowerCase().replace(/\s+/g, '')} #spacebaddie #ai`;

          // Use scheduled_at or now (whichever is later) so the cron picks it up
          const scheduledTime = new Date(episode.scheduled_at) > new Date()
            ? episode.scheduled_at
            : now;

          // Insert one row per platform (table uses singular `platform`)
          for (const plat of targetPlatforms) {
            if (existingPlatforms.has(plat)) {
              console.log(`[EpisodeStatus] Post already exists for episode ${episodeId} on ${plat}`);
              continue;
            }
            const { error: insertErr } = await adminSupabase
              .from('spacebaddie_post_queue')
              .insert({
                id: crypto.randomUUID(),
                user_id: series.user_id,
                video_url: statusData.videoUrl,
                caption,
                hashtags,
                platform: plat,
                platform_settings: {
                  source_episode_id: episodeId,
                  source_series_id: series.series_id,
                  source_type: 'series',
                },
                scheduled_at: scheduledTime,
                timezone: userTimezone,
                status: 'queued',
              });

            if (insertErr) {
              console.error(`[EpisodeStatus] Failed to create post queue for ${plat}:`, insertErr);
            } else {
              console.log(`[EpisodeStatus] Post queued for episode ${episodeId} on ${plat}, scheduled at ${scheduledTime}`);
            }
          }
        } catch (postErr) {
          // Non-fatal: video is ready, post creation is best-effort
          console.error('[EpisodeStatus] Error creating post queue entry:', postErr);
        }
      }

      return NextResponse.json({
        ok: true,
        status: 'completed',
        videoUrl: statusData.videoUrl,
        message: 'Video is ready!',
      });
    } else if (statusData.status === 'failed') {
      // Video generation failed
      await adminSupabase
        .from('spacebaddie_series_episodes')
        .update({
          status: 'failed',
          error_message: statusData.error || 'Video generation failed',
          updated_at: new Date().toISOString(),
        })
        .eq('episode_id', episodeId);

      return NextResponse.json({
        ok: false,
        status: 'failed',
        error: statusData.error || 'Video generation failed',
      });
    } else {
      // Still processing
      return NextResponse.json({
        ok: true,
        status: statusData.status || 'processing',
        progress: statusData.progress,
        message: `Video is ${statusData.status || 'processing'}. This usually takes 1-5 minutes.`,
      });
    }
  } catch (err: any) {
    console.error('[EpisodeStatus] Error checking video status:', err);
    return NextResponse.json({
      ok: false,
      status: 'error',
      error: `Failed to check video status: ${err.message}`,
    });
  }
}
