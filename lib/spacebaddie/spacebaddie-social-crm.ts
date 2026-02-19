import { Buffer } from "buffer";
import { emitSignal } from "@/lib/uoi/signals";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export type SpacebaddieSocialEventType = "follow" | "comment" | "mention" | "dm";

export type SpacebaddieSocialSignalInput = {
  tenant: string;
  platform: string;
  eventType: SpacebaddieSocialEventType;
  handle: string;
  displayName?: string | null;
  profileUrl?: string | null;
  avatarUrl?: string | null;
  content?: string | null;
  metadata?: Record<string, unknown>;
};

type SpacebaddieContact = {
  contactId: string;
  tenant: string;
  platform: string;
  handle: string;
  displayName: string | null;
  profileUrl: string | null;
  avatarUrl: string | null;
  follower: boolean;
  lastInteractionAt: string | null;
  tags: string[];
  source: string | null;
  createdAt: string;
  updatedAt: string;
};

function spacebaddieSupabaseEnabled() {
  return String(process.env.SPACEBADDIE_SUPABASE_ENABLED || "").trim().toLowerCase() === "true";
}

function normalizeHandle(handle: string) {
  return handle.trim().replace(/^@/, "").toLowerCase();
}

function contactIdFor(input: { tenant: string; platform: string; handle: string }) {
  const base = `${input.tenant}:${input.platform}:${normalizeHandle(input.handle)}`;
  return `sb_contact_${Buffer.from(base).toString("base64url").slice(0, 22)}`;
}

function conversationIdFor(input: { tenant: string; platform: string; contactId: string }) {
  const base = `${input.tenant}:${input.platform}:${input.contactId}`;
  return `sb_convo_${Buffer.from(base).toString("base64url").slice(0, 22)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function autoReplyEnabled() {
  return String(process.env.SPACEBADDIE_SOCIAL_AUTO_REPLY || "").trim().toLowerCase() === "true";
}

function templateFor(eventType: SpacebaddieSocialEventType) {
  if (eventType === "follow") {
    return (
      process.env.SPACEBADDIE_SOCIAL_REPLY_TEMPLATE_FOLLOW ||
      "Thanks for the follow {{handle}}. Want the latest drop or a quick collab?"
    );
  }
  if (eventType === "comment") {
    return (
      process.env.SPACEBADDIE_SOCIAL_REPLY_TEMPLATE_COMMENT ||
      "Appreciate the comment {{handle}}. Want me to DM the full details?"
    );
  }
  if (eventType === "mention") {
    return (
      process.env.SPACEBADDIE_SOCIAL_REPLY_TEMPLATE_MENTION ||
      "Saw the mention {{handle}}. Want the quick rundown or the full kit?"
    );
  }
  return (
    process.env.SPACEBADDIE_SOCIAL_REPLY_TEMPLATE_DM ||
    "Got your message {{handle}}. How can I help?"
  );
}

/**
 * Fetch a user's engage rule from the DB for a given event type and platform.
 * Returns the rule if found and enabled, otherwise null.
 * Falls back to 'all' platform if no platform-specific rule exists.
 */
async function getEngageRuleFromDB(input: {
  eventType: SpacebaddieSocialEventType;
  platform: string;
}): Promise<{ enabled: boolean; template: string; delay_seconds: number } | null> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return null;

  // Try platform-specific rule first, then fall back to 'all'
  const { data: rules } = await supabase
    .from("spacebaddie_engage_rules")
    .select("enabled, template, delay_seconds, platform")
    .eq("event_type", input.eventType)
    .in("platform", [input.platform, "all"])
    .order("platform", { ascending: true }); // 'all' comes before specific platforms alphabetically, but specific overrides

  if (!rules || rules.length === 0) return null;

  // Prefer platform-specific rule over 'all'
  const specificRule = rules.find((r: any) => r.platform === input.platform);
  const allRule = rules.find((r: any) => r.platform === "all");
  return specificRule || allRule || null;
}

function renderTemplate(template: string, vars: Record<string, string>) {
  let out = template;
  for (const [key, val] of Object.entries(vars)) {
    out = out.replaceAll(`{{${key}}}`, val);
  }
  return out;
}

async function upsertContact(input: {
  tenant: string;
  platform: string;
  handle: string;
  displayName?: string | null;
  profileUrl?: string | null;
  avatarUrl?: string | null;
  follower: boolean;
}) {
  if (!spacebaddieSupabaseEnabled()) return null;
  const supabase = getSupabaseAdminClient();
  if (!supabase) return null;

  const now = nowIso();
  const contactId = contactIdFor({ tenant: input.tenant, platform: input.platform, handle: input.handle });
  const payload = {
    contact_id: contactId,
    tenant: input.tenant,
    platform: input.platform,
    handle: normalizeHandle(input.handle),
    display_name: input.displayName ?? null,
    profile_url: input.profileUrl ?? null,
    avatar_url: input.avatarUrl ?? null,
    follower: input.follower,
    last_interaction_at: now,
    tags: [],
    source: "spacebaddie",
    updated_at: now,
    created_at: now,
  };

  const { error } = await supabase.from("spacebaddie_contacts").upsert(payload, { onConflict: "contact_id" });
  if (error) {
    console.warn("[SPACEBADDIE] Contact upsert failed:", error.message);
    return null;
  }

  const contact: SpacebaddieContact = {
    contactId,
    tenant: input.tenant,
    platform: input.platform,
    handle: normalizeHandle(input.handle),
    displayName: input.displayName ?? null,
    profileUrl: input.profileUrl ?? null,
    avatarUrl: input.avatarUrl ?? null,
    follower: input.follower,
    lastInteractionAt: now,
    tags: [],
    source: "spacebaddie",
    createdAt: now,
    updatedAt: now,
  };

  return contact;
}

async function ensureConversation(input: { tenant: string; platform: string; contactId: string }) {
  if (!spacebaddieSupabaseEnabled()) return null;
  const supabase = getSupabaseAdminClient();
  if (!supabase) return null;

  const now = nowIso();
  const conversationId = conversationIdFor(input);
  const payload = {
    conversation_id: conversationId,
    tenant: input.tenant,
    platform: input.platform,
    contact_id: input.contactId,
    status: "open",
    last_message_at: now,
    updated_at: now,
    created_at: now,
  };

  const { error } = await supabase.from("spacebaddie_conversations").upsert(payload, { onConflict: "conversation_id" });
  if (error) {
    console.warn("[SPACEBADDIE] Conversation upsert failed:", error.message);
    return null;
  }

  return conversationId;
}

async function insertSignal(input: {
  tenant: string;
  platform: string;
  type: string;
  contactId?: string | null;
  conversationId?: string | null;
  content?: string | null;
  metadata?: Record<string, unknown>;
}) {
  if (!spacebaddieSupabaseEnabled()) return;
  const supabase = getSupabaseAdminClient();
  if (!supabase) return;

  const payload = {
    signal_id: `sb_signal_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    tenant: input.tenant,
    platform: input.platform,
    type: input.type,
    contact_id: input.contactId ?? null,
    conversation_id: input.conversationId ?? null,
    content: input.content ?? null,
    metadata: input.metadata ?? null,
    created_at: nowIso(),
  };

  const { error } = await supabase.from("spacebaddie_social_signals").insert(payload);
  if (error) {
    console.warn("[SPACEBADDIE] Signal insert failed:", error.message);
  }
}

async function enqueueMessage(input: {
  tenant: string;
  conversationId: string;
  contactId: string;
  channel: string;
  content: string;
}) {
  if (!spacebaddieSupabaseEnabled()) return;
  const supabase = getSupabaseAdminClient();
  if (!supabase) return;

  const payload = {
    message_id: `sb_msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    tenant: input.tenant,
    conversation_id: input.conversationId,
    contact_id: input.contactId,
    direction: "outgoing",
    channel: input.channel,
    content: input.content,
    status: "queued",
    created_at: nowIso(),
  };

  const { error } = await supabase.from("spacebaddie_messages").insert(payload);
  if (error) {
    console.warn("[SPACEBADDIE] Message enqueue failed:", error.message);
  }
}

export async function handleSpacebaddieSocialSignal(input: SpacebaddieSocialSignalInput) {
  if (!spacebaddieSupabaseEnabled()) {
    return { ok: false, reason: "supabase_disabled" } as const;
  }

  const contact = await upsertContact({
    tenant: input.tenant,
    platform: input.platform,
    handle: input.handle,
    displayName: input.displayName,
    profileUrl: input.profileUrl,
    avatarUrl: input.avatarUrl,
    follower: input.eventType === "follow",
  });

  const contactId = contact?.contactId || contactIdFor(input);
  const conversationId = await ensureConversation({ tenant: input.tenant, platform: input.platform, contactId });

  await insertSignal({
    tenant: input.tenant,
    platform: input.platform,
    type: input.eventType,
    contactId,
    conversationId,
    content: input.content ?? null,
    metadata: input.metadata,
  });

  emitSignal({
    source: "spacebaddie",
    type: "spacebaddie.social.signal.received",
    priority: "high",
    payload: {
      tenant: input.tenant,
      platform: input.platform,
      eventType: input.eventType,
      handle: normalizeHandle(input.handle),
      contactId,
      conversationId,
    },
  });

  // Check DB-stored engage rules first, then fall back to env vars
  let shouldAutoReply = false;
  let replyTemplate: string | null = null;

  const dbRule = await getEngageRuleFromDB({
    eventType: input.eventType,
    platform: input.platform,
  });

  if (dbRule) {
    // DB rule exists -- use it
    shouldAutoReply = dbRule.enabled;
    replyTemplate = dbRule.template;
  } else {
    // Fall back to env var approach
    shouldAutoReply = autoReplyEnabled();
    replyTemplate = templateFor(input.eventType);
  }

  if (shouldAutoReply && conversationId && replyTemplate) {
    const content = renderTemplate(replyTemplate, {
      handle: normalizeHandle(input.handle),
    });
    const channel = input.eventType === "comment" ? "comment_reply" : "dm";
    await enqueueMessage({
      tenant: input.tenant,
      conversationId,
      contactId,
      channel,
      content,
    });

    emitSignal({
      source: "spacebaddie",
      type: "spacebaddie.social.message.queued",
      priority: "medium",
      payload: {
        tenant: input.tenant,
        platform: input.platform,
        eventType: input.eventType,
        contactId,
        conversationId,
        channel,
      },
    });
  }

  return { ok: true } as const;
}
