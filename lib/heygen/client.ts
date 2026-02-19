/**
 * HeyGen Client (for future use when API key available)
 * Creates talking head videos using HeyGen's Photo Avatar API.
 * See: https://docs.heygen.com/docs/create-videos-with-photo-avatars
 */

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY || '';
const HEYGEN_API_URL = 'https://api.heygen.com/v2';
const HEYGEN_API_V1 = 'https://api.heygen.com/v1';
const HEYGEN_UPLOAD_URL = 'https://upload.heygen.com/v1';

// Voice cache - populated from HeyGen API
let cachedVoices: Array<{ voice_id: string; display_name?: string; language?: string; locale?: string; gender?: string }> = [];
let cachedDefaultVoiceId: string | null = null;

// Fetch and cache available voices from HeyGen
async function fetchAndCacheVoices(): Promise<typeof cachedVoices> {
  if (cachedVoices.length > 0) return cachedVoices;
  
  if (!HEYGEN_API_KEY) return [];
  
  try {
    console.log('[HeyGen] Fetching available voices from v2 API...');
    const response = await fetch(`${HEYGEN_API_URL}/voices`, {
      method: 'GET',
      headers: { 'X-Api-Key': HEYGEN_API_KEY },
    });
    
    const responseText = await response.text();
    console.log('[HeyGen] Voices response:', response.status, responseText.substring(0, 500));
    
    if (!response.ok) {
      console.error('[HeyGen] Failed to fetch voices:', response.status);
      return [];
    }
    
    let data: { 
      data?: { voices?: typeof cachedVoices };
      voices?: typeof cachedVoices;
    };
    
    try {
      data = JSON.parse(responseText);
    } catch {
      console.error('[HeyGen] Failed to parse voices response');
      return [];
    }
    
    cachedVoices = data?.data?.voices ?? data?.voices ?? [];
    console.log('[HeyGen] Cached', cachedVoices.length, 'voices');
    
    // Log available voices for debugging
    if (cachedVoices.length > 0) {
      console.log('[HeyGen] Sample voices:', cachedVoices.slice(0, 3).map(v => `${v.voice_id} (${v.display_name || 'unnamed'})`));
    }
    
    return cachedVoices;
  } catch (error) {
    console.error('[HeyGen] Error fetching voices:', error);
    return [];
  }
}

// Get a valid voice ID from HeyGen based on our internal style/gender
async function getHeyGenVoiceId(internalVoiceId?: string): Promise<string | null> {
  const voices = await fetchAndCacheVoices();
  
  if (voices.length === 0) {
    console.warn('[HeyGen] No voices available - check HeyGen account or API key');
    return null;
  }
  
  // If we have a cached default, use it
  if (!internalVoiceId && cachedDefaultVoiceId) {
    return cachedDefaultVoiceId;
  }
  
  // FIRST: Check if internalVoiceId is already a real HeyGen voice ID
  // (user selected a specific voice from the voice picker)
  if (internalVoiceId) {
    const directMatch = voices.find(v => v.voice_id === internalVoiceId);
    if (directMatch) {
      console.log('[HeyGen] Direct voice match found:', directMatch.voice_id, `(${directMatch.display_name || 'unnamed'}, ${directMatch.gender || 'unknown gender'})`);
      return directMatch.voice_id;
    }
  }
  
  // Parse internal voice ID: voice_{style}_{gender}_{number}
  // e.g., voice_natural_female_1 or voice_energetic_male_1
  let targetGender: 'female' | 'male' | null = null;
  if (internalVoiceId) {
    if (internalVoiceId.includes('female')) targetGender = 'female';
    else if (internalVoiceId.includes('male')) targetGender = 'male';
  }
  
  // Try to find a matching voice
  let selectedVoice = null;
  
  // First: try to match gender if specified
  if (targetGender) {
    selectedVoice = voices.find(v => 
      v.gender?.toLowerCase() === targetGender &&
      (v.language?.toLowerCase().includes('en') || v.locale?.toLowerCase().startsWith('en'))
    );
  }
  
  // Second: try any English voice
  if (!selectedVoice) {
    selectedVoice = voices.find(v => 
      v.language?.toLowerCase().includes('en') || 
      v.locale?.toLowerCase().startsWith('en') ||
      v.locale?.toLowerCase() === 'en-us'
    );
  }
  
  // Third: just use the first available voice
  if (!selectedVoice && voices.length > 0) {
    selectedVoice = voices[0];
  }
  
  if (selectedVoice?.voice_id) {
    console.log('[HeyGen] Selected voice:', selectedVoice.voice_id, `(${selectedVoice.display_name || 'unnamed'}, gender: ${selectedVoice.gender || 'unknown'})`);
    // Cache as default if no specific voice was requested
    if (!internalVoiceId) {
      cachedDefaultVoiceId = selectedVoice.voice_id;
    }
    return selectedVoice.voice_id;
  }
  
  console.warn('[HeyGen] Could not find suitable voice');
  return null;
}

export interface HeyGenVideoRequest {
  imageUrl: string;
  script: string;
  voiceId?: string;
  aspectRatio?: '16:9' | '9:16' | '1:1';
  talkingPhotoId?: string;
  // Use Avatar IV for more expressive facial motion
  useAvatarIV?: boolean;
  // Use a public HeyGen avatar instead of photo (for full-body animation)
  avatarId?: string;
  // Expression/emotion setting
  expression?: 'default' | 'happy' | 'serious' | 'friendly';
  // Background settings
  background?: {
    type: 'color' | 'image' | 'video';
    value: string; // hex color, image URL, or video URL
  };
}

export interface HeyGenVideoResult {
  success: boolean;
  videoId?: string;
  videoUrl?: string;
  error?: string;
}

export function isHeyGenAvailable(): boolean {
  return Boolean(HEYGEN_API_KEY);
}

export async function createTalkingPhoto(imageUrl: string): Promise<{ success: boolean; talkingPhotoId?: string; error?: string }> {
  if (!HEYGEN_API_KEY) {
    return { success: false, error: 'HEYGEN_API_KEY not configured' };
  }
  
  console.log('[HeyGen] Creating talking photo from:', imageUrl.substring(0, 80) + '...');
  
  try {
    let body: ArrayBuffer | Uint8Array;
    let contentType = 'image/jpeg';
    
    if (imageUrl.startsWith('data:')) {
      const base64 = imageUrl.split(',')[1];
      if (!base64) return { success: false, error: 'Invalid data URL' };
      if (typeof Buffer !== 'undefined') {
        body = Buffer.from(base64, 'base64');
      } else {
        body = new Uint8Array((typeof atob !== 'undefined' ? atob(base64) : '').split('').map(c => c.charCodeAt(0)));
      }
      const m = imageUrl.match(/data:([^;]+);/);
      if (m?.[1]?.includes('png')) contentType = 'image/png';
    } else {
      console.log('[HeyGen] Fetching image from URL...');
      const res = await fetch(imageUrl, {
        headers: {
          'Accept': 'image/*',
          'User-Agent': 'SpaceBaddie-VideoGenerator/1.0',
        },
      });
      if (!res.ok) {
        console.error('[HeyGen] Image fetch failed:', res.status, res.statusText);
        return { success: false, error: `Failed to fetch image: ${res.status} ${res.statusText}` };
      }
      body = await res.arrayBuffer();
      console.log('[HeyGen] Image fetched, size:', body.byteLength);
      
      if (body.byteLength < 1000) {
        return { success: false, error: `Image too small (${body.byteLength} bytes) - may be invalid` };
      }
      
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('png')) contentType = 'image/png';
      else if (ct.includes('webp')) contentType = 'image/webp';
      
      console.log(`[HeyGen] Fetched image. Size: ${body.byteLength}, Type: ${ct}, Detected Content-Type: ${contentType}`);
    }
    
    // HeyGen expects raw binary body (not multipart) according to recent docs/fixes
    console.log('[HeyGen] Uploading to HeyGen as binary, content-type:', contentType);
    
    const response = await fetch(`${HEYGEN_UPLOAD_URL}/talking_photo`, {
      method: 'POST',
      headers: {
        'X-Api-Key': HEYGEN_API_KEY,
        'Content-Type': contentType,
      },
      body: body as BodyInit,
    });
    
    const responseText = await response.text();
    console.log('[HeyGen] Upload response:', response.status, responseText.substring(0, 200));
    
    if (!response.ok) {
      return { success: false, error: `HeyGen upload failed: ${response.status} ${responseText}` };
    }
    
    let data;
    try {
      data = JSON.parse(responseText) as { data?: { talking_photo_id?: string }; talking_photo_id?: string };
    } catch {
      return { success: false, error: `Invalid JSON response: ${responseText.substring(0, 100)}` };
    }
    
    const id = data?.data?.talking_photo_id ?? data?.talking_photo_id;
    if (!id) return { success: false, error: 'No talking_photo_id in response: ' + responseText.substring(0, 100) };
    
    console.log('[HeyGen] Talking photo created:', id);
    return { success: true, talkingPhotoId: id };
  } catch (e) {
    console.error('[HeyGen] Error:', e);
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function createTalkingVideo(request: HeyGenVideoRequest): Promise<HeyGenVideoResult> {
  if (!HEYGEN_API_KEY) {
    return { success: false, error: 'HEYGEN_API_KEY not configured' };
  }
  try {
    const aspect = request.aspectRatio || '9:16';
    const dimension = aspect === '9:16' ? { width: 1080, height: 1920 } : aspect === '16:9' ? { width: 1920, height: 1080 } : { width: 1080, height: 1080 };
    
    // Get a valid HeyGen voice ID
    const voiceId = await getHeyGenVoiceId(request.voiceId);
    if (!voiceId) {
      return { success: false, error: 'No voices available in HeyGen account. Please check your HeyGen subscription or contact support.' };
    }
    console.log('[HeyGen] Using voice_id:', voiceId, 'for internal ID:', request.voiceId || 'default');
    
    // Build character config based on avatar type
    let character: Record<string, unknown>;
    
    if (request.avatarId) {
      // Use HeyGen's public/instant avatar (full-body animation)
      console.log('[HeyGen] Using public avatar:', request.avatarId);
      character = {
        type: 'avatar',
        avatar_id: request.avatarId,
        scale: 1.0,
      };
    } else {
      // Use talking photo from uploaded image
      let talkingPhotoId = request.talkingPhotoId;
      if (!talkingPhotoId && request.imageUrl) {
        console.log('[HeyGen] Creating video, imageUrl type:', request.imageUrl.startsWith('data:') ? 'base64' : 'url', 'length:', request.imageUrl.length);
        const upload = await createTalkingPhoto(request.imageUrl);
        if (!upload.success || !upload.talkingPhotoId) {
          console.log('[HeyGen] Talking photo creation failed:', upload.error);
          return { success: false, error: `Talking photo failed: ${upload.error || 'Unknown error'}` };
        }
        talkingPhotoId = upload.talkingPhotoId;
        console.log('[HeyGen] Talking photo created successfully:', talkingPhotoId);
      }
      if (!talkingPhotoId) {
        return { success: false, error: 'imageUrl, talkingPhotoId, or avatarId required' };
      }
      
      character = {
        type: 'talking_photo',
        talking_photo_id: talkingPhotoId,
        scale: 1.0,
        talking_photo_style: 'circle', // circle style for more dynamic framing
      };
    }
    
    // Build the video input scene
    const videoInput: Record<string, unknown> = {
      character,
      voice: {
        type: 'text',
        input_text: request.script,
        voice_id: voiceId,
        // Add emotion/expression if specified
        ...(request.expression && request.expression !== 'default' ? { emotion: request.expression } : {}),
      },
    };

    // Add background if specified
    // HeyGen supports: { type: "color", value: "#ffffff" }
    //                   { type: "image", value: "https://..." }
    //                   { type: "video", value: "https://..." }
    if (request.background && request.background.value) {
      videoInput.background = request.background;
      console.log('[HeyGen] Using background:', request.background.type, request.background.value.substring(0, 80));
    }

    // Build the payload
    const payload: Record<string, unknown> = {
      video_inputs: [videoInput],
      dimension,
      test: false,
    };
    
    // Enable Avatar IV for more expressive facial motion (default: true for better quality)
    if (request.useAvatarIV !== false) {
      (payload as Record<string, unknown>).avatar_style = 'normal'; // Required for Avatar IV
      console.log('[HeyGen] Avatar IV mode enabled for enhanced facial motion');
    }
    
    console.log('[HeyGen] Sending video generate request, avatar type:', request.avatarId ? 'public_avatar' : 'talking_photo');
    const response = await fetch(`${HEYGEN_API_URL}/video/generate`, {
      method: 'POST',
      headers: { 'X-Api-Key': HEYGEN_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const responseText = await response.text();
    console.log('[HeyGen] Video generate response:', response.status, responseText.substring(0, 500));
    
    if (!response.ok) {
      return { success: false, error: `HeyGen generate failed: ${response.status} - ${responseText.substring(0, 300)}` };
    }
    
    let data: { data?: { video_id?: string; error?: string; message?: string }; video_id?: string; error?: string; message?: string };
    try {
      data = JSON.parse(responseText);
    } catch {
      return { success: false, error: `Invalid JSON from HeyGen: ${responseText.substring(0, 200)}` };
    }
    
    const videoId = data?.data?.video_id ?? data?.video_id;
    if (!videoId) {
      const errorMsg = data?.data?.error || data?.data?.message || data?.error || data?.message || 'No video_id in response';
      return { success: false, error: `HeyGen video creation failed: ${errorMsg}` };
    }
    console.log('[HeyGen] Video generation started, videoId:', videoId);
    return { success: true, videoId };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function getVideoStatus(videoId: string): Promise<{
  status: 'pending' | 'waiting' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  error?: string;
}> {
  if (!HEYGEN_API_KEY) {
    return { status: 'failed', error: 'HEYGEN_API_KEY not configured' };
  }
  try {
    const response = await fetch(`${HEYGEN_API_V1}/video_status.get?video_id=${encodeURIComponent(videoId)}`, {
      method: 'GET',
      headers: { 'X-Api-Key': HEYGEN_API_KEY },
    });
    const responseText = await response.text();
    console.log('[HeyGen] Status response for', videoId, ':', response.status, responseText.substring(0, 500));
    
    if (!response.ok) {
      return { status: 'failed', error: `Status check failed: ${response.status} - ${responseText.substring(0, 200)}` };
    }
    
    let data: { data?: { status?: string; video_url?: string; error_message?: string; error?: string; message?: string }; status?: string; video_url?: string; error?: string; message?: string };
    try {
      data = JSON.parse(responseText);
    } catch {
      return { status: 'failed', error: `Invalid JSON response: ${responseText.substring(0, 100)}` };
    }
    
    const status = (data?.data?.status ?? data?.status ?? '').toLowerCase();
    const videoUrl = data?.data?.video_url ?? data?.video_url;
    // HeyGen can return error in multiple fields
    const error = data?.data?.error_message || data?.data?.error || data?.data?.message || data?.error || data?.message;
    
    console.log('[HeyGen] Parsed status:', status, 'videoUrl:', videoUrl ? 'present' : 'none', 'error:', error);
    
    if (status === 'completed' && videoUrl) return { status: 'completed', videoUrl };
    if (status === 'failed') {
      const errorMsg = error || `Video generation failed (HeyGen status: failed, videoId: ${videoId})`;
      console.log('[HeyGen] Video failed:', errorMsg);
      return { status: 'failed', error: errorMsg };
    }
    const map: Record<string, 'pending' | 'waiting' | 'processing'> = {
      pending: 'pending',
      waiting: 'waiting',
      processing: 'processing',
      in_progress: 'processing',
    };
    return { status: map[status] || 'processing' };
  } catch (e) {
    console.error('[HeyGen] Status check error:', e);
    return { status: 'failed', error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function listVoices(): Promise<{ success: boolean; voices?: Array<{ id: string; name?: string }>; error?: string }> {
  if (!HEYGEN_API_KEY) {
    return { success: false, error: 'HEYGEN_API_KEY not configured' };
  }
  try {
    const response = await fetch(`${HEYGEN_API_URL}/voices`, {
      method: 'GET',
      headers: { 'X-Api-Key': HEYGEN_API_KEY },
    });
    if (!response.ok) {
      return { success: false, error: `List voices failed: ${response.status}` };
    }
    const data = (await response.json()) as { data?: { voices?: Array<{ voice_id?: string; name?: string }> }; voices?: Array<{ voice_id?: string; name?: string }> };
    const list = data?.data?.voices ?? data?.voices ?? [];
    const voices = list.map((v: { voice_id?: string; name?: string }) => ({ id: v.voice_id || '', name: v.name }));
    return { success: true, voices };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export interface HeyGenAvatar {
  id: string;
  name?: string;
  gender?: string;
  preview_url?: string;
  type?: 'public' | 'instant' | 'photo';
}

// Cache for avatars
let cachedAvatars: HeyGenAvatar[] = [];

/**
 * List available HeyGen avatars (public + user's instant avatars)
 * These provide full-body animation compared to talking photos
 */
export async function listAvatars(): Promise<{ success: boolean; avatars?: HeyGenAvatar[]; error?: string }> {
  if (!HEYGEN_API_KEY) {
    return { success: false, error: 'HEYGEN_API_KEY not configured' };
  }
  
  // Return cached if available
  if (cachedAvatars.length > 0) {
    return { success: true, avatars: cachedAvatars };
  }
  
  try {
    console.log('[HeyGen] Fetching available avatars...');
    const response = await fetch(`${HEYGEN_API_URL}/avatars`, {
      method: 'GET',
      headers: { 'X-Api-Key': HEYGEN_API_KEY },
    });
    
    if (!response.ok) {
      console.error('[HeyGen] List avatars failed:', response.status);
      return { success: false, error: `List avatars failed: ${response.status}` };
    }
    
    const data = await response.json() as { 
      data?: { avatars?: Array<{ avatar_id?: string; avatar_name?: string; gender?: string; preview_image_url?: string; is_public?: boolean }> };
      avatars?: Array<{ avatar_id?: string; avatar_name?: string; gender?: string; preview_image_url?: string; is_public?: boolean }>;
    };
    
    const list = data?.data?.avatars ?? data?.avatars ?? [];
    cachedAvatars = list.map(a => ({
      id: a.avatar_id || '',
      name: a.avatar_name,
      gender: a.gender,
      preview_url: a.preview_image_url,
      type: a.is_public ? 'public' : 'instant',
    })).filter(a => a.id);
    
    console.log('[HeyGen] Found', cachedAvatars.length, 'avatars');
    return { success: true, avatars: cachedAvatars };
  } catch (e) {
    console.error('[HeyGen] List avatars error:', e);
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}
