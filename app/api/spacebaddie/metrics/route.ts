/**
 * SpaceBaddie Metrics API
 * GET /api/spacebaddie/metrics
 * 
 * Aggregates performance metrics from connected platforms and internal usage.
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

    // 1. Get usage stats (posts made)
    const { count: postsMade } = await supabase
      .from("spacebaddie_post_queue")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("tenant", tenant)
      .eq("status", "posted");

    // 2. Social reach/engagement — coming soon (requires real social ingest / spacebaddie_social_stats)
    const reach = 0;
    const leads = 0;
    const revenue = 0;

    // 3. Check connected platforms
    const { count: connectedPlatforms } = await supabase
      .from("spacebaddie_social_connections")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("tenant", tenant)
      .eq("connected", true);

    return NextResponse.json({
      ok: true,
      stats: {
        postsMade: postsMade || 0,
        reach,
        leads,
        revenue,
        connectedPlatforms: connectedPlatforms || 0,
        hasData: (postsMade || 0) > 0 || (connectedPlatforms || 0) > 0,
        reachLeadsRevenueLive: false,
        reachLeadsRevenueMessage: "Reach, leads, and revenue coming soon with social ingest.",
      },
    });

  } catch (error: any) {
    console.error("[SpaceBaddie Metrics] GET error:", error);
    return NextResponse.json({
      ok: false,
      error: "Failed to fetch metrics",
    }, { status: 500 });
  }
}
