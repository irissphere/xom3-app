// Broadcast Engine - Trend Action Executor
// Executes trend actions (auto-campaigns, content series, etc.)

import { TrendAction, ClassifiedTrend } from "./trend-engine";
import { generateContent } from "./content-generation";
import { crossPost, schedulePost } from "./auto-posting-engine";
import { BroadcastPost, Platform } from "./types";
import { createPost } from "./store";
import { emitSignal } from "@/lib/uoi/signals";

export interface TrendCampaign {
  id: string;
  trendId: string;
  action: TrendAction;
  status: "pending" | "generating" | "scheduled" | "active" | "completed" | "failed";
  contentIds: string[];
  postsScheduled: number;
  postsPosted: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Execute auto-campaign (breakout trend)
 */
export async function executeAutoCampaign(
  action: TrendAction
): Promise<TrendCampaign> {
  const campaign: TrendCampaign = {
    id: `campaign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    trendId: action.trendId,
    action,
    status: "generating",
    contentIds: [],
    postsScheduled: 0,
    postsPosted: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  try {
    // Generate content for each post
    for (let i = 0; i < action.contentCount; i++) {
      const content = await generateContent(action.metadata.topics[0] || "trend_topic", action.platforms, {
        length: "short",
        includeTrending: true,
      });
      
      // Create post
      const primary = (action.platforms[0] || "instagram") as Platform;
      const captionKey = primary === "twitter" ? "x" : primary === "reels" ? "instagram" : primary === "shorts" ? "youtube" : primary;
      const hashtagKey = primary === "reels" ? "instagram" : primary === "shorts" ? "youtube" : primary;
      const caption = (content.captions as any)[captionKey] || content.captions.instagram;
      const hashtags = (content.hashtags as any)[hashtagKey] || content.hashtags.instagram || [];
      const cta = content.ctas.find((c) => c.platform === primary)?.text || content.ctas[0]?.text || "";

      const post = createPost({
        content: content.script.short,
        platforms: action.platforms,
        metadata: {
          caption,
          hashtags,
          cta,
          description: content.description
        }
      });
      
      campaign.contentIds.push(post.id);
      
      // Post immediately (breakout trends need speed)
      const credentials: Record<Platform, Record<string, string>> = {} as any;
      const result = await crossPost(post, action.platforms, credentials);
      
      if (result.totalSuccess > 0) {
        campaign.postsPosted++;
      }
    }
    
    campaign.status = "active";
    campaign.updatedAt = new Date().toISOString();
    
    // Emit signal
    emitSignal({
      source: "broadcast_engine",
      type: "auto_campaign_executed",
      payload: {
        campaignId: campaign.id,
        trendId: action.trendId,
        postsPosted: campaign.postsPosted,
        platforms: action.platforms
      },
      priority: "high"
    });
    
  } catch (error: any) {
    campaign.status = "failed";
    campaign.updatedAt = new Date().toISOString();
    console.error("[Trend Engine] Auto-campaign failed:", error);
  }
  
  return campaign;
}

/**
 * Execute content series (sustained trend)
 */
export async function executeContentSeries(
  action: TrendAction
): Promise<TrendCampaign> {
  const campaign: TrendCampaign = {
    id: `series_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    trendId: action.trendId,
    action,
    status: "generating",
    contentIds: [],
    postsScheduled: 0,
    postsPosted: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  try {
    const startDate = new Date(action.schedule.startDate);
    
    // Generate content for each post in the series
    for (let i = 0; i < action.contentCount; i++) {
      const content = await generateContent(`${action.metadata.topics[0] || "trend_topic"} - Part ${i + 1}`, action.platforms, {
        length: "medium",
        includeTrending: true,
      });
      
      // Create post
      const primary = (action.platforms[0] || "instagram") as Platform;
      const captionKey = primary === "twitter" ? "x" : primary === "reels" ? "instagram" : primary === "shorts" ? "youtube" : primary;
      const hashtagKey = primary === "reels" ? "instagram" : primary === "shorts" ? "youtube" : primary;
      const caption = (content.captions as any)[captionKey] || content.captions.instagram;
      const hashtags = (content.hashtags as any)[hashtagKey] || content.hashtags.instagram || [];
      const cta = content.ctas.find((c) => c.platform === primary)?.text || content.ctas[0]?.text || "";

      const post = createPost({
        content: content.script.medium,
        platforms: action.platforms,
        scheduledAt: new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000).toISOString(), // Schedule each day
        metadata: {
          caption,
          hashtags,
          cta,
          description: content.description
        }
      });
      
      campaign.contentIds.push(post.id);
      campaign.postsScheduled++;
    }
    
    campaign.status = "scheduled";
    campaign.updatedAt = new Date().toISOString();
    
    // Emit signal
    emitSignal({
      source: "broadcast_engine",
      type: "content_series_scheduled",
      payload: {
        campaignId: campaign.id,
        trendId: action.trendId,
        postsScheduled: campaign.postsScheduled,
        platforms: action.platforms,
        startDate: action.schedule.startDate
      },
      priority: "medium"
    });
    
  } catch (error: any) {
    campaign.status = "failed";
    campaign.updatedAt = new Date().toISOString();
    console.error("[Trend Engine] Content series failed:", error);
  }
  
  return campaign;
}

/**
 * Execute prepared scripts (seasonal trend)
 */
export async function executePreparedScripts(
  action: TrendAction
): Promise<TrendCampaign> {
  const campaign: TrendCampaign = {
    id: `seasonal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    trendId: action.trendId,
    action,
    status: "generating",
    contentIds: [],
    postsScheduled: 0,
    postsPosted: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  try {
    // Use prepared scripts for seasonal trends
    const seasonalScripts = getSeasonalScripts(action.metadata.topics[0]);
    
    const startDate = new Date(action.schedule.startDate);
    
    for (let i = 0; i < Math.min(action.contentCount, seasonalScripts.length); i++) {
      const script = seasonalScripts[i];
      
      // Create post
      const post = createPost({
        content: script.content,
        platforms: action.platforms,
        scheduledAt: new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000).toISOString(),
        metadata: {
          caption: script.caption,
          hashtags: action.metadata.hashtags,
          cta: script.cta,
          description: script.description
        }
      });
      
      campaign.contentIds.push(post.id);
      campaign.postsScheduled++;
    }
    
    campaign.status = "scheduled";
    campaign.updatedAt = new Date().toISOString();
    
    // Emit signal
    emitSignal({
      source: "broadcast_engine",
      type: "seasonal_campaign_scheduled",
      payload: {
        campaignId: campaign.id,
        trendId: action.trendId,
        postsScheduled: campaign.postsScheduled,
        platforms: action.platforms
      },
      priority: "medium"
    });
    
  } catch (error: any) {
    campaign.status = "failed";
    campaign.updatedAt = new Date().toISOString();
    console.error("[Trend Engine] Prepared scripts failed:", error);
  }
  
  return campaign;
}

/**
 * Execute niche content (micro trend)
 */
export async function executeNicheContent(
  action: TrendAction
): Promise<TrendCampaign> {
  const campaign: TrendCampaign = {
    id: `niche_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    trendId: action.trendId,
    action,
    status: "generating",
    contentIds: [],
    postsScheduled: 0,
    postsPosted: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  try {
    const startDate = new Date(action.schedule.startDate);
    
    // Generate niche content
    for (let i = 0; i < action.contentCount; i++) {
      const content = await generateContent(action.metadata.topics[0] || "trend_topic", action.platforms, {
        length: "short",
        includeTrending: true,
      });
      
      // Create post
      const primary = (action.platforms[0] || "instagram") as Platform;
      const captionKey = primary === "twitter" ? "x" : primary === "reels" ? "instagram" : primary === "shorts" ? "youtube" : primary;
      const hashtagKey = primary === "reels" ? "instagram" : primary === "shorts" ? "youtube" : primary;
      const caption = (content.captions as any)[captionKey] || content.captions.instagram;
      const hashtags = (content.hashtags as any)[hashtagKey] || content.hashtags.instagram || [];
      const cta = content.ctas.find((c) => c.platform === primary)?.text || content.ctas[0]?.text || "";

      const post = createPost({
        content: content.script.short,
        platforms: action.platforms,
        scheduledAt: new Date(startDate.getTime() + i * 2 * 24 * 60 * 60 * 1000).toISOString(), // Every 2 days
        metadata: {
          caption,
          hashtags,
          cta,
          description: content.description
        }
      });
      
      campaign.contentIds.push(post.id);
      campaign.postsScheduled++;
    }
    
    campaign.status = "scheduled";
    campaign.updatedAt = new Date().toISOString();
    
    // Emit signal
    emitSignal({
      source: "broadcast_engine",
      type: "niche_content_scheduled",
      payload: {
        campaignId: campaign.id,
        trendId: action.trendId,
        postsScheduled: campaign.postsScheduled,
        platforms: action.platforms
      },
      priority: "low"
    });
    
  } catch (error: any) {
    campaign.status = "failed";
    campaign.updatedAt = new Date().toISOString();
    console.error("[Trend Engine] Niche content failed:", error);
  }
  
  return campaign;
}

/**
 * Execute trend action
 */
export async function executeTrendAction(
  action: TrendAction
): Promise<TrendCampaign> {
  switch (action.action) {
    case "auto_campaign":
      return await executeAutoCampaign(action);
    case "content_series":
      return await executeContentSeries(action);
    case "prepared_scripts":
      return await executePreparedScripts(action);
    case "niche_content":
      return await executeNicheContent(action);
    default:
      throw new Error(`Unknown action type: ${action.action}`);
  }
}

/**
 * Get seasonal scripts (prepared content for seasonal trends)
 */
function getSeasonalScripts(topic: string): Array<{
  content: string;
  caption: string;
  cta: string;
  description: string;
}> {
  const lower = topic.toLowerCase();
  
  // Open enrollment scripts
  if (lower.includes("enrollment") || lower.includes("open enrollment")) {
    return [
      {
        content: "Open enrollment is here! Here's everything you need to know about choosing the right health insurance plan for you and your family.",
        caption: "Open enrollment season is here! 🎉 Make sure you're choosing the right plan. Link in bio for help!",
        cta: "Get help choosing your plan → xom3.io",
        description: "Open enrollment guide for 2024"
      },
      {
        content: "Don't wait until the last minute! Open enrollment deadlines are approaching. Here's how to make the right choice.",
        caption: "Time is running out! ⏰ Get your enrollment sorted before the deadline. We can help!",
        cta: "Schedule a consultation → xom3.io",
        description: "Open enrollment deadline reminder"
      }
    ];
  }
  
  // Medicare scripts
  if (lower.includes("medicare")) {
    return [
      {
        content: "Medicare enrollment can be confusing. Here's a simple guide to help you understand your options.",
        caption: "Medicare made simple! 📋 We break down everything you need to know.",
        cta: "Learn more → xom3.io",
        description: "Medicare enrollment guide"
      }
    ];
  }
  
  // Tax season scripts
  if (lower.includes("tax")) {
    return [
      {
        content: "Tax season is here! Did you know your health insurance premiums might be tax-deductible?",
        caption: "Tax season tip! 💰 Your health insurance might be deductible. Learn more!",
        cta: "Get tax help → xom3.io",
        description: "Tax season health insurance tips"
      }
    ];
  }
  
  // Default scripts
  return [
    {
      content: `${topic} is an important topic. Here's what you need to know.`,
      caption: `Everything you need to know about ${topic}! 📚`,
      cta: "Learn more → xom3.io",
      description: `${topic} guide`
    }
  ];
}
