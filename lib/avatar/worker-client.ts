/**
 * Avatar Worker Client
 * 
 * Dispatches avatar generation jobs to RunPod Serverless GPU workers.
 * RunPod Serverless API: https://docs.runpod.io/serverless/endpoints/job-operations
 */

import { 
  GenerateAvatarRequest, 
  CreateVoiceRequest,
  CreateFaceRequest,
  VoiceProfile,
  FaceProfile,
} from './types';

// RunPod Serverless configuration
const RUNPOD_ENDPOINT_ID = process.env.RUNPOD_ENDPOINT_ID || '0rwohy3oqhuozd';
const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY || '';
const RUNPOD_BASE_URL = `https://api.runpod.ai/v2/${RUNPOD_ENDPOINT_ID}`;

// Legacy support - if custom worker URL is set, use that instead
const WORKER_URL = process.env.AVATAR_WORKER_URL || '';
const WORKER_SECRET = process.env.AVATAR_WORKER_SECRET || '';

interface WorkerResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

interface RunPodJobResponse {
  id: string;
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  output?: any;
  error?: string;
}

/**
 * Check if avatar worker is available
 */
export async function isAvatarWorkerAvailable(): Promise<boolean> {
  // Check RunPod first
  if (RUNPOD_API_KEY) {
    try {
      const response = await fetch(`${RUNPOD_BASE_URL}/health`, {
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${RUNPOD_API_KEY}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      });
      
      if (response.ok) {
        const data = await response.json();
        // RunPod health returns workers info
        return data.workers?.ready > 0 || data.jobs?.completed !== undefined;
      }
    } catch (e) {
      console.log('[RunPod] Health check failed:', e);
    }
  }

  // Fallback to legacy worker
  if (WORKER_URL && WORKER_SECRET) {
    try {
      const response = await fetch(`${WORKER_URL}/health`, {
        method: 'GET',
        headers: RUNPOD_API_KEY ? { 'Authorization': `Bearer ${RUNPOD_API_KEY}` } : {},
        signal: AbortSignal.timeout(10000),
      });
      
      if (!response.ok) return false;
      
      const data = await response.json();
      return data.status === 'healthy' || data.gpu_available === true;
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Get worker status
 */
export async function getAvatarWorkerStatus(): Promise<{
  available: boolean;
  gpuAvailable?: boolean;
  modelsLoaded?: { voice: boolean; face: boolean };
  workers?: { ready: number; running: number; idle: number };
  error?: string;
}> {
  // Try RunPod first
  if (RUNPOD_API_KEY) {
    try {
      const response = await fetch(`${RUNPOD_BASE_URL}/health`, {
        headers: { 
          'Authorization': `Bearer ${RUNPOD_API_KEY}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      });
      
      if (response.ok) {
        const data = await response.json();
        return {
          available: true,
          gpuAvailable: data.workers?.ready > 0,
          workers: data.workers,
        };
      }
    } catch (error) {
      console.log('[RunPod] Status check failed:', error);
    }
  }

  // Fallback to legacy
  if (WORKER_URL) {
    try {
      const response = await fetch(`${WORKER_URL}/health`, {
        headers: RUNPOD_API_KEY ? { 'Authorization': `Bearer ${RUNPOD_API_KEY}` } : {},
        signal: AbortSignal.timeout(10000),
      });
      
      if (!response.ok) {
        return { available: false, error: `HTTP ${response.status}` };
      }
      
      const data = await response.json();
      return {
        available: true,
        gpuAvailable: data.gpu_available,
        modelsLoaded: data.models_loaded,
      };
    } catch (error) {
      return {
        available: false,
        error: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  return { available: false, error: 'No worker configured' };
}

/**
 * Dispatch avatar generation job to RunPod Serverless
 */
export async function dispatchAvatarJob(
  jobId: string,
  tenantId: string,
  request: GenerateAvatarRequest
): Promise<WorkerResponse<{ jobId: string; runpodJobId?: string; message: string }>> {
  
  // Try RunPod Serverless first
  if (RUNPOD_API_KEY) {
    try {
      const payload = {
        input: {
          jobId,
          tenantId,
          script: request.script,
          voiceId: request.voiceId,
          faceId: request.faceId,
          style: request.style || 'social',
          aspectRatio: request.aspectRatio || '9:16',
          enhanceFace: request.enhanceFace ?? true,
          callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://xom3.io'}/api/avatar/callback`,
        },
      };

      console.log('[RunPod] Dispatching job to:', RUNPOD_BASE_URL);
      
      const response = await fetch(`${RUNPOD_BASE_URL}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RUNPOD_API_KEY}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[RunPod] Error:', response.status, errorText);
        return { success: false, error: `RunPod error: ${response.status} - ${errorText}` };
      }

      const data: RunPodJobResponse = await response.json();
      console.log('[RunPod] Job submitted:', data);
      
      return { 
        success: true, 
        data: { 
          jobId, 
          runpodJobId: data.id,
          message: `Job queued on RunPod (${data.id})` 
        } 
      };

    } catch (error) {
      console.error('[RunPod] Dispatch error:', error);
      // Fall through to legacy worker
    }
  }

  // Fallback to legacy worker
  if (WORKER_URL && WORKER_SECRET) {
    try {
      const response = await fetch(`${WORKER_URL}/render`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-worker-secret': WORKER_SECRET,
          ...(RUNPOD_API_KEY ? { 'Authorization': `Bearer ${RUNPOD_API_KEY}` } : {}),
        },
        body: JSON.stringify({
          jobId,
          tenantId,
          script: request.script,
          voiceId: request.voiceId,
          faceId: request.faceId,
          style: request.style || 'social',
          aspectRatio: request.aspectRatio || '9:16',
          enhanceFace: request.enhanceFace ?? true,
          callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://xom3.io'}/api/avatar/callback`,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error: `Worker error: ${response.status} - ${error}` };
      }

      const data = await response.json();
      return { success: true, data };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to dispatch job',
      };
    }
  }

  return { success: false, error: 'No worker configured. Set RUNPOD_API_KEY or AVATAR_WORKER_URL.' };
}

/**
 * Check RunPod job status
 */
export async function checkRunPodJobStatus(runpodJobId: string): Promise<RunPodJobResponse | null> {
  if (!RUNPOD_API_KEY) return null;

  try {
    const response = await fetch(`${RUNPOD_BASE_URL}/status/${runpodJobId}`, {
      headers: {
        'Authorization': `Bearer ${RUNPOD_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) return null;

    return await response.json();
  } catch {
    return null;
  }
}

/**
 * Cancel a RunPod job
 */
export async function cancelRunPodJob(runpodJobId: string): Promise<boolean> {
  if (!RUNPOD_API_KEY) return false;

  try {
    const response = await fetch(`${RUNPOD_BASE_URL}/cancel/${runpodJobId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RUNPOD_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Create a voice profile
 */
export async function createVoiceProfile(
  tenantId: string,
  request: CreateVoiceRequest
): Promise<WorkerResponse<VoiceProfile>> {
  const workerUrl = WORKER_URL || RUNPOD_BASE_URL;
  
  try {
    const response = await fetch(`${workerUrl}/voices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-worker-secret': WORKER_SECRET,
        ...(RUNPOD_API_KEY ? { 'Authorization': `Bearer ${RUNPOD_API_KEY}` } : {}),
      },
      body: JSON.stringify({
        tenantId,
        name: request.name,
        samples: request.samples,
        description: request.description,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    const data = await response.json();
    return {
      success: true,
      data: {
        id: data.voiceId,
        tenantId,
        name: request.name,
        description: request.description,
        sampleCount: request.samples.length,
        createdAt: new Date().toISOString(),
      },
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create voice',
    };
  }
}

/**
 * Create a face profile
 */
export async function createFaceProfile(
  tenantId: string,
  request: CreateFaceRequest
): Promise<WorkerResponse<FaceProfile>> {
  const workerUrl = WORKER_URL || RUNPOD_BASE_URL;
  
  try {
    const response = await fetch(`${workerUrl}/faces`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-worker-secret': WORKER_SECRET,
        ...(RUNPOD_API_KEY ? { 'Authorization': `Bearer ${RUNPOD_API_KEY}` } : {}),
      },
      body: JSON.stringify({
        tenantId,
        name: request.name,
        image: request.image,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    const data = await response.json();
    return {
      success: true,
      data: {
        id: data.faceId,
        tenantId,
        name: request.name,
        imageUrl: '', // Worker stores internally
        createdAt: new Date().toISOString(),
      },
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create face',
    };
  }
}

/**
 * List voice profiles
 */
export async function listVoiceProfiles(): Promise<WorkerResponse<VoiceProfile[]>> {
  const workerUrl = WORKER_URL || RUNPOD_BASE_URL;
  
  try {
    const response = await fetch(`${workerUrl}/voices`, {
      headers: RUNPOD_API_KEY ? { 'Authorization': `Bearer ${RUNPOD_API_KEY}` } : {},
    });

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    return { success: true, data: data.voices || [] };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list voices',
    };
  }
}

/**
 * List face profiles
 */
export async function listFaceProfiles(): Promise<WorkerResponse<FaceProfile[]>> {
  const workerUrl = WORKER_URL || RUNPOD_BASE_URL;
  
  try {
    const response = await fetch(`${workerUrl}/faces`, {
      headers: RUNPOD_API_KEY ? { 'Authorization': `Bearer ${RUNPOD_API_KEY}` } : {},
    });

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    return { success: true, data: data.faces || [] };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list faces',
    };
  }
}
