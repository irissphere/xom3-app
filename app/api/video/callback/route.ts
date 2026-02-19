/**
 * Video Callback API - POST /api/video/callback
 * 
 * Receives completion/failure callbacks from the video render worker.
 * Updates job status in the system.
 */

import { NextResponse } from 'next/server';
import { getVideoJob } from '@/lib/video/job-queue';
import { emitSignal } from '@/lib/uoi/signals';

const WORKER_SECRET = process.env.VIDEO_WORKER_SECRET || '';

// In-memory store update (matches job-queue.ts structure)
// In production, this would be a database call
const updateJobFromCallback = (jobId: string, updates: {
  status: 'completed' | 'failed';
  outputUrl?: string;
  thumbnailUrl?: string;
  error?: string;
}) => {
  // The job-queue uses a Map internally
  // We access it through a dynamic import to avoid circular deps
  const job = getVideoJob(jobId);
  if (job) {
    Object.assign(job, {
      ...updates,
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      progress: updates.status === 'completed' ? 100 : job.progress,
    });
  }
  return job;
};

export async function POST(req: Request) {
  try {
    // Verify worker secret
    const secret = req.headers.get('x-worker-secret');
    if (!secret || secret !== WORKER_SECRET) {
      console.warn('[Video Callback] Unauthorized attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { jobId, status, videoUrl, thumbnailUrl, error } = body;

    if (!jobId || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: jobId, status' },
        { status: 400 }
      );
    }

    // Validate status
    if (!['completed', 'failed'].includes(status)) {
      return NextResponse.json(
        { error: 'Status must be "completed" or "failed"' },
        { status: 400 }
      );
    }

    // Check if job exists
    const existingJob = getVideoJob(jobId);
    if (!existingJob) {
      console.warn(`[Video Callback] Job not found: ${jobId}`);
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    if (status === 'completed') {
      if (!videoUrl) {
        return NextResponse.json(
          { error: 'videoUrl required for completed status' },
          { status: 400 }
        );
      }

      // Update job
      updateJobFromCallback(jobId, {
        status: 'completed',
        outputUrl: videoUrl,
        thumbnailUrl: thumbnailUrl,
      });

      // Emit completion signal
      emitSignal({
        source: 'video_worker',
        type: 'video_render_completed',
        payload: {
          jobId,
          tenantId: existingJob.tenantId,
          videoUrl,
          thumbnailUrl,
          costCents: existingJob.costCents,
        },
        priority: 'high',
      });

      console.log(`[Video Callback] Job ${jobId} completed: ${videoUrl}`);

      return NextResponse.json({
        success: true,
        message: 'Job completion recorded',
        jobId,
        videoUrl,
        thumbnailUrl,
      });
    }

    if (status === 'failed') {
      // Update job
      updateJobFromCallback(jobId, {
        status: 'failed',
        error: error || 'Unknown error from worker',
      });

      // Emit failure signal
      emitSignal({
        source: 'video_worker',
        type: 'video_render_failed',
        payload: {
          jobId,
          tenantId: existingJob.tenantId,
          error: error || 'Unknown error',
        },
        priority: 'high',
      });

      console.log(`[Video Callback] Job ${jobId} failed: ${error}`);

      return NextResponse.json({
        success: true,
        message: 'Job failure recorded',
        jobId,
        error,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Status update received',
      jobId,
      status,
    });

  } catch (error) {
    console.error('[Video Callback] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// Health check for the callback endpoint
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/video/callback',
    accepts: 'POST',
    requiredHeaders: ['x-worker-secret'],
    requiredBody: ['jobId', 'status'],
  });
}
