'use server';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createTalkingVideo, isHeyGenAvailable } from '@/lib/heygen/client';

/**
 * POST /api/spacebaddie/series/episode/[episodeId]/retry
 * Retry video generation for a stuck or failed episode
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { episodeId: string } }
) {
  const { episodeId } = await params;

  if (!episodeId) {
    return NextResponse.json({ ok: false, error: 'episodeId required' }, { status: 400 });
  }

  const adminSupabase = createAdminClient();

  // Get the episode with series data
  const { data: episode, error: fetchError } = await adminSupabase
    .from('spacebaddie_series_episodes')
    .select(`
      *,
      series:spacebaddie_content_series(
        series_id,
        title,
        avatar_image_url,
        voice_style,
        platforms,
        frequency,
        post_time_utc
      )
    `)
    .eq('episode_id', episodeId)
    .single();

  if (fetchError || !episode) {
    console.log('[EpisodeRetry] Episode not found:', episodeId, fetchError);
    return NextResponse.json({ ok: false, error: 'Episode not found' }, { status: 404 });
  }

  console.log('[EpisodeRetry] Episode data:', {
    episodeId,
    status: episode.status,
    hasScript: !!episode.script,
    hasVideoUrl: !!episode.video_url,
    seriesTitle: episode.series?.title,
  });

  // Check if episode has a script - required for video generation
  if (!episode.script) {
    return NextResponse.json({
      ok: false,
      error: 'Episode has no script. Cannot regenerate video without a script.',
    }, { status: 400 });
  }

  // Get avatar image URL from series
  const avatarImageUrl = episode.series?.avatar_image_url;
  if (!avatarImageUrl) {
    return NextResponse.json({
      ok: false,
      error: 'Series has no avatar image. Please upload an avatar image first.',
    }, { status: 400 });
  }

  // Check HeyGen availability
  if (!isHeyGenAvailable()) {
    return NextResponse.json({
      ok: false,
      error: 'HeyGen API is not configured',
    }, { status: 503 });
  }

  try {
    // Reset episode status
    await adminSupabase
      .from('spacebaddie_series_episodes')
      .update({
        status: 'generating_video',
        video_url: null,
        video_job_id: null,
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq('episode_id', episodeId);

    console.log('[EpisodeRetry] Starting HeyGen video generation...');

    // Generate new video with HeyGen
    const videoResult = await createTalkingVideo({
      imageUrl: avatarImageUrl,
      script: episode.script,
      voiceId: episode.series?.voice_style || undefined,
      aspectRatio: '9:16', // Default to vertical for social
    });

    if (!videoResult.success || !videoResult.videoId) {
      console.error('[EpisodeRetry] HeyGen failed:', videoResult.error);
      
      await adminSupabase
        .from('spacebaddie_series_episodes')
        .update({
          status: 'failed',
          error_message: videoResult.error || 'Video generation failed',
          updated_at: new Date().toISOString(),
        })
        .eq('episode_id', episodeId);

      return NextResponse.json({
        ok: false,
        error: videoResult.error || 'Failed to start video generation',
      });
    }

    console.log('[EpisodeRetry] HeyGen job started:', videoResult.videoId);

    // Create/update job record in the video jobs table
    const origin = req.headers.get('origin') || 
                   req.headers.get('host')?.includes('localhost') ? 'http://localhost:3000' : 
                   `https://${req.headers.get('host')}`;

    // Register the job with the video API
    try {
      await fetch(`${origin}/api/spacebaddie/video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          jobId: videoResult.videoId,
          heygenVideoId: videoResult.videoId,
          status: 'processing',
        }),
      });
    } catch (regErr) {
      console.warn('[EpisodeRetry] Failed to register job, continuing anyway:', regErr);
    }

    // Update episode with new job ID
    await adminSupabase
      .from('spacebaddie_series_episodes')
      .update({
        video_job_id: videoResult.videoId,
        status: 'generating_video',
        updated_at: new Date().toISOString(),
      })
      .eq('episode_id', episodeId);

    return NextResponse.json({
      ok: true,
      message: 'Video regeneration started',
      videoJobId: videoResult.videoId,
    });

  } catch (err: any) {
    console.error('[EpisodeRetry] Error:', err);
    
    await adminSupabase
      .from('spacebaddie_series_episodes')
      .update({
        status: 'failed',
        error_message: `Retry failed: ${err.message}`,
        updated_at: new Date().toISOString(),
      })
      .eq('episode_id', episodeId);

    return NextResponse.json({
      ok: false,
      error: `Failed to retry video generation: ${err.message}`,
    }, { status: 500 });
  }
}
