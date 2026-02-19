// Broadcast Engine - Trend Detection Layer
// Monitors trends across platforms and adapts strategy in real-time

import { Platform } from "./types";
import { emitSignal } from "@/lib/uoi/signals";

export interface TrendSignal {
  id: string;
  platform: Platform;
  type: "topic" | "keyword" | "audio" | "hashtag" | "format" | "challenge" | "niche" | "algorithm_shift";
  value: string;
  velocity: number; // Growth rate (0-100)
  volume: number; // Current volume
  trend: "rising" | "peaking" | "declining" | "stable";
  detectedAt: string;
  metadata: {
    crossPlatform?: boolean;
    competitorActivity?: number;
    sentiment?: "positive" | "neutral" | "negative";
    relatedTrends?: string[];
  };
}

export interface PlatformTrends {
  platform: Platform;
  topics: TrendSignal[];
  keywords: TrendSignal[];
  audio: TrendSignal[];
  hashtags: TrendSignal[];
  formats: TrendSignal[];
  challenges: TrendSignal[];
  niches: TrendSignal[];
  algorithmShifts: TrendSignal[];
  lastUpdated: string;
}

export interface CrossPlatformSignal {
  id: string;
  keyword: string;
  platforms: Platform[];
  velocity: number;
  firstDetected: string;
  peakPlatform: Platform;
  spreading: boolean;
}

/**
 * Detect YouTube trends
 */
export async function detectYouTubeTrends(): Promise<PlatformTrends> {
  console.log("[Trend Detection] Scanning YouTube trends...");

  try {
    // Get access token for YouTube API
    const { getAccessToken } = await import("@/lib/oauth/token-storage");
    const accessToken = await getAccessToken("demo-user", "youtube"); // TODO: Get from context

    if (!accessToken) {
      console.warn("[Trend Detection] No YouTube access token available, using public API");
      return await detectYouTubeTrendsPublic();
    }

    const { google } = await import('googleapis');
    const youtube = google.youtube('v3');

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    const trends: PlatformTrends = {
      platform: "youtube",
      topics: [],
      keywords: [],
      audio: [],
      hashtags: [],
      formats: [],
      challenges: [],
      niches: [],
      algorithmShifts: [],
      lastUpdated: new Date().toISOString()
    };

    // 1. Get trending videos in healthcare category
    const trendingResponse = await youtube.videos.list({
      auth: oauth2Client,
      part: ['snippet', 'statistics'],
      chart: 'mostPopular',
      regionCode: 'US',
      videoCategoryId: '27', // Education (healthcare content often falls here)
      maxResults: 50,
    });

    // 2. Analyze trending videos for patterns
    const trendingVideos = trendingResponse.data.items || [];
    const keywordCounts: Record<string, number> = {};
    const hashtagCounts: Record<string, number> = {};

    for (const video of trendingVideos) {
      const title = video.snippet?.title || '';
      const description = video.snippet?.description || '';
      const tags = video.snippet?.tags || [];
      const viewCount = parseInt(video.statistics?.viewCount || '0');

      // Extract keywords from title and description
      const words = [...title.split(' '), ...description.split(' ')].filter(word =>
        word.length > 3 && !['with', 'from', 'this', 'that', 'have', 'been'].includes(word.toLowerCase())
      );

      words.forEach(word => {
        const cleanWord = word.toLowerCase().replace(/[^\w]/g, '');
        if (cleanWord.length > 3) {
          keywordCounts[cleanWord] = (keywordCounts[cleanWord] || 0) + viewCount;
        }
      });

      // Count hashtags
      tags.forEach((tag: string) => {
        const cleanTag = tag.toLowerCase();
        hashtagCounts[cleanTag] = (hashtagCounts[cleanTag] || 0) + viewCount;
      });
    }

    // 3. Convert to trend signals
    const now = new Date();

    // Top keywords
    const topKeywords = Object.entries(keywordCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([keyword, score]) => ({
        id: `yt-keyword-${keyword}-${Date.now()}`,
        platform: "youtube" as const,
        type: "keyword" as const,
        value: keyword,
        velocity: Math.min(100, score / 100000), // Normalize velocity
        volume: score,
        trend: "rising" as const,
        detectedAt: now.toISOString(),
        metadata: {
          crossPlatform: false,
          relatedTrends: [],
        }
      }));

    // Top hashtags
    const topHashtags = Object.entries(hashtagCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([hashtag, score]) => ({
        id: `yt-hashtag-${hashtag}-${Date.now()}`,
        platform: "youtube" as const,
        type: "hashtag" as const,
        value: hashtag,
        velocity: Math.min(100, score / 50000),
        volume: score,
        trend: "rising" as const,
        detectedAt: now.toISOString(),
        metadata: {
          crossPlatform: false,
          relatedTrends: [],
        }
      }));

    trends.keywords = topKeywords;
    trends.hashtags = topHashtags;

    return trends;

  } catch (error: any) {
    console.error("[Trend Detection] YouTube API error:", error);
    return {
      platform: "youtube",
      topics: [],
      keywords: [],
      audio: [],
      hashtags: [],
      formats: [],
      challenges: [],
      niches: [],
      algorithmShifts: [],
      lastUpdated: new Date().toISOString()
    };
  }
}

/**
 * Detect YouTube trends using public API (no auth required)
 */
async function detectYouTubeTrendsPublic(): Promise<PlatformTrends> {
  // Use YouTube Data API v3 with API key for public trending data
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    console.warn("[Trend Detection] No YouTube API key available");
    return {
      platform: "youtube",
      topics: [],
      keywords: [],
      audio: [],
      hashtags: [],
      formats: [],
      challenges: [],
      niches: [],
      algorithmShifts: [],
      lastUpdated: new Date().toISOString()
    };
  }

  try {
    // Get trending videos
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&regionCode=US&maxResults=50&key=${apiKey}`
    );

    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status}`);
    }

    const data = await response.json();
    const videos = data.items || [];

    // Analyze for healthcare-related trends
    const healthcareKeywords = ['health', 'medical', 'insurance', 'benefits', 'care', 'doctor', 'hospital', 'treatment'];
    const healthcareTrends: TrendSignal[] = [];

    for (const video of videos) {
      const title = video.snippet?.title?.toLowerCase() || '';
      const description = video.snippet?.description?.toLowerCase() || '';
      const viewCount = parseInt(video.statistics?.viewCount || '0');

      const hasHealthcareContent = healthcareKeywords.some(keyword =>
        title.includes(keyword) || description.includes(keyword)
      );

      if (hasHealthcareContent && viewCount > 10000) {
        healthcareTrends.push({
          id: `yt-trend-${video.id}-${Date.now()}`,
          platform: "youtube" as const,
          type: "topic" as const,
          value: video.snippet.title,
          velocity: Math.min(100, viewCount / 100000),
          volume: viewCount,
          trend: "rising" as const,
          detectedAt: new Date().toISOString(),
          metadata: {
            crossPlatform: false,
            relatedTrends: healthcareKeywords.filter(k => title.includes(k)),
          }
        });
      }
    }

    return {
      platform: "youtube",
      topics: healthcareTrends.slice(0, 5),
      keywords: [],
      audio: [],
      hashtags: [],
      formats: [],
      challenges: [],
      niches: [],
      algorithmShifts: [],
      lastUpdated: new Date().toISOString()
    };

  } catch (error) {
    console.error("[Trend Detection] Public YouTube API error:", error);
    return {
      platform: "youtube",
      topics: [],
      keywords: [],
      audio: [],
      hashtags: [],
      formats: [],
      challenges: [],
      niches: [],
      algorithmShifts: [],
      lastUpdated: new Date().toISOString()
    };
  }
}

/**
 * Detect TikTok trends
 */
export async function detectTikTokTrends(): Promise<PlatformTrends> {
  // Placeholder - integrate with TikTok Business API
  // - Trending sounds endpoint
  // - Trending hashtags endpoint
  // - Trending challenges
  // - Format analysis
  
  console.log("[Trend Detection] Scanning TikTok trends...");
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const trends: PlatformTrends = {
    platform: "tiktok",
    topics: [],
    keywords: [],
    audio: [],
    hashtags: [],
    formats: [],
    challenges: [],
    niches: [],
    algorithmShifts: [],
    lastUpdated: new Date().toISOString()
  };
  
  // In production:
  // - Fetch trending sounds
  // - Fetch trending hashtags
  // - Analyze viral format patterns
  // - Track challenge participation
  
  return trends;
}

/**
 * Detect Instagram trends
 */
export async function detectInstagramTrends(): Promise<PlatformTrends> {
  // Placeholder - integrate with Instagram Graph API
  // - Reel format analysis
  // - Audio trend detection
  // - Carousel pattern analysis
  // - Viral hook identification
  
  console.log("[Trend Detection] Scanning Instagram trends...");
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const trends: PlatformTrends = {
    platform: "instagram",
    topics: [],
    keywords: [],
    audio: [],
    hashtags: [],
    formats: [],
    challenges: [],
    niches: [],
    algorithmShifts: [],
    lastUpdated: new Date().toISOString()
  };
  
  // In production:
  // - Analyze top-performing reels
  // - Extract common audio tracks
  // - Identify carousel patterns
  // - Track viral hook formats
  
  return trends;
}

/**
 * Detect cross-platform signals
 */
export async function detectCrossPlatformSignals(
  platformTrends: PlatformTrends[]
): Promise<CrossPlatformSignal[]> {
  const signals: CrossPlatformSignal[] = [];
  
  // Find keywords that appear across multiple platforms
  const keywordMap = new Map<string, { platforms: Platform[]; velocities: number[] }>();
  
  for (const trends of platformTrends) {
    for (const keyword of trends.keywords) {
      const existing = keywordMap.get(keyword.value) || { platforms: [], velocities: [] };
      existing.platforms.push(trends.platform);
      existing.velocities.push(keyword.velocity);
      keywordMap.set(keyword.value, existing);
    }
  }
  
  // Identify cross-platform signals (appears on 2+ platforms)
  for (const [keyword, data] of Array.from(keywordMap.entries())) {
    if (data.platforms.length >= 2) {
      const avgVelocity = data.velocities.reduce((a, b) => a + b, 0) / data.velocities.length;
      const peakPlatform = data.platforms[0]; // Simplified
      
      signals.push({
        id: `cross_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        keyword,
        platforms: Array.from(new Set(data.platforms)),
        velocity: avgVelocity,
        firstDetected: new Date().toISOString(),
        peakPlatform,
        spreading: data.platforms.length > 2
      });
    }
  }
  
  return signals;
}

/**
 * Calculate trend velocity
 */
export function calculateVelocity(
  currentVolume: number,
  previousVolume: number,
  timeDelta: number // hours
): number {
  if (previousVolume === 0) return currentVolume > 0 ? 100 : 0;
  
  const growthRate = ((currentVolume - previousVolume) / previousVolume) * 100;
  const normalized = growthRate / Math.max(1, timeDelta / 24); // Normalize to daily rate
  
  return Math.min(100, Math.max(0, normalized));
}

/**
 * Classify trend state
 */
export function classifyTrend(velocity: number, volume: number): TrendSignal["trend"] {
  if (velocity > 50 && volume > 1000) return "rising";
  if (velocity > 20 && volume > 5000) return "peaking";
  if (velocity < -20) return "declining";
  return "stable";
}

/**
 * Detect all platform trends
 */
export async function detectAllTrends(): Promise<{
  platforms: PlatformTrends[];
  crossPlatform: CrossPlatformSignal[];
}> {
  const [youtube, tiktok, instagram] = await Promise.all([
    detectYouTubeTrends(),
    detectTikTokTrends(),
    detectInstagramTrends()
  ]);
  
  const platforms = [youtube, tiktok, instagram];
  const crossPlatform = await detectCrossPlatformSignals(platforms);
  
  // Emit signal for significant trends
  const significantTrends = platforms.flatMap(p => 
    [...p.topics, ...p.keywords, ...p.hashtags].filter(t => t.velocity > 50)
  );
  
  if (significantTrends.length > 0) {
    emitSignal({
      source: "broadcast_engine",
      type: "trends_detected",
      payload: {
        count: significantTrends.length,
        platforms: platforms.map(p => p.platform),
        crossPlatform: crossPlatform.length
      },
      priority: "medium"
    });
  }
  
  return { platforms, crossPlatform };
}

/**
 * Monitor competitor activity
 */
export async function monitorCompetitorActivity(
  competitorIds: string[],
  platform: Platform
): Promise<{
  uploadFrequency: number; // posts per day
  contentTypes: string[];
  trendingTopics: string[];
  engagementPatterns: Record<string, number>;
}> {
  // Placeholder - integrate with platform APIs to monitor competitors
  console.log(`[Trend Detection] Monitoring ${competitorIds.length} competitors on ${platform}`);
  
  return {
    uploadFrequency: 0,
    contentTypes: [],
    trendingTopics: [],
    engagementPatterns: {}
  };
}

/**
 * Detect algorithm shifts
 */
export async function detectAlgorithmShifts(
  platform: Platform,
  historicalData: any[]
): Promise<TrendSignal[]> {
  // Analyze engagement patterns to detect algorithm changes
  // - Sudden drop in reach → algorithm shift
  // - Format preference changes → algorithm shift
  // - Timing preference changes → algorithm shift
  
  const shifts: TrendSignal[] = [];
  
  // Placeholder logic
  // In production, analyze:
  // - Reach/impression patterns
  // - Engagement rate changes
  // - Format performance shifts
  // - Timing effectiveness changes
  
  return shifts;
}
