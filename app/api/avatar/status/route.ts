/**
 * Avatar Status API - GET /api/avatar/status
 *
 * Returns status of avatar generation jobs.
 */

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getAvatarJob, getJobsByTenant, getAllAvatarJobs } from '@/lib/avatar/job-store';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('jobId');
    const list = searchParams.get('list') === 'true';
    const tenantId = req.headers.get('x-tenant-id') || 'default';

    // List all jobs for tenant
    if (list) {
      const allJobs = tenantId === 'admin' 
        ? getAllAvatarJobs() 
        : getJobsByTenant(tenantId);
      
      const jobs = allJobs.map(job => ({
        jobId: job.id,
        status: job.status,
        progress: job.progress,
        createdAt: job.createdAt,
      }));

      return NextResponse.json({
        success: true,
        jobs: jobs.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
        count: jobs.length,
      });
    }

    // Get specific job
    if (!jobId) {
      return NextResponse.json(
        { error: 'jobId query parameter required, or use ?list=true' },
        { status: 400 }
      );
    }

    const job = getAvatarJob(jobId);

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // Check access
    if (job.tenantId !== tenantId && tenantId !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Estimate time remaining
    let estimatedTimeRemaining: number | undefined;
    if (job.status !== 'completed' && job.status !== 'failed') {
      const progressRemaining = 100 - job.progress;
      estimatedTimeRemaining = Math.ceil(progressRemaining * 1.5); // ~1.5 sec per %
    }

    return NextResponse.json({
      success: true,
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      estimatedTimeRemaining,
      config: job.config,
      createdAt: job.createdAt,
    });

  } catch (error) {
    console.error('[Avatar Status] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
