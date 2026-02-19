/**
 * SpaceBaddie Cinematic Video Generation API
 * 
 * POST /api/spacebaddie/cinematic
 * 
 * Generates expressive talking avatar videos using Hedra Character-1.
 * Requires an image (face photo) and script/audio.
 * 
 * Hedra produces high-quality, expressive lip-synced videos.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  isHedraAvailable,
  generateHedraVideo,
  getHedraVideoStatus,
  getExpressionPrompt,
  getSpeakingStylePrompt,
  type HedraVideoRequest,
  type HedraExpressionStyle,
  type HedraSpeakingStyle,
} from '@/lib/hedra/client';
import { textToSpeech } from '@/lib/infinitetalk/client';
import { getMusicUrl, getAvailableGenres, getAvailableMoods } from '@/lib/music/stock';
import { createClient } from '@supabase/supabase-js';

const MAX_VOICEOVER_CHARS = 2000;

// Lazy Supabase client
let supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!supabase && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }
  return supabase;
}

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minute max for video generation

/**
 * POST - Generate a cinematic video using Hedra
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      // User context
      userId,
      
      // Content
      prompt,
      script,
      voiceStyle,
      
      // Audio
      audioUrl,
      music,
      musicUrl: providedMusicUrl,
      musicVolume = 0.3,
      
      // Image (required for Hedra)
      imageUrl,
      
      // Video settings
      aspectRatio = '9:16',
      resolution = '720p',
      duration,
      
      // Generation controls
      seed,
      
      // Hedra-specific style options
      expressionStyle,  // 'confident', 'excited', 'serious', etc.
      speakingStyle,    // 'presenter', 'storyteller', 'news_anchor', etc.
      enhancePrompt = true, // Let Hedra AI improve the prompt
      characterPosition, // 'center', 'left', 'right' or [x, y]
      batchSize = 1,    // Generate variations (1-8)
      directorNotes,    // Tao-style: "single key light, film noir, shallow depth of field"
      cinematicKeywords, // Alias for directorNotes
      
      // Mode
      async = true, // Default to async for better UX
    } = body;
    
    // Validation - Hedra requires an image
    if (!imageUrl) {
      return NextResponse.json(
        { 
          error: 'Image required for cinematic video',
          message: 'Please upload a face photo to create a talking avatar video.',
        },
        { status: 400 }
      );
    }
    
    // Need script, audio, or at least a prompt (we can TTS from prompt)
    const hasScript = Boolean(script?.trim());
    const hasAudio = Boolean(audioUrl);
    const hasPrompt = Boolean(prompt?.trim());
    if (!hasScript && !hasAudio && !hasPrompt) {
      return NextResponse.json(
        { 
          error: 'Script or audio required',
          message: 'Please provide a script for your avatar to speak, upload audio, or add a style/prompt so we can generate a short voiceover.',
        },
        { status: 400 }
      );
    }
    
    // Check if Hedra is configured
    if (!isHedraAvailable()) {
      console.log('[Cinematic API] Hedra not configured');
      return NextResponse.json(
        { 
          error: 'Cinematic video generation not available',
          message: 'HEDRA_API_KEY not configured. Please add it to environment variables.',
        },
        { status: 503 }
      );
    }
    
    // Generate voiceover audio if needed
    let voiceoverUrl: string | null = typeof audioUrl === 'string' ? audioUrl : null;
    const textForTts = (typeof script === 'string' && script.trim().length > 0)
      ? script.trim()
      : (hasPrompt ? prompt!.trim() : null);
    const fallbackScript = 'A short welcome message for your video.';
    const ttsText = textForTts || fallbackScript;

    if (!voiceoverUrl && ttsText) {
      if (ttsText.length > MAX_VOICEOVER_CHARS) {
        return NextResponse.json(
          { error: `Script too long. Max ${MAX_VOICEOVER_CHARS} characters.` },
          { status: 400 }
        );
      }

      console.log('[Cinematic API] Generating TTS audio...');
      const ttsResult = await textToSpeech(ttsText, typeof voiceStyle === 'string' ? voiceStyle : 'natural');

      if (!ttsResult.success || !ttsResult.audioUrl) {
        return NextResponse.json(
          { error: 'Failed to generate voiceover: ' + (ttsResult.error || 'TTS unavailable') },
          { status: 500 }
        );
      }

      voiceoverUrl = ttsResult.audioUrl;
      console.log('[Cinematic API] TTS audio generated');
    }
    
    // Resolve background music
    let musicTrackUrl: string | null = providedMusicUrl || null;
    if (!musicTrackUrl && music && music !== 'none') {
      if (music.includes(':')) {
        const [genre, mood] = music.split(':');
        musicTrackUrl = getMusicUrl(genre, mood);
      } else {
        const PRESET_MAP: Record<string, [string, string]> = {
          'upbeat': ['electronic', 'energetic'],
          'cinematic': ['cinematic', 'epic'],
          'ambient': ['ambient', 'calm'],
          'dramatic': ['cinematic', 'dramatic'],
          'calm': ['ambient', 'calm'],
          'epic': ['orchestral', 'epic'],
          'lofi': ['lofi', 'calm'],
          'happy': ['pop', 'happy'],
          'dark': ['ambient', 'dark'],
          'energetic': ['electronic', 'energetic'],
          'mysterious': ['cinematic', 'mysterious'],
        };
        
        const mapping = PRESET_MAP[music.toLowerCase()];
        if (mapping) {
          musicTrackUrl = getMusicUrl(mapping[0], mapping[1]);
        } else {
          const moods = getAvailableMoods(music);
          if (moods.length > 0) {
            musicTrackUrl = getMusicUrl(music, moods[0]);
          }
        }
      }
      
      if (musicTrackUrl) {
        console.log('[Cinematic API] Resolved music:', music, '->', musicTrackUrl);
      }
    }
    
    // Build enhanced text prompt from style options
    const promptParts: string[] = [];
    
    // Add user's custom prompt first
    if (prompt) {
      promptParts.push(prompt);
    }
    
    // Add expression style prompt
    if (expressionStyle) {
      const exprPrompt = getExpressionPrompt(expressionStyle as HedraExpressionStyle);
      if (exprPrompt) promptParts.push(exprPrompt);
    }
    
    // Add speaking style prompt
    if (speakingStyle) {
      const speakPrompt = getSpeakingStylePrompt(speakingStyle as HedraSpeakingStyle);
      if (speakPrompt) promptParts.push(speakPrompt);
    }
    
    // Tao-style Director notes / cinematic keywords (Advanced mode)
    const notes = typeof directorNotes === 'string' ? directorNotes.trim() : typeof cinematicKeywords === 'string' ? cinematicKeywords.trim() : '';
    if (notes) promptParts.push(notes);
    
    // Default prompt if nothing provided
    const finalPrompt = promptParts.length > 0 
      ? promptParts.join('. ')
      : 'A person speaking naturally with expressive emotions';
    
    // Parse character position
    let boundingBoxTarget: [number, number] | undefined;
    if (characterPosition) {
      if (Array.isArray(characterPosition)) {
        boundingBoxTarget = characterPosition as [number, number];
      } else if (characterPosition === 'left') {
        boundingBoxTarget = [0.3, 0.5];
      } else if (characterPosition === 'right') {
        boundingBoxTarget = [0.7, 0.5];
      } else if (characterPosition === 'center') {
        boundingBoxTarget = [0.5, 0.5];
      }
    }
    
    // character_orientation indicates input type (video or image)
    // We always submit a static image to Hedra here.
    const characterOrientation = 'image' as const;

    // Build Hedra request
    const hedraRequest: HedraVideoRequest = {
      imageUrl,
      audioUrl: voiceoverUrl!,
      textPrompt: finalPrompt,
      aspectRatio: aspectRatio as '16:9' | '9:16' | '1:1',
      resolution: resolution === '1080p' ? '720p' : resolution as '540p' | '720p',
      duration,
      seed,
      enhancePrompt,
      characterOrientation,
      boundingBoxTarget,
      batchSize: Math.min(Math.max(batchSize, 1), 8),
    };
    
    console.log('[Cinematic API] Starting Hedra generation:', {
      hasImage: Boolean(imageUrl),
      hasAudio: Boolean(voiceoverUrl),
      aspectRatio,
      resolution: hedraRequest.resolution,
    });
    
    // Submit to Hedra
    const submitResult = await generateHedraVideo(hedraRequest);
    
    if (!submitResult.success || !submitResult.jobId) {
      return NextResponse.json(
        { error: submitResult.error || 'Failed to start video generation' },
        { status: 500 }
      );
    }
    
    const jobId = submitResult.jobId;
    
    // Save job to database
    if (userId) {
      const db = getSupabase();
      if (db) {
        try {
          await db.from('spacebaddie_projects').insert({
            id: `proj_${jobId}`,
            user_id: userId,
            video_url: '',
            script: script || prompt,
            status: 'processing',
            settings: {
              model: 'hedra',
              aspectRatio,
              resolution: hedraRequest.resolution,
              voiceStyle,
              voiceoverUrl,
              music,
              musicUrl: musicTrackUrl,
              musicVolume,
            },
            created_at: new Date().toISOString(),
          });
        } catch (dbError) {
          console.error('[Cinematic API] Failed to save project:', dbError);
        }
      }
      
      // Also save to render_history for Projects page
      try {
        await db?.from('spacebaddie_render_history').insert({
          user_id: userId,
          tenant: 'spacebaddie',
          job_id: jobId,
          job_type: 'hedra-cinematic',
          script: script || prompt,
          aspect_ratio: aspectRatio,
          is_draft: false,
          status: 'pending',
          progress: 0,
          started_at: new Date().toISOString(),
          metadata: { voiceStyle, music },
        });
      } catch (renderError) {
        console.error('[Cinematic API] Failed to save render history:', renderError);
      }
    }
    
    // Return job info (async mode is default)
    return NextResponse.json({
      success: true,
      mode: 'async',
      model: 'hedra',
      jobId,
      voiceoverUrl,
      musicUrl: musicTrackUrl || undefined,
      musicVolume,
      estimatedTime: 120, // ~2 minutes typical for Hedra
      message: 'Video generation started. Use /api/spacebaddie/cinematic/status to check progress.',
    });
    
  } catch (error) {
    console.error('[Cinematic API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET - Check capabilities or status
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');
  
  if (action === 'capabilities') {
    return NextResponse.json({
      configured: isHedraAvailable(),
      provider: 'Hedra Character-1',
      voiceover: {
        ttsAvailable: Boolean(process.env.OPENAI_API_KEY),
        maxChars: MAX_VOICEOVER_CHARS,
      },
      // Hedra-specific options
      resolutions: ['540p', '720p'],
      aspectRatios: ['16:9', '9:16', '1:1'],
      // Expression and speaking styles
      expressionStyles: [
        { id: 'confident', name: 'Confident', description: 'Authoritative and assertive' },
        { id: 'excited', name: 'Excited', description: 'Enthusiastic and energetic' },
        { id: 'serious', name: 'Serious', description: 'Thoughtful and focused' },
        { id: 'friendly', name: 'Friendly', description: 'Warm and approachable' },
        { id: 'mysterious', name: 'Mysterious', description: 'Intriguing and captivating' },
        { id: 'professional', name: 'Professional', description: 'Business-like and polished' },
        { id: 'energetic', name: 'Energetic', description: 'High energy and dynamic' },
        { id: 'calm', name: 'Calm', description: 'Serene and peaceful' },
        { id: 'storyteller', name: 'Storyteller', description: 'Engaging narrative style' },
      ],
      speakingStyles: [
        { id: 'presenter', name: 'Presenter', description: 'Professional presentation style' },
        { id: 'storyteller', name: 'Storyteller', description: 'Captivating narrative delivery' },
        { id: 'news_anchor', name: 'News Anchor', description: 'Professional broadcast style' },
        { id: 'tutorial', name: 'Tutorial', description: 'Patient teacher style' },
        { id: 'conversational', name: 'Conversational', description: 'Natural friendly chat' },
        { id: 'dramatic', name: 'Dramatic', description: 'Theatrical with emotion' },
        { id: 'sales_pitch', name: 'Sales Pitch', description: 'Persuasive and enthusiastic' },
      ],
      characterPositions: [
        { id: 'center', name: 'Center', description: 'Character centered in frame' },
        { id: 'left', name: 'Left', description: 'Character on left (good for text overlays)' },
        { id: 'right', name: 'Right', description: 'Character on right (good for graphics)' },
      ],
      // Batch generation
      batchSize: { min: 1, max: 8, description: 'Generate multiple variations' },
      // Music options
      music: {
        genres: getAvailableGenres(),
        presets: [
          { id: 'none', name: 'No Music', description: 'Voice only' },
          { id: 'cinematic', name: 'Cinematic', description: 'Epic film score' },
          { id: 'ambient', name: 'Ambient', description: 'Calm atmospheric' },
          { id: 'dramatic', name: 'Dramatic', description: 'Intense orchestral' },
          { id: 'upbeat', name: 'Upbeat', description: 'Energetic electronic' },
          { id: 'lofi', name: 'Lo-Fi', description: 'Chill beats' },
          { id: 'epic', name: 'Epic', description: 'Grand orchestral' },
          { id: 'mysterious', name: 'Mysterious', description: 'Suspenseful atmosphere' },
        ],
        moodsByGenre: {
          cinematic: getAvailableMoods('cinematic'),
          ambient: getAvailableMoods('ambient'),
          electronic: getAvailableMoods('electronic'),
          lofi: getAvailableMoods('lofi'),
          orchestral: getAvailableMoods('orchestral'),
          corporate: getAvailableMoods('corporate'),
          pop: getAvailableMoods('pop'),
          rock: getAvailableMoods('rock'),
        },
      },
      note: 'Cinematic mode uses Hedra for expressive talking avatar videos. Choose expression and speaking styles for the best results.',
    });
  }
  
  // Default: return status
  return NextResponse.json({
    service: 'SpaceBaddie Cinematic Video',
    configured: isHedraAvailable(),
    provider: 'Hedra Character-1',
    voiceover: {
      ttsAvailable: Boolean(process.env.OPENAI_API_KEY),
      maxChars: MAX_VOICEOVER_CHARS,
    },
    music: {
      available: true,
      genres: getAvailableGenres(),
    },
  });
}
