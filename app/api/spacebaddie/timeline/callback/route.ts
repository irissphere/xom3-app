import { NextResponse } from 'next/server';
import { getTimelineJob, updateTimelineJob } from '@/lib/spacebaddie/timeline-jobs';

const WORKER_SECRET = process.env.VIDEO_WORKER_SECRET || '';

export async function POST(req: Request) {
  try {
    const secret = req.headers.get('x-worker-secret');
    if (!secret || secret !== WORKER_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { jobId, status, videoUrl, error } = body || {};

    if (!jobId || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: jobId, status' },
        { status: 400 }
      );
    }

    const job = getTimelineJob(jobId);
    if (!job) {
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

      updateTimelineJob(jobId, {
        status: 'completed',
        outputUrl: videoUrl,
      });

      return NextResponse.json({ ok: true, jobId, status });
    }

    if (status === 'failed') {
      updateTimelineJob(jobId, {
        status: 'failed',
        error: error || 'Timeline render failed',
      });

      return NextResponse.json({ ok: true, jobId, status });
    }

    updateTimelineJob(jobId, { status: 'processing' });
    return NextResponse.json({ ok: true, jobId, status });
  } catch (error) {
    console.error('[Timeline Callback] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Callback failed' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/spacebaddie/timeline/callback',
  });
}
