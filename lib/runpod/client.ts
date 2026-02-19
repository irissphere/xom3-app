/**
 * RunPod API Client
 * 
 * Handles avatar generation via RunPod serverless endpoints.
 */

const RUNPOD_API_BASE = 'https://api.runpod.ai/v2';

interface RunPodJobRequest {
  input: {
    source_image: string;  // Base64 or URL
    driving_video?: string; // Base64 or URL
    audio_url?: string;    // TTS audio URL
    face_enhancer?: boolean;
    output_format?: 'mp4' | 'webm';
  };
}

interface RunPodJobResponse {
  id: string;
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  output?: {
    video_url: string;
    duration: number;
    metadata: Record<string, unknown>;
  };
  error?: string;
  executionTime?: number;
}

/**
 * Submit an avatar generation job to RunPod
 */
export async function submitAvatarJob(params: {
  sourceImage: string;
  drivingVideo?: string;
  audioUrl?: string;
  faceEnhancer?: boolean;
  outputFormat?: 'mp4' | 'webm';
}): Promise<{ jobId: string }> {
  const apiKey = process.env.RUNPOD_API_KEY;
  const endpointId = process.env.RUNPOD_AVATAR_ENDPOINT_ID;

  if (!apiKey || !endpointId) {
    throw new Error('RunPod configuration missing');
  }

  const response = await fetch(`${RUNPOD_API_BASE}/${endpointId}/run`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: {
        source_image: params.sourceImage,
        driving_video: params.drivingVideo,
        audio_url: params.audioUrl,
        face_enhancer: params.faceEnhancer ?? true,
        output_format: params.outputFormat ?? 'mp4',
      },
    } as RunPodJobRequest),
  });

  if (!response.ok) {
    throw new Error(`RunPod API error: ${response.status}`);
  }

  const data = await response.json();
  return { jobId: data.id };
}

/**
 * Check the status of a RunPod job
 */
export async function checkJobStatus(jobId: string): Promise<RunPodJobResponse> {
  const apiKey = process.env.RUNPOD_API_KEY;
  const endpointId = process.env.RUNPOD_AVATAR_ENDPOINT_ID;

  if (!apiKey || !endpointId) {
    throw new Error('RunPod configuration missing');
  }

  const response = await fetch(`${RUNPOD_API_BASE}/${endpointId}/status/${jobId}`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`RunPod API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Poll for job completion with timeout
 */
export async function waitForCompletion(
  jobId: string,
  maxWaitMs: number = 300000,
  pollIntervalMs: number = 5000
): Promise<RunPodJobResponse> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const status = await checkJobStatus(jobId);

    if (status.status === 'COMPLETED' || status.status === 'FAILED') {
      return status;
    }

    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error('Job timed out');
}

/**
 * Cancel a running job
 */
export async function cancelJob(jobId: string): Promise<void> {
  const apiKey = process.env.RUNPOD_API_KEY;
  const endpointId = process.env.RUNPOD_AVATAR_ENDPOINT_ID;

  if (!apiKey || !endpointId) {
    throw new Error('RunPod configuration missing');
  }

  await fetch(`${RUNPOD_API_BASE}/${endpointId}/cancel/${jobId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
  });
}

export type { RunPodJobRequest, RunPodJobResponse };
