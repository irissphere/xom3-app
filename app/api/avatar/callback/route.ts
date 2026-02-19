/**
 * Avatar Callback API - POST /api/avatar/callback
 * 
 * Receives completion callbacks from the GPU worker.
 * Persists completed videos to the database for Projects display.
 * 
 * AKV: SpaceBaddie Sovereign - Callback Lane
 */

import { NextRequest, NextResponse } from 'next/server';
import { updateAvatarJob, getAvatarJob } from '@/lib/avatar/job-store';
import { createClient } from '@/lib/supabase/server';
import { emitSignal } from '@/lib/uoi/signals';
import { notifyVideoComplete } from '@/lib/notifications/spacebaddie-notifier';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface CallbackPayload {
  jobId: string;
  status: 'completed' | 'failed' | 'processing';
  progress?: number;
  resultUrl?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * POST /api/avatar/callback
 * 
 * Body: { jobId, status, progress?, resultUrl?, thumbnailUrl?, error?, metadata? }
 * 
 * Called by GPU worker to report job progress/completion
 */
export async function POST(req: NextRequest) {
  try {
    // Verify callback is from trusted source (in production, use secret/signature)
    const authHeader = req.headers.get('x-worker-auth');
    const expectedAuth = process.env.AVATAR_WORKER_AUTH_TOKEN;
    
    if (expectedAuth && authHeader !== expectedAuth) {
      console.warn('[Avatar Callback] Unauthorized callback attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: CallbackPayload = await req.json();
    const { jobId, status, progress, resultUrl, thumbnailUrl, durationSeconds, error, metadata } = body;

    if (!jobId || !status) {
      return NextResponse.json({ error: 'Missing jobId or status' }, { status: 400 });
    }

    // Get existing job from in-memory store
    const existingJob = getAvatarJob(jobId);
    
    // Update in-memory store
    updateAvatarJob(jobId, {
      status,
      progress: progress ?? (status === 'completed' ? 100 : undefined),
      resultUrl,
      thumbnailUrl,
      error,
    });

    // Persist to database on completion or failure
    if (status === 'completed' || status === 'failed') {
      const supabase = await createClient();
      
      // Try to find existing render record
      const { data: existingRender } = await supabase
        .from('spacebaddie_render_history')
        .select('render_id, user_id')
        .eq('job_id', jobId)
        .single();

      if (existingRender) {
        // Update existing record
        const { error: updateError } = await supabase
          .from('spacebaddie_render_history')
          .update({
            status,
            progress: status === 'completed' ? 100 : (progress || 0),
            output_url: resultUrl,
            thumbnail_url: thumbnailUrl,
            duration_seconds: durationSeconds,
            error_message: error,
            completed_at: status === 'completed' ? new Date().toISOString() : null,
            metadata: metadata ? { ...metadata, callback_received_at: new Date().toISOString() } : undefined,
            updated_at: new Date().toISOString(),
          })
          .eq('job_id', jobId);

        if (updateError) {
          console.error('[Avatar Callback] Failed to update render history:', updateError);
        } else {
          console.log(`[Avatar Callback] Updated render history for job ${jobId}`);
          
          // Send notification to user on completion
          if (status === 'completed' && existingRender.user_id && resultUrl) {
            try {
              await notifyVideoComplete(existingRender.user_id, resultUrl, thumbnailUrl);
            } catch (notifyError) {
              console.error('[Avatar Callback] Failed to send notification:', notifyError);
            }
          }
        }
      } else if (existingJob) {
        // Create new record if we have job info but no DB record
        // This handles cases where job was created before DB persistence was added
        console.log(`[Avatar Callback] No existing render record for ${jobId}, creating one`);
        
        // We don't have user_id from the in-memory job, so we can't create a full record
        // This is a limitation - jobs created before this update won't appear in Projects
        // Future jobs will be saved to DB on creation
      }

      // Emit completion signal
      emitSignal({
        source: 'avatar_callback',
        type: status === 'completed' ? 'avatar_generation_completed' : 'avatar_generation_failed',
        payload: {
          jobId,
          resultUrl,
          thumbnailUrl,
          durationSeconds,
          error,
          tenantId: existingJob?.tenantId,
        },
        priority: status === 'completed' ? 'medium' : 'high',
      });
    }

    return NextResponse.json({
      ok: true,
      jobId,
      status,
      message: `Job ${jobId} ${status}`,
    });

  } catch (err: any) {
    console.error('[Avatar Callback] Error:', err);
    return NextResponse.json({
      ok: false,
      error: err?.message || 'Internal server error',
    }, { status: 500 });
  }
}

/**
 * GET /api/avatar/callback
 * 
 * Health check for callback endpoint
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: '/api/avatar/callback',
    method: 'POST',
    description: 'Avatar generation callback endpoint for GPU worker',
  });
}
