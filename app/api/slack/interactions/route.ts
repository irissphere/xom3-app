import { NextResponse } from "next/server";
import crypto from "crypto";
import { triggerWorkflow } from "@/lib/n8n/trigger";
import { logEvent } from "@/lib/uoi/store";
import { approveSignup, denySignup } from "@/lib/signup-approval/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/slack/interactions
 * Handles Slack interactive component payloads (button clicks, etc.)
 * 
 * Slack sends a URL-encoded payload to this endpoint when users
 * interact with buttons in Block Kit messages.
 */
export async function POST(request: Request) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    
    // Verify Slack signature (if signing secret is configured)
    const signingSecret = process.env.SLACK_SIGNING_SECRET;
    if (signingSecret) {
      const timestamp = request.headers.get("x-slack-request-timestamp");
      const signature = request.headers.get("x-slack-signature");
      
      if (!timestamp || !signature) {
        return NextResponse.json({ error: "Missing signature headers" }, { status: 401 });
      }
      
      // Check timestamp to prevent replay attacks (5 minute window)
      const now = Math.floor(Date.now() / 1000);
      if (Math.abs(now - parseInt(timestamp)) > 60 * 5) {
        return NextResponse.json({ error: "Request too old" }, { status: 401 });
      }
      
      // Verify signature
      const sigBasestring = `v0:${timestamp}:${rawBody}`;
      const hmac = crypto.createHmac("sha256", signingSecret);
      hmac.update(sigBasestring);
      const expectedSignature = `v0=${hmac.digest("hex")}`;
      
      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    // Parse URL-encoded payload
    const params = new URLSearchParams(rawBody);
    const payloadStr = params.get("payload");
    
    if (!payloadStr) {
      return NextResponse.json({ error: "No payload" }, { status: 400 });
    }

    const payload = JSON.parse(payloadStr);
    
    // Handle different interaction types
    if (payload.type === "block_actions") {
      return handleBlockActions(payload);
    }

    // Default response
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("[SLACK_INTERACTIONS] Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal error" },
      { status: 500 }
    );
  }
}

/**
 * Handle block_actions (button clicks)
 */
async function handleBlockActions(payload: any) {
  const actions = payload.actions || [];
  const user = payload.user;
  const channel = payload.channel;
  const messageTs = payload.message?.ts;

  for (const action of actions) {
    const actionId = action.action_id;
    const actionValue = action.value ? JSON.parse(action.value) : {};

    console.log(`[SLACK_ACTION] ${actionId} by ${user?.name || user?.id}`);

    // Log to UOI
    logEvent({
      type: "decision",
      source: "operator",
      description: `Slack action: ${actionId}`,
      metadata: {
        actionId,
        proposalId: actionValue.proposalId,
        userId: user?.id,
        userName: user?.name,
      },
    });

    switch (actionId) {
      case "start_proposal":
        await handleStartProposal(actionValue, user);
        break;

      case "send_followup_email":
        await handleSendFollowupEmail(actionValue, user);
        break;
        
      case "schedule_call":
        await handleScheduleCall(actionValue, user);
        break;
        
      case "mark_contacted":
        await handleMarkContacted(actionValue, user);
        break;

      case "approve_starter":
      case "approve_pro":
      case "approve_enterprise":
        await handleApproveSignup(actionId, actionValue, user);
        break;

      case "deny_signup":
        await handleDenySignup(actionValue, user);
        break;
        
      default:
        console.warn(`[SLACK_ACTION] Unknown action: ${actionId}`);
    }

    // Update the original message to show action was taken
    if (process.env.SLACK_BOT_TOKEN && channel?.id && messageTs) {
      await updateMessageWithAction(channel.id, messageTs, actionId, user?.name);
    }
  }

  // Acknowledge immediately (Slack requires response within 3 seconds)
  return NextResponse.json({ ok: true });
}

/**
 * Handle "Start Proposal" action
 */
async function handleStartProposal(value: { proposalId?: string; email?: string; name?: string }, user: any) {
  const { proposalId, email, name } = value;

  console.log(`[SLACK_ACTION] Starting proposal for ${name} (${proposalId})`);

  // Log to UOI
  logEvent({
    type: "decision",
    source: "operator",
    description: `Proposal ${proposalId} started for ${name}`,
    metadata: {
      proposalId,
      status: "in_progress",
      startedBy: user?.name || "Operator",
    },
  });

  // Trigger n8n workflow to kick off proposal process
  try {
    await triggerWorkflow("xom3-proposal-start", {
      proposalId,
      recipientEmail: email,
      recipientName: name,
      triggeredBy: user?.name || "Operator",
      triggeredAt: new Date().toISOString(),
      type: "start_proposal",
    });
  } catch (err) {
    console.warn("[SLACK_ACTION] Start proposal workflow failed:", err);
  }
}

/**
 * Handle "Send Follow-up Email" action
 */
async function handleSendFollowupEmail(value: { proposalId?: string; email?: string }, user: any) {
  const { proposalId, email } = value;

  if (!email) {
    console.warn("[SLACK_ACTION] No email for follow-up");
    return;
  }

  console.log(`[SLACK_ACTION] Sending follow-up email to ${email} for proposal ${proposalId}`);

  // Trigger n8n workflow for follow-up email
  try {
    await triggerWorkflow("xom3-proposal-followup", {
      proposalId,
      recipientEmail: email,
      triggeredBy: user?.name || "Operator",
      triggeredAt: new Date().toISOString(),
      type: "followup_email",
    });
  } catch (err) {
    console.warn("[SLACK_ACTION] Follow-up workflow failed:", err);
  }
}

/**
 * Handle "Schedule Call" action
 */
async function handleScheduleCall(value: { proposalId?: string; email?: string }, user: any) {
  const { proposalId, email } = value;

  console.log(`[SLACK_ACTION] Scheduling call for proposal ${proposalId}`);

  // Option 1: Send Calendly link via email
  // Option 2: Create a task in CRM
  // Option 3: Open booking page

  try {
    await triggerWorkflow("xom3-proposal-schedule", {
      proposalId,
      recipientEmail: email,
      triggeredBy: user?.name || "Operator",
      triggeredAt: new Date().toISOString(),
      type: "schedule_call",
      calendlyLink: process.env.CALENDLY_LINK || "https://calendly.com/xom3/demo",
    });
  } catch (err) {
    console.warn("[SLACK_ACTION] Schedule workflow failed:", err);
  }
}

/**
 * Handle "Mark as Contacted" action
 */
async function handleMarkContacted(value: { proposalId?: string }, user: any) {
  const { proposalId } = value;

  console.log(`[SLACK_ACTION] Marking proposal ${proposalId} as contacted`);

  // Log the status change
  logEvent({
    type: "decision",
    source: "operator",
    description: `Proposal ${proposalId} marked as contacted by ${user?.name || "Operator"}`,
    metadata: {
      proposalId,
      status: "contacted",
      updatedBy: user?.name,
    },
  });

  // Could also update Airtable/CRM here
  try {
    await triggerWorkflow("xom3-proposal-status", {
      proposalId,
      status: "contacted",
      updatedBy: user?.name || "Operator",
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn("[SLACK_ACTION] Status update workflow failed:", err);
  }
}

/**
 * Handle signup approval with tier selection
 */
async function handleApproveSignup(actionId: string, value: { signupId?: string; email?: string; tier?: string }, user: any) {
  const { signupId, email, tier } = value;
  const tierName = (tier || actionId.replace("approve_", "")) as "starter" | "pro" | "enterprise";
  const approvedBy = user?.name || "Operator";

  console.log(`[SLACK_ACTION] Approving signup for ${email} with tier ${tierName}`);

  // Store approval
  if (signupId) {
    approveSignup(signupId, tierName, approvedBy);
  }

  // Log to UOI
  logEvent({
    type: "decision",
    source: "operator",
    description: `Signup approved: ${email} → ${tierName} tier`,
    metadata: {
      signupId,
      email,
      tier: tierName,
      approvedBy,
      status: "approved",
    },
  });

  // Trigger n8n workflow to create account
  try {
    await triggerWorkflow("xom3-signup-approved", {
      signupId,
      email,
      tier: tierName,
      approvedBy,
      approvedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn("[SLACK_ACTION] Approval workflow failed:", err);
  }
}

/**
 * Handle signup denial
 */
async function handleDenySignup(value: { signupId?: string; email?: string }, user: any) {
  const { signupId, email } = value;
  const deniedBy = user?.name || "Operator";

  console.log(`[SLACK_ACTION] Denying signup for ${email}`);

  // Store denial
  if (signupId) {
    denySignup(signupId, deniedBy);
  }

  // Log to UOI
  logEvent({
    type: "decision",
    source: "operator",
    description: `Signup denied: ${email}`,
    metadata: {
      signupId,
      email,
      deniedBy,
      status: "denied",
    },
  });

  // Trigger n8n workflow to send denial email
  try {
    await triggerWorkflow("xom3-signup-denied", {
      signupId,
      email,
      deniedBy,
      deniedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn("[SLACK_ACTION] Denial workflow failed:", err);
  }
}

/**
 * Update the Slack message to show action was taken
 */
async function updateMessageWithAction(channelId: string, messageTs: string, actionId: string, userName?: string) {
  const botToken = process.env.SLACK_BOT_TOKEN;
  if (!botToken) return;

  const actionLabels: Record<string, string> = {
    start_proposal: "🚀 Proposal started",
    send_followup_email: "📧 Follow-up email sent",
    schedule_call: "📅 Call scheduled",
    mark_contacted: "✅ Marked as contacted",
    approve_starter: "✅ Approved with Starter tier",
    approve_pro: "✅ Approved with Pro tier",
    approve_enterprise: "✅ Approved with Enterprise tier",
    deny_signup: "❌ Signup denied",
  };

  const actionLabel = actionLabels[actionId] || actionId;
  const actor = userName || "Operator";
  const timestamp = new Date().toLocaleTimeString();

  try {
    // Post a thread reply to show the action
    await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel: channelId,
        thread_ts: messageTs,
        text: `${actionLabel} by ${actor} at ${timestamp}`,
      }),
    });
  } catch (err) {
    console.warn("[SLACK] Failed to post action update:", err);
  }
}

