/**
 * SpaceBaddie Daily Generate API
 * POST /api/spacebaddie/daily-generate
 *
 * Orchestrates daily content: script generation + video creation + scheduling.
 * Called by n8n cron or manually. Uses /api/video/generate for video creation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabase() {
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey);
}

export interface DailyGenerateRequest {
  profileId?: string;
  imageUrl?: string;
  script?: string;
  topic?: string;
  voiceId?: string;
  voiceStyle?: string;
  aspectRatio?: '16:9' | '9:16' | '1:1';
  platform?: string;
  scheduledAt?: string;
  userId?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: DailyGenerateRequest = await req.json();
    let { imageUrl, script: providedScript, topic, voiceStyle, aspectRatio, platform = 'youtube', scheduledAt, userId, profileId } = body;
    const origin = new URL(req.url).origin;
    const supabase = getSupabase();

    // Load profile if provided
    if (profileId && supabase) {
      const { data: profile } = await supabase
        .from('spacebaddie_avatar_profiles')
        .select('display_name, avatar_image_urls, voice_id, face_id, personality_prompt')
        .eq('profile_id', profileId)
        .maybeSingle();
      if (profile) {
        const urls = (profile.avatar_image_urls as string[] | null) || [];
        if (urls.length > 0 && !imageUrl) imageUrl = urls[Math.floor(Math.random() * urls.length)];
        if (profile.personality_prompt && !topic) topic = profile.personality_prompt;
      }
    }

    if (!imageUrl) {
      return NextResponse.json({ success: false, error: 'imageUrl or profileId with avatar_image_urls required' }, { status: 400 });
    }

    // Generate script if needed
    let script = providedScript;
    if (!script && topic) {
      try {
        const scriptRes = await fetch(`${origin}/api/avatar/script`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic, tone: voiceStyle || 'engaging', duration: 15 }),
        });
        const scriptData = await scriptRes.json();
        script = Array.isArray(scriptData.scripts) ? scriptData.scripts[0] : scriptData.script;
      } catch {
        // fallback
      }
    }
    if (!script) {
      script = `Hey everyone! Here's today's update. Stay tuned for more great content!`;
    }

    // Generate video via /api/video/generate
    const videoRes = await fetch(`${origin}/api/video/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: imageUrl,
        script,
        voice_style: voiceStyle || 'natural',
        aspect_ratio: aspectRatio || '9:16',
        user_id: userId,
      }),
    });
    const videoData = await videoRes.json();
    if (!videoData.job_id) {
      return NextResponse.json({
        success: false,
        error: videoData.error || 'Video generation failed',
        video: videoData,
      }, { status: 500 });
    }

    // Schedule post
    const scheduled = scheduledAt ? new Date(scheduledAt) : new Date(Date.now() + 24 * 60 * 60 * 1000);
    const postId = `sb_post_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    if (supabase) {
      await supabase.from('broadcast_posts').upsert({
        id: postId,
        platform,
        title: topic || 'Daily content',
        caption: script.slice(0, 200),
        description: script,
        status: 'scheduled',
        scheduled_at: scheduled.toISOString(),
        video_url: null,
        metadata: {
          job_id: videoData.job_id,
          profile_id: profileId,
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
    }

    return NextResponse.json({
      success: true,
      jobId: videoData.job_id,
      postId,
      scheduledAt: scheduled.toISOString(),
      platform,
      pollUrl: `/api/video/status/${videoData.job_id}`,
    });
  } catch (e) {
    console.error('[SpaceBaddie daily-generate]', e);
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Internal error' },
      { status: 500 }
    );
  }
}
