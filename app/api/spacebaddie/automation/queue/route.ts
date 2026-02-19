/**
 * SpaceBaddie Automation Queue API
 * GET/POST /api/spacebaddie/automation/queue
 * 
 * Manages the content posting queue.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({
        ok: false,
        error: "Authentication required",
      }, { status: 401 });
    }

    const tenant = req.headers.get("x-tenant-id") || "spacebaddie";
    const status = req.nextUrl.searchParams.get("status");

    let query = supabase
      .from("spacebaddie_post_queue")
      .select("*")
      .eq("user_id", user.id)
      .order("scheduled_at", { ascending: true });

    if (status) {
      query = query.eq("status", status);
    }

    const { data: queue, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({
      ok: true,
      queue: queue || []
    });

  } catch (error: any) {
    console.error("[SpaceBaddie Queue] GET error:", error);
    return NextResponse.json({
      ok: false,
      error: "Failed to fetch queue",
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({
        ok: false,
        error: "Authentication required",
      }, { status: 401 });
    }

    const body = await req.json();
    const tenant = req.headers.get("x-tenant-id") || "spacebaddie";

    // Actual columns: id, user_id, video_url, caption, hashtags, platform (singular),
    // platform_settings, scheduled_at, status, etc.
    const platform = body.platforms?.[0] || "youtube";
    const { data: post, error } = await supabase
      .from("spacebaddie_post_queue")
      .insert({
        id: crypto.randomUUID(),
        user_id: user.id,
        video_url: body.content?.url || body.videoUrl || "",
        caption: body.content?.text || body.caption || null,
        platform,
        platform_settings: body.metadata || {},
        scheduled_at: body.scheduledTime || new Date().toISOString(),
        timezone: body.timezone || "America/New_York",
        status: "queued",
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      ok: true,
      post,
      message: "Content scheduled successfully"
    });

  } catch (error: any) {
    console.error("[SpaceBaddie Queue] POST error:", error);
    return NextResponse.json({
      ok: false,
      error: "Failed to schedule content",
    }, { status: 500 });
  }
}
