/**
 * Hedra API Client (Updated for new API - 2025+)
 * 
 * Creates expressive talking-head videos using Hedra's Character-1 model.
 * 
 * API Docs: https://www.hedra.com/docs
 * 
 * New API Flow:
 * 1. Upload image asset
 * 2. Upload audio asset (or use TTS)
 * 3. Submit generation request
 * 4. Poll for status until complete
 * 5. Download video from returned URL
 */

const HEDRA_API_KEY = process.env.HEDRA_API_KEY || '';
const HEDRA_BASE_URL = 'https://api.hedra.com/web-app/public';
const HEDRA_MODEL_ID = 'd1dd37a3-e39a-4854-a298-6510289f9cf2'; // Character-1 model

export interface HedraVideoRequest {
  /** URL to the source image (portrait photo) */
  imageUrl: string;
  /** URL to the audio file for lip-sync */
  audioUrl: string;
  /** Text prompt describing the video style/content/expression */
  textPrompt?: string;
  /** Aspect ratio of the output video */
  aspectRatio?: '16:9' | '9:16' | '1:1';
  /** Resolution of output video */
  resolution?: '540p' | '720p';
  /** Duration in seconds (optional, defaults to audio length) */
  duration?: number;
  /** Seed for reproducibility */
  seed?: number;
  /** Let Hedra AI enhance the prompt for better results */
  enhancePrompt?: boolean;
  /** Character orientation - 'video' uses natural motion */
  characterOrientation?: 'video' | 'image';
  /** Position character in frame as {x, y} where 0.5, 0.5 is center. Values 0-1. */
  boundingBoxTarget?: [number, number];
  /** Generate multiple variations (1-8) */
  batchSize?: number;
}

/** Expression style presets for Hedra */
export type HedraExpressionStyle = 
  | 'confident'
  | 'excited' 
  | 'serious'
  | 'friendly'
  | 'mysterious'
  | 'professional'
  | 'energetic'
  | 'calm'
  | 'storyteller';

/** Speaking style presets */
export type HedraSpeakingStyle =
  | 'presenter'
  | 'storyteller'
  | 'news_anchor'
  | 'tutorial'
  | 'conversational'
  | 'dramatic'
  | 'sales_pitch';

/** Get a text prompt for an expression style */
export function getExpressionPrompt(style: HedraExpressionStyle): string {
  const prompts: Record<HedraExpressionStyle, string> = {
    confident: 'Speaking with confidence and authority, direct eye contact, assertive gestures, professional demeanor',
    excited: 'Enthusiastic and energetic speaking, expressive eyes, animated facial expressions, genuine excitement',
    serious: 'Thoughtful and focused expression, measured speaking pace, contemplative and sincere delivery',
    friendly: 'Warm and approachable, gentle smile, welcoming expression, conversational and relatable',
    mysterious: 'Intriguing and enigmatic, subtle expressions, captivating presence, thoughtful pauses',
    professional: 'Business-like demeanor, clear enunciation, composed and polished presentation style',
    energetic: 'High energy and dynamic, vibrant expressions, enthusiastic delivery with movement',
    calm: 'Serene and peaceful expression, soothing presence, relaxed and measured delivery',
    storyteller: 'Engaging narrative style, expressive range of emotions, drawing the viewer in with presence',
  };
  return prompts[style];
}

/** Get a text prompt for a speaking style */
export function getSpeakingStylePrompt(style: HedraSpeakingStyle): string {
  const prompts: Record<HedraSpeakingStyle, string> = {
    presenter: 'Professional presenter style, clear articulation, engaging with the audience, confident stance',
    storyteller: 'Captivating storyteller, varied emotional range, drawing listeners into the narrative',
    news_anchor: 'Professional news anchor delivery, authoritative yet approachable, clear and concise',
    tutorial: 'Patient teacher style, clear explanations, encouraging and helpful demeanor',
    conversational: 'Natural conversation style, relaxed and authentic, like talking to a friend',
    dramatic: 'Theatrical delivery with emotional depth, powerful expressions, commanding presence',
    sales_pitch: 'Persuasive and enthusiastic, building excitement, confident product presentation',
  };
  return prompts[style];
}

export interface HedraVideoResult {
  success: boolean;
  jobId?: string;
  videoUrl?: string;
  downloadUrl?: string;
  status?: 'queued' | 'processing' | 'finalizing' | 'complete' | 'error';
  progress?: number;
  error?: string;
}

/**
 * Check if Hedra API is configured and available
 */
export function isHedraAvailable(): boolean {
  return Boolean(HEDRA_API_KEY);
}

/**
 * Make authenticated request to Hedra API
 */
async function hedraFetch(
  endpoint: string, 
  options: RequestInit = {}
): Promise<Response> {
  const url = `${HEDRA_BASE_URL}${endpoint}`;
  const headers = {
    'x-api-key': HEDRA_API_KEY,
    ...options.headers,
  };
  
  return fetch(url, { ...options, headers });
}

/**
 * Upload an asset (image or audio) from URL to Hedra
 */
async function uploadAssetFromUrl(
  url: string, 
  type: 'image' | 'audio',
  filename: string
): Promise<{ success: boolean; assetId?: string; error?: string }> {
  try {
    // Step 1: Create asset placeholder
    const createResponse = await hedraFetch('/assets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: filename, type }),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error('[Hedra] Failed to create asset:', createResponse.status, errorText);
      return { success: false, error: `Failed to create ${type} asset: ${errorText}` };
    }

    const createData = await createResponse.json();
    const assetId = createData.id;
    console.log(`[Hedra] Created ${type} asset:`, assetId);

    // Step 2: Download the file from URL
    const fileResponse = await fetch(url);
    if (!fileResponse.ok) {
      return { success: false, error: `Failed to fetch ${type} from URL` };
    }
    const fileBlob = await fileResponse.blob();

    // Step 3: Upload the file to Hedra
    const formData = new FormData();
    formData.append('file', fileBlob, filename);

    const uploadResponse = await hedraFetch(`/assets/${assetId}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('[Hedra] Failed to upload asset:', uploadResponse.status, errorText);
      return { success: false, error: `Failed to upload ${type}: ${errorText}` };
    }

    console.log(`[Hedra] Uploaded ${type} asset successfully:`, assetId);
    return { success: true, assetId };
  } catch (error) {
    console.error(`[Hedra] Error uploading ${type}:`, error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Generate an expressive talking-head video using Hedra Character-1
 */
export async function generateHedraVideo(request: HedraVideoRequest): Promise<HedraVideoResult> {
  if (!HEDRA_API_KEY) {
    return { success: false, error: 'HEDRA_API_KEY not configured' };
  }

  try {
    console.log('[Hedra] Starting video generation with params:', {
      hasImage: Boolean(request.imageUrl),
      hasAudio: Boolean(request.audioUrl),
      textPrompt: request.textPrompt?.substring(0, 50),
      aspectRatio: request.aspectRatio || '9:16',
      resolution: request.resolution || '720p',
    });

    // Step 1: Upload image
    const imageResult = await uploadAssetFromUrl(
      request.imageUrl,
      'image',
      `avatar_${Date.now()}.jpg`
    );
    if (!imageResult.success || !imageResult.assetId) {
      return { success: false, error: imageResult.error || 'Failed to upload image' };
    }

    // Step 2: Upload audio
    const audioResult = await uploadAssetFromUrl(
      request.audioUrl,
      'audio',
      `audio_${Date.now()}.mp3`
    );
    if (!audioResult.success || !audioResult.assetId) {
      return { success: false, error: audioResult.error || 'Failed to upload audio' };
    }

    // Step 3: Submit generation request
    const videoInputs: Record<string, unknown> = {
      text_prompt: request.textPrompt || 'A person talking naturally with expressive emotions',
      resolution: request.resolution || '720p',
      aspect_ratio: request.aspectRatio || '9:16',
    };
    
    // Add optional duration
    if (request.duration) {
      videoInputs.duration_ms = Math.round(request.duration * 1000);
    }

    // Add optional seed
    if (request.seed !== undefined) {
      videoInputs.seed = request.seed;
    }
    
    // Add enhance_prompt if enabled (let Hedra AI improve the prompt)
    if (request.enhancePrompt !== undefined) {
      videoInputs.enhance_prompt = request.enhancePrompt;
    }
    
    // Add character orientation
    if (request.characterOrientation) {
      videoInputs.character_orientation = request.characterOrientation;
    }
    
    // Add bounding box target for character positioning (Hedra expects {x, y} format)
    if (request.boundingBoxTarget) {
      videoInputs.bounding_box_target = {
        x: request.boundingBoxTarget[0],
        y: request.boundingBoxTarget[1],
      };
    }
    
    const generationRequest: Record<string, unknown> = {
      type: 'video',
      ai_model_id: HEDRA_MODEL_ID,
      start_keyframe_id: imageResult.assetId,
      audio_id: audioResult.assetId,
      generated_video_inputs: videoInputs,
    };
    
    // Add batch size for generating multiple variations
    if (request.batchSize && request.batchSize > 1) {
      generationRequest.batch_size = Math.min(request.batchSize, 8);
    }

    console.log('[Hedra] Submitting generation request...');
    const genResponse = await hedraFetch('/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(generationRequest),
    });

    if (!genResponse.ok) {
      const errorText = await genResponse.text();
      console.error('[Hedra] Generation request failed:', genResponse.status, errorText);
      return { success: false, error: `Generation failed: ${errorText}` };
    }

    const genData = await genResponse.json();
    console.log('[Hedra] Generation started:', genData.id);

    return {
      success: true,
      jobId: genData.id,
      status: genData.status || 'queued',
    };
  } catch (error) {
    console.error('[Hedra] Error in generateHedraVideo:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Check the status of a Hedra generation job
 */
export async function getHedraVideoStatus(jobId: string): Promise<HedraVideoResult> {
  if (!HEDRA_API_KEY) {
    return { success: false, error: 'HEDRA_API_KEY not configured' };
  }

  try {
    const response = await hedraFetch(`/generations/${jobId}/status`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Hedra] Status check failed:', response.status, errorText);
      return { success: false, error: `Status check failed: ${errorText}` };
    }

    const data = await response.json();
    console.log('[Hedra] Status response:', { status: data.status, progress: data.progress });

    // Map Hedra status to our status type
    const statusMap: Record<string, HedraVideoResult['status']> = {
      'queued': 'queued',
      'processing': 'processing',
      'finalizing': 'finalizing',
      'complete': 'complete',
      'error': 'error',
    };

    const result: HedraVideoResult = {
      success: true,
      jobId,
      status: statusMap[data.status] || 'processing',
      progress: data.progress,
    };

    // If complete, include the download URL
    if (data.status === 'complete') {
      result.videoUrl = data.url;
      result.downloadUrl = data.download_url;
    }

    // If error, include the error message
    if (data.status === 'error') {
      result.success = false;
      result.error = data.error_message || 'Generation failed';
    }

    return result;
  } catch (error) {
    console.error('[Hedra] Error checking status:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Generate video and wait for completion (synchronous helper)
 */
export async function generateHedraVideoSync(
  request: HedraVideoRequest,
  timeoutMs: number = 300000 // 5 minute default
): Promise<HedraVideoResult> {
  const startTime = Date.now();

  // Start generation
  const startResult = await generateHedraVideo(request);
  if (!startResult.success || !startResult.jobId) {
    return startResult;
  }

  const jobId = startResult.jobId;

  // Poll for completion
  while (Date.now() - startTime < timeoutMs) {
    const statusResult = await getHedraVideoStatus(jobId);

    if (statusResult.status === 'complete') {
      return {
        success: true,
        jobId,
        videoUrl: statusResult.videoUrl,
        downloadUrl: statusResult.downloadUrl,
        status: 'complete',
      };
    }

    if (statusResult.status === 'error') {
      return {
        success: false,
        jobId,
        status: 'error',
        error: statusResult.error || 'Generation failed',
      };
    }

    // Wait before polling again
    const elapsed = Date.now() - startTime;
    const waitTime = elapsed < 30000 ? 3000 : elapsed < 120000 ? 5000 : 10000;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  return {
    success: false,
    jobId,
    status: 'processing',
    error: 'Generation timed out',
  };
}

/**
 * Get available Hedra voices for TTS (if using built-in TTS instead of audio upload)
 */
export async function getHedraVoices(): Promise<Array<{
  id: string;
  name: string;
  gender?: string;
  accent?: string;
}>> {
  if (!HEDRA_API_KEY) {
    return [];
  }

  try {
    const response = await hedraFetch('/voices');
    if (!response.ok) {
      console.error('[Hedra] Failed to fetch voices');
      return [];
    }

    const voices = await response.json();
    return voices.map((v: Record<string, unknown>) => {
      const labels = ((v.asset as Record<string, unknown>)?.labels as Array<{ name: string; value: string }>) || [];
      const labelsMap = labels.reduce((acc, l) => ({ ...acc, [l.name]: l.value }), {} as Record<string, string>);
      
      return {
        id: v.id as string,
        name: v.name as string,
        gender: labelsMap.gender,
        accent: labelsMap.accent,
      };
    });
  } catch (error) {
    console.error('[Hedra] Error fetching voices:', error);
    return [];
  }
}
