// Broadcast Engine - Lead Detection Engine
// Intelligence layer that identifies leads from engagement

import { LeadSignal, ScrapedEngagement, DetectedLead, Platform } from "./types";
import { analyzeSentiment } from "./scraping-engine";

/**
 * Intent keywords that indicate lead interest
 */
const INTENT_KEYWORDS = {
  high: ["sign up", "signup", "how do i", "how can i", "i need", "i want", "help me", "interested", "more info", "information", "details", "pricing", "cost", "price", "quote", "consultation", "schedule", "book", "appointment", "demo", "trial"],
  medium: ["tell me", "explain", "what is", "how does", "can you", "do you", "does it", "is it", "will it", "should i"],
  low: ["nice", "cool", "interesting", "thanks", "thank you"]
};

/**
 * Industry keywords
 */
const INDUSTRY_KEYWORDS = [
  "insurance", "benefits", "policy", "coverage", "healthcare", "medical", "dental", "vision",
  "plan", "enrollment", "open enrollment", "deductible", "copay", "premium", "claim", "provider"
];

/**
 * Detect intent from content
 */
export function detectIntent(content: string): {
  intent: string;
  confidence: number; // 0-1
  keywords: string[];
} {
  const lower = content.toLowerCase();
  const detectedKeywords: string[] = [];
  let maxConfidence = 0;
  let detectedIntent = "general_inquiry";
  
  // Check high-intent keywords
  for (const keyword of INTENT_KEYWORDS.high) {
    if (lower.includes(keyword)) {
      detectedKeywords.push(keyword);
      maxConfidence = Math.max(maxConfidence, 0.9);
      detectedIntent = "high_intent";
    }
  }
  
  // Check medium-intent keywords
  if (maxConfidence < 0.7) {
    for (const keyword of INTENT_KEYWORDS.medium) {
      if (lower.includes(keyword)) {
        detectedKeywords.push(keyword);
        maxConfidence = Math.max(maxConfidence, 0.6);
        if (detectedIntent === "general_inquiry") {
          detectedIntent = "medium_intent";
        }
      }
    }
  }
  
  // Check industry keywords
  for (const keyword of INDUSTRY_KEYWORDS) {
    if (lower.includes(keyword)) {
      detectedKeywords.push(keyword);
      maxConfidence = Math.max(maxConfidence, maxConfidence + 0.1);
    }
  }
  
  return {
    intent: detectedIntent,
    confidence: Math.min(1, maxConfidence),
    keywords: Array.from(new Set(detectedKeywords))
  };
}

/**
 * Calculate lead score (legacy - use lead-scoring-engine.ts for full scoring)
 */
export function calculateLeadScore(
  engagement: ScrapedEngagement,
  context?: {
    engagementHistory?: number;
    repeatViewer?: boolean;
    highEngagement?: boolean;
    watched80Percent?: boolean;
    savedOrShared?: boolean;
    clickedLink?: boolean;
  }
): number {
  let score = 0;
  
  // Base score by engagement type
  switch (engagement.type) {
    case "comment":
      score += 30;
      break;
    case "dm":
      score += 50;
      break;
    case "mention":
      score += 20;
      break;
    case "reply":
      score += 25;
      break;
    case "like":
      score += 5;
      break;
    case "share":
      score += 15;
      break;
    case "save":
      score += 10;
      break;
  }
  
  // Intent detection
  if (engagement.content) {
    const intent = detectIntent(engagement.content);
    score += intent.confidence * 30;
    
    // Industry keywords boost
    if (intent.keywords.some(k => INDUSTRY_KEYWORDS.includes(k))) {
      score += 20;
    }
  }
  
  // Context boosts
  if (context?.repeatViewer) {
    score += 15;
  }
  
  if (context?.highEngagement) {
    score += 10;
  }
  
  if (context?.engagementHistory && context.engagementHistory > 3) {
    score += 10;
  }
  
  // High-intent signals
  if (context?.watched80Percent) {
    score += 20; // Watched 80%+ = high intent
  }
  
  if (context?.savedOrShared) {
    score += 15; // Saved/shared = high interest
  }
  
  if (context?.clickedLink) {
    score += 25; // Clicked link = highest intent
  }
  
  // Sentiment boost (positive sentiment = higher score)
  if (engagement.content) {
    const sentiment = analyzeSentiment(engagement.content);
    if (sentiment.sentiment === "positive") {
      score += 5;
    }
  }
  
  return Math.min(100, Math.max(0, score));
}

/**
 * Determine lead type
 */
export function determineLeadType(score: number): "hot" | "warm" | "cold" {
  if (score >= 70) return "hot";
  if (score >= 40) return "warm";
  return "cold";
}

/**
 * Determine urgency
 */
export function determineUrgency(
  engagement: ScrapedEngagement,
  score: number
): "high" | "medium" | "low" {
  // DMs are always high urgency
  if (engagement.type === "dm") {
    return "high";
  }
  
  // High-intent comments are high urgency
  if (engagement.type === "comment" && engagement.content) {
    const intent = detectIntent(engagement.content);
    if (intent.intent === "high_intent") {
      return "high";
    }
  }
  
  // High score = high urgency
  if (score >= 70) {
    return "high";
  }
  
  // Medium score = medium urgency
  if (score >= 40) {
    return "medium";
  }
  
  return "low";
}

/**
 * Detect lead from engagement (uses new scoring engine)
 */
export function detectLead(
  engagement: ScrapedEngagement,
  context?: {
    engagementHistory?: number;
    repeatViewer?: boolean;
    highEngagement?: boolean;
    watched80Percent?: boolean;
    savedOrShared?: boolean;
    clickedLink?: boolean;
    watchTime?: number;
    retentionCurve?: number[];
    nameMatch?: boolean;
    emailMatch?: boolean;
    phoneMatch?: boolean;
    crossPlatformMatch?: boolean;
    topicSpike?: boolean;
    keywordSpike?: boolean;
  }
): LeadSignal {
  // Use new scoring engine for comprehensive scoring
  const { scoreAndClassifyLead } = require("./lead-scoring-engine");
  const classification = scoreAndClassifyLead(engagement, context);
  
  // Convert classification back to LeadSignal format
  return {
    id: classification.leadId,
    source: engagement.type === "comment" ? "comment" :
            engagement.type === "dm" ? "dm" :
            engagement.type === "mention" ? "mention" :
            "keyword",
    platform: engagement.platform,
    postId: engagement.postId,
    userId: engagement.userId,
    username: engagement.username,
    content: engagement.content || "",
    intent: classification.score.intent > 30 ? "high_intent" : 
            classification.score.intent > 15 ? "medium_intent" : "low_intent",
    score: classification.score.total,
    type: classification.score.tier === "hot" ? "hot" : 
          classification.score.tier === "warm" ? "warm" : "cold",
    urgency: classification.score.urgency,
    detectedAt: new Date().toISOString(),
    metadata: {
      breakdown: classification.score.breakdown,
      classification: {
        pipelineEntryPoint: classification.pipelineEntryPoint,
        agentAssignment: classification.agentAssignment,
        taskDescription: classification.taskDescription
      },
      ...engagement.metadata
    }
  };
}

/**
 * Batch detect leads from multiple engagements
 */
export function batchDetectLeads(
  engagements: ScrapedEngagement[],
  context?: Record<string, any>
): LeadSignal[] {
  return engagements
    .map(engagement => detectLead(engagement, context?.[engagement.userId || ""]))
    .filter(lead => lead.score >= 20); // Only return leads with score >= 20
}

/**
 * Check if engagement is a repeat viewer
 */
export function isRepeatViewer(
  userId: string,
  engagementHistory: ScrapedEngagement[]
): boolean {
  const userEngagements = engagementHistory.filter(e => e.userId === userId);
  return userEngagements.length > 1;
}

/**
 * Check if user has high engagement
 */
export function hasHighEngagement(
  userId: string,
  engagementHistory: ScrapedEngagement[]
): boolean {
  const userEngagements = engagementHistory.filter(e => e.userId === userId);
  const engagementTypes = new Set(userEngagements.map(e => e.type));
  
  // High engagement = multiple types of engagement
  return engagementTypes.size >= 3;
}

/**
 * Check if user watched 80%+ of video
 */
export function watched80Percent(
  userId: string,
  watchData: { userId: string; watchPercentage: number }[]
): boolean {
  const userWatch = watchData.find(w => w.userId === userId);
  return userWatch ? userWatch.watchPercentage >= 80 : false;
}

/**
 * Check if user saved or shared content
 */
export function savedOrShared(
  userId: string,
  engagementHistory: ScrapedEngagement[]
): boolean {
  const userEngagements = engagementHistory.filter(e => e.userId === userId);
  return userEngagements.some(e => e.type === "save" || e.type === "share");
}

/**
 * Check if user clicked tracking link
 */
export function clickedLink(
  userId: string,
  linkClicks: { userId: string; timestamp: string }[]
): boolean {
  return linkClicks.some(click => click.userId === userId);
}
