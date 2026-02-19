/**
 * InfiniteTalk Client
 * 
 * Generates talking avatar videos using RunPod's InfiniteTalk public endpoint.
 * Takes an image + audio and produces a lip-synced video.
 * 
 * API Reference: https://docs.runpod.io/hub/public-endpoint-reference
 */

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY || '';
// InfiniteTalk public endpoint - confirmed working endpoint ID
const INFINITETALK_ENDPOINT = 'https://api.runpod.ai/v2/infinitetalk';

export interface InfiniteTalkInput {
  mode: 'audio_to_video' | 'image_to_video' | 'video_to_video';
  image?: string;  // URL or base64
  video?: string;  // URL or base64 (for video_to_video mode)
  audio: string;   // URL or base64
  resolution?: '480p' | '720p' | '1080p';
  fps?: number;
}

export interface InfiniteTalkParams {
  seed?: number;
  guidance_scale?: number;
  audio_guidance?: number;
}

export interface InfiniteTalkRequest {
  input: InfiniteTalkInput;
  params?: InfiniteTalkParams;
}

export interface InfiniteTalkJobResponse {
  id: string;
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  output?: {
    // Different possible field names for video URL
    video_url?: string;
    videoUrl?: string;
    video?: string;
    url?: string;
    result?: string;
    // Thumbnail
    thumbnail_url?: string;
    thumbnailUrl?: string;
    thumbnail?: string;
    // Other
    duration?: number;
    message?: string;
  } | string; // Some endpoints return just the URL as output
  error?: string;
  executionTime?: number;
}

/**
 * Check if InfiniteTalk endpoint is available
 * Public endpoints don't have a /health endpoint, so we just check if API key is configured
 */
export async function isInfiniteTalkAvailable(): Promise<boolean> {
  if (!RUNPOD_API_KEY) {
    console.log('[InfiniteTalk] No API key configured');
    return false;
  }
  
  // Public endpoints are always available if we have an API key
  // The actual availability is checked when we submit a job
  console.log('[InfiniteTalk] API key configured, endpoint available');
  return true;
}

/**
 * Submit a job to InfiniteTalk (async)
 */
export async function submitInfiniteTalkJob(
  request: InfiniteTalkRequest
): Promise<{ success: boolean; jobId?: string; error?: string }> {
  if (!RUNPOD_API_KEY) {
    return { success: false, error: 'No RunPod API key configured' };
  }

  try {
    console.log('[InfiniteTalk] Submitting job:', request.input.mode);
    
    const response = await fetch(`${INFINITETALK_ENDPOINT}/run`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RUNPOD_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[InfiniteTalk] Submit error:', response.status, errorText);
      return { success: false, error: `API error: ${response.status} - ${errorText}` };
    }

    const data: InfiniteTalkJobResponse = await response.json();
    console.log('[InfiniteTalk] Job submitted:', data.id, data.status);
    
    return { success: true, jobId: data.id };
  } catch (error) {
    console.error('[InfiniteTalk] Submit error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Check the status of an InfiniteTalk job
 */
export async function checkInfiniteTalkJobStatus(
  jobId: string
): Promise<InfiniteTalkJobResponse | null> {
  if (!RUNPOD_API_KEY) return null;

  try {
    const response = await fetch(`${INFINITETALK_ENDPOINT}/status/${jobId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${RUNPOD_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('[InfiniteTalk] Status check failed:', response.status);
      return null;
    }

    const data = await response.json();
    console.log('[InfiniteTalk] Job status:', jobId, data.status, 'Full response:', JSON.stringify(data));
    
    // Map RunPod response to our interface
    const result: InfiniteTalkJobResponse = {
      id: data.id,
      status: data.status,
      output: data.output,
      error: data.error,
      executionTime: data.executionTime,
    };
    return result;
  } catch (error) {
    console.error('[InfiniteTalk] Status check error:', error);
    return null;
  }
}

/**
 * Cancel an InfiniteTalk job
 */
export async function cancelInfiniteTalkJob(jobId: string): Promise<boolean> {
  if (!RUNPOD_API_KEY) return false;

  try {
    const response = await fetch(`${INFINITETALK_ENDPOINT}/cancel/${jobId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RUNPOD_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    return response.ok;
  } catch (error) {
    console.error('[InfiniteTalk] Cancel error:', error);
    return false;
  }
}

/**
 * Generate a talking video from image + audio (synchronous - waits for completion)
 * Use this for shorter videos where you want to wait for the result.
 */
export async function generateTalkingVideoSync(
  imageUrl: string,
  audioUrl: string,
  options: {
    resolution?: '480p' | '720p' | '1080p';
    fps?: number;
    seed?: number;
    audioGuidance?: number;
  } = {}
): Promise<{ success: boolean; videoUrl?: string; thumbnailUrl?: string; error?: string }> {
  if (!RUNPOD_API_KEY) {
    return { success: false, error: 'No RunPod API key configured' };
  }

  try {
    console.log('[InfiniteTalk] Generating video (sync)...');
    
    const request: InfiniteTalkRequest = {
      input: {
        mode: 'audio_to_video',
        image: imageUrl,
        audio: audioUrl,
        resolution: options.resolution || '720p',
        fps: options.fps || 25,
      },
      params: {
        seed: options.seed,
        audio_guidance: options.audioGuidance || 6,
      },
    };

    const response = await fetch(`${INFINITETALK_ENDPOINT}/runsync`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RUNPOD_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `API error: ${response.status} - ${errorText}` };
    }

    const data: InfiniteTalkJobResponse = await response.json();
    
    if (data.status === 'COMPLETED' && data.output) {
      // Handle both string and object output formats
      let videoUrl: string | undefined;
      let thumbnailUrl: string | undefined;
      
      if (typeof data.output === 'string') {
        videoUrl = data.output;
      } else {
        videoUrl = data.output.video_url || data.output.videoUrl || data.output.video || data.output.url || data.output.result;
        thumbnailUrl = data.output.thumbnail_url || data.output.thumbnailUrl || data.output.thumbnail;
      }
      
      if (videoUrl) {
        return {
          success: true,
          videoUrl,
          thumbnailUrl,
        };
      }
      return { success: false, error: 'Video completed but no URL in output' };
    } else if (data.status === 'FAILED') {
      return { success: false, error: data.error || 'Video generation failed' };
    } else {
      return { success: false, error: `Unexpected status: ${data.status}` };
    }
  } catch (error) {
    console.error('[InfiniteTalk] Sync generation error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Convert text to speech using a TTS service
 * This is needed because InfiniteTalk requires audio input
 */
export async function textToSpeech(
  text: string,
  voiceStyle: string = 'natural'
): Promise<{ success: boolean; audioUrl?: string; error?: string }> {
  // For now, we'll use a placeholder TTS
  // In production, integrate with ElevenLabs, OpenAI TTS, or similar
  
  // Check if we have an OpenAI API key for TTS
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  
  if (OPENAI_API_KEY) {
    try {
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'tts-1',
          input: text,
          voice: voiceStyle === 'energetic' ? 'nova' : 
                 voiceStyle === 'professional' ? 'onyx' :
                 voiceStyle === 'friendly' ? 'shimmer' :
                 voiceStyle === 'calm' ? 'echo' : 'alloy',
        }),
      });

      if (!response.ok) {
        return { success: false, error: 'TTS API error' };
      }

      // Convert audio buffer to base64
      const audioBuffer = await response.arrayBuffer();
      const base64Audio = Buffer.from(audioBuffer).toString('base64');
      const audioUrl = `data:audio/mpeg;base64,${base64Audio}`;

      return { success: true, audioUrl };
    } catch (error) {
      console.error('[TTS] Error:', error);
      return { success: false, error: 'TTS generation failed' };
    }
  }

  // Fallback: Return error if no TTS available
  return { 
    success: false, 
    error: 'No TTS service configured. Set OPENAI_API_KEY for text-to-speech.' 
  };
}

/**
 * Full pipeline: Text + Image → Talking Video
 * Combines TTS and InfiniteTalk
 */
export async function createTalkingVideo(
  imageUrl: string,
  script: string,
  options: {
    voiceStyle?: string;
    resolution?: '480p' | '720p' | '1080p';
    fps?: number;
  } = {}
): Promise<{ 
  success: boolean; 
  jobId?: string; 
  videoUrl?: string; 
  error?: string;
  mode?: 'production' | 'demo';
}> {
  // Step 1: Check if InfiniteTalk is available
  const available = await isInfiniteTalkAvailable();
  
  if (!available) {
    console.log('[InfiniteTalk] Not available, returning demo mode');
    return { success: true, mode: 'demo', error: 'InfiniteTalk not available' };
  }

  // Step 2: Convert script to audio
  const ttsResult = await textToSpeech(script, options.voiceStyle);
  
  if (!ttsResult.success || !ttsResult.audioUrl) {
    console.log('[InfiniteTalk] TTS failed:', ttsResult.error);
    return { success: false, error: ttsResult.error || 'TTS failed' };
  }

  // Step 3: Submit to InfiniteTalk
  const request: InfiniteTalkRequest = {
    input: {
      mode: 'audio_to_video',
      image: imageUrl,
      audio: ttsResult.audioUrl,
      resolution: options.resolution || '720p',
      fps: options.fps || 25,
    },
    params: {
      audio_guidance: 6,
    },
  };

  const submitResult = await submitInfiniteTalkJob(request);
  
  if (!submitResult.success || !submitResult.jobId) {
    return { success: false, error: submitResult.error || 'Job submission failed' };
  }

  return { 
    success: true, 
    jobId: submitResult.jobId,
    mode: 'production',
  };
}
