/**
 * Video Generation API - POST /api/video/generate
 * 
 * Creates a new video generation job and dispatches to the render worker.
 * Returns jobId immediately for status polling.
 */

import { NextResponse } from 'next/server';
import { 
  createVideoJob, 
  startJob, 
  estimateVideoCost,
  getVideoJob,
} from '@/lib/video/job-queue';
import { 
  VideoStyle, 
  VoiceId, 
  AspectRatio, 
  GenerateVideoRequest,
  VIDEO_COSTS,
} from '@/lib/video/types';
import { 
  dispatchToWorker, 
  isWorkerAvailable, 
  getWorkerStatus,
} from '@/lib/video/worker-client';
import { emitSignal } from '@/lib/uoi/signals';

// Validation helpers
const VALID_STYLES: VideoStyle[] = ['minimal', 'bold', 'corporate', 'energetic', 'cinematic', 'social'];
const VALID_VOICES: VoiceId[] = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
const VALID_ASPECTS: AspectRatio[] = ['16:9', '9:16', '1:1', '4:5'];

export async function POST(req: Request) {
  try {
    const body: GenerateVideoRequest = await req.json();

    // Validate required fields
    if (!body.script || typeof body.script !== 'string') {
      return NextResponse.json(
        { error: 'script is required and must be a string' },
        { status: 400 }
      );
    }

    if (body.script.length < 10) {
      return NextResponse.json(
        { error: 'script must be at least 10 characters' },
        { status: 400 }
      );
    }

    if (body.script.length > 5000) {
      return NextResponse.json(
        { error: 'script must not exceed 5000 characters' },
        { status: 400 }
      );
    }

    // Validate optional fields
    const style: VideoStyle = body.style && VALID_STYLES.includes(body.style) 
      ? body.style 
      : 'social';

    const voice: VoiceId = body.voice && VALID_VOICES.includes(body.voice)
      ? body.voice
      : 'nova';

    const aspectRatio: AspectRatio = body.aspectRatio && VALID_ASPECTS.includes(body.aspectRatio)
      ? body.aspectRatio
      : '9:16';

    const duration = Math.max(15, Math.min(180, body.duration || 60));

    // Extract tenant ID from headers/auth
    const tenantId = req.headers.get('x-tenant-id') || 'default';

    // Estimate cost
    const costEstimate = estimateVideoCost(body.script, duration);

    // TODO: Check wallet balance before proceeding
    // const wallet = await getWallet(tenantId);
    // if (!hasBalance(wallet, VIDEO_COSTS.USER_CHARGE)) {
    //   return NextResponse.json({ error: 'Insufficient balance' }, { status: 402 });
    // }

    // Create job record
    const job = createVideoJob(
      tenantId,
      body.script,
      style,
      voice,
      duration,
      aspectRatio
    );

    // Check if external worker is available
    const workerAvailable = await isWorkerAvailable();

    if (workerAvailable) {
      // Dispatch to external Hostinger worker
      console.log(`[${job.id}] Dispatching to external worker...`);
      
      const dispatchResult = await dispatchToWorker({
        jobId: job.id,
        tenantId,
        script: body.script,
        style,
        voice,
        aspectRatio,
        duration,
      });

      if (!dispatchResult.success) {
        // Fallback to local processing if dispatch fails
        console.log(`[${job.id}] Worker dispatch failed, falling back to local processing`);
        startJob(job.id);
      }

      emitSignal({
        source: 'video_api',
        type: 'video_generation_started',
        payload: {
          jobId: job.id,
          tenantId,
          style,
          voice,
          aspectRatio,
          scriptLength: body.script.length,
          estimatedCost: costEstimate.userCharge,
          mode: dispatchResult.success ? 'worker' : 'local',
        },
        priority: 'medium',
      });

    } else {
      // No worker available, process locally (limited capability)
      console.log(`[${job.id}] No worker available, processing locally...`);
      startJob(job.id);

      emitSignal({
        source: 'video_api',
        type: 'video_generation_started',
        payload: {
          jobId: job.id,
          tenantId,
          style,
          voice,
          aspectRatio,
          scriptLength: body.script.length,
          estimatedCost: costEstimate.userCharge,
          mode: 'local',
        },
        priority: 'medium',
      });
    }

    return NextResponse.json({
      success: true,
      jobId: job.id,
      status: job.status,
      estimatedCost: {
        cents: VIDEO_COSTS.USER_CHARGE,
        formatted: `$${(VIDEO_COSTS.USER_CHARGE / 100).toFixed(2)}`,
      },
      config: {
        style,
        voice,
        aspectRatio,
        duration,
      },
      processingMode: workerAvailable ? 'worker' : 'local',
      message: 'Video generation started. Poll /api/video/status/:jobId for updates.',
    });

  } catch (error) {
    console.error('[Video API] Generate error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint for cost estimation and worker status
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    // Check worker status
    if (action === 'worker-status') {
      const status = await getWorkerStatus();
      return NextResponse.json({
        success: true,
        worker: status,
      });
    }

    // Cost estimation (default)
    const scriptLength = parseInt(searchParams.get('scriptLength') || '500');
    const duration = parseInt(searchParams.get('duration') || '60');

    if (scriptLength < 10 || scriptLength > 5000) {
      return NextResponse.json(
        { error: 'scriptLength must be between 10 and 5000' },
        { status: 400 }
      );
    }

    // Create dummy script for estimation
    const dummyScript = 'a'.repeat(scriptLength);
    const estimate = estimateVideoCost(dummyScript, duration);

    // Check worker availability
    const workerAvailable = await isWorkerAvailable();

    return NextResponse.json({
      success: true,
      estimate: {
        scriptLength,
        duration,
        breakdown: {
          tts: { cents: estimate.ttsCost, formatted: `$${(estimate.ttsCost / 100).toFixed(2)}` },
          render: { cents: estimate.renderCost, formatted: `$${(estimate.renderCost / 100).toFixed(2)}` },
          total: { cents: estimate.totalCost, formatted: `$${(estimate.totalCost / 100).toFixed(2)}` },
        },
        userCharge: {
          cents: estimate.userCharge,
          formatted: `$${(estimate.userCharge / 100).toFixed(2)}`,
        },
      },
      worker: {
        available: workerAvailable,
        message: workerAvailable 
          ? 'External render worker is online' 
          : 'External worker offline, will use local processing (limited)',
      },
      availableOptions: {
        styles: VALID_STYLES,
        voices: VALID_VOICES,
        aspectRatios: VALID_ASPECTS,
        durationRange: { min: 15, max: 180 },
        scriptLengthRange: { min: 10, max: 5000 },
      },
    });

  } catch (error) {
    console.error('[Video API] Estimate error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
