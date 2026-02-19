/**
 * fal.ai AI Avatar Client
 * 
 * MultiTalk model generates a talking avatar video from an image and audio file.
 * The avatar lip-syncs to the provided audio with natural facial expressions.
 * 
 * API: https://fal.ai/models/fal-ai/ai-avatar
 * 
 * This is the correct model for cinematic videos with avatars!
 * (LTX-Video is text-to-video only, doesn't animate people)
 */

const FAL_API_KEY = process.env.FAL_API_KEY || '';
const FAL_BASE_URL = 'https://queue.fal.run';

export type AvatarResolution = '480p' | '720p';
export type AccelerationLevel = 'none' | 'regular' | 'high';

export interface FalAvatarRequest {
  /** URL of the input image (portrait photo) */
  imageUrl: string;
  /** URL of the audio file for lip-sync */
  audioUrl: string;
  /** Text prompt to guide video generation (describe the scene/style) */
  prompt: string;
  /** Number of frames (81-129 for single billing, 130+ for 1.25x) */
  numFrames?: number;
  /** Resolution of output video */
  resolution?: AvatarResolution;
  /** Random seed for reproducibility */
  seed?: number;
  /** Acceleration level (affects speed vs quality) */
  acceleration?: AccelerationLevel;
}

export interface FalAvatarResponse {
  success: boolean;
  requestId?: string;
  videoUrl?: string;
  seed?: number;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress?: number;
  error?: string;
}

// fal.ai API types
interface FalQueueResponse {
  request_id: string;
  status: string;
}

interface FalStatusResponse {
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  logs?: { message: string }[];
}

interface FalResultResponse {
  video: {
    url: string;
    content_type: string;
    file_name: string;
    file_size: number;
  };
  seed: number;
}

// Track job start times for progress simulation
const jobStartTimes = new Map<string, number>();

/**
 * Check if fal.ai is configured
 */
export function isFalAvatarConfigured(): boolean {
  return Boolean(FAL_API_KEY);
}

/**
 * Submit avatar video generation job to fal.ai queue
 */
export async function submitFalAvatarJob(request: FalAvatarRequest): Promise<{
  success: boolean;
  requestId?: string;
  error?: string;
}> {
  if (!FAL_API_KEY) {
    return { success: false, error: 'FAL_API_KEY not configured' };
  }

  try {
    const payload = {
      image_url: request.imageUrl,
      audio_url: request.audioUrl,
      prompt: request.prompt || 'A person talking naturally',
      num_frames: request.numFrames || 145, // ~5 seconds at 24fps
      resolution: request.resolution || '720p',
      seed: request.seed ?? Math.floor(Math.random() * 2147483647),
      acceleration: request.acceleration || 'regular',
    };

    console.log('[FalAvatar] Submitting to fal-ai/ai-avatar:', {
      hasImage: Boolean(request.imageUrl),
      hasAudio: Boolean(request.audioUrl),
      prompt: request.prompt?.substring(0, 50),
      numFrames: payload.num_frames,
      resolution: payload.resolution,
    });

    const response = await fetch(`${FAL_BASE_URL}/fal-ai/ai-avatar`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[FalAvatar] API error:', response.status, errorText);
      return { success: false, error: `fal.ai API error: ${response.status} - ${errorText.substring(0, 200)}` };
    }

    const data: FalQueueResponse = await response.json();
    console.log('[FalAvatar] Job submitted:', data.request_id);

    return { success: true, requestId: data.request_id };
  } catch (error) {
    console.error('[FalAvatar] Submit error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Check the status of a fal.ai AI Avatar job
 */
export async function checkFalAvatarStatus(requestId: string): Promise<{
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress?: number;
  logs?: string[];
}> {
  if (!FAL_API_KEY) {
    return { status: 'failed' };
  }

  try {
    const response = await fetch(`${FAL_BASE_URL}/fal-ai/ai-avatar/requests/${requestId}/status`, {
      method: 'GET',
      headers: {
        'Authorization': `Key ${FAL_API_KEY}`,
      },
    });

    if (!response.ok) {
      console.error('[FalAvatar] Status check failed:', response.status);
      return { status: 'failed' };
    }

    const data: FalStatusResponse = await response.json();
    console.log('[FalAvatar] Status response:', data.status);

    const statusMap: Record<string, 'queued' | 'processing' | 'completed' | 'failed'> = {
      'IN_QUEUE': 'queued',
      'IN_PROGRESS': 'processing',
      'COMPLETED': 'completed',
      'FAILED': 'failed',
    };

    const status = statusMap[data.status] || 'processing';

    // Calculate progress based on status and time
    let progress = 0;

    if (status === 'completed') {
      progress = 100;
      jobStartTimes.delete(requestId);
    } else if (status === 'failed') {
      progress = 0;
      jobStartTimes.delete(requestId);
    } else {
      if (!jobStartTimes.has(requestId)) {
        jobStartTimes.set(requestId, Date.now());
      }

      const startTime = jobStartTimes.get(requestId)!;
      const elapsedMs = Date.now() - startTime;
      const elapsedSeconds = elapsedMs / 1000;

      if (status === 'queued') {
        // Queue stage: 5-15% over first 20 seconds
        progress = Math.min(5 + (elapsedSeconds / 20) * 10, 15);
      } else {
        // Processing stage: 15-95% over ~90 seconds (AI Avatar is faster than LTX-Video)
        const processingProgress = Math.min((elapsedSeconds / 90) * 80, 80);
        progress = Math.min(15 + processingProgress, 95);
      }
    }

    return {
      status,
      progress: Math.round(progress),
      logs: data.logs?.map(l => l.message),
    };
  } catch (error) {
    console.error('[FalAvatar] Status check error:', error);
    return { status: 'failed' };
  }
}

/**
 * Get the result of a completed fal.ai AI Avatar job
 */
export async function getFalAvatarResult(requestId: string): Promise<{
  success: boolean;
  videoUrl?: string;
  seed?: number;
  error?: string;
}> {
  if (!FAL_API_KEY) {
    return { success: false, error: 'FAL_API_KEY not configured' };
  }

  try {
    const response = await fetch(`${FAL_BASE_URL}/fal-ai/ai-avatar/requests/${requestId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Key ${FAL_API_KEY}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `Failed to get result: ${response.status}` };
    }

    const data: FalResultResponse = await response.json();

    return {
      success: true,
      videoUrl: data.video?.url,
      seed: data.seed,
    };
  } catch (error) {
    console.error('[FalAvatar] Get result error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Generate avatar video synchronously (waits for completion)
 */
export async function generateFalAvatarVideo(
  request: FalAvatarRequest,
  timeoutMs: number = 180000 // 3 minute default (AI Avatar is faster)
): Promise<FalAvatarResponse> {
  const startTime = Date.now();

  // Submit the job
  const submitResult = await submitFalAvatarJob(request);

  if (!submitResult.success || !submitResult.requestId) {
    return {
      success: false,
      status: 'failed',
      error: submitResult.error || 'Failed to submit job',
    };
  }

  const requestId = submitResult.requestId;

  // Poll for completion
  while (Date.now() - startTime < timeoutMs) {
    const statusResult = await checkFalAvatarStatus(requestId);

    if (statusResult.status === 'completed') {
      const result = await getFalAvatarResult(requestId);

      return {
        success: true,
        requestId,
        videoUrl: result.videoUrl,
        seed: result.seed,
        status: 'completed',
      };
    }

    if (statusResult.status === 'failed') {
      return {
        success: false,
        requestId,
        status: 'failed',
        error: 'Avatar video generation failed',
      };
    }

    // Wait before polling again
    const elapsed = Date.now() - startTime;
    const waitTime = elapsed < 20000 ? 2000 : elapsed < 60000 ? 3000 : 5000;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  return {
    success: false,
    requestId,
    status: 'failed',
    error: 'Generation timed out',
  };
}

/**
 * Estimate cost for AI Avatar generation (in cents)
 * AI Avatar is roughly $0.08-0.12 per generation depending on resolution
 */
export function estimateFalAvatarCost(request: FalAvatarRequest): number {
  const baseCost = request.resolution === '720p' ? 12 : 8; // cents
  const frameMultiplier = (request.numFrames || 145) > 129 ? 1.25 : 1;
  return Math.round(baseCost * frameMultiplier);
}

/**
 * Estimate generation time in seconds
 */
export function estimateFalAvatarTime(request: FalAvatarRequest): number {
  const baseTime = 60; // seconds
  const resMultiplier = request.resolution === '720p' ? 1.3 : 1;
  const accelMultiplier = request.acceleration === 'high' ? 0.7 : request.acceleration === 'none' ? 1.5 : 1;
  return Math.round(baseTime * resMultiplier * accelMultiplier);
}
