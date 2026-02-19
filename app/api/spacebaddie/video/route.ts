/**
 * SpaceBaddie Video Generation API
 * POST /api/spacebaddie/video
 * 
 * Creates AI-generated talking videos using HeyGen, Hedra, or fal.ai AI Avatar.
 * Supports realistic scene backgrounds via fal.ai's AI Avatar model.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { 
  isHeyGenAvailable,
  createTalkingVideo as createHeyGenVideo,
  getVideoStatus as getHeyGenVideoStatus,
} from '@/lib/heygen/client';
import {
  isHedraAvailable,
  generateHedraVideo,
  getHedraVideoStatus,
} from '@/lib/hedra/client';
import {
  isFalAvatarConfigured,
  submitFalAvatarJob,
  checkFalAvatarStatus,
  getFalAvatarResult,
} from '@/lib/fal-avatar/client';
import { textToSpeech } from '@/lib/infinitetalk/client';
import { canCreateVideo, recordVideoGeneration } from '@/lib/spacebaddie/usage';

const VALID_ASPECTS = ['16:9', '9:16', '1:1'] as const;
const VALID_VOICES = ['natural', 'energetic', 'professional', 'friendly', 'calm'] as const;

// Pricing (cents per video)
const VIDEO_COST_CENTS = 50; // $0.50 per video

// In-memory job store (use database in production)
const jobStore = new Map<string, JobRecord>();

interface JobRecord {
  id: string;
  visitorId?: string;
  userId?: string;
  heygenVideoId?: string;
  hedraJobId?: string;
  falRequestId?: string;
  provider?: 'heygen' | 'hedra' | 'fal-avatar';
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'demo';
  progress: number;
  createdAt: string;
  updatedAt?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  error?: string;
  config: {
    imageUrl: string;
    script: string;
    voiceStyle: string;
    aspectRatio: string;
  };
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

// Maps our internal job ID (sb_video_...) to a UUID for DB storage
const jobIdToDbId = new Map<string, string>();

async function upsertJobRecord(job: JobRecord) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.warn('[SpaceBaddie Video] upsertJobRecord: No Supabase admin client available');
    return;
  }
  try {
    // The DB table uses UUID for `id`, but our internal job IDs are `sb_video_...`.
    // We generate a stable UUID per job and store the mapping.
    let dbId = jobIdToDbId.get(job.id);
    if (!dbId) {
      dbId = crypto.randomUUID();
      jobIdToDbId.set(job.id, dbId);
    }

    // Actual table columns: id (UUID, NOT NULL), tenant_id (NOT NULL), user_id,
    // status, progress, video_url, thumbnail_url, error, created_at, updated_at,
    // scene_type, heygen_video_id, visitor_id, script, ltx2_job_id, ...
    const { error } = await supabase.from('spacebaddie_video_jobs').upsert({
      id: dbId,
      tenant_id: 'spacebaddie',
      visitor_id: job.visitorId || null,
      user_id: job.userId || null,
      heygen_video_id: job.heygenVideoId || job.hedraJobId || null,
      status: job.status,
      progress: job.progress,
      created_at: job.createdAt,
      updated_at: job.updatedAt || job.createdAt,
      error: job.error || null,
      video_url: job.videoUrl || null,
      script: job.config?.script || null,
    });
    if (error) {
      console.error('[SpaceBaddie Video] upsertJobRecord FAILED:', error.message, error.details, error.hint);
      console.error('[SpaceBaddie Video] Job data:', JSON.stringify({ internalId: job.id, dbId, provider: job.provider, status: job.status }));
    } else {
      console.log('[SpaceBaddie Video] upsertJobRecord success for job:', job.id, '-> DB:', dbId);
    }
  } catch (err) {
    console.error('[SpaceBaddie Video] upsertJobRecord exception:', err);
  }
}

async function getLatestJobByVisitor(visitorId: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('spacebaddie_video_jobs')
    .select('*')
    .eq('visitor_id', visitorId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return data;
}

function generateJobId(): string {
  return `sb_video_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export interface SpaceBaddieVideoRequest {
  imageUrl?: string;         // Photo/selfie to animate (optional if avatarId provided)
  avatarId?: string;         // HeyGen public avatar ID (full-body animation)
  script?: string;           // What the avatar should say
  voiceStyle?: typeof VALID_VOICES[number];
  aspectRatio?: typeof VALID_ASPECTS[number];
  duration?: number;         // Target duration in seconds
  music?: string;            // Background music preset
  visitorId?: string;
  userId?: string;           // Authenticated user ID for usage tracking
  voiceId?: string;          // Specific voice ID to use
  faceId?: string;           // Face profile ID
  provider?: 'heygen' | 'hedra' | 'fal-avatar';
  // Background & Scene settings
  backgroundScene?: string;     // Background scene ID from the scene picker
  backgroundPrompt?: string;    // Custom background description
  sceneInstruction?: string;    // Scene direction/framing instruction
  voiceGender?: 'male' | 'female'; // Explicit gender for fallback voice mapping
  // Cinematic scene mode - uses fal.ai AI Avatar for real-life scene placement
  cinematicScene?: boolean;     // Enable cinematic scene mode (auto-selects fal-avatar)
}

/**
 * POST - Create a new video generation job
 */
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');
  
  // Cancel action (HeyGen doesn't support cancellation, just mark as failed locally)
  if (action === 'cancel') {
    const jobId = searchParams.get('jobId');
    if (jobId && jobStore.has(jobId)) {
      const job = jobStore.get(jobId)!;
      job.status = 'failed';
      job.error = 'Job cancelled by user.';
      job.updatedAt = new Date().toISOString();
      jobStore.set(jobId, job);
      await upsertJobRecord(job);
    }

    return NextResponse.json({
      success: true,
      jobId,
      status: 'cancelled'
    });
  }

  console.log('[SpaceBaddie Video API] POST request received');
  
  let body: SpaceBaddieVideoRequest;
  try {
    body = await req.json();
    console.log('[SpaceBaddie Video API] Request body:', JSON.stringify(body));
    
    // Validate: must have either imageUrl OR avatarId
    const hasImage = body.imageUrl && typeof body.imageUrl === 'string';
    const hasAvatarId = body.avatarId && typeof body.avatarId === 'string';
    
    if (!hasImage && !hasAvatarId) {
      return NextResponse.json(
        { error: 'Either imageUrl or avatarId is required' },
        { status: 400 }
      );
    }
    
    // Validate and set defaults
    const aspectRatio = body.aspectRatio && VALID_ASPECTS.includes(body.aspectRatio)
      ? body.aspectRatio
      : '9:16';
      
    const voiceStyle = body.voiceStyle && VALID_VOICES.includes(body.voiceStyle)
      ? body.voiceStyle
      : 'natural';
      
    const duration = Math.min(Math.max(body.duration || 15, 5), 60);
    
    // Generate script if not provided
    const script = body.script || generateDefaultScript(voiceStyle, duration);
    
    // Check usage limits if user is authenticated
    if (body.userId) {
      const usageCheck = await canCreateVideo(body.userId);
      if (!usageCheck.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: usageCheck.reason,
            usage: usageCheck.usage,
            upgradeRequired: true,
          },
          { status: 403 }
        );
      }
    }
    
    // Determine provider and availability
    // Auto-select fal-avatar when cinematicScene is enabled or explicitly requested
    const forceDemo = process.env.SPACEBADDIE_FORCE_DEMO === 'true';
    let provider: 'heygen' | 'hedra' | 'fal-avatar' = body.provider === 'hedra' ? 'hedra' : body.provider === 'fal-avatar' ? 'fal-avatar' : 'heygen';
    
    // Auto-upgrade to fal-avatar for cinematic scene mode (real-life backgrounds)
    if (body.cinematicScene && isFalAvatarConfigured()) {
      provider = 'fal-avatar';
    }
    
    const available = provider === 'hedra' 
      ? isHedraAvailable() 
      : provider === 'fal-avatar' 
        ? isFalAvatarConfigured() 
        : isHeyGenAvailable();
    
    console.log(`[SpaceBaddie Video] Provider: ${provider}, Available: ${available}, ForceDemo: ${forceDemo}, CinematicScene: ${body.cinematicScene}`);
    
    if (!available || forceDemo) {
      // If fal-avatar unavailable, fall back to HeyGen
      if (provider === 'fal-avatar' && isHeyGenAvailable()) {
        console.log('[SpaceBaddie Video] fal-avatar unavailable, falling back to HeyGen');
        provider = 'heygen';
      } else {
        return NextResponse.json(
          {
            success: false,
            mode: 'unavailable',
            error: `Video generation service (${provider}) unavailable. API Key not configured.`
          },
          { status: 503 }
        );
      }
    }
    
    let result: { success: boolean; videoId?: string; jobId?: string; error?: string } = { success: false };
    
    if (provider === 'fal-avatar') {
      // ===== FAL.AI AI AVATAR - Real-life cinematic scenes =====
      // Uses image + audio + scene prompt to place avatar IN a realistic scene
      console.log('[SpaceBaddie Video] Using fal.ai AI Avatar for cinematic scene generation');
      
      // Generate TTS audio first (fal-avatar needs audio URL)
      const ttsResult = await textToSpeech(script, voiceStyle || 'natural');
      if (!ttsResult.success || !ttsResult.audioUrl) {
        return NextResponse.json(
          { error: 'Failed to generate audio: ' + (ttsResult.error || 'TTS failed') },
          { status: 500 }
        );
      }
      
      // Build the scene prompt for fal.ai AI Avatar
      const scenePrompt = buildScenePrompt(body.backgroundScene, body.backgroundPrompt, body.sceneInstruction);
      
      console.log('[SpaceBaddie Video] Cinematic scene prompt:', scenePrompt.substring(0, 150));
      
      const falResult = await submitFalAvatarJob({
        imageUrl: body.imageUrl || '',
        audioUrl: ttsResult.audioUrl,
        prompt: scenePrompt,
        resolution: '720p',
        numFrames: Math.min(Math.max((body.duration || 5) * 24, 81), 240), // duration * 24fps
      });
      
      if (falResult.success && falResult.requestId) {
        result = { success: true, videoId: falResult.requestId };
      } else {
        result = { success: false, error: falResult.error || 'fal.ai AI Avatar submission failed' };
      }
    } else if (provider === 'hedra') {
      // Submit to Hedra - needs TTS first since Hedra API requires audio URL
      console.log('[SpaceBaddie Video] Generating TTS audio for Hedra...');
      
      // Generate audio from script using our TTS service
      const ttsResult = await textToSpeech(script, voiceStyle || 'natural');
      if (!ttsResult.success || !ttsResult.audioUrl) {
        return NextResponse.json(
          { error: 'Failed to generate audio for Hedra: ' + (ttsResult.error || 'TTS failed') },
          { status: 500 }
        );
      }
      
      console.log('[SpaceBaddie Video] TTS complete, submitting to Hedra...', {
        audioUrl: ttsResult.audioUrl?.substring(0, 50),
        imageUrl: body.imageUrl?.substring(0, 50),
      });
      
      const hedraResult = await generateHedraVideo({
        imageUrl: body.imageUrl || '',
        audioUrl: ttsResult.audioUrl,
        aspectRatio,
        textPrompt: 'A person speaking naturally with expressive emotions',
      });
      result = { ...hedraResult, videoId: hedraResult.jobId }; // Map jobId to videoId generic field
    } else {
      // Submit to HeyGen (handles both TTS and video generation)
      // If no specific voiceId provided, map from style + gender
      let targetVoiceId = body.voiceId;
      if (!targetVoiceId && voiceStyle) {
        // Use explicit gender if provided, otherwise default to female
        const gender = body.voiceGender || 'female';
        targetVoiceId = `voice_${voiceStyle}_${gender}_1`;
      }

      // Build background config for HeyGen
      let heygenBackground: { type: 'color' | 'image' | 'video'; value: string } | undefined;
      if (body.backgroundScene || body.backgroundPrompt) {
        const bg = resolveBackground(body.backgroundScene, body.backgroundPrompt);
        if (bg) {
          heygenBackground = bg;
        }
      }

      console.log('[SpaceBaddie Video] Submitting to HeyGen...', { 
        voiceId: targetVoiceId, 
        originalVoiceId: body.voiceId, 
        voiceStyle,
        voiceGender: body.voiceGender,
        avatarId: body.avatarId,
        hasImage: Boolean(body.imageUrl),
        background: heygenBackground ? heygenBackground.type : 'none',
        backgroundScene: body.backgroundScene,
      });
      
      const heygenResult = await createHeyGenVideo({
        imageUrl: body.imageUrl || '', // Empty string if using avatarId instead
        script,
        aspectRatio,
        voiceId: targetVoiceId, // Pass user-selected voice or mapped style
        avatarId: body.avatarId, // HeyGen public/instant avatar ID (full-body)
        background: heygenBackground,
      });
      result = heygenResult;
    }
    
    if (!result.success || !result.videoId) {
      const errorMsg = result.error || 'Failed to start video generation';
      console.log(`[SpaceBaddie Video] ${provider} submit failed:`, errorMsg);
      return NextResponse.json(
        { 
          error: errorMsg,
          debug: {
            provider,
            imageProvided: Boolean(body.imageUrl),
          }
        },
        { status: 500 }
      );
    }
    
    // Create job record
    const jobId = generateJobId();
    jobStore.set(jobId, {
      id: jobId,
      visitorId: body.visitorId,
      userId: body.userId,
      heygenVideoId: provider === 'heygen' ? result.videoId : undefined,
      hedraJobId: provider === 'hedra' ? result.videoId : undefined,
      falRequestId: provider === 'fal-avatar' ? result.videoId : undefined,
      provider,
      status: 'processing',
      progress: 5,
      createdAt: new Date().toISOString(),
      config: { 
        imageUrl: body.imageUrl || body.avatarId || '', 
        script, 
        voiceStyle, 
        aspectRatio 
      },
    });
    await upsertJobRecord(jobStore.get(jobId)!);
    
    // Save to spacebaddie_render_history for Projects page
    if (body.userId) {
      const supabase = getSupabaseAdmin();
      if (supabase) {
        try {
          const { error: rhInsertErr } = await supabase.from('spacebaddie_render_history').insert({
            user_id: body.userId,
            tenant: 'spacebaddie',
            job_id: jobId,
            job_type: provider === 'hedra' ? 'hedra' : 'heygen',
            script: script,
            aspect_ratio: aspectRatio,
            is_draft: false,
            status: 'pending',
            progress: 0,
            started_at: new Date().toISOString(),
            metadata: { provider, voiceStyle },
          });
          if (rhInsertErr) {
            console.error('[SpaceBaddie Video] Render history insert error:', rhInsertErr);
          } else {
            console.log(`[SpaceBaddie Video] Saved job ${jobId} to render history for user ${body.userId}`);
          }
        } catch (dbError) {
          console.error('[SpaceBaddie Video] Failed to save to render history:', dbError);
          // Don't fail the request, just log the error
        }
      }
    }
    
    // Record for usage tracking if user is authenticated
    if (body.userId) {
      await recordVideoGeneration({
        userId: body.userId,
        jobId,
        visitorId: body.visitorId,
        script,
      });
    }
    
    console.log('[SpaceBaddie Video] Job created:', jobId, `-> ${provider}:`, result.videoId);
    
    return NextResponse.json({
      success: true,
      jobId,
      heygenVideoId: result.videoId, // Legacy field support
      providerJobId: result.videoId,
      status: 'processing',
      mode: 'production',
      provider,
      estimatedDuration: duration,
      estimatedCost: {
        cents: VIDEO_COST_CENTS,
        formatted: `$${(VIDEO_COST_CENTS / 100).toFixed(2)}`,
      },
      config: {
        aspectRatio,
        voiceStyle,
        duration,
        scriptLength: script.length,
      },
      pollUrl: `/api/spacebaddie/video?jobId=${jobId}&userId=${body.userId || ''}`,
    });
    
  } catch (error) {
    console.error('[SpaceBaddie Video API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET - Check job status or worker status
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const jobId = searchParams.get('jobId');
    
    // Job status check
    if (jobId) {
      let job = jobStore.get(jobId);
      if (!job) {
        const supabase = getSupabaseAdmin();
        if (supabase) {
          // First try by direct ID match (works if jobId is a UUID)
          // If not found, try by visitor_id (we don't store sb_video_ refs in DB id)
          // DB `id` is UUID but our internal IDs are `sb_video_...` format
          let dbJob: any = null;
          
          // Check if jobId looks like a UUID
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(jobId);
          if (isUuid) {
            const { data } = await supabase
              .from('spacebaddie_video_jobs')
              .select('*')
              .eq('id', jobId)
              .maybeSingle();
            dbJob = data;
          }
          
          // Also check if we have a mapping from internal ID to DB UUID
          if (!dbJob) {
            const mappedDbId = jobIdToDbId.get(jobId);
            if (mappedDbId) {
              const { data } = await supabase
                .from('spacebaddie_video_jobs')
                .select('*')
                .eq('id', mappedDbId)
                .maybeSingle();
              dbJob = data;
            }
          }
          if (dbJob) {
            job = {
              id: dbJob.id,
              visitorId: dbJob.visitor_id || undefined,
              userId: dbJob.user_id || undefined,
              heygenVideoId: dbJob.heygen_video_id || undefined,
              hedraJobId: undefined,
              provider: dbJob.heygen_video_id ? 'heygen' : undefined,
              status: dbJob.status || 'processing',
              progress: typeof dbJob.progress === 'number' ? dbJob.progress : 0,
              createdAt: dbJob.created_at || new Date().toISOString(),
              updatedAt: dbJob.updated_at || dbJob.created_at,
              videoUrl: dbJob.video_url || undefined,
              error: dbJob.error || undefined,
              config: {
                imageUrl: '',
                script: '',
                voiceStyle: 'natural',
                aspectRatio: '9:16',
              },
            };
            jobStore.set(jobId, job);
          }
        }
      }
      const heygenVideoId = searchParams.get('heygenVideoId') || job?.heygenVideoId;
      const hedraJobId = searchParams.get('hedraJobId') || job?.hedraJobId;
      const falRequestId = searchParams.get('falRequestId') || job?.falRequestId;
      const provider = searchParams.get('provider') || job?.provider || (falRequestId ? 'fal-avatar' : hedraJobId ? 'hedra' : 'heygen');
      const userId = searchParams.get('userId') || job?.userId;

      // ===== Fal.ai AI Avatar Status Check =====
      if (provider === 'fal-avatar' && falRequestId) {
        try {
          const falStatus = await checkFalAvatarStatus(falRequestId);
          console.log('[SpaceBaddie Video API] fal-avatar status:', JSON.stringify(falStatus));
          
          let status: JobRecord['status'] = 'processing';
          let progress = falStatus.progress || 0;
          
          if (falStatus.status === 'completed') {
            status = 'completed';
            progress = 100;
            
            // Get the final video URL
            const falResult = await getFalAvatarResult(falRequestId);
            const finalVideoUrl = falResult.videoUrl;
            
            // Save to DB
            const supabase = getSupabaseAdmin();
            if (supabase && finalVideoUrl) {
              const now = new Date().toISOString();
              const mappedDbId = jobIdToDbId.get(jobId);
              if (mappedDbId) {
                await supabase.from('spacebaddie_video_jobs').update({
                  status: 'completed',
                  progress: 100,
                  video_url: finalVideoUrl,
                  updated_at: now,
                }).eq('id', mappedDbId);
              }
              
              // Update render_history
              try {
                await supabase.from('spacebaddie_render_history').update({
                  status: 'completed',
                  progress: 100,
                  output_url: finalVideoUrl,
                  completed_at: now,
                  updated_at: now,
                }).eq('job_id', jobId);
              } catch (e) {
                console.error('[SpaceBaddie Video] render_history update error:', e);
              }
            }
            
            if (job) {
              job.status = status;
              job.progress = progress;
              job.videoUrl = finalVideoUrl;
              job.updatedAt = new Date().toISOString();
            }
            
            return NextResponse.json({
              jobId,
              status,
              progress,
              videoUrl: finalVideoUrl,
              provider: 'fal-avatar',
            });
          } else if (falStatus.status === 'failed') {
            status = 'failed';
            if (job) {
              job.status = status;
              job.error = 'Cinematic scene generation failed';
              job.updatedAt = new Date().toISOString();
            }
            return NextResponse.json({
              jobId,
              status,
              progress: 0,
              error: 'Cinematic scene generation failed',
              provider: 'fal-avatar',
            });
          }
          
          // Still processing
          if (job) {
            job.status = status;
            job.progress = progress;
            job.updatedAt = new Date().toISOString();
          }
          
          return NextResponse.json({
            jobId,
            status,
            progress,
            provider: 'fal-avatar',
          });
        } catch (error) {
          console.error('fal-avatar status check error:', error);
          return NextResponse.json({ jobId, status: 'failed', error: 'Status check failed', provider: 'fal-avatar' });
        }
      }

      // Hedra Status Check
      if (provider === 'hedra' && hedraJobId) {
        try {
          const hedraStatus = await getHedraVideoStatus(hedraJobId);
          console.log('[SpaceBaddie Video API] Hedra status:', JSON.stringify(hedraStatus));
          
          let status: JobRecord['status'] = 'processing';
          let progress = hedraStatus.progress || 0;
          
          // Map Hedra status to our status
          if (hedraStatus.status === 'complete') {
            status = 'completed';
            progress = 100;
            // Get the video URL (prefer downloadUrl for direct access)
            const finalVideoUrl = hedraStatus.downloadUrl || hedraStatus.videoUrl;
            
            // Save to DB
            const supabase = getSupabaseAdmin();
            if (supabase && finalVideoUrl) {
              const now = new Date().toISOString();
              const { data: existing } = await supabase
                .from('spacebaddie_video_jobs')
                .select('id')
                .eq('id', jobId)
                .maybeSingle();
                
              if (existing) {
                const { error: updateErr } = await supabase.from('spacebaddie_video_jobs').update({
                  heygen_video_id: hedraJobId,
                  user_id: userId || null,
                  status: 'completed',
                  progress: 100,
                  video_url: finalVideoUrl,
                  updated_at: now,
                }).eq('id', jobId);
                if (updateErr) console.error('[SpaceBaddie Video] Failed to update video job:', updateErr);
              } else {
                const { error: insertErr } = await supabase.from('spacebaddie_video_jobs').insert({
                  id: jobId,
                  heygen_video_id: hedraJobId,
                  user_id: userId || null,
                  status: 'completed',
                  progress: 100,
                  video_url: finalVideoUrl,
                  created_at: now,
                  updated_at: now,
                });
                if (insertErr) console.error('[SpaceBaddie Video] Failed to insert video job:', insertErr);
              }
              
              // Also update render_history for Projects page
              try {
                const { error: renderErr } = await supabase.from('spacebaddie_render_history')
                  .update({
                    status: 'completed',
                    progress: 100,
                    output_url: finalVideoUrl,
                    completed_at: now,
                    updated_at: now,
                  })
                  .eq('job_id', jobId);
                if (renderErr) {
                  console.error('[SpaceBaddie Video] Render history update error:', renderErr);
                } else {
                  console.log(`[SpaceBaddie Video] Updated render history for job ${jobId}`);
                }
              } catch (renderHistoryError) {
                console.error('[SpaceBaddie Video] Failed to update render history:', renderHistoryError);
              }
            }
            
            if (job) {
              job.status = status;
              job.progress = progress;
              job.videoUrl = finalVideoUrl;
              job.updatedAt = new Date().toISOString();
            }
            
            return NextResponse.json({
              jobId,
              status,
              progress,
              videoUrl: finalVideoUrl,
            });
          } else if (hedraStatus.status === 'error') {
            status = 'failed';
            if (job) {
              job.status = status;
              job.error = hedraStatus.error;
              job.updatedAt = new Date().toISOString();
            }
            return NextResponse.json({
              jobId,
              status,
              progress: 0,
              error: hedraStatus.error || 'Generation failed',
            });
          }
          
          // Still processing (queued, processing, finalizing)
          if (job) {
            job.status = status;
            job.progress = progress;
            job.updatedAt = new Date().toISOString();
          }
          
          return NextResponse.json({
            jobId,
            status,
            progress,
            hedraStatus: hedraStatus.status, // Include actual Hedra status for debugging
          });
        } catch (error) {
          console.error('Hedra status check error:', error);
          return NextResponse.json({ jobId, status: 'failed', error: 'Status check failed' });
        }
      }

      // HeyGen Status Check (Existing logic)
      // If job not in memory but we have HeyGen video ID, query directly
      if ((!job || provider === 'heygen') && heygenVideoId) {
        try {
          const heygenStatus = await getHeyGenVideoStatus(heygenVideoId);
          
          console.log('[SpaceBaddie Video API] HeyGen status response:', JSON.stringify(heygenStatus));
          
          let status: JobRecord['status'] = 'processing';
          let progress = 0;
          
          if (heygenStatus.status === 'completed') {
            status = 'completed';
            progress = 100;
            // Save completed video to database even without job in memory
            const supabase = getSupabaseAdmin();
            if (supabase && heygenStatus.videoUrl) {
              console.log('[SpaceBaddie Video API] Saving completed video to database from fallback path, userId:', userId);
              const now = new Date().toISOString();
              // First try to update existing record
              const { data: existing } = await supabase
                .from('spacebaddie_video_jobs')
                .select('id')
                .eq('id', jobId)
                .maybeSingle();
              
              if (existing) {
                // Update existing record
                const { error: hgUpdateErr } = await supabase.from('spacebaddie_video_jobs').update({
                  heygen_video_id: heygenVideoId,
                  user_id: userId || null,
                  status: 'completed',
                  progress: 100,
                  video_url: heygenStatus.videoUrl,
                  updated_at: now,
                }).eq('id', jobId);
                if (hgUpdateErr) console.error('[SpaceBaddie Video API] HeyGen update error:', hgUpdateErr);
              } else {
                // Insert new record with created_at
                const { error: hgInsertErr } = await supabase.from('spacebaddie_video_jobs').insert({
                  id: jobId,
                  heygen_video_id: heygenVideoId,
                  user_id: userId || null,
                  status: 'completed',
                  progress: 100,
                  video_url: heygenStatus.videoUrl,
                  created_at: now,
                  updated_at: now,
                });
                if (hgInsertErr) console.error('[SpaceBaddie Video API] HeyGen insert error:', hgInsertErr);
              }
              console.log('[SpaceBaddie Video API] Video saved to DB successfully');
              
              // Also update render_history for Projects page
              try {
                const { error: hgRenderErr } = await supabase.from('spacebaddie_render_history')
                  .update({
                    status: 'completed',
                    progress: 100,
                    output_url: heygenStatus.videoUrl,
                    completed_at: now,
                    updated_at: now,
                  })
                  .eq('job_id', jobId);
                if (hgRenderErr) {
                  console.error('[SpaceBaddie Video API] HeyGen render history error:', hgRenderErr);
                } else {
                  console.log(`[SpaceBaddie Video API] Updated render history for job ${jobId}`);
                }
              } catch (renderHistoryError) {
                console.error('[SpaceBaddie Video API] Failed to update render history:', renderHistoryError);
              }
            }
          } else if (heygenStatus.status === 'failed') {
            status = 'failed';
          } else if (heygenStatus.status === 'processing') {
            status = 'processing';
            progress = 50;
          } else if (heygenStatus.status === 'pending' || heygenStatus.status === 'waiting') {
            status = 'queued';
            progress = 10;
          }
          
          return NextResponse.json({
            success: true,
            jobId,
            heygenVideoId,
            status,
            progress,
            videoUrl: heygenStatus.videoUrl,
            error: heygenStatus.error,
          });
        } catch (e) {
          console.error('[SpaceBaddie Video API] HeyGen status error:', e);
        }
        
        // If query fails, return unknown status
        return NextResponse.json({
          success: true,
          jobId,
          status: 'processing',
          progress: 25,
          message: 'Checking job status...',
        });
      }
      
      if (!job) {
        return NextResponse.json(
          { error: 'Job not found. Include heygenVideoId parameter for status checks.' },
          { status: 404 }
        );
      }
      
      // If job is demo/completed/failed, return cached status
      if (job.status === 'completed' || job.status === 'failed' || job.status === 'demo') {
        return NextResponse.json({
          success: true,
          jobId: job.id,
          status: job.status,
          progress: job.progress || (job.status === 'completed' ? 100 : 0),
          createdAt: job.createdAt,
          updatedAt: job.updatedAt,
          videoUrl: job.videoUrl,
          thumbnailUrl: job.thumbnailUrl,
          error: job.error,
        });
      }
      
      // If we have a HeyGen video ID, poll for status
      if (job.heygenVideoId) {
        try {
          const heygenStatus = await getHeyGenVideoStatus(job.heygenVideoId);
          
          let newStatus: JobRecord['status'] = job.status;
          let newProgress = job.progress || 0;
          let videoUrl = job.videoUrl;
          let errorMsg = job.error;
          
          if (heygenStatus.status === 'completed' && heygenStatus.videoUrl) {
            newStatus = 'completed';
            newProgress = 100;
            videoUrl = heygenStatus.videoUrl;
            console.log('[SpaceBaddie Video API] HeyGen completed, videoUrl:', videoUrl);
          } else if (heygenStatus.status === 'failed') {
            newStatus = 'failed';
            errorMsg = heygenStatus.error || 'Video generation failed';
          } else if (heygenStatus.status === 'processing') {
            newStatus = 'processing';
            newProgress = Math.min((job.progress || 0) + 10, 90);
          } else if (heygenStatus.status === 'pending' || heygenStatus.status === 'waiting') {
            newStatus = 'queued';
            newProgress = 10;
          }
          
          // Update local job record
          job.status = newStatus;
          job.progress = newProgress;
          job.videoUrl = videoUrl;
          job.error = errorMsg;
          job.updatedAt = new Date().toISOString();
          jobStore.set(jobId, job);
          await upsertJobRecord(job);
          
          return NextResponse.json({
            success: true,
            jobId: job.id,
            heygenVideoId: job.heygenVideoId,
            status: newStatus,
            progress: newProgress,
            createdAt: job.createdAt,
            updatedAt: job.updatedAt,
            videoUrl,
            error: errorMsg,
          });
        } catch (pollError) {
          console.error('[SpaceBaddie Video API] Poll error:', pollError);
          // Return cached status with poll warning instead of swallowing error
          return NextResponse.json({
            success: true,
            jobId: job.id,
            heygenVideoId: job.heygenVideoId,
            status: job.status || 'processing',
            progress: job.progress || 25,
            createdAt: job.createdAt,
            updatedAt: job.updatedAt,
            videoUrl: job.videoUrl,
            pollWarning: 'Status check temporarily unavailable, using cached status',
          });
        }
      }
      
      // Return cached status
      return NextResponse.json({
        success: true,
        jobId: job.id,
        status: job.status || 'processing',
        progress: job.progress || 0,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        videoUrl: job.videoUrl,
        thumbnailUrl: job.thumbnailUrl,
        error: job.error,
      });
    }

    if (action === 'resume') {
      const visitorId = searchParams.get('visitorId');
      if (!visitorId) {
        return NextResponse.json(
          { success: false, error: 'visitorId parameter required' },
          { status: 400 }
        );
      }

      const record = await getLatestJobByVisitor(visitorId);
      if (!record) {
        return NextResponse.json({ success: true, job: null });
      }

      return NextResponse.json({
        success: true,
        job: {
          jobId: record.id,
          heygenVideoId: record.heygen_video_id,
          status: record.status,
          progress: record.progress,
          videoUrl: record.video_url,
          error: record.error
        }
      });
    }
    
    // Worker status
    if (action === 'status') {
      const available = isHeyGenAvailable();
      const forceDemo = process.env.SPACEBADDIE_FORCE_DEMO === 'true';
      
      return NextResponse.json({
        success: true,
        worker: {
          available: available && !forceDemo,
          provider: 'HeyGen',
          mode: forceDemo ? 'demo' : (available ? 'production' : 'unavailable'),
        },
        pricing: {
          perVideo: {
            cents: VIDEO_COST_CENTS,
            formatted: `$${(VIDEO_COST_CENTS / 100).toFixed(2)}`,
          },
        },
        options: {
          aspectRatios: VALID_ASPECTS,
          voiceStyles: VALID_VOICES,
          maxDuration: 60,
          maxScriptLength: 3000,
        },
      });
    }
    
    // Capabilities endpoint (for UI to check available features)
    if (action === 'capabilities') {
      const heygenAvailable = isHeyGenAvailable();
      const hedraAvailable = isHedraAvailable();
      const forceDemo = process.env.SPACEBADDIE_FORCE_DEMO === 'true';
      
      return NextResponse.json({
        success: true,
        configured: heygenAvailable || hedraAvailable,
        heygenAvailable: heygenAvailable && !forceDemo,
        hedraAvailable: hedraAvailable && !forceDemo,
        providers: {
          heygen: {
            available: heygenAvailable && !forceDemo,
            name: 'HeyGen',
            description: 'Fast, reliable lip-sync with full-body avatars',
            features: ['talking_video', 'public_avatars', 'instant_avatars', 'lip_sync'],
          },
          hedra: {
            available: hedraAvailable && !forceDemo,
            name: 'Hedra Character-1',
            description: 'Expressive emotions & natural movements',
            features: ['talking_video', 'emotions', 'natural_movement', 'lip_sync'],
            emotions: ['neutral', 'happy', 'sad', 'angry', 'surprised', 'fear'],
          },
        },
        options: {
          aspectRatios: VALID_ASPECTS,
          voiceStyles: VALID_VOICES,
          maxDuration: 60,
          maxScriptLength: 3000,
        },
      });
    }
    
    // Default: return API info
    return NextResponse.json({
      success: true,
      api: 'SpaceBaddie Video Generation',
      version: '3.0.0',
      provider: 'HeyGen',
      endpoints: {
        'POST /api/spacebaddie/video': 'Create a new talking video',
        'GET /api/spacebaddie/video?jobId=xxx': 'Check job status',
        'GET /api/spacebaddie/video?action=status': 'Check service status',
      },
    });
    
  } catch (error) {
    console.error('[SpaceBaddie Video API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Build a rich scene description prompt for fal.ai AI Avatar.
 * This prompt tells the AI model what real-life scene to place the person in.
 * The more descriptive, the better the cinematic result.
 */
function buildScenePrompt(
  sceneId?: string,
  customPrompt?: string,
  sceneInstruction?: string,
): string {
  // Rich scene descriptions for each predefined background
  // These are much more detailed than the HeyGen color fallbacks
  const SCENE_DESCRIPTIONS: Record<string, string> = {
    'studio':       'Person in a professional video studio with soft diffused lighting, neutral gray backdrop, professional camera equipment visible in background, cinematic shallow depth of field',
    'office':       'Person in a modern minimalist office with floor-to-ceiling windows, natural daylight streaming in, indoor plants, clean white desk, cityscape visible through windows',
    'home-office':  'Person in a cozy warm home office with wooden bookshelf full of books, warm amber lighting, small plant on desk, laptop and coffee mug, comfortable atmosphere',
    'podcast':      'Person in a professional podcast studio with acoustic foam panels on walls, high-end microphone on boom arm, warm ambient LED lighting, headphones on desk, moody atmosphere',
    'conference':   'Person in a modern glass-walled conference room with a long table, city skyline visible through windows, professional office environment, bright clean lighting',
    'neon':         'Person in a dark room illuminated by vibrant neon pink and blue lights, cyberpunk aesthetic, moody atmospheric lighting, futuristic urban feel, dramatic shadows',
    'gradient':     'Person against a smooth flowing abstract gradient background transitioning from deep purple to magenta to electric blue, modern and artistic, soft even lighting on face',
    'particles':    'Person in a dark environment surrounded by floating glowing particles and magical sparkles, beautiful bokeh light effects, ethereal and mystical atmosphere',
    'stage':        'Person on a professional performance stage with dramatic spotlights from above, concert-style lighting with beams cutting through atmospheric haze, energetic feel',
    'beach':        'Person on a beautiful tropical beach during golden hour sunset, palm trees swaying gently, calm turquoise ocean waves in background, warm golden light on face',
    'forest':       'Person standing in a serene green forest with sunlight filtering through tall trees, lush foliage, peaceful natural atmosphere, dappled light creating beautiful patterns',
    'mountain':     'Person with breathtaking mountain landscape behind them, snow-capped peaks against clear blue sky, epic panoramic vista, crisp natural lighting',
    'city-night':   'Person on a rooftop with city skyline at night behind them, thousands of twinkling building lights, modern skyscrapers, urban nighttime atmosphere',
    'minimal':      'Person against a clean pure white background with subtle soft shadows, minimalist professional look, even studio lighting, commercial quality',
    'dark':         'Person in dramatic low-key lighting against a dark background, cinematic moody shadows, single key light creating depth, film noir inspired',
    'blur':         'Person with a beautifully blurred background full of soft bokeh light orbs, dreamy and ethereal shallow depth of field effect, warm and inviting',
  };

  const parts: string[] = [];

  // Add scene description
  if (sceneId && sceneId !== 'custom' && SCENE_DESCRIPTIONS[sceneId]) {
    parts.push(SCENE_DESCRIPTIONS[sceneId]);
  }

  // Add custom prompt if provided
  if (customPrompt && customPrompt.trim()) {
    parts.push(customPrompt.trim());
  }

  // Add scene instruction (framing, direction)
  if (sceneInstruction && sceneInstruction.trim()) {
    parts.push(sceneInstruction.trim());
  }

  // Always include quality enhancers
  parts.push('high quality, realistic, natural facial expressions, good lighting on face');

  // If no scene was specified, provide a good default
  if (!sceneId && !customPrompt) {
    return 'Person speaking naturally in a professional studio setting with soft lighting, clean background, high quality realistic video, natural facial expressions';
  }

  return parts.join(', ');
}

/**
 * Map a background scene ID or custom prompt to a HeyGen background config.
 * HeyGen supports: { type: "color", value: "#hexcolor" }
 *                  { type: "image", value: "https://image-url" }
 *
 * For predefined scenes, we use solid colors / gradients that match the scene mood.
 * For custom prompts that look like URLs, we treat them as image backgrounds.
 */
function resolveBackground(
  sceneId?: string,
  customPrompt?: string
): { type: 'color' | 'image'; value: string } | undefined {
  // Scene ID to background color mapping (themed to match the scene name)
  const SCENE_COLORS: Record<string, string> = {
    'studio':       '#2c2c2c',  // Dark studio gray
    'office':       '#f5f5f0',  // Light office beige
    'home-office':  '#e8dcc8',  // Warm tan
    'podcast':      '#1a1a2e',  // Dark blue-black
    'conference':   '#d9e2ec',  // Light blue-gray
    'neon':         '#0d0221',  // Deep neon purple-black
    'gradient':     '#2d1b69',  // Purple gradient base
    'particles':    '#0a0a14',  // Near-black
    'stage':        '#1a0a0a',  // Dark stage red-black
    'beach':        '#f5c882',  // Sandy gold
    'forest':       '#1a3c1a',  // Forest green
    'mountain':     '#8bb5d4',  // Mountain blue
    'city-night':   '#0f1923',  // Dark city blue
    'minimal':      '#ffffff',  // Clean white
    'dark':         '#0a0a0a',  // Near-black
    'blur':         '#1a1a2e',  // Soft dark blue
  };

  // If a predefined scene is selected
  if (sceneId && sceneId !== 'custom' && SCENE_COLORS[sceneId]) {
    return { type: 'color', value: SCENE_COLORS[sceneId] };
  }

  // If custom prompt looks like an image URL, use it as image background
  if (customPrompt) {
    const trimmed = customPrompt.trim();
    if (trimmed.match(/^https?:\/\/.+\.(jpg|jpeg|png|webp|gif)/i)) {
      return { type: 'image', value: trimmed };
    }
    // If it's a hex color
    if (trimmed.match(/^#[0-9a-fA-F]{6}$/)) {
      return { type: 'color', value: trimmed };
    }
    // For text prompts, we can't directly use them with HeyGen
    // but we'll log that the user wanted a custom scene for future enhancement
    console.log('[SpaceBaddie Video] Custom background prompt (not directly supported by HeyGen):', trimmed.substring(0, 100));
  }

  return undefined;
}

/**
 * Generate a default script based on voice style
 */
function generateDefaultScript(voiceStyle: string, duration: number): string {
  const scripts: Record<string, string> = {
    natural: "Hey! Thanks for checking out my content. I really appreciate you being here. Make sure to follow for more updates!",
    energetic: "What's up everyone! So excited to share this with you! Don't forget to like and follow for more awesome content!",
    professional: "Hello and welcome. Thank you for your time today. I look forward to sharing more valuable content with you.",
    friendly: "Hey there, friend! So glad you stopped by. Hope you're having an amazing day! See you in the next one!",
    calm: "Hi there. Take a moment to relax and enjoy. I hope this brings a little peace to your day.",
  };
  
  return scripts[voiceStyle] || scripts.natural;
}
