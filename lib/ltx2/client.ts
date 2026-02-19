/**
 * LTX-2 Cinematic Video Generation Client
 * 
 * Real implementation using fal.ai's LTX-Video model for cinematic AI video generation.
 * Supports: image-to-video, text-to-video, multiple images, camera motion, and scene types.
 * 
 * fal.ai LTX-Video: https://fal.ai/models/fal-ai/ltx-video
 */

// Camera motion types supported by LTX-Video
export type CameraMotion = 
  | 'static'
  | 'pan_left'
  | 'pan_right'
  | 'tilt_up'
  | 'tilt_down'
  | 'zoom_in'
  | 'zoom_out'
  | 'push_in'
  | 'pull_out'
  | 'orbit_left'
  | 'orbit_right'
  | 'crane_up'
  | 'crane_down'
  | 'dolly_in'
  | 'dolly_out'
  | 'tracking_left'
  | 'tracking_right';

export type LTX2SceneType = 
  | 'talking_head'
  | 'dramatic'
  | 'dialogue'
  | 'action'
  | 'ambient'
  | 'product'
  | 'cinematic'
  | 'portrait'
  | 'landscape';

export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:3' | '3:4' | '21:9';

export interface LTX2Request {
  // Content inputs
  prompt: string;
  negativePrompt?: string;
  imageUrl?: string;              // Single image for image-to-video
  imageUrls?: string[];           // Multiple images for multi-image video
  
  // Scene configuration
  sceneType?: LTX2SceneType;
  
  // Camera controls
  cameraMotion?: CameraMotion;
  cameraSpeed?: number;           // 0.5 to 2.0, default 1.0
  
  // Video settings
  duration?: number;              // 2-10 seconds (fal.ai limit)
  fps?: number;                   // 8, 16, 24, 30
  aspectRatio?: AspectRatio;
  resolution?: '480p' | '720p' | '1080p';
  
  // Generation controls
  seed?: number;
  guidanceScale?: number;         // 1-20, default 7.5
  numInferenceSteps?: number;     // 20-50, default 30
  
  // Mode
  isDraft?: boolean;              // Low quality, fast preview
  parentJobId?: string;           // For iterations
}

export interface LTX2Response {
  jobId: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  seed: number;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  error?: string;
  provider: 'fal' | 'runpod';
  duration?: number;
  progress?: number;
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
  timings?: Record<string, number>;
}

const FAL_API_KEY = process.env.FAL_API_KEY || '';
const FAL_BASE_URL = 'https://queue.fal.run';

// Scene type to prompt enhancement mapping
const SCENE_PROMPTS: Record<LTX2SceneType, string> = {
  talking_head: 'professional talking head video, person speaking directly to camera, good lighting, clean background',
  dramatic: 'cinematic dramatic scene, high contrast lighting, emotional, film-like quality',
  dialogue: 'two people conversing, natural interaction, documentary style',
  action: 'dynamic action sequence, motion blur, fast-paced, exciting',
  ambient: 'atmospheric ambient scene, slow movement, peaceful, mood-setting',
  product: 'professional product showcase, clean background, rotating view, commercial quality',
  cinematic: 'cinematic film quality, wide angle, professional color grading, movie-like',
  portrait: 'portrait video, shallow depth of field, subject-focused, artistic',
  landscape: 'sweeping landscape view, wide angle, nature cinematography',
};

// Camera motion to prompt enhancement
const CAMERA_PROMPTS: Record<CameraMotion, string> = {
  static: 'locked tripod shot, stable frame',
  pan_left: 'smooth pan left camera movement',
  pan_right: 'smooth pan right camera movement',
  tilt_up: 'tilting up camera movement',
  tilt_down: 'tilting down camera movement',
  zoom_in: 'slow zoom in, dramatic reveal',
  zoom_out: 'zoom out establishing shot',
  push_in: 'dolly push in, dramatic approach',
  pull_out: 'dolly pull out, reveal scene',
  orbit_left: 'orbiting left around subject',
  orbit_right: 'orbiting right around subject',
  crane_up: 'crane shot rising up',
  crane_down: 'crane shot descending',
  dolly_in: 'smooth dolly in toward subject',
  dolly_out: 'smooth dolly out from subject',
  tracking_left: 'tracking shot moving left',
  tracking_right: 'tracking shot moving right',
};

/**
 * Build the enhanced prompt with scene and camera information
 */
function buildEnhancedPrompt(request: LTX2Request): string {
  const parts: string[] = [];
  
  // Base prompt
  parts.push(request.prompt);
  
  // Add scene type enhancement
  if (request.sceneType && SCENE_PROMPTS[request.sceneType]) {
    parts.push(SCENE_PROMPTS[request.sceneType]);
  }
  
  // Add camera motion enhancement
  if (request.cameraMotion && CAMERA_PROMPTS[request.cameraMotion]) {
    parts.push(CAMERA_PROMPTS[request.cameraMotion]);
  }
  
  return parts.join(', ');
}

/**
 * Get resolution dimensions
 */
function getResolutionDimensions(resolution: string, aspectRatio: AspectRatio): { width: number; height: number } {
  const base = resolution === '1080p' ? 1080 : resolution === '720p' ? 720 : 480;
  
  const ratios: Record<AspectRatio, { w: number; h: number }> = {
    '16:9': { w: 16, h: 9 },
    '9:16': { w: 9, h: 16 },
    '1:1': { w: 1, h: 1 },
    '4:3': { w: 4, h: 3 },
    '3:4': { w: 3, h: 4 },
    '21:9': { w: 21, h: 9 },
  };
  
  const ratio = ratios[aspectRatio];
  const isPortrait = ratio.h > ratio.w;
  
  if (isPortrait) {
    return {
      width: Math.round(base * (ratio.w / ratio.h)),
      height: base,
    };
  } else {
    return {
      width: base * (ratio.w / ratio.h),
      height: base,
    };
  }
}

/**
 * Check if fal.ai is configured
 */
export function isFalConfigured(): boolean {
  return !!FAL_API_KEY;
}

/**
 * Submit a video generation job to fal.ai (async queue)
 */
export async function submitLTX2Job(request: LTX2Request): Promise<{
  success: boolean;
  requestId?: string;
  error?: string;
}> {
  if (!FAL_API_KEY) {
    return { success: false, error: 'FAL_API_KEY not configured' };
  }

  try {
    const enhancedPrompt = buildEnhancedPrompt(request);
    const resolution = request.resolution || (request.isDraft ? '480p' : '720p');
    const dimensions = getResolutionDimensions(resolution, request.aspectRatio || '16:9');
    
    // Build fal.ai request payload
    const payload: Record<string, unknown> = {
      prompt: enhancedPrompt,
      negative_prompt: request.negativePrompt || 'blurry, low quality, distorted, watermark, text overlay',
      num_frames: Math.min(Math.max((request.duration || 5) * (request.fps || 24), 48), 240), // 48-240 frames
      width: dimensions.width,
      height: dimensions.height,
      seed: request.seed ?? Math.floor(Math.random() * 2147483647),
      guidance_scale: request.guidanceScale ?? 7.5,
      num_inference_steps: request.isDraft ? 20 : (request.numInferenceSteps ?? 30),
    };
    
    // Add image input if provided
    if (request.imageUrl) {
      payload.image_url = request.imageUrl;
    }
    
    // For multiple images, use the first one (fal.ai ltx-video handles single image)
    // Multi-image could use a different model or stitching approach
    if (request.imageUrls && request.imageUrls.length > 0 && !request.imageUrl) {
      payload.image_url = request.imageUrls[0];
    }
    
    console.log('[LTX2] Submitting to fal.ai:', { prompt: enhancedPrompt.substring(0, 100), ...dimensions });
    
    const response = await fetch(`${FAL_BASE_URL}/fal-ai/ltx-video`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[LTX2] fal.ai error:', response.status, errorText);
      return { success: false, error: `fal.ai API error: ${response.status}` };
    }
    
    const data: FalQueueResponse = await response.json();
    console.log('[LTX2] Job submitted:', data.request_id);
    
    return { success: true, requestId: data.request_id };
  } catch (error) {
    console.error('[LTX2] Submit error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Track job start times for progress simulation
const jobStartTimes = new Map<string, number>();

/**
 * Check the status of a fal.ai job
 */
export async function checkLTX2Status(requestId: string): Promise<{
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress?: number;
  logs?: string[];
}> {
  if (!FAL_API_KEY) {
    return { status: 'failed' };
  }

  try {
    const response = await fetch(`${FAL_BASE_URL}/fal-ai/ltx-video/requests/${requestId}/status`, {
      method: 'GET',
      headers: {
        'Authorization': `Key ${FAL_API_KEY}`,
      },
    });
    
    if (!response.ok) {
      console.error('[LTX2] Status check failed:', response.status);
      return { status: 'failed' };
    }
    
    const data: FalStatusResponse = await response.json();
    console.log('[LTX2] Status response:', data.status, 'logs:', data.logs?.length || 0);
    
    const statusMap: Record<string, 'queued' | 'processing' | 'completed' | 'failed'> = {
      'IN_QUEUE': 'queued',
      'IN_PROGRESS': 'processing',
      'COMPLETED': 'completed',
      'FAILED': 'failed',
    };
    
    const status = statusMap[data.status] || 'processing';
    
    // Calculate simulated progress based on status and time elapsed
    // LTX-2 typically takes 2-5 minutes for a video
    let progress = 0;
    
    if (status === 'completed') {
      progress = 100;
      jobStartTimes.delete(requestId);
    } else if (status === 'failed') {
      progress = 0;
      jobStartTimes.delete(requestId);
    } else {
      // Track start time for this job
      if (!jobStartTimes.has(requestId)) {
        jobStartTimes.set(requestId, Date.now());
      }
      
      const startTime = jobStartTimes.get(requestId)!;
      const elapsedMs = Date.now() - startTime;
      const elapsedSeconds = elapsedMs / 1000;
      
      if (status === 'queued') {
        // Queue stage: 5-15% over first 30 seconds
        progress = Math.min(5 + (elapsedSeconds / 30) * 10, 15);
      } else {
        // Processing stage: 15-95% over ~3 minutes (180 seconds)
        const processingProgress = Math.min((elapsedSeconds / 180) * 80, 80);
        progress = Math.min(15 + processingProgress, 95);
      }
    }
    
    return {
      status,
      progress: Math.round(progress),
      logs: data.logs?.map(l => l.message),
    };
  } catch (error) {
    console.error('[LTX2] Status check error:', error);
    return { status: 'failed' };
  }
}

/**
 * Get the result of a completed fal.ai job
 */
export async function getLTX2Result(requestId: string): Promise<{
  success: boolean;
  videoUrl?: string;
  seed?: number;
  error?: string;
}> {
  if (!FAL_API_KEY) {
    return { success: false, error: 'FAL_API_KEY not configured' };
  }

  try {
    const response = await fetch(`${FAL_BASE_URL}/fal-ai/ltx-video/requests/${requestId}`, {
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
    console.error('[LTX2] Get result error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Generate video synchronously (waits for completion)
 * Good for shorter videos, polls until done
 */
export async function generateLTX2VideoSync(
  request: LTX2Request,
  timeoutMs: number = 300000 // 5 minute default timeout
): Promise<LTX2Response> {
  const startTime = Date.now();
  
  // Submit the job
  const submitResult = await submitLTX2Job(request);
  
  if (!submitResult.success || !submitResult.requestId) {
    return {
      jobId: `ltx2_err_${Date.now()}`,
      seed: request.seed ?? 0,
      status: 'failed',
      error: submitResult.error || 'Failed to submit job',
      provider: 'fal',
    };
  }
  
  const requestId = submitResult.requestId;
  
  // Poll for completion
  while (Date.now() - startTime < timeoutMs) {
    const statusResult = await checkLTX2Status(requestId);
    
    if (statusResult.status === 'completed') {
      const result = await getLTX2Result(requestId);
      
      return {
        jobId: requestId,
        videoUrl: result.videoUrl,
        seed: result.seed ?? request.seed ?? 0,
        status: 'completed',
        provider: 'fal',
      };
    }
    
    if (statusResult.status === 'failed') {
      return {
        jobId: requestId,
        seed: request.seed ?? 0,
        status: 'failed',
        error: 'Video generation failed',
        provider: 'fal',
      };
    }
    
    // Wait before polling again (exponential backoff)
    const elapsed = Date.now() - startTime;
    const waitTime = elapsed < 30000 ? 2000 : elapsed < 60000 ? 5000 : 10000;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  return {
    jobId: requestId,
    seed: request.seed ?? 0,
    status: 'failed',
    error: 'Generation timed out',
    provider: 'fal',
  };
}

/**
 * Main entry point - generates cinematic video using LTX-2
 */
export async function generateLTX2Video(
  request: LTX2Request,
  tenantId: string = 'default'
): Promise<LTX2Response> {
  const provider = process.env.LTX2_PROVIDER || 'fal';
  
  console.log(`[LTX2] Generating cinematic video for tenant ${tenantId}:`, {
    sceneType: request.sceneType,
    cameraMotion: request.cameraMotion,
    duration: request.duration,
    hasImage: !!request.imageUrl || !!(request.imageUrls?.length),
  });
  
  if (provider === 'fal') {
    return await generateLTX2VideoSync(request);
  }
  
  // Fallback error
  return {
    jobId: `ltx2_err_${Date.now()}`,
    seed: request.seed ?? 0,
    status: 'failed',
    error: `Unsupported provider: ${provider}`,
    provider: 'fal',
  };
}

/**
 * Estimate generation time based on request parameters
 */
export function estimateGenerationTime(request: LTX2Request): number {
  const baseDuration = request.isDraft ? 30 : 60; // seconds
  const durationMultiplier = (request.duration || 5) / 5;
  const resolutionMultiplier = request.resolution === '1080p' ? 1.5 : request.resolution === '720p' ? 1.2 : 1;
  
  return Math.round(baseDuration * durationMultiplier * resolutionMultiplier);
}

/**
 * Estimate cost for generation (in cents)
 */
export function estimateCost(request: LTX2Request): number {
  // fal.ai charges approximately $0.06 per second of video
  const duration = request.duration || 5;
  const baseCost = duration * 6; // 6 cents per second
  const resolutionMultiplier = request.resolution === '1080p' ? 1.5 : 1;
  
  return Math.round(baseCost * resolutionMultiplier);
}
