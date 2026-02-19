import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dispatchBaseUrl = process.env.SPACEBADDIE_DISPATCH_BASE_URL || "http://localhost:3000";

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "[SPACEBADDIE] Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function nowIso() {
  return new Date().toISOString();
}

function contactIdFor(tenant, platform, handle) {
  const base = `${tenant}:${platform}:${handle}`.replace(/\s+/g, "");
  return `sb_contact_${Buffer.from(base).toString("base64url").slice(0, 22)}`;
}

function conversationIdFor(tenant, platform, contactId) {
  const base = `${tenant}:${platform}:${contactId}`;
  return `sb_convo_${Buffer.from(base).toString("base64url").slice(0, 22)}`;
}

async function enqueueMessage() {
  const tenant = "spacebaddie";
  const platform = "instagram";
  const handle = "test_handle";
  const contactId = contactIdFor(tenant, platform, handle);
  const conversationId = conversationIdFor(tenant, platform, contactId);
  const now = nowIso();

  await supabase.from("spacebaddie_contacts").upsert({
    contact_id: contactId,
    tenant,
    platform,
    handle,
    display_name: "Test Handle",
    follower: true,
    last_interaction_at: now,
    updated_at: now,
    created_at: now,
  });

  await supabase.from("spacebaddie_conversations").upsert({
    conversation_id: conversationId,
    tenant,
    platform,
    contact_id: contactId,
    status: "open",
    last_message_at: now,
    updated_at: now,
    created_at: now,
  });

  const messageId = `sb_msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const { error } = await supabase.from("spacebaddie_messages").insert({
    message_id: messageId,
    tenant,
    conversation_id: conversationId,
    contact_id: contactId,
    direction: "outgoing",
    channel: "dm",
    content: "SpaceBaddie test message from queue script.",
    status: "queued",
    created_at: now,
  });

  if (error) {
    throw new Error(error.message);
  }

  return { tenant, platform, messageId, contactId, conversationId };
}

async function triggerDispatch(limit = 5) {
  const response = await fetch(`${dispatchBaseUrl}/api/spacebaddie/message-dispatch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ limit }),
  });
  const data = await response.json();
  return { status: response.status, data };
}

async function run() {
  console.log("[SPACEBADDIE] Enqueueing test message...");
  const queued = await enqueueMessage();
  console.log("[SPACEBADDIE] Queued:", queued);

  console.log("[SPACEBADDIE] Dispatching queue...");
  const result = await triggerDispatch();
  console.log("[SPACEBADDIE] Dispatch result:", result);
}

run().catch((err) => {
  console.error("[SPACEBADDIE] Test failed:", err);
  process.exit(1);
});
