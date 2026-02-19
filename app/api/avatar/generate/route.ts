/**
 * Avatar Generation API - POST /api/avatar/generate
 * 
 * Creates a talking head video using voice cloning + face animation.
 * Dispatches to GPU worker for processing.
 * 
 * Server-side tier enforcement for free-tier limits.
 * AKV: SpaceBaddie Sovereign - Generation Lane
 */

import { NextResponse } from 'next/server';
import { 
  GenerateAvatarRequest, 
  AVATAR_COSTS,
  AvatarStyle,
} from '@/lib/avatar/types';
import { 
  dispatchAvatarJob, 
  isAvatarWorkerAvailable,
  getAvatarWorkerStatus,
} from '@/lib/avatar/worker-client';
import { 
  setAvatarJob, 
  deleteAvatarJob 
} from '@/lib/avatar/job-store';
import { emitSignal } from '@/lib/uoi/signals';
import { generateLTX2Video, LTX2SceneType } from '@/lib/ltx2/client';
import { createClient } from '@/lib/supabase/server';
import { loadSubscriptionRecord, getEffectiveTier } from '@/lib/subscription/subscription-store';
import { getTierConfig } from '@/lib/tiers/features';
import crypto from 'crypto';

const VALID_STYLES: AvatarStyle[] = ['professional', 'casual', 'energetic', 'calm', 'social'];
const VALID_ASPECTS = ['16:9', '9:16', '1:1', '4:5'] as const;

function generateJobId(): string {
  return `avatar_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export async function POST(req: Request) {
  try {
    const body: GenerateAvatarRequest = await req.json();
    const tenantId = req.headers.get('x-tenant-id') || 'default';

    // --- Server-side Tier Enforcement ---
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    // Check user's subscription tier
    let effectiveTier: ReturnType<typeof getEffectiveTier> = 'free';
    if (user) {
      const record = await loadSubscriptionRecord({ userId: user.id });
      effectiveTier = getEffectiveTier(record);
    }
    
    // For free tier, check device limits
    if (effectiveTier === 'free') {
      const deviceFingerprint = req.headers.get('x-device-fingerprint');
      
      if (deviceFingerprint) {
        const fingerprintHash = crypto.createHash('sha256').update(deviceFingerprint).digest('hex');
        
        // Check device usage in database
        const { data: device } = await supabase
          .from('spacebaddie_usage_devices')
          .select('free_generations_used, max_free_generations, free_tier_locked')
          .eq('fingerprint_hash', fingerprintHash)
          .eq('tenant', 'spacebaddie')
          .single();
        
        if (device) {
          // Check if device is locked or at limit
          if (device.free_tier_locked || device.free_generations_used >= device.max_free_generations) {
            const tierConfig = getTierConfig('pro');
            
            return NextResponse.json({
              success: false,
              error: 'Free tier generation limit reached',
              code: 'FREE_LIMIT_REACHED',
              upgradeRequired: 'pro',
              suggestedPlan: {
                tier: 'pro',
                name: tierConfig.name,
                price: tierConfig.priceLabel,
              },
              upgradeUrl: '/spacebaddie/pricing',
            }, { status: 403 });
          }
          
          // Increment usage count
          await supabase
            .from('spacebaddie_usage_devices')
            .update({
              free_generations_used: device.free_generations_used + 1,
              updated_at: new Date().toISOString(),
            })
            .eq('fingerprint_hash', fingerprintHash)
            .eq('tenant', 'spacebaddie');
        }
      }
    }
    // --- End Tier Enforcement ---

    // Check if this is a cinematic LTX-2 request
    const isCinematic = body.sceneType && body.sceneType !== 'talking_head';
    
    if (isCinematic) {
      // LTX-2 Cinematic Pipeline (Pro Tier only)
      const ltxResult = await generateLTX2Video({
        prompt: body.script,
        sceneType: body.sceneType as LTX2SceneType,
        seed: body.seed,
        isDraft: body.isDraft,
        aspectRatio: body.aspectRatio,
        parentJobId: body.parentJobId
      }, tenantId);

      // Save to database for Projects persistence
      if (user) {
        try {
          await supabase.from('spacebaddie_render_history').insert({
            user_id: user.id,
            tenant: tenantId === 'default' ? 'spacebaddie' : tenantId,
            job_id: ltxResult.jobId,
            job_type: 'ltx2',
            script: body.script,
            scene_type: body.sceneType,
            aspect_ratio: body.aspectRatio || '16:9',
            is_draft: body.isDraft ?? true,
            status: 'pending',
            progress: 0,
            started_at: new Date().toISOString(),
            metadata: { seed: ltxResult.seed },
          });
          console.log(`[Avatar API] Saved LTX-2 job ${ltxResult.jobId} to render history for user ${user.id}`);
        } catch (dbError) {
          console.error('[Avatar API] Failed to save LTX-2 job to render history:', dbError);
        }
      }

      return NextResponse.json({
        success: true,
        jobId: ltxResult.jobId,
        status: ltxResult.status,
        seed: ltxResult.seed,
        estimatedCost: {
          cents: body.isDraft ? 1 : 10,
          formatted: body.isDraft ? "$0.01" : "$0.10",
        },
        message: 'Cinematic video generation started via LTX-2.',
      });
    }

    // Standard SadTalker Pipeline
    // Check if worker is available
    const workerAvailable = await isAvatarWorkerAvailable();

    if (!workerAvailable) {
      return NextResponse.json(
        { 
          error: 'Avatar generation service is currently unavailable',
          hint: 'GPU worker is offline. Please try again later or contact support.',
        },
        { status: 503 }
      );
    }

    // Create job
    const jobId = generateJobId();
    const style = body.style || 'professional';
    const aspectRatio = body.aspectRatio || '16:9';
    const enhanceFace = body.enhanceFace ?? true;
    
    setAvatarJob(jobId, {
      id: jobId,
      tenantId,
      status: 'queued',
      progress: 0,
      createdAt: new Date().toISOString(),
      config: {
        script: body.script,
        voiceId: body.voiceId,
        faceId: body.faceId,
        style,
        aspectRatio,
        enhanceFace,
      },
    });

    // Save to database for Projects persistence
    if (user) {
      try {
        await supabase.from('spacebaddie_render_history').insert({
          user_id: user.id,
          tenant: tenantId === 'default' ? 'spacebaddie' : tenantId,
          job_id: jobId,
          job_type: 'avatar',
          script: body.script,
          voice_id: body.voiceId,
          face_id: body.faceId,
          scene_type: 'talking_head',
          aspect_ratio: aspectRatio,
          is_draft: body.isDraft ?? true,
          status: 'pending',
          progress: 0,
          started_at: new Date().toISOString(),
        });
        console.log(`[Avatar API] Saved job ${jobId} to render history for user ${user.id}`);
      } catch (dbError) {
        console.error('[Avatar API] Failed to save to render history:', dbError);
        // Don't fail the request, just log the error
      }
    }

    // Dispatch to GPU worker
    const dispatchResult = await dispatchAvatarJob(jobId, tenantId, {
      script: body.script,
      voiceId: body.voiceId,
      faceId: body.faceId,
      style,
      aspectRatio,
      enhanceFace,
    });

    if (!dispatchResult.success) {
      deleteAvatarJob(jobId);
      return NextResponse.json(
        { error: dispatchResult.error || 'Failed to dispatch job to worker' },
        { status: 500 }
      );
    }

    // Emit signal
    emitSignal({
      source: 'avatar_api',
      type: 'avatar_generation_started',
      payload: {
        jobId,
        tenantId,
        voiceId: body.voiceId,
        faceId: body.faceId,
        style,
        aspectRatio,
        scriptLength: body.script.length,
      },
      priority: 'medium',
    });

    return NextResponse.json({
      success: true,
      jobId,
      status: 'queued',
      estimatedCost: {
        cents: AVATAR_COSTS.USER_CHARGE,
        formatted: `$${(AVATAR_COSTS.USER_CHARGE / 100).toFixed(2)}`,
      },
      config: {
        style,
        aspectRatio,
        enhanceFace,
      },
      message: 'Avatar generation started. Poll /api/avatar/status?jobId=xxx for updates.',
    });

  } catch (error) {
    console.error('[Avatar API] Generate error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    // Worker status check
    if (action === 'worker-status') {
      const status = await getAvatarWorkerStatus();
      return NextResponse.json({
        success: true,
        worker: status,
      });
    }

    // Default: return available options and pricing
    const workerAvailable = await isAvatarWorkerAvailable();

    return NextResponse.json({
      success: true,
      worker: {
        available: workerAvailable,
        message: workerAvailable 
          ? 'Avatar generation service is online'
          : 'Avatar generation service is offline',
      },
      pricing: {
        perVideo: {
          cents: AVATAR_COSTS.USER_CHARGE,
          formatted: `$${(AVATAR_COSTS.USER_CHARGE / 100).toFixed(2)}`,
        },
      },
      options: {
        styles: VALID_STYLES,
        aspectRatios: VALID_ASPECTS,
        maxScriptLength: 3000,
      },
      requirements: {
        voiceProfile: 'Create a voice profile first with /api/avatar/voices',
        faceProfile: 'Create a face profile first with /api/avatar/faces',
      },
    });

  } catch (error) {
    console.error('[Avatar API] Info error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
