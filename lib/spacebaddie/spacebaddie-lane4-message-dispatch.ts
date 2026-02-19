import { emitSignal } from "@/lib/uoi/signals";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { triggerSpacebaddieSocialDispatch } from "@/lib/n8n/trigger";

type DispatchResult = {
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
};

function spacebaddieDispatchEnabled() {
  return String(process.env.SPACEBADDIE_MESSAGE_DISPATCH_ENABLED || "").trim().toLowerCase() === "true";
}

function nowIso() {
  return new Date().toISOString();
}

export async function dispatchSpacebaddieQueuedMessages(input?: { limit?: number }): Promise<DispatchResult> {
  if (!spacebaddieDispatchEnabled()) {
    return { processed: 0, sent: 0, failed: 0, skipped: 0 };
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return { processed: 0, sent: 0, failed: 0, skipped: 0 };
  }

  const limit = Math.max(1, Math.min(100, input?.limit ?? 25));

  const { data: queued, error } = await supabase
    .from("spacebaddie_messages")
    .select(
      `
      message_id,
      tenant,
      conversation_id,
      contact_id,
      channel,
      content,
      status,
      created_at,
      conversation:spacebaddie_conversations ( platform ),
      contact:spacebaddie_contacts ( handle )
    `
    )
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error || !queued?.length) {
    return { processed: 0, sent: 0, failed: 0, skipped: 0 };
  }

  const messageIds = queued.map((item) => item.message_id);
  const { data: claimed, error: claimError } = await supabase
    .from("spacebaddie_messages")
    .update({ status: "sending" })
    .in("message_id", messageIds)
    .eq("status", "queued")
    .select("message_id");

  if (claimError || !claimed?.length) {
    return { processed: 0, sent: 0, failed: 0, skipped: queued.length };
  }

  const claimedIds = new Set(claimed.map((row) => row.message_id));
  const dispatchables = queued.filter((item) => claimedIds.has(item.message_id));

  let sent = 0;
  let failed = 0;

  for (const message of dispatchables) {
    try {
      const conv = message.conversation as { platform?: string } | null;
      const cont = message.contact as { handle?: string } | null;
      const platform = conv?.platform || "unknown";
      const handle = cont?.handle || null;

      const result = await triggerSpacebaddieSocialDispatch({
        tenant: message.tenant,
        platform,
        channel: message.channel,
        messageId: message.message_id,
        conversationId: message.conversation_id,
        contactId: message.contact_id,
        handle,
        content: message.content,
      });

      if (!result.success) {
        await supabase
          .from("spacebaddie_messages")
          .update({
            status: "failed",
            error: result.error || "dispatch_failed",
          })
          .eq("message_id", message.message_id);
        failed += 1;
        continue;
      }

      await supabase
        .from("spacebaddie_messages")
        .update({
          status: "sent",
          sent_at: nowIso(),
        })
        .eq("message_id", message.message_id);
      sent += 1;

      emitSignal({
        source: "spacebaddie",
        type: "spacebaddie.social.message.sent",
        priority: "low",
        payload: {
          tenant: message.tenant,
          platform,
          messageId: message.message_id,
          conversationId: message.conversation_id,
          contactId: message.contact_id,
        },
      });
    } catch (err: any) {
      await supabase
        .from("spacebaddie_messages")
        .update({
          status: "failed",
          error: err?.message || "dispatch_failed",
        })
        .eq("message_id", message.message_id);
      failed += 1;
    }
  }

  return {
    processed: dispatchables.length,
    sent,
    failed,
    skipped: queued.length - dispatchables.length,
  };
}
