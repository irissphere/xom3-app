// Broadcast Engine - Agent Workflow: Script Module
// Provides recommended replies, DM scripts, comment scripts, warm-up scripts, follow-up scripts, closing scripts

import { LeadObject } from "../funnel-modules/lead-intake";
import { RoutingDecision } from "../funnel-modules/routing";
import { Platform } from "../types";

export interface AgentScript {
  id: string;
  type: "comment_reply" | "dm_reply" | "warmup" | "followup" | "closing" | "trend_campaign";
  platform: Platform;
  script: string;
  variations: string[];
  context: {
    leadTier: string;
    leadType: string;
    urgency: string;
    platform: Platform;
  };
}

/**
 * Generate comment reply script
 */
export function generateCommentReplyScript(
  lead: LeadObject,
  routing: RoutingDecision
): AgentScript {
  const platform = lead.platform as Platform;
  
  let script = "";
  const variations: string[] = [];
  
  if (lead.leadTier === "hot") {
    script = `Hi ${lead.username || "there"}! Thanks for your comment. I'd love to help you with ${lead.content.includes("plan") ? "choosing a plan" : "that"}. Can you DM me so we can discuss your specific needs?`;
    
    variations.push(
      `Hey ${lead.username || "there"}! I saw your comment and I think I can help. Let's chat - DM me!`,
      `Thanks for reaching out! I'd be happy to help you with ${lead.content.includes("plan") ? "plan selection" : "this"}. Send me a DM and we'll get started.`
    );
  } else if (lead.leadTier === "warm") {
    script = `Hi ${lead.username || "there"}! Great question. I have some resources that might help. Check the link in my bio for more info, or DM me if you want to discuss further!`;
    
    variations.push(
      `Thanks for your interest! I've got some helpful info in the link in my bio. Feel free to DM me if you have questions!`,
      `Appreciate the comment! Check out the link in my bio for more details, or DM me to chat.`
    );
  } else {
    script = `Thanks for your comment! I appreciate the engagement. If you're interested in learning more, check the link in my bio!`;
    
    variations.push(
      `Thanks for commenting! If you want to learn more, the link in my bio has all the details.`,
      `Appreciate the comment! Feel free to check out the link in my bio for more information.`
    );
  }
  
  return {
    id: `script_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: "comment_reply",
    platform,
    script,
    variations,
    context: {
      leadTier: lead.leadTier,
      leadType: lead.leadType,
      urgency: lead.urgency,
      platform
    }
  };
}

/**
 * Generate DM reply script
 */
export function generateDMReplyScript(
  lead: LeadObject,
  routing: RoutingDecision
): AgentScript {
  const platform = lead.platform as Platform;
  
  let script = "";
  const variations: string[] = [];
  
  if (lead.leadTier === "hot") {
    script = `Hi ${lead.username || "there"}! Thanks for reaching out. I'd love to help you with ${lead.content.includes("plan") ? "choosing the right plan" : "this"}. Can you tell me a bit more about what you're looking for?`;
    
    variations.push(
      `Hey! Thanks for the DM. I'm here to help. What specific questions do you have?`,
      `Hi! I saw your message and I'd be happy to assist. What are you looking to accomplish?`
    );
  } else if (lead.leadTier === "warm") {
    script = `Hi ${lead.username || "there"}! Thanks for your interest. I have some resources that might be helpful. What specific area are you most interested in?`;
    
    variations.push(
      `Thanks for reaching out! I'd love to help. What questions do you have?`,
      `Hi! I appreciate your interest. Let me know what you'd like to learn more about.`
    );
  } else {
    script = `Hi ${lead.username || "there"}! Thanks for your message. I'd be happy to share some information. What would you like to know more about?`;
    
    variations.push(
      `Thanks for reaching out! I'm here to help. What can I assist you with?`,
      `Hi! I appreciate your interest. What questions do you have?`
    );
  }
  
  return {
    id: `script_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: "dm_reply",
    platform,
    script,
    variations,
    context: {
      leadTier: lead.leadTier,
      leadType: lead.leadType,
      urgency: lead.urgency,
      platform
    }
  };
}

/**
 * Generate warm-up script
 */
export function generateWarmupScript(
  lead: LeadObject,
  routing: RoutingDecision
): AgentScript {
  const platform = lead.platform as Platform;
  
  let script = "";
  const variations: string[] = [];
  
  script = `Hi ${lead.username || "there"}! I noticed you've been engaging with our content. I thought you might be interested in learning more about our services. Would you like to schedule a quick call to discuss?`;
  
  variations.push(
    `Hey ${lead.username || "there"}! I saw you've been checking out our content. I'd love to chat about how we can help. Interested in a quick call?`,
    `Hi! I noticed your engagement with our posts. I think we might have something that could help you. Want to schedule a quick conversation?`
  );
  
  return {
    id: `script_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: "warmup",
    platform,
    script,
    variations,
    context: {
      leadTier: lead.leadTier,
      leadType: lead.leadType,
      urgency: lead.urgency,
      platform
    }
  };
}

/**
 * Generate follow-up script
 */
export function generateFollowupScript(
  lead: LeadObject,
  routing: RoutingDecision,
  previousInteraction?: string
): AgentScript {
  const platform = lead.platform as Platform;
  
  let script = "";
  const variations: string[] = [];
  
  script = `Hi ${lead.username || "there"}! I wanted to follow up on our previous conversation. ${previousInteraction || "Are you still interested in learning more?"} Let me know if you have any questions!`;
  
  variations.push(
    `Hey! Just checking in. ${previousInteraction || "Are you still interested?"} I'm here if you need anything.`,
    `Hi! Following up on our chat. ${previousInteraction || "What questions do you have?"} I'd love to help.`
  );
  
  return {
    id: `script_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: "followup",
    platform,
    script,
    variations,
    context: {
      leadTier: lead.leadTier,
      leadType: lead.leadType,
      urgency: lead.urgency,
      platform
    }
  };
}

/**
 * Generate closing script
 */
export function generateClosingScript(
  lead: LeadObject,
  routing: RoutingDecision
): AgentScript {
  const platform = lead.platform as Platform;
  
  let script = "";
  const variations: string[] = [];
  
  script = `Hi ${lead.username || "there"}! Based on our conversation, I think we have a great solution for you. Would you like to move forward? I can help you get started today.`;
  
  variations.push(
    `Hey! I think we've found the right fit. Ready to get started? I'm here to help you through the process.`,
    `Hi! Based on everything we've discussed, I believe this is the right solution. Want to take the next step?`
  );
  
  return {
    id: `script_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: "closing",
    platform,
    script,
    variations,
    context: {
      leadTier: lead.leadTier,
      leadType: lead.leadType,
      urgency: lead.urgency,
      platform
    }
  };
}

/**
 * Generate trend campaign script
 */
export function generateTrendCampaignScript(
  lead: LeadObject,
  routing: RoutingDecision,
  trendContext?: string
): AgentScript {
  const platform = lead.platform as Platform;
  
  let script = "";
  const variations: string[] = [];
  
  script = `Hi ${lead.username || "there"}! I noticed you're interested in ${trendContext || "this trending topic"}. We have some great resources on this. Would you like to learn more?`;
  
  variations.push(
    `Hey! I saw your interest in ${trendContext || "this topic"}. I think we have something that could help. Want to chat?`,
    `Hi! ${trendContext || "This topic"} is really hot right now. We've got some insights that might interest you. Want to learn more?`
  );
  
  return {
    id: `script_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: "trend_campaign",
    platform,
    script,
    variations,
    context: {
      leadTier: lead.leadTier,
      leadType: lead.leadType,
      urgency: lead.urgency,
      platform
    }
  };
}

/**
 * Get script for lead and routing
 */
export function getScriptForLead(
  lead: LeadObject,
  routing: RoutingDecision,
  scriptType?: AgentScript["type"]
): AgentScript {
  const type = scriptType || (
    routing.entryPoint === "comment_intent" ? "comment_reply" :
    routing.entryPoint === "dm_intent" ? "dm_reply" :
    routing.entryPoint === "high_engagement" ? "warmup" :
    routing.entryPoint === "trend_spike" ? "trend_campaign" :
    "followup"
  );
  
  switch (type) {
    case "comment_reply":
      return generateCommentReplyScript(lead, routing);
    case "dm_reply":
      return generateDMReplyScript(lead, routing);
    case "warmup":
      return generateWarmupScript(lead, routing);
    case "followup":
      return generateFollowupScript(lead, routing);
    case "closing":
      return generateClosingScript(lead, routing);
    case "trend_campaign":
      return generateTrendCampaignScript(lead, routing);
    default:
      return generateFollowupScript(lead, routing);
  }
}
