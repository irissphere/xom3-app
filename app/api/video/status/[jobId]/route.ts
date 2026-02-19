/**
 * Video Status API - GET /api/video/status/:jobId
 * 
 * Returns status of a specific video generation job by ID.
 */

import { NextResponse } from 'next/server';
import { getVideoJob, retryJob, cancelJob } from '@/lib/video/job-queue';
import { VideoStatusResponse } from '@/lib/video/types';

interface RouteParams {
  params: Promise<{ jobId: string }>;
}

export async function GET(req: Request, { params }: RouteParams) {
  try {
    const { jobId } = await params;
    const tenantId = req.headers.get('x-tenant-id') || 'default';

    const job = getVideoJob(jobId);

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // Check tenant access
    if (job.tenantId !== tenantId && tenantId !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Calculate estimated time remaining
    let estimatedTimeRemaining: number | undefined;
    if (job.status !== 'completed' && job.status !== 'failed') {
      const progressRemaining = 100 - job.progress;
      estimatedTimeRemaining = Math.ceil(progressRemaining / 2);
    }

    const response: VideoStatusResponse = {
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      downloadUrl: job.outputUrl,
      thumbnailUrl: job.thumbnailUrl,
      error: job.error,
      estimatedTimeRemaining,
    };

    return NextResponse.json({
      success: true,
      ...response,
      details: {
        style: job.style,
        voice: job.voice,
        aspectRatio: job.aspectRatio,
        duration: job.audioDuration,
        costCents: job.costCents,
        retryCount: job.retryCount,
        createdAt: job.createdAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
      },
    });

  } catch (error) {
    console.error('[Video API] Status error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST to retry a failed job
export async function POST(req: Request, { params }: RouteParams) {
  try {
    const { jobId } = await params;
    const tenantId = req.headers.get('x-tenant-id') || 'default';
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'retry';

    const job = getVideoJob(jobId);

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // Check tenant access
    if (job.tenantId !== tenantId && tenantId !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    if (action === 'retry') {
      if (job.status !== 'failed') {
        return NextResponse.json(
          { error: 'Only failed jobs can be retried' },
          { status: 400 }
        );
      }

      const retriedJob = retryJob(jobId);
      if (!retriedJob) {
        return NextResponse.json(
          { error: 'Max retries exceeded (3)' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Job retry started',
        jobId: retriedJob.id,
        status: retriedJob.status,
        retryCount: retriedJob.retryCount,
      });
    }

    if (action === 'cancel') {
      if (job.status !== 'queued') {
        return NextResponse.json(
          { error: 'Only queued jobs can be cancelled' },
          { status: 400 }
        );
      }

      const cancelled = cancelJob(jobId);
      if (!cancelled) {
        return NextResponse.json(
          { error: 'Failed to cancel job' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Job cancelled',
        jobId,
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "retry" or "cancel"' },
      { status: 400 }
    );

  } catch (error) {
    console.error('[Video API] Action error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}















