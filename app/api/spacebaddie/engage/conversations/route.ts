import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/spacebaddie/engage/conversations
 * Fetch conversations with contacts and message counts
 */
export async function GET(req: NextRequest) {
  try {
    const supabaseAuth = await createClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const status = url.searchParams.get("status") || "all";
    const platform = url.searchParams.get("platform");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 100);
    const offset = parseInt(url.searchParams.get("offset") || "0", 10);
    const conversationId = url.searchParams.get("conversation_id");

    const supabase = getSupabaseAdminClient();

    // If requesting a specific conversation's messages
    if (conversationId) {
      const { data: messages, error } = await supabase
        .from("spacebaddie_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .eq("tenant", "spacebaddie")
        .order("created_at", { ascending: true });

      if (error) {
        console.warn("[ENGAGE] Messages fetch error:", error.message);
        return NextResponse.json({ ok: false, error: "fetch_failed" }, { status: 500 });
      }

      return NextResponse.json({ ok: true, messages: messages || [] });
    }

    // Fetch conversations with contact info
    let query = supabase
      .from("spacebaddie_conversations")
      .select("*, spacebaddie_contacts!contact_id(contact_id, handle, display_name, avatar_url, platform, follower, profile_url)")
      .eq("tenant", "spacebaddie")
      .order("last_message_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status !== "all") {
      query = query.eq("status", status);
    }
    if (platform && platform !== "all") {
      query = query.eq("platform", platform);
    }

    const { data: conversations, error } = await query;

    if (error) {
      console.warn("[ENGAGE] Conversations fetch error:", error.message);
      return NextResponse.json({ ok: false, error: "fetch_failed" }, { status: 500 });
    }

    // Get message counts per conversation
    const convoIds = (conversations || []).map((c: any) => c.conversation_id);
    let messageCounts: Record<string, number> = {};

    if (convoIds.length > 0) {
      const { data: countData } = await supabase
        .from("spacebaddie_messages")
        .select("conversation_id")
        .eq("tenant", "spacebaddie")
        .in("conversation_id", convoIds);

      if (countData) {
        for (const row of countData) {
          messageCounts[row.conversation_id] = (messageCounts[row.conversation_id] || 0) + 1;
        }
      }
    }

    // Get last message per conversation
    let lastMessages: Record<string, any> = {};
    if (convoIds.length > 0) {
      for (const convoId of convoIds) {
        const { data: lastMsg } = await supabase
          .from("spacebaddie_messages")
          .select("*")
          .eq("conversation_id", convoId)
          .eq("tenant", "spacebaddie")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (lastMsg) {
          lastMessages[convoId] = lastMsg;
        }
      }
    }

    const enriched = (conversations || []).map((c: any) => ({
      ...c,
      message_count: messageCounts[c.conversation_id] || 0,
      last_message: lastMessages[c.conversation_id] || null,
    }));

    return NextResponse.json({
      ok: true,
      conversations: enriched,
    });
  } catch (error) {
    console.warn("[ENGAGE] Conversations error:", error);
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}

/**
 * POST /api/spacebaddie/engage/conversations
 * Send a reply message (enqueue to message queue)
 */
export async function POST(req: NextRequest) {
  try {
    const supabaseAuth = await createClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { conversation_id, contact_id, content, channel } = body;

    if (!conversation_id || !contact_id || !content) {
      return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();

    const messageId = `sb_msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();

    const { error } = await supabase.from("spacebaddie_messages").insert({
      message_id: messageId,
      tenant: "spacebaddie",
      conversation_id,
      contact_id,
      direction: "outgoing",
      channel: channel || "dm",
      content,
      status: "queued",
      created_at: now,
    });

    if (error) {
      console.warn("[ENGAGE] Reply enqueue error:", error.message);
      return NextResponse.json({ ok: false, error: "enqueue_failed" }, { status: 500 });
    }

    // Update conversation last_message_at
    await supabase
      .from("spacebaddie_conversations")
      .update({ last_message_at: now, updated_at: now })
      .eq("conversation_id", conversation_id);

    return NextResponse.json({ ok: true, message_id: messageId });
  } catch (error) {
    console.warn("[ENGAGE] Reply error:", error);
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
