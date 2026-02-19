/**
 * Video Worker Client
 * 
 * Dispatches video render jobs to the external Hostinger worker.
 */

import { VideoJob, VideoStyle, AspectRatio, VoiceId } from './types';
import { generateSpeech, segmentScript } from './voice-synthesis';

const WORKER_URL = process.env.VIDEO_WORKER_URL || 'http://localhost:3500';
const WORKER_SECRET = process.env.VIDEO_WORKER_SECRET || '';

export interface DispatchJobRequest {
  jobId: string;
  tenantId: string;
  script: string;
  style: VideoStyle;
  voice: VoiceId;
  aspectRatio: AspectRatio;
  duration: number;
  spacebaddieConfig?: {
    photoUrl: string;
    effects?: any;
    cameraMovement?: string;
    music?: boolean;
    textOverlay?: string;
  };
}

export interface DispatchResult {
  success: boolean;
  jobId: string;
  message?: string;
  error?: string;
}

/**
 * Check if worker is configured and available
 */
export async function isWorkerAvailable(): Promise<boolean> {
  if (!WORKER_URL || !WORKER_SECRET) {
    return false;
  }

  try {
    const response = await fetch(`${WORKER_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    
    if (!response.ok) return false;
    
    const data = await response.json();
    return data.status === 'healthy';
  } catch {
    return false;
  }
}

/**
 * Dispatch a video job to the external worker
 * 
 * Flow:
 * 1. Generate audio using OpenAI TTS (done in xom3.io)
 * 2. Upload audio to temporary storage
 * 3. Send render job to worker with audio URL
 * 4. Worker renders video and calls back when done
 */
export async function dispatchToWorker(request: DispatchJobRequest): Promise<DispatchResult> {
  const { jobId, tenantId, script, style, voice, aspectRatio, duration } = request;

  try {
    // Step 1: Generate audio
    console.log(`[${jobId}] Generating audio...`);
    const ttsResult = await generateSpeech({
      text: script,
      voice,
      speed: 1.0,
    });

    // Step 2: Upload audio to accessible URL
    // For now, we'll base64 encode and send inline
    // In production, upload to Vercel Blob or R2 first
    const audioBase64 = ttsResult.audioBuffer.toString('base64');
    const audioUrl = `data:audio/mp3;base64,${audioBase64}`;

    // Step 3: Dispatch to worker
    console.log(`[${jobId}] Dispatching to worker...`);
    
    const response = await fetch(`${WORKER_URL}/render`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-worker-secret': WORKER_SECRET,
      },
      body: JSON.stringify({
        jobId,
        tenantId,
        audioUrl,
        script,
        style,
        aspectRatio,
        duration: ttsResult.duration,
        callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://xom3.io'}/api/video/callback`,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Worker error: ${response.status} - ${error}`);
    }

    const result = await response.json();
    
    return {
      success: true,
      jobId,
      message: result.message || 'Job dispatched to worker',
    };

  } catch (error) {
    console.error(`[${jobId}] Dispatch error:`, error);
    return {
      success: false,
      jobId,
      error: error instanceof Error ? error.message : 'Failed to dispatch job',
    };
  }
}

/**
 * Get worker status/health
 */
export async function getWorkerStatus(): Promise<{
  available: boolean;
  activeJobs?: number;
  uptime?: number;
  error?: string;
}> {
  try {
    const response = await fetch(`${WORKER_URL}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    
    if (!response.ok) {
      return { available: false, error: `HTTP ${response.status}` };
    }
    
    const data = await response.json();
    return {
      available: data.status === 'healthy',
      activeJobs: data.activeJobs,
      uptime: data.uptime,
    };
  } catch (error) {
    return {
      available: false,
      error: error instanceof Error ? error.message : 'Connection failed',
    };
  }
}

/**
 * Check job status on worker (for jobs still processing)
 */
export async function getWorkerJobStatus(jobId: string): Promise<{
  found: boolean;
  status?: string;
  progress?: number;
  error?: string;
}> {
  try {
    const response = await fetch(`${WORKER_URL}/status/${jobId}`, {
      signal: AbortSignal.timeout(5000),
    });
    
    if (response.status === 404) {
      return { found: false };
    }
    
    if (!response.ok) {
      return { found: false, error: `HTTP ${response.status}` };
    }
    
    const data = await response.json();
    return {
      found: true,
      status: data.status,
      progress: data.progress,
    };
  } catch (error) {
    return {
      found: false,
      error: error instanceof Error ? error.message : 'Connection failed',
    };
  }
}















