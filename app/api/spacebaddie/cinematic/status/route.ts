/**
 * Cinematic Video Status API
 * 
 * GET /api/spacebaddie/cinematic/status?jobId=xxx
 * 
 * Check the status of an async Hedra cinematic video generation job
 */

import { NextRequest, NextResponse } from 'next/server';
import { getHedraVideoStatus } from '@/lib/hedra/client';
import { createClient } from '@supabase/supabase-js';

// Stale job threshold: mark as failed if still processing after this many hours
const STALE_JOB_HOURS = 4;

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

async function markProjectStale(db: NonNullable<ReturnType<typeof getSupabase>>, jobId: string) {
  const staleError = 'Job timed out (stale). Please start a new video.';
  await db.from('spacebaddie_projects').update({
    status: 'failed',
    updated_at: new Date().toISOString(),
  }).eq('id', `proj_${jobId}`);
  await db.from('spacebaddie_render_history').update({
    status: 'failed',
    error_message: staleError,
    completed_at: new Date().toISOString(),
  }).eq('job_id', jobId);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get('jobId');
  
  if (!jobId) {
    return NextResponse.json(
      { error: 'jobId required' },
      { status: 400 }
    );
  }
  
  try {
    console.log('[Cinematic Status] Checking Hedra job:', jobId);
    
    const db = getSupabase();
    if (db) {
      const { data: project } = await db
        .from('spacebaddie_projects')
        .select('created_at, status')
        .eq('id', `proj_${jobId}`)
        .maybeSingle();
      if (project?.created_at && project.status === 'processing') {
        const ageHours = (Date.now() - new Date(project.created_at).getTime()) / (1000 * 60 * 60);
        if (ageHours >= STALE_JOB_HOURS) {
          await markProjectStale(db, jobId);
          return NextResponse.json({
            jobId,
            status: 'failed',
            error: 'Job timed out (stale). Please start a new video.',
          });
        }
      }
    }
    
    // Check Hedra status
    const statusResult = await getHedraVideoStatus(jobId);
    
    if (!statusResult.success) {
      return NextResponse.json({
        jobId,
        status: 'failed',
        error: statusResult.error || 'Status check failed',
      });
    }
    
    // Map Hedra status to our normalized status
    const hedraStatus = statusResult.status;
    let normalizedStatus: 'pending' | 'processing' | 'completed' | 'failed';
    let progress = 0;
    
    switch (hedraStatus) {
      case 'queued':
        normalizedStatus = 'pending';
        progress = 5;
        break;
      case 'processing':
        normalizedStatus = 'processing';
        progress = 50;
        break;
      case 'finalizing':
        normalizedStatus = 'processing';
        progress = 80;
        break;
      case 'complete':
        normalizedStatus = 'completed';
        progress = 100;
        break;
      case 'error':
        normalizedStatus = 'failed';
        progress = 0;
        break;
      default:
        normalizedStatus = 'processing';
        progress = 25;
    }
    
    console.log('[Cinematic Status] Hedra status:', hedraStatus, '->', normalizedStatus);
    
    // If completed, update database
    if (normalizedStatus === 'completed' && statusResult.videoUrl) {
      const db = getSupabase();
      if (db) {
        // Fetch existing project settings
        const { data: existing } = await db
          .from('spacebaddie_projects')
          .select('settings')
          .eq('id', `proj_${jobId}`)
          .maybeSingle();
        
        const existingSettings = existing?.settings || {};
        
        // Update project status
        const { error: projError } = await db
          .from('spacebaddie_projects')
          .update({
            video_url: statusResult.videoUrl,
            status: 'completed',
            settings: { ...existingSettings },
            updated_at: new Date().toISOString(),
          })
          .eq('id', `proj_${jobId}`);
        
        if (projError) {
          console.error('[Cinematic Status] Failed to update project:', projError);
        }
        
        // Update render history
        const { error: renderError } = await db
          .from('spacebaddie_render_history')
          .update({
            status: 'completed',
            progress: 100,
            output_url: statusResult.videoUrl,
            completed_at: new Date().toISOString(),
          })
          .eq('job_id', jobId);
        
        if (renderError) {
          console.error('[Cinematic Status] Failed to update render history:', renderError);
        }
        
        return NextResponse.json({
          jobId,
          status: 'completed',
          model: 'hedra',
          videoUrl: statusResult.videoUrl,
          voiceoverUrl: existingSettings.voiceoverUrl,
          musicUrl: existingSettings.musicUrl,
        });
      }
      
      return NextResponse.json({
        jobId,
        status: 'completed',
        model: 'hedra',
        videoUrl: statusResult.videoUrl,
      });
    }
    
    // If failed, update database
    if (normalizedStatus === 'failed') {
      const db = getSupabase();
      if (db) {
        const { error: projFailError } = await db
          .from('spacebaddie_projects')
          .update({
            status: 'failed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', `proj_${jobId}`);
        
        if (projFailError) {
          console.error('[Cinematic Status] Failed to update project failure:', projFailError);
        }
        
        const { error: renderFailError } = await db
          .from('spacebaddie_render_history')
          .update({
            status: 'failed',
            error_message: statusResult.error || 'Generation failed',
            completed_at: new Date().toISOString(),
          })
          .eq('job_id', jobId);
        
        if (renderFailError) {
          console.error('[Cinematic Status] Failed to update render history failure:', renderFailError);
        }
      }
      
      return NextResponse.json({
        jobId,
        status: 'failed',
        error: statusResult.error || 'Video generation failed',
      });
    }
    
    // Still processing
    return NextResponse.json({
      jobId,
      status: normalizedStatus,
      model: 'hedra',
      progress,
      hedraStatus, // Include raw Hedra status for debugging
    });
    
  } catch (error) {
    console.error('[Cinematic Status] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Status check failed' },
      { status: 500 }
    );
  }
}
