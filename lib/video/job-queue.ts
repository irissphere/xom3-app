/**
 * Video Job Queue - Background Processing
 * 
 * Manages video generation jobs with status tracking and retry logic.
 * In production, this would use Redis/database for persistence.
 */

import { VideoJob, VideoStatus, VideoStyle, VoiceId, AspectRatio, VIDEO_COSTS } from './types';
import { generateSpeech, segmentScript, calculateTTSCost } from './voice-synthesis';
import { renderVideo, calculateRenderCost } from './render-engine';
import { emitSignal } from '@/lib/uoi/signals';

// In-memory job store (use Redis/database in production)
const jobStore = new Map<string, VideoJob>();

// Active processing promises
const processingJobs = new Map<string, Promise<void>>();

/**
 * Generate a unique job ID
 */
function generateJobId(): string {
  return `vid_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Create a new video job
 */
export function createVideoJob(
  tenantId: string,
  script: string,
  style: VideoStyle = 'social',
  voice: VoiceId = 'nova',
  duration: number = 60,
  aspectRatio: AspectRatio = '9:16'
): VideoJob {
  const job: VideoJob = {
    id: generateJobId(),
    tenantId,
    status: 'queued',
    progress: 0,
    script,
    style,
    voice,
    duration,
    aspectRatio,
    costCents: 0,
    retryCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  jobStore.set(job.id, job);
  
  // Emit signal
  emitSignal({
    source: 'video_pipeline',
    type: 'video_job_created',
    payload: { jobId: job.id, tenantId, style, aspectRatio },
    priority: 'medium',
  });

  return job;
}

/**
 * Get a job by ID
 */
export function getVideoJob(jobId: string): VideoJob | undefined {
  return jobStore.get(jobId);
}

/**
 * Update job status and progress
 */
function updateJob(jobId: string, updates: Partial<VideoJob>): VideoJob | undefined {
  const job = jobStore.get(jobId);
  if (!job) return undefined;

  const updated: VideoJob = {
    ...job,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  jobStore.set(jobId, updated);
  return updated;
}

/**
 * Process a video job (main pipeline)
 */
async function processJob(jobId: string): Promise<void> {
  const job = getVideoJob(jobId);
  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }

  let totalCost = 0;

  try {
    // Step 1: Generate audio
    updateJob(jobId, { status: 'generating_audio', progress: 10, startedAt: new Date().toISOString() });
    
    const ttsResult = await generateSpeech({
      text: job.script,
      voice: job.voice,
      speed: 1.0,
    });

    totalCost += ttsResult.costCents;

    // Store audio URL (in production, upload to storage first)
    const audioUrl = `https://storage.xom3.ai/audio/${jobId}/speech.mp3`;
    updateJob(jobId, { 
      audioUrl, 
      audioDuration: ttsResult.duration,
      progress: 40,
      costCents: totalCost,
    });

    // Step 2: Generate caption segments
    const segments = segmentScript(job.script, ttsResult.duration);

    // Step 3: Render video
    updateJob(jobId, { status: 'rendering', progress: 50 });

    const renderResult = await renderVideo({
      jobId,
      audioUrl,
      audioDuration: ttsResult.duration,
      segments,
      style: job.style,
      aspectRatio: job.aspectRatio,
    });

    totalCost += renderResult.costCents;

    // Step 4: Encoding (handled by FFmpeg in render)
    updateJob(jobId, { status: 'encoding', progress: 80, costCents: totalCost });

    // Step 5: Upload to storage
    updateJob(jobId, { status: 'uploading', progress: 90 });

    // Step 6: Complete
    updateJob(jobId, {
      status: 'completed',
      progress: 100,
      outputUrl: renderResult.outputUrl,
      thumbnailUrl: renderResult.thumbnailUrl,
      costCents: totalCost,
      completedAt: new Date().toISOString(),
    });

    // Emit completion signal
    emitSignal({
      source: 'video_pipeline',
      type: 'video_job_completed',
      payload: {
        jobId,
        tenantId: job.tenantId,
        outputUrl: renderResult.outputUrl,
        duration: renderResult.duration,
        costCents: totalCost,
      },
      priority: 'high',
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    updateJob(jobId, {
      status: 'failed',
      error: errorMessage,
      retryCount: job.retryCount + 1,
      costCents: totalCost,
    });

    // Emit failure signal
    emitSignal({
      source: 'video_pipeline',
      type: 'video_job_failed',
      payload: { jobId, tenantId: job.tenantId, error: errorMessage },
      priority: 'high',
    });

    throw error;
  }
}

/**
 * Start processing a job (async, returns immediately)
 */
export function startJob(jobId: string): void {
  if (processingJobs.has(jobId)) {
    return; // Already processing
  }

  const promise = processJob(jobId).finally(() => {
    processingJobs.delete(jobId);
  });

  processingJobs.set(jobId, promise);
}

/**
 * Estimate cost for a video before generation
 */
export function estimateVideoCost(script: string, duration: number): {
  ttsCost: number;
  renderCost: number;
  totalCost: number;
  userCharge: number;
  margin: number;
} {
  const ttsCost = calculateTTSCost(script.length);
  const renderCost = calculateRenderCost(duration);
  const totalCost = ttsCost + renderCost;
  const userCharge = VIDEO_COSTS.USER_CHARGE;
  const margin = userCharge - totalCost;

  return {
    ttsCost,
    renderCost,
    totalCost,
    userCharge,
    margin,
  };
}

/**
 * List all jobs for a tenant
 */
export function listJobs(tenantId: string, limit: number = 50): VideoJob[] {
  return Array.from(jobStore.values())
    .filter(job => job.tenantId === tenantId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

/**
 * Get jobs by status
 */
export function getJobsByStatus(status: VideoStatus): VideoJob[] {
  return Array.from(jobStore.values())
    .filter(job => job.status === status);
}

/**
 * Retry a failed job
 */
export function retryJob(jobId: string): VideoJob | undefined {
  const job = getVideoJob(jobId);
  if (!job || job.status !== 'failed') {
    return undefined;
  }

  if (job.retryCount >= 3) {
    return undefined; // Max retries exceeded
  }

  updateJob(jobId, {
    status: 'queued',
    progress: 0,
    error: undefined,
  });

  startJob(jobId);
  return getVideoJob(jobId);
}

/**
 * Cancel a queued job
 */
export function cancelJob(jobId: string): boolean {
  const job = getVideoJob(jobId);
  if (!job || job.status !== 'queued') {
    return false;
  }

  updateJob(jobId, { status: 'failed', error: 'Cancelled by user' });
  return true;
}

