// Broadcast Engine - Lead Scoring Engine (The Intelligence Core)
// Turns raw social signals into ranked, classified, actionable leads

import { LeadSignal, ScrapedEngagement } from "./types";
import { analyzeSentiment } from "./scraping-engine";

export type LeadTier = 
  | "hot"      // Score 80-100
  | "warm"     // Score 60-79
  | "interested" // Score 40-59
  | "cold"     // Score 20-39
  | "noise";   // Score 0-19

export interface LeadScore {
  total: number; // 0-100
  tier: LeadTier;
  urgency: "high" | "medium" | "low";
  intent: number; // 0-40
  engagement: number; // 0-20
  behavior: number; // 0-20
  identity: number; // 0-15
  trend: number; // 0-5
  breakdown: {
    intentSignals: string[];
    engagementSignals: string[];
    behaviorSignals: string[];
    identitySignals: string[];
    trendSignals: string[];
  };
}

export interface LeadClassification {
  leadId: string;
  score: LeadScore;
  pipelineEntryPoint: "warm_lead" | "interested" | "cold_lead" | "none" | "ignore";
  trendAlignment?: number;
  agentAssignment: {
    required: boolean;
    priority: "immediate" | "assigned" | "optional" | "none";
    responseTime?: string; // "1 hour", "24 hours", etc.
  };
  taskDescription: string | null;
  hseState: string[];
  uoiSignal: string;
}

/**
 * Intent keywords (strongest signals)
 */
const INTENT_KEYWORDS = {
  direct: ["i need help", "i need", "help me", "i want", "i'm interested", "interested", "sign up", "signup", "how do i", "how can i", "can you help", "need help"],
  pricing: ["price", "pricing", "cost", "how much", "what's the price", "what does it cost", "quote", "pricing info"],
  signup: ["sign up", "signup", "register", "join", "get started", "start", "begin", "enroll", "enrollment"],
  contact: ["dm me", "dm", "message me", "contact me", "reach out", "call me", "email me", "get in touch"],
  question: ["how does", "how do", "what is", "what are", "tell me", "explain", "can you", "do you", "does it", "is it", "will it", "should i"]
};

/**
 * Industry keywords
 */
const INDUSTRY_KEYWORDS = [
  "insurance", "benefits", "policy", "coverage", "healthcare", "medical", "dental", "vision",
  "plan", "enrollment", "open enrollment", "deductible", "copay", "premium", "claim", "provider",
  "health", "wellness", "preventive", "treatment", "doctor", "hospital", "clinic"
];

/**
 * Score Intent Signals (0-40 points)
 */
export function scoreIntentSignals(
  engagement: ScrapedEngagement,
  content?: string
): {
  score: number; // 0-40
  signals: string[];
} {
  if (!content) {
    return { score: 0, signals: [] };
  }
  
  const lower = content.toLowerCase();
  const signals: string[] = [];
  let score = 0;
  
  // Direct intent (30-40 points)
  for (const keyword of INTENT_KEYWORDS.direct) {
    if (lower.includes(keyword)) {
      signals.push(`direct_intent:${keyword}`);
      score = Math.max(score, 35);
    }
  }
  
  // Pricing intent (25-30 points)
  for (const keyword of INTENT_KEYWORDS.pricing) {
    if (lower.includes(keyword)) {
      signals.push(`pricing_intent:${keyword}`);
      score = Math.max(score, 28);
    }
  }
  
  // Signup intent (25-30 points)
  for (const keyword of INTENT_KEYWORDS.signup) {
    if (lower.includes(keyword)) {
      signals.push(`signup_intent:${keyword}`);
      score = Math.max(score, 28);
    }
  }
  
  // Contact intent (20-25 points)
  for (const keyword of INTENT_KEYWORDS.contact) {
    if (lower.includes(keyword)) {
      signals.push(`contact_intent:${keyword}`);
      score = Math.max(score, 23);
    }
  }
  
  // Question intent (10-15 points)
  for (const keyword of INTENT_KEYWORDS.question) {
    if (lower.includes(keyword)) {
      signals.push(`question_intent:${keyword}`);
      score = Math.max(score, 12);
    }
  }
  
  // Industry keywords boost (+5 points)
  for (const keyword of INDUSTRY_KEYWORDS) {
    if (lower.includes(keyword)) {
      signals.push(`industry_keyword:${keyword}`);
      score = Math.min(40, score + 2); // Cap at 40
    }
  }
  
  // DM is always high intent
  if (engagement.type === "dm") {
    signals.push("dm_channel");
    score = Math.max(score, 38);
  }
  
  return {
    score: Math.min(40, score),
    signals
  };
}

/**
 * Score Engagement Signals (0-20 points)
 */
export function scoreEngagementSignals(
  engagement: ScrapedEngagement,
  context?: {
    engagementHistory?: number;
    repeatViewer?: boolean;
    highEngagement?: boolean;
  }
): {
  score: number; // 0-20
  signals: string[];
} {
  const signals: string[] = [];
  let score = 0;
  
  // Engagement type scoring
  switch (engagement.type) {
    case "comment":
      score += 8;
      signals.push("engagement:comment");
      break;
    case "dm":
      score += 15;
      signals.push("engagement:dm");
      break;
    case "mention":
      score += 6;
      signals.push("engagement:mention");
      break;
    case "reply":
      score += 7;
      signals.push("engagement:reply");
      break;
    case "like":
      score += 2;
      signals.push("engagement:like");
      break;
    case "share":
      score += 5;
      signals.push("engagement:share");
      break;
    case "save":
      score += 4;
      signals.push("engagement:save");
      break;
    case "follow":
      score += 6;
      signals.push("engagement:follow");
      break;
  }
  
  // Context boosts
  if (context?.repeatViewer) {
    score += 3;
    signals.push("context:repeat_viewer");
  }
  
  if (context?.highEngagement) {
    score += 2;
    signals.push("context:high_engagement");
  }
  
  if (context?.engagementHistory && context.engagementHistory > 3) {
    score += 2;
    signals.push(`context:multiple_engagements:${context.engagementHistory}`);
  }
  
  return {
    score: Math.min(20, score),
    signals
  };
}

/**
 * Score Behavior Signals (0-20 points)
 */
export function scoreBehaviorSignals(
  engagement: ScrapedEngagement,
  context?: {
    watched80Percent?: boolean;
    savedOrShared?: boolean;
    clickedLink?: boolean;
    watchTime?: number;
    retentionCurve?: number[];
  }
): {
  score: number; // 0-20
  signals: string[];
} {
  const signals: string[] = [];
  let score = 0;
  
  // Link click (highest behavior signal)
  if (context?.clickedLink) {
    score += 15;
    signals.push("behavior:link_click");
  }
  
  // 80%+ watch time (high intent)
  if (context?.watched80Percent) {
    score += 12;
    signals.push("behavior:watched_80_percent");
  }
  
  // Save/share (shows interest)
  if (context?.savedOrShared) {
    score += 8;
    signals.push("behavior:saved_or_shared");
  }
  
  // High watch time (60%+)
  if (context?.watchTime && context.watchTime > 60) {
    score += 5;
    signals.push(`behavior:watch_time:${context.watchTime}%`);
  }
  
  // Good retention curve (stays engaged)
  if (context?.retentionCurve && context.retentionCurve.length > 0) {
    const avgRetention = context.retentionCurve.reduce((a, b) => a + b, 0) / context.retentionCurve.length;
    if (avgRetention > 70) {
      score += 3;
      signals.push(`behavior:high_retention:${avgRetention.toFixed(0)}%`);
    }
  }
  
  return {
    score: Math.min(20, score),
    signals
  };
}

/**
 * Score Identity Signals (0-15 points)
 */
export function scoreIdentitySignals(
  engagement: ScrapedEngagement,
  context?: {
    nameMatch?: boolean;
    emailMatch?: boolean;
    phoneMatch?: boolean;
    crossPlatformMatch?: boolean;
    locationMatch?: boolean;
  }
): {
  score: number; // 0-15
  signals: string[];
} {
  const signals: string[] = [];
  let score = 0;
  
  // Email match (highest identity signal)
  if (context?.emailMatch) {
    score += 10;
    signals.push("identity:email_match");
  }
  
  // Phone match
  if (context?.phoneMatch) {
    score += 8;
    signals.push("identity:phone_match");
  }
  
  // Name match
  if (context?.nameMatch) {
    score += 5;
    signals.push("identity:name_match");
  }
  
  // Cross-platform match (same person across platforms)
  if (context?.crossPlatformMatch) {
    score += 7;
    signals.push("identity:cross_platform_match");
  }
  
  // Location match
  if (context?.locationMatch) {
    score += 3;
    signals.push("identity:location_match");
  }
  
  return {
    score: Math.min(15, score),
    signals
  };
}

/**
 * Score Trend Signals (0-5 points)
 */
export function scoreTrendSignals(
  engagement: ScrapedEngagement,
  context?: {
    topicSpike?: boolean;
    keywordSpike?: boolean;
    audioSpike?: boolean;
    competitorSpike?: boolean;
    trendVelocity?: number;
  }
): {
  score: number; // 0-5
  signals: string[];
} {
  const signals: string[] = [];
  let score = 0;
  
  // Topic spike
  if (context?.topicSpike) {
    score += 2;
    signals.push("trend:topic_spike");
  }
  
  // Keyword spike
  if (context?.keywordSpike) {
    score += 2;
    signals.push("trend:keyword_spike");
  }
  
  // Audio spike
  if (context?.audioSpike) {
    score += 1;
    signals.push("trend:audio_spike");
  }
  
  // Competitor spike
  if (context?.competitorSpike) {
    score += 1;
    signals.push("trend:competitor_spike");
  }
  
  // High trend velocity
  if (context?.trendVelocity && context.trendVelocity > 70) {
    score += 1;
    signals.push(`trend:high_velocity:${context.trendVelocity}`);
  }
  
  return {
    score: Math.min(5, score),
    signals
  };
}

/**
 * Calculate complete lead score
 */
export function calculateLeadScore(
  engagement: ScrapedEngagement,
  context?: {
    // Intent context
    content?: string;
    
    // Engagement context
    engagementHistory?: number;
    repeatViewer?: boolean;
    highEngagement?: boolean;
    
    // Behavior context
    watched80Percent?: boolean;
    savedOrShared?: boolean;
    clickedLink?: boolean;
    watchTime?: number;
    retentionCurve?: number[];
    
    // Identity context
    nameMatch?: boolean;
    emailMatch?: boolean;
    phoneMatch?: boolean;
    crossPlatformMatch?: boolean;
    locationMatch?: boolean;
    
    // Trend context
    topicSpike?: boolean;
    keywordSpike?: boolean;
    audioSpike?: boolean;
    competitorSpike?: boolean;
    trendVelocity?: number;
  }
): LeadScore {
  // Score each category
  const intent = scoreIntentSignals(engagement, context?.content);
  const engagementScore = scoreEngagementSignals(engagement, {
    engagementHistory: context?.engagementHistory,
    repeatViewer: context?.repeatViewer,
    highEngagement: context?.highEngagement
  });
  const behavior = scoreBehaviorSignals(engagement, {
    watched80Percent: context?.watched80Percent,
    savedOrShared: context?.savedOrShared,
    clickedLink: context?.clickedLink,
    watchTime: context?.watchTime,
    retentionCurve: context?.retentionCurve
  });
  const identity = scoreIdentitySignals(engagement, {
    nameMatch: context?.nameMatch,
    emailMatch: context?.emailMatch,
    phoneMatch: context?.phoneMatch,
    crossPlatformMatch: context?.crossPlatformMatch,
    locationMatch: context?.locationMatch
  });
  const trend = scoreTrendSignals(engagement, {
    topicSpike: context?.topicSpike,
    keywordSpike: context?.keywordSpike,
    audioSpike: context?.audioSpike,
    competitorSpike: context?.competitorSpike,
    trendVelocity: context?.trendVelocity
  });
  
  // Calculate total score
  const total = intent.score + engagementScore.score + behavior.score + identity.score + trend.score;
  
  // Determine tier
  let tier: LeadTier;
  if (total >= 80) tier = "hot";
  else if (total >= 60) tier = "warm";
  else if (total >= 40) tier = "interested";
  else if (total >= 20) tier = "cold";
  else tier = "noise";
  
  // Determine urgency
  let urgency: "high" | "medium" | "low";
  if (total >= 80 || engagement.type === "dm" || context?.clickedLink) {
    urgency = "high";
  } else if (total >= 60 || context?.watched80Percent) {
    urgency = "medium";
  } else {
    urgency = "low";
  }
  
  return {
    total,
    tier,
    urgency,
    intent: intent.score,
    engagement: engagementScore.score,
    behavior: behavior.score,
    identity: identity.score,
    trend: trend.score,
    breakdown: {
      intentSignals: intent.signals,
      engagementSignals: engagementScore.signals,
      behaviorSignals: behavior.signals,
      identitySignals: identity.signals,
      trendSignals: trend.signals
    }
  };
}

/**
 * Classify lead (determine pipeline entry point, agent assignment, etc.)
 */
export function classifyLead(
  leadSignal: LeadSignal,
  score: LeadScore
): LeadClassification {
  // Map tier to pipeline entry point
  let pipelineEntryPoint: LeadClassification["pipelineEntryPoint"];
  let agentAssignment: LeadClassification["agentAssignment"];
  let taskDescription: string | null = null;
  let hseState: string[] = [];
  let uoiSignal: string;
  
  switch (score.tier) {
    case "hot":
      pipelineEntryPoint = "warm_lead";
      agentAssignment = {
        required: true,
        priority: "immediate",
        responseTime: "1 hour"
      };
      taskDescription = `Respond to ${leadSignal.source} from ${leadSignal.username || "user"}: "${leadSignal.content.substring(0, 100)}"`;
      hseState = ["lead_created", "lead_hot", "elevated"];
      uoiSignal = "lead_hot";
      break;
      
    case "warm":
      pipelineEntryPoint = "interested";
      agentAssignment = {
        required: true,
        priority: "assigned",
        responseTime: "24 hours"
      };
      taskDescription = `Follow up with ${leadSignal.username || "user"} (${score.total} score)`;
      hseState = ["lead_created", "lead_warm", "nominal"];
      uoiSignal = "lead_warm";
      break;
      
    case "interested":
      pipelineEntryPoint = "cold_lead";
      agentAssignment = {
        required: false,
        priority: "optional"
      };
      taskDescription = `Warm up lead: ${leadSignal.username || "user"} (${score.total} score)`;
      hseState = ["lead_created", "lead_interested", "nominal"];
      uoiSignal = "lead_interested";
      break;
      
    case "cold":
      pipelineEntryPoint = "none";
      agentAssignment = {
        required: false,
        priority: "none"
      };
      taskDescription = null;
      hseState = []; // No HSE change
      uoiSignal = "lead_cold";
      break;
      
    case "noise":
      pipelineEntryPoint = "ignore";
      agentAssignment = {
        required: false,
        priority: "none"
      };
      taskDescription = null;
      hseState = []; // No HSE change
      uoiSignal = "lead_noise";
      break;
  }
  
  return {
    leadId: leadSignal.id,
    score,
    pipelineEntryPoint,
    agentAssignment,
    taskDescription,
    hseState,
    uoiSignal
  };
}

/**
 * Score and classify lead (complete intelligence)
 */
export function scoreAndClassifyLead(
  engagement: ScrapedEngagement,
  context?: any
): LeadClassification {
  // Calculate score
  const score = calculateLeadScore(engagement, context);
  
  // Create lead signal
  const leadSignal: LeadSignal = {
    id: `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    source: engagement.type === "comment" ? "comment" :
            engagement.type === "dm" ? "dm" :
            engagement.type === "mention" ? "mention" :
            "keyword",
    platform: engagement.platform,
    postId: engagement.postId,
    userId: engagement.userId,
    username: engagement.username,
    content: engagement.content || "",
    intent: score.intent > 30 ? "high_intent" : score.intent > 15 ? "medium_intent" : "low_intent",
    score: score.total,
    type: score.tier === "hot" ? "hot" : score.tier === "warm" ? "warm" : "cold",
    urgency: score.urgency,
    detectedAt: new Date().toISOString(),
    metadata: {
      breakdown: score.breakdown,
      ...engagement.metadata
    }
  };
  
  // Classify lead
  return classifyLead(leadSignal, score);
}

/**
 * Batch score and classify leads
 */
export function batchScoreAndClassifyLeads(
  engagements: ScrapedEngagement[],
  context?: Record<string, any>
): LeadClassification[] {
  return engagements
    .map(engagement => scoreAndClassifyLead(engagement, context?.[engagement.userId || ""]))
    .filter(classification => classification.score.tier !== "noise"); // Filter out noise
}
