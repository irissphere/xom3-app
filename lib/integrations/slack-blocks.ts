/**
 * Slack Block Kit Message Builder
 * Creates rich interactive messages for enterprise proposals
 */

import { ProposalAnalysis } from "@/lib/ai/proposal-analyzer";

export interface ProposalData {
  id: string;
  contact: {
    name: string;
    email: string;
    phone?: string;
    website?: string;
  };
  company: {
    industry: string;
    teamSize?: string;
  };
  businesses: Array<{
    companyName: string;
    industry: string;
    integrations: string;
  }>;
  requirements: {
    timeline: string;
    currentTools?: string;
    painPoints?: string;
    customNeeds?: string;
  };
  submittedAt: string;
}

export interface SlackBlockMessage {
  text: string;
  blocks: any[];
}

/**
 * Build a rich Slack message for a new enterprise proposal
 */
export function buildProposalSlackMessage(
  proposal: ProposalData,
  analysis: ProposalAnalysis
): SlackBlockMessage {
  const costRange = `$${analysis.onboardingCost.low.toLocaleString()} - $${analysis.onboardingCost.high.toLocaleString()}`;
  const hoursRange = `${analysis.loe.setupHours.low}-${analysis.loe.setupHours.high}`;
  
  const businessList = proposal.businesses
    .map((b) => `• ${b.companyName} (${b.industry})`)
    .join('\n');

  const blocks: any[] = [
    // Header
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "🏢 NEW ENTERPRISE PROPOSAL",
        emoji: true,
      },
    },
    // Contact Info
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Contact:*\n${proposal.contact.name}`,
        },
        {
          type: "mrkdwn",
          text: `*Email:*\n${proposal.contact.email}`,
        },
        {
          type: "mrkdwn",
          text: `*Phone:*\n${proposal.contact.phone || 'Not provided'}`,
        },
        {
          type: "mrkdwn",
          text: `*Industry:*\n${proposal.company.industry || 'Not specified'}`,
        },
      ],
    },
    // Team Size
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Team Size:*\n${proposal.company.teamSize || 'Not specified'}`,
        },
        {
          type: "mrkdwn",
          text: `*Website:*\n${proposal.contact.website || 'Not provided'}`,
        },
      ],
    },
    // Divider
    { type: "divider" },
    // Businesses
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*📋 Businesses (${proposal.businesses.length}):*\n${businessList}`,
      },
    },
    // Timeline & Requirements
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Timeline:*\n${proposal.requirements.timeline}`,
        },
        {
          type: "mrkdwn",
          text: `*Current Tools:*\n${proposal.requirements.currentTools || 'None specified'}`,
        },
      ],
    },
  ];

  // Pain Points (if provided)
  if (proposal.requirements.painPoints) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Pain Points:*\n${proposal.requirements.painPoints.slice(0, 500)}${proposal.requirements.painPoints.length > 500 ? '...' : ''}`,
      },
    });
  }

  // Custom Needs (if provided)
  if (proposal.requirements.customNeeds) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Custom Needs:*\n${proposal.requirements.customNeeds.slice(0, 500)}${proposal.requirements.customNeeds.length > 500 ? '...' : ''}`,
      },
    });
  }

  // Divider before AI Analysis
  blocks.push({ type: "divider" });

  // AI Analysis Section
  blocks.push({
    type: "section",
    text: {
      type: "mrkdwn",
      text: `*🤖 AI ANALYSIS*`,
    },
  });

  blocks.push({
    type: "section",
    fields: [
      {
        type: "mrkdwn",
        text: `*Est. Onboarding:*\n${costRange}`,
      },
      {
        type: "mrkdwn",
        text: `*LOE:*\n${hoursRange} hrs setup`,
      },
      {
        type: "mrkdwn",
        text: `*Recommended Tier:*\n${analysis.recommendedTier}`,
      },
      {
        type: "mrkdwn",
        text: `*Onboarding:*\n${analysis.loe.onboardingWeeks} week(s)`,
      },
    ],
  });

  // Add-ons
  if (analysis.addOns.length > 0) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Suggested Add-ons:* ${analysis.addOns.join(', ')}`,
      },
    });
  }

  // Risks
  if (analysis.risks.length > 0) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*⚠️ Risks:*\n${analysis.risks.map(r => `• ${r}`).join('\n')}`,
      },
    });
  }

  // Divider before actions
  blocks.push({ type: "divider" });

  // Action Buttons
  blocks.push({
    type: "actions",
    elements: [
      {
        type: "button",
        text: {
          type: "plain_text",
          text: "🚀 Start Proposal",
          emoji: true,
        },
        style: "primary",
        action_id: "start_proposal",
        value: JSON.stringify({ proposalId: proposal.id, email: proposal.contact.email, name: proposal.contact.name }),
      },
      {
        type: "button",
        text: {
          type: "plain_text",
          text: "📧 Send Follow-up Email",
          emoji: true,
        },
        action_id: "send_followup_email",
        value: JSON.stringify({ proposalId: proposal.id, email: proposal.contact.email }),
      },
      {
        type: "button",
        text: {
          type: "plain_text",
          text: "📅 Schedule Call",
          emoji: true,
        },
        action_id: "schedule_call",
        value: JSON.stringify({ proposalId: proposal.id, email: proposal.contact.email }),
      },
      {
        type: "button",
        text: {
          type: "plain_text",
          text: "✅ Mark Contacted",
          emoji: true,
        },
        action_id: "mark_contacted",
        value: JSON.stringify({ proposalId: proposal.id }),
      },
    ],
  });

  // Context footer
  blocks.push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: `Submitted: ${new Date(proposal.submittedAt).toLocaleString()} | ID: ${proposal.id}`,
      },
    ],
  });

  return {
    text: `New Enterprise Proposal from ${proposal.contact.name} (${proposal.contact.email})`,
    blocks,
  };
}

/**
 * Send a Block Kit message to Slack
 */
export async function sendSlackBlockMessage(
  message: SlackBlockMessage,
  channel?: string
): Promise<{ ok: boolean; error?: string }> {
  const botToken = process.env.SLACK_BOT_TOKEN;
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  const targetChannel = channel || process.env.SLACK_PROPOSALS_CHANNEL || '#enterprise-proposals';

  // Prefer Bot Token API for interactive messages
  if (botToken) {
    try {
      // First, try to resolve channel name to ID
      let channelId = targetChannel;
      
      if (targetChannel.startsWith('#')) {
        const channelName = targetChannel.substring(1);
        const listResponse = await fetch('https://slack.com/api/conversations.list', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${botToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            types: 'public_channel,private_channel',
            limit: 1000,
          }),
        });

        if (listResponse.ok) {
          const listData = await listResponse.json();
          if (listData.ok && listData.channels) {
            const found = listData.channels.find((c: any) => c.name === channelName);
            if (found) {
              channelId = found.id;
            }
          }
        }
      }

      const response = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${botToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel: channelId,
          text: message.text,
          blocks: message.blocks,
        }),
      });

      const data = await response.json();
      
      if (!data.ok) {
        console.error('[Slack] API error:', data.error);
        return { ok: false, error: data.error };
      }

      return { ok: true };
    } catch (error: any) {
      console.error('[Slack] Error sending block message:', error);
      return { ok: false, error: error.message };
    }
  }

  // Fallback to webhook (no interactive buttons)
  if (webhookUrl) {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: message.text,
          blocks: message.blocks,
        }),
      });

      if (!response.ok) {
        return { ok: false, error: `Webhook error: ${response.status}` };
      }

      return { ok: true };
    } catch (error: any) {
      console.error('[Slack] Webhook error:', error);
      return { ok: false, error: error.message };
    }
  }

  console.warn('[Slack] No SLACK_BOT_TOKEN or SLACK_WEBHOOK_URL configured');
  return { ok: false, error: 'Slack not configured' };
}

/**
 * Build a simple update message for button click feedback
 */
export function buildActionResponseMessage(
  action: string,
  proposalId: string,
  actorName?: string
): any[] {
  const actionMap: Record<string, string> = {
    start_proposal: '🚀 Proposal started',
    send_followup_email: '📧 Follow-up email sent',
    schedule_call: '📅 Call scheduled',
    mark_contacted: '✅ Marked as contacted',
  };

  const actionText = actionMap[action] || action;
  const actor = actorName || 'Operator';

  return [
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `${actionText} by ${actor} • ${new Date().toLocaleTimeString()}`,
        },
      ],
    },
  ];
}

/**
 * Build a Slack message for new signup approval
 */
export function buildSignupApprovalMessage(signupData: {
  signupId: string;
  name: string;
  email: string;
  phone?: string;
  businessName?: string;
  goal?: string;
  submittedAt: string;
}): SlackBlockMessage {
  const blocks: any[] = [
    // Header
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "🆕 NEW SIGNUP REQUEST",
        emoji: true,
      },
    },
    // Contact Info
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Name:*\n${signupData.name}`,
        },
        {
          type: "mrkdwn",
          text: `*Email:*\n${signupData.email}`,
        },
        {
          type: "mrkdwn",
          text: `*Phone:*\n${signupData.phone || 'Not provided'}`,
        },
        {
          type: "mrkdwn",
          text: `*Business:*\n${signupData.businessName || 'Not provided'}`,
        },
      ],
    },
  ];

  // Goal if provided
  if (signupData.goal) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Goal:* ${signupData.goal}`,
      },
    });
  }

  // Divider before actions
  blocks.push({ type: "divider" });

  // Tier Selection Buttons
  blocks.push({
    type: "section",
    text: {
      type: "mrkdwn",
      text: "*Select Tier & Approve:*",
    },
  });

  blocks.push({
    type: "actions",
    elements: [
      {
        type: "button",
        text: {
          type: "plain_text",
          text: "✅ Starter",
          emoji: true,
        },
        style: "primary",
        action_id: "approve_starter",
        value: JSON.stringify({ signupId: signupData.signupId, email: signupData.email, tier: "starter" }),
      },
      {
        type: "button",
        text: {
          type: "plain_text",
          text: "✅ Pro",
          emoji: true,
        },
        style: "primary",
        action_id: "approve_pro",
        value: JSON.stringify({ signupId: signupData.signupId, email: signupData.email, tier: "pro" }),
      },
      {
        type: "button",
        text: {
          type: "plain_text",
          text: "✅ Enterprise",
          emoji: true,
        },
        style: "primary",
        action_id: "approve_enterprise",
        value: JSON.stringify({ signupId: signupData.signupId, email: signupData.email, tier: "enterprise" }),
      },
      {
        type: "button",
        text: {
          type: "plain_text",
          text: "❌ Deny",
          emoji: true,
        },
        style: "danger",
        action_id: "deny_signup",
        value: JSON.stringify({ signupId: signupData.signupId, email: signupData.email }),
      },
    ],
  });

  // Context footer
  blocks.push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: `Submitted: ${new Date(signupData.submittedAt).toLocaleString()} | ID: ${signupData.signupId}`,
      },
    ],
  });

  return {
    text: `New signup request from ${signupData.name} (${signupData.email})`,
    blocks,
  };
}

