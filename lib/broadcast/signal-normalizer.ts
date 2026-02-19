// Broadcast Engine - Signal Normalizer
// Normalizes all platform signals into common schema

import { Platform, ScrapedEngagement } from "./types";
import { analyzeSentiment } from "./scraping-engine";

export interface NormalizedSignal {
  id: string;
  platform: Platform;
  signalType: "comment" | "like" | "share" | "dm" | "mention" | "view" | "follow" | "save" | "reply" | "link_click";
  content: string;
  userId: string;
  username?: string;
  postId?: string;
  timestamp: string;
  engagementValue: number; // 0-100, normalized engagement score
  sentiment: "positive" | "negative" | "neutral";
  keywords: string[];
  metadata: {
    raw: any; // Original platform data
    normalized: boolean;
    source: string;
    [key: string]: any;
  };
}

/**
 * Normalize platform-specific signal to common schema
 */
export function normalizeSignal(
  platform: Platform,
  rawSignal: any,
  signalType: NormalizedSignal["signalType"]
): NormalizedSignal {
  const id = `signal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Extract content based on platform and signal type
  let content = "";
  let userId = "";
  let username = "";
  let postId = "";
  let timestamp = new Date().toISOString();
  
  switch (platform) {
    case "youtube":
      if (signalType === "comment") {
        content = rawSignal.snippet?.textDisplay || rawSignal.text || "";
        userId = rawSignal.snippet?.authorChannelId?.value || rawSignal.authorId || "";
        username = rawSignal.snippet?.authorDisplayName || rawSignal.author || "";
        postId = rawSignal.snippet?.videoId || rawSignal.videoId || "";
        timestamp = rawSignal.snippet?.publishedAt || rawSignal.timestamp || timestamp;
      } else if (signalType === "view") {
        content = `View: ${rawSignal.videoId || ""}`;
        userId = rawSignal.userId || "";
        postId = rawSignal.videoId || "";
        timestamp = rawSignal.timestamp || timestamp;
      }
      break;
      
    case "instagram":
      if (signalType === "comment") {
        content = rawSignal.text || rawSignal.message || "";
        userId = rawSignal.from?.id || rawSignal.userId || "";
        username = rawSignal.from?.username || rawSignal.username || "";
        postId = rawSignal.media?.id || rawSignal.postId || "";
        timestamp = rawSignal.timestamp || rawSignal.created_time || timestamp;
      } else if (signalType === "dm") {
        content = rawSignal.text || rawSignal.message || "";
        userId = rawSignal.from?.id || rawSignal.userId || "";
        username = rawSignal.from?.username || rawSignal.username || "";
        timestamp = rawSignal.timestamp || rawSignal.created_time || timestamp;
      }
      break;
      
    case "tiktok":
      if (signalType === "comment") {
        content = rawSignal.text || rawSignal.comment_text || "";
        userId = rawSignal.user?.id || rawSignal.userId || "";
        username = rawSignal.user?.unique_id || rawSignal.username || "";
        postId = rawSignal.video_id || rawSignal.postId || "";
        timestamp = rawSignal.create_time ? new Date(rawSignal.create_time * 1000).toISOString() : timestamp;
      }
      break;
      
    case "linkedin":
      if (signalType === "comment") {
        content = rawSignal.text || rawSignal.comment || "";
        userId = rawSignal.author?.id || rawSignal.userId || "";
        username = rawSignal.author?.name || rawSignal.username || "";
        postId = rawSignal.postId || rawSignal.urn || "";
        timestamp = rawSignal.timestamp || timestamp;
      }
      break;
      
    case "twitter":
      if (signalType === "mention") {
        content = rawSignal.text || rawSignal.tweet_text || "";
        userId = rawSignal.user?.id_str || rawSignal.userId || "";
        username = rawSignal.user?.screen_name || rawSignal.username || "";
        postId = rawSignal.id_str || rawSignal.tweetId || "";
        timestamp = rawSignal.created_at ? new Date(rawSignal.created_at).toISOString() : timestamp;
      }
      break;
      
    default:
      // Generic extraction
      content = rawSignal.text || rawSignal.content || rawSignal.message || "";
      userId = rawSignal.userId || rawSignal.user?.id || rawSignal.from?.id || "";
      username = rawSignal.username || rawSignal.user?.username || rawSignal.from?.username || "";
      postId = rawSignal.postId || rawSignal.id || "";
      timestamp = rawSignal.timestamp || rawSignal.created_at || rawSignal.created_time || timestamp;
  }
  
  // Calculate engagement value (0-100)
  const engagementValue = calculateEngagementValue(signalType, rawSignal);
  
  // Analyze sentiment
  const sentiment = content ? analyzeSentiment(content).sentiment : "neutral";
  
  // Extract keywords
  const keywords = extractKeywords(content);
  
  return {
    id,
    platform,
    signalType,
    content,
    userId,
    username,
    postId,
    timestamp,
    engagementValue,
    sentiment,
    keywords,
    metadata: {
      raw: rawSignal,
      normalized: true,
      source: `platform_${platform}`,
      originalType: rawSignal.type || signalType
    }
  };
}

/**
 * Calculate engagement value (0-100)
 */
function calculateEngagementValue(
  signalType: NormalizedSignal["signalType"],
  rawSignal: any
): number {
  // Base value by signal type
  const baseValues: Record<NormalizedSignal["signalType"], number> = {
    dm: 80,
    comment: 50,
    mention: 40,
    reply: 45,
    link_click: 70,
    view: 10,
    follow: 30,
    share: 25,
    save: 20,
    like: 5
  };
  
  let value = baseValues[signalType] || 10;
  
  // Boost for high engagement signals
  if (rawSignal.like_count && rawSignal.like_count > 10) {
    value += 5;
  }
  
  if (rawSignal.reply_count && rawSignal.reply_count > 5) {
    value += 5;
  }
  
  return Math.min(100, Math.max(0, value));
}

/**
 * Extract keywords from content
 */
function extractKeywords(content: string): string[] {
  if (!content) return [];
  
  const industryKeywords = [
    "insurance", "benefits", "policy", "coverage", "healthcare", "medical", "dental", "vision",
    "plan", "enrollment", "open enrollment", "deductible", "copay", "premium", "claim", "provider"
  ];
  
  const intentKeywords = [
    "help", "need", "want", "interested", "sign up", "signup", "price", "pricing", "cost",
    "quote", "consultation", "schedule", "book", "appointment", "dm", "message", "contact"
  ];
  
  const lower = content.toLowerCase();
  const found: string[] = [];
  
  for (const keyword of [...industryKeywords, ...intentKeywords]) {
    if (lower.includes(keyword)) {
      found.push(keyword);
    }
  }
  
  return Array.from(new Set(found));
}

/**
 * Batch normalize signals
 */
export function batchNormalizeSignals(
  platform: Platform,
  rawSignals: any[],
  signalType: NormalizedSignal["signalType"]
): NormalizedSignal[] {
  return rawSignals.map(raw => normalizeSignal(platform, raw, signalType));
}
