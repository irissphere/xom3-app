/**
 * Video Status API - GET /api/video/status
 *
 * Returns status of a video generation job.
 * Supports both query param (?jobId=xxx) and listing jobs for a tenant.
 */

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getVideoJob, listJobs } from '@/lib/video/job-queue';
import { VideoStatusResponse } from '@/lib/video/types';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('jobId');
    const list = searchParams.get('list') === 'true';
    const tenantId = req.headers.get('x-tenant-id') || 'default';

    // List all jobs for tenant
    if (list) {
      const limit = parseInt(searchParams.get('limit') || '20');
      const jobs = listJobs(tenantId, Math.min(limit, 100));

      return NextResponse.json({
        success: true,
        jobs: jobs.map(job => ({
          jobId: job.id,
          status: job.status,
          progress: job.progress,
          style: job.style,
          aspectRatio: job.aspectRatio,
          downloadUrl: job.outputUrl,
          thumbnailUrl: job.thumbnailUrl,
          error: job.error,
          costCents: job.costCents,
          createdAt: job.createdAt,
          completedAt: job.completedAt,
        })),
        count: jobs.length,
      });
    }

    // Get specific job
    if (!jobId) {
      return NextResponse.json(
        { error: 'jobId query parameter is required, or use ?list=true to list all jobs' },
        { status: 400 }
      );
    }

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
      // Rough estimate: 1 second per 2% progress
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















