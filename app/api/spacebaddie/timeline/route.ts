import { NextResponse } from 'next/server';
import { createTimelineJob, getTimelineJob, updateTimelineJob } from '@/lib/spacebaddie/timeline-jobs';

const WORKER_URL = process.env.VIDEO_WORKER_URL || '';
const WORKER_SECRET = process.env.VIDEO_WORKER_SECRET || '';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://xom3.io';

const buildJobId = () => `timeline_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export async function POST(req: Request) {
  try {
    if (!WORKER_URL || !WORKER_SECRET) {
      return NextResponse.json(
        { error: 'Video worker is not configured' },
        { status: 503 }
      );
    }

    const body = await req.json();
    const clips = Array.isArray(body?.clips) ? body.clips : [];
    const audioUrl = typeof body?.audioUrl === 'string' ? body.audioUrl : undefined;

    if (clips.length < 1 || !clips.every((clip) => clip?.url)) {
      return NextResponse.json(
        { error: 'At least one clip URL is required' },
        { status: 400 }
      );
    }

    const jobId = buildJobId();
    const now = new Date().toISOString();

    createTimelineJob({
      jobId,
      status: 'queued',
      clips: clips.map((clip: { url: string; label?: string }) => ({
        url: clip.url,
        label: clip.label,
      })),
      audioUrl,
      createdAt: now,
      updatedAt: now,
    });

    const response = await fetch(`${WORKER_URL}/timeline/render`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-worker-secret': WORKER_SECRET,
      },
      body: JSON.stringify({
        jobId,
        clips,
        audioUrl,
        callbackUrl: `${APP_URL}/api/spacebaddie/timeline/callback`,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      updateTimelineJob(jobId, { status: 'failed', error: errorText || 'Worker error' });
      return NextResponse.json(
        { error: `Worker error: ${errorText}` },
        { status: 502 }
      );
    }

    updateTimelineJob(jobId, { status: 'processing' });

    return NextResponse.json({
      ok: true,
      jobId,
      status: 'processing',
    });
  } catch (error) {
    console.error('[Timeline Export] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Timeline export failed' },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get('jobId');

  if (!jobId) {
    return NextResponse.json(
      { error: 'jobId is required' },
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

  return NextResponse.json({ ok: true, job });
}
