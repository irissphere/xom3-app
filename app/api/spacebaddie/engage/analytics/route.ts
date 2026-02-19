import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/spacebaddie/engage/analytics
 * Engagement analytics summary
 */
export async function GET(req: NextRequest) {
  try {
    const supabaseAuth = await createClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const days = parseInt(url.searchParams.get("days") || "30", 10);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const supabase = getSupabaseAdminClient();

    // Total followers (contacts marked as follower)
    const { count: totalFollowers } = await supabase
      .from("spacebaddie_contacts")
      .select("contact_id", { count: "exact", head: true })
      .eq("tenant", "spacebaddie")
      .eq("follower", true);

    // New followers in period
    const { count: newFollowers } = await supabase
      .from("spacebaddie_social_signals")
      .select("signal_id", { count: "exact", head: true })
      .eq("tenant", "spacebaddie")
      .eq("type", "follow")
      .gte("created_at", since);

    // Total signals in period by type
    const { data: signalsByType } = await supabase
      .from("spacebaddie_social_signals")
      .select("type")
      .eq("tenant", "spacebaddie")
      .gte("created_at", since);

    const typeCounts: Record<string, number> = {};
    if (signalsByType) {
      for (const s of signalsByType) {
        typeCounts[s.type] = (typeCounts[s.type] || 0) + 1;
      }
    }

    // Messages sent in period
    const { count: messagesSent } = await supabase
      .from("spacebaddie_messages")
      .select("message_id", { count: "exact", head: true })
      .eq("tenant", "spacebaddie")
      .eq("direction", "outgoing")
      .gte("created_at", since);

    // Messages by status
    const { data: msgByStatus } = await supabase
      .from("spacebaddie_messages")
      .select("status")
      .eq("tenant", "spacebaddie")
      .eq("direction", "outgoing")
      .gte("created_at", since);

    const statusCounts: Record<string, number> = {};
    if (msgByStatus) {
      for (const m of msgByStatus) {
        statusCounts[m.status] = (statusCounts[m.status] || 0) + 1;
      }
    }

    // Signals by platform
    const { data: signalsByPlatform } = await supabase
      .from("spacebaddie_social_signals")
      .select("platform")
      .eq("tenant", "spacebaddie")
      .gte("created_at", since);

    const platformCounts: Record<string, number> = {};
    if (signalsByPlatform) {
      for (const s of signalsByPlatform) {
        platformCounts[s.platform] = (platformCounts[s.platform] || 0) + 1;
      }
    }

    // Open conversations
    const { count: openConversations } = await supabase
      .from("spacebaddie_conversations")
      .select("conversation_id", { count: "exact", head: true })
      .eq("tenant", "spacebaddie")
      .eq("status", "open");

    // Total contacts
    const { count: totalContacts } = await supabase
      .from("spacebaddie_contacts")
      .select("contact_id", { count: "exact", head: true })
      .eq("tenant", "spacebaddie");

    // Reply rate: messages sent / total signals
    const totalSignals = Object.values(typeCounts).reduce((a, b) => a + b, 0);
    const replyRate = totalSignals > 0 ? ((messagesSent || 0) / totalSignals) * 100 : 0;

    return NextResponse.json({
      ok: true,
      period_days: days,
      stats: {
        total_followers: totalFollowers || 0,
        new_followers: newFollowers || 0,
        total_contacts: totalContacts || 0,
        open_conversations: openConversations || 0,
        messages_sent: messagesSent || 0,
        reply_rate: Math.round(replyRate * 10) / 10,
        signals_by_type: typeCounts,
        signals_by_platform: platformCounts,
        messages_by_status: statusCounts,
      },
    });
  } catch (error) {
    console.warn("[ENGAGE] Analytics error:", error);
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
