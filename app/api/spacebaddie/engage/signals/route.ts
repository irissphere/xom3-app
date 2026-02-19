import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/spacebaddie/engage/signals
 * Fetch social signals with optional filters: platform, event_type, limit, offset
 */
export async function GET(req: NextRequest) {
  try {
    const supabaseAuth = await createClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const platform = url.searchParams.get("platform");
    const eventType = url.searchParams.get("event_type");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 100);
    const offset = parseInt(url.searchParams.get("offset") || "0", 10);

    const supabase = getSupabaseAdminClient();

    let query = supabase
      .from("spacebaddie_social_signals")
      .select("*, spacebaddie_contacts!contact_id(contact_id, handle, display_name, avatar_url, platform, follower)")
      .eq("tenant", "spacebaddie")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (platform && platform !== "all") {
      query = query.eq("platform", platform);
    }
    if (eventType && eventType !== "all") {
      query = query.eq("type", eventType);
    }

    const { data: signals, error, count } = await query;

    if (error) {
      console.warn("[ENGAGE] Signals fetch error:", error.message);
      return NextResponse.json({ ok: false, error: "fetch_failed" }, { status: 500 });
    }

    // Also get total count for pagination
    let countQuery = supabase
      .from("spacebaddie_social_signals")
      .select("signal_id", { count: "exact", head: true })
      .eq("tenant", "spacebaddie");

    if (platform && platform !== "all") {
      countQuery = countQuery.eq("platform", platform);
    }
    if (eventType && eventType !== "all") {
      countQuery = countQuery.eq("type", eventType);
    }

    const { count: totalCount } = await countQuery;

    return NextResponse.json({
      ok: true,
      signals: signals || [],
      total: totalCount || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.warn("[ENGAGE] Signals error:", error);
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
