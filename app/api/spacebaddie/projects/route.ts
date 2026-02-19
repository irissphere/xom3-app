/**
 * SpaceBaddie Projects API
 * GET /api/spacebaddie/projects
 * 
 * Returns user's video projects from render history
 * AKV: SpaceBaddie Sovereign - Projects Lane
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export interface VideoProject {
  id: string;
  jobId: string;
  jobType: string;
  status: string;
  progress: number;
  script?: string;
  sceneType?: string;
  aspectRatio?: string;
  isDraft: boolean;
  outputUrl?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

/**
 * GET /api/spacebaddie/projects
 * 
 * Query params:
 * - status: Filter by status (pending, processing, completed, failed)
 * - limit: Max results (default 50)
 * - offset: Pagination offset (default 0)
 * 
 * Returns user's video projects sorted by creation date (newest first)
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({
        ok: false,
        error: "Authentication required",
        code: "AUTH_REQUIRED",
      }, { status: 401 });
    }

    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);
    const offset = parseInt(url.searchParams.get("offset") || "0");
    const tenant = req.headers.get("x-tenant-id") || "spacebaddie";

    // Build query
    let query = supabase
      .from("spacebaddie_render_history")
      .select("*")
      .eq("user_id", user.id)
      .eq("tenant", tenant)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter by status if provided
    if (status) {
      query = query.eq("status", status);
    }

    const { data: renders, error: fetchError } = await query;

    if (fetchError) {
      console.error("[SpaceBaddie Projects] Fetch error:", fetchError);
      return NextResponse.json({
        ok: false,
        error: "Failed to fetch projects",
      }, { status: 500 });
    }

    // Transform to API response format
    const projects: VideoProject[] = (renders || []).map((render: any) => ({
      id: render.render_id,
      jobId: render.job_id,
      jobType: render.job_type,
      status: render.status,
      progress: render.progress || 0,
      script: render.script,
      sceneType: render.scene_type,
      aspectRatio: render.aspect_ratio,
      isDraft: render.is_draft ?? true,
      outputUrl: render.output_url,
      thumbnailUrl: render.thumbnail_url,
      durationSeconds: render.duration_seconds,
      errorMessage: render.error_message,
      startedAt: render.started_at,
      completedAt: render.completed_at,
      createdAt: render.created_at,
    }));

    // Get total count for pagination
    const { count } = await supabase
      .from("spacebaddie_render_history")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("tenant", tenant);

    return NextResponse.json({
      ok: true,
      projects,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (offset + projects.length) < (count || 0),
      },
    });

  } catch (error: any) {
    console.error("[SpaceBaddie Projects] Error:", error);
    return NextResponse.json({
      ok: false,
      error: error?.message || "Internal server error",
    }, { status: 500 });
  }
}

/**
 * DELETE /api/spacebaddie/projects?id=xxx
 * 
 * Deletes a project from render history
 */
export async function DELETE(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({
        ok: false,
        error: "Authentication required",
        code: "AUTH_REQUIRED",
      }, { status: 401 });
    }

    const url = new URL(req.url);
    const projectId = url.searchParams.get("id");
    const tenant = req.headers.get("x-tenant-id") || "spacebaddie";

    if (!projectId) {
      return NextResponse.json({
        ok: false,
        error: "Project ID required",
      }, { status: 400 });
    }

    // Delete project (RLS ensures user can only delete their own)
    const { error: deleteError } = await supabase
      .from("spacebaddie_render_history")
      .delete()
      .eq("render_id", projectId)
      .eq("user_id", user.id)
      .eq("tenant", tenant);

    if (deleteError) {
      console.error("[SpaceBaddie Projects] Delete error:", deleteError);
      return NextResponse.json({
        ok: false,
        error: "Failed to delete project",
      }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      message: "Project deleted",
    });

  } catch (error: any) {
    console.error("[SpaceBaddie Projects] Delete error:", error);
    return NextResponse.json({
      ok: false,
      error: error?.message || "Internal server error",
    }, { status: 500 });
  }
}
