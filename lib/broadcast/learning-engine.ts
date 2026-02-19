// Broadcast Engine - Continuous Learning Loop
// Learns from performance and optimizes over time

import { Platform, BroadcastPost } from "./types";
import { PerformanceMetrics } from "./adaptive-strategy";

export interface LearningMemory {
  contentPerformance: ContentPerformance[];
  platformPerformance: PlatformPerformance[];
  hookPerformance: HookPerformance[];
  topicPerformance: TopicPerformance[];
  ctaPerformance: CTAPerformance[];
  formatPerformance: FormatPerformance[];
  lastLearned: string;
}

export interface ContentPerformance {
  contentId: string;
  platform: Platform;
  reach: number;
  engagement: number;
  leads: number;
  conversionRate: number;
  timestamp: string;
  metadata: {
    format: string;
    captionStyle: string;
    hashtags: string[];
    cta: string;
    topics: string[];
  };
}

export interface PlatformPerformance {
  platform: Platform;
  avgEngagementRate: number;
  avgLeadConversion: number;
  totalLeads: number;
  totalReach: number;
  trendAlignment: number;
  lastUpdated: string;
}

export interface HookPerformance {
  hook: string;
  platform: Platform;
  avgEngagement: number;
  avgLeads: number;
  usageCount: number;
  successRate: number;
}

export interface TopicPerformance {
  topic: string;
  platform: Platform;
  avgEngagement: number;
  avgLeads: number;
  usageCount: number;
  trendVelocity: number;
}

export interface CTAPerformance {
  cta: string;
  platform: Platform;
  clickRate: number;
  leadConversion: number;
  usageCount: number;
}

export interface FormatPerformance {
  format: string;
  platform: Platform;
  avgEngagement: number;
  avgLeads: number;
  usageCount: number;
}

// In-memory learning store (replace with database in production)
const learningMemory: LearningMemory = {
  contentPerformance: [],
  platformPerformance: [],
  hookPerformance: [],
  topicPerformance: [],
  ctaPerformance: [],
  formatPerformance: [],
  lastLearned: new Date().toISOString()
};

/**
 * Record content performance
 */
export function recordContentPerformance(performance: ContentPerformance): void {
  learningMemory.contentPerformance.push(performance);
  
  // Keep last 1000 records
  if (learningMemory.contentPerformance.length > 1000) {
    learningMemory.contentPerformance.shift();
  }
  
  // Update platform performance
  updatePlatformPerformance(performance.platform, performance);
  
  // Update format performance
  updateFormatPerformance(performance.metadata.format, performance.platform, performance);
  
  // Update topic performance
  for (const topic of performance.metadata.topics || []) {
    updateTopicPerformance(topic, performance.platform, performance);
  }
  
  // Update CTA performance
  updateCTAPerformance(performance.metadata.cta, performance.platform, performance);
  
  learningMemory.lastLearned = new Date().toISOString();
}

/**
 * Update platform performance
 */
function updatePlatformPerformance(platform: Platform, performance: ContentPerformance): void {
  let platformPerf = learningMemory.platformPerformance.find(p => p.platform === platform);
  
  if (!platformPerf) {
    platformPerf = {
      platform,
      avgEngagementRate: 0,
      avgLeadConversion: 0,
      totalLeads: 0,
      totalReach: 0,
      trendAlignment: 0,
      lastUpdated: new Date().toISOString()
    };
    learningMemory.platformPerformance.push(platformPerf);
  }
  
  // Recalculate averages
  const platformContent = learningMemory.contentPerformance.filter(c => c.platform === platform);
  const total = platformContent.length;
  
  if (total > 0) {
    platformPerf.avgEngagementRate = platformContent.reduce((sum, c) => sum + (c.engagement / c.reach), 0) / total;
    platformPerf.avgLeadConversion = platformContent.reduce((sum, c) => sum + c.conversionRate, 0) / total;
    platformPerf.totalLeads = platformContent.reduce((sum, c) => sum + c.leads, 0);
    platformPerf.totalReach = platformContent.reduce((sum, c) => sum + c.reach, 0);
  }
  
  platformPerf.lastUpdated = new Date().toISOString();
}

/**
 * Update format performance
 */
function updateFormatPerformance(format: string, platform: Platform, performance: ContentPerformance): void {
  let formatPerf = learningMemory.formatPerformance.find(
    f => f.format === format && f.platform === platform
  );
  
  if (!formatPerf) {
    formatPerf = {
      format,
      platform,
      avgEngagement: 0,
      avgLeads: 0,
      usageCount: 0
    };
    learningMemory.formatPerformance.push(formatPerf);
  }
  
  formatPerf.usageCount++;
  const formatContent = learningMemory.contentPerformance.filter(
    c => c.metadata.format === format && c.platform === platform
  );
  
  if (formatContent.length > 0) {
    formatPerf.avgEngagement = formatContent.reduce((sum, c) => sum + c.engagement, 0) / formatContent.length;
    formatPerf.avgLeads = formatContent.reduce((sum, c) => sum + c.leads, 0) / formatContent.length;
  }
}

/**
 * Update topic performance
 */
function updateTopicPerformance(topic: string, platform: Platform, performance: ContentPerformance): void {
  let topicPerf = learningMemory.topicPerformance.find(
    t => t.topic === topic && t.platform === platform
  );
  
  if (!topicPerf) {
    topicPerf = {
      topic,
      platform,
      avgEngagement: 0,
      avgLeads: 0,
      usageCount: 0,
      trendVelocity: 0
    };
    learningMemory.topicPerformance.push(topicPerf);
  }
  
  topicPerf.usageCount++;
  const topicContent = learningMemory.contentPerformance.filter(
    c => c.metadata.topics?.includes(topic) && c.platform === platform
  );
  
  if (topicContent.length > 0) {
    topicPerf.avgEngagement = topicContent.reduce((sum, c) => sum + c.engagement, 0) / topicContent.length;
    topicPerf.avgLeads = topicContent.reduce((sum, c) => sum + c.leads, 0) / topicContent.length;
  }
}

/**
 * Update CTA performance
 */
function updateCTAPerformance(cta: string, platform: Platform, performance: ContentPerformance): void {
  let ctaPerf = learningMemory.ctaPerformance.find(
    c => c.cta === cta && c.platform === platform
  );
  
  if (!ctaPerf) {
    ctaPerf = {
      cta,
      platform,
      clickRate: 0,
      leadConversion: 0,
      usageCount: 0
    };
    learningMemory.ctaPerformance.push(ctaPerf);
  }
  
  ctaPerf.usageCount++;
  // In production, track actual click rates from tracking links
  // For now, estimate from lead conversion
  ctaPerf.leadConversion = performance.conversionRate;
}

/**
 * Get best performing content patterns
 */
export function getBestPerformingPatterns(platform?: Platform): {
  formats: FormatPerformance[];
  topics: TopicPerformance[];
  ctas: CTAPerformance[];
} {
  let formats = learningMemory.formatPerformance;
  let topics = learningMemory.topicPerformance;
  let ctas = learningMemory.ctaPerformance;
  
  if (platform) {
    formats = formats.filter(f => f.platform === platform);
    topics = topics.filter(t => t.platform === platform);
    ctas = ctas.filter(c => c.platform === platform);
  }
  
  return {
    formats: formats.sort((a, b) => b.avgLeads - a.avgLeads).slice(0, 5),
    topics: topics.sort((a, b) => b.avgLeads - a.avgLeads).slice(0, 10),
    ctas: ctas.sort((a, b) => b.leadConversion - a.leadConversion).slice(0, 5)
  };
}

/**
 * Get platform recommendations
 */
export function getPlatformRecommendations(): PlatformPerformance[] {
  return learningMemory.platformPerformance
    .sort((a, b) => b.avgLeadConversion - a.avgLeadConversion);
}

/**
 * Learn from batch performance
 */
export function learnFromBatch(performances: ContentPerformance[]): void {
  for (const performance of performances) {
    recordContentPerformance(performance);
  }
}

/**
 * Get learning insights
 */
export function getLearningInsights(): {
  topPlatform: Platform | null;
  topFormat: string | null;
  topTopic: string | null;
  topCTA: string | null;
  totalContent: number;
  totalLeads: number;
  avgConversionRate: number;
} {
  const platforms = getPlatformRecommendations();
  const patterns = getBestPerformingPatterns();
  
  const totalContent = learningMemory.contentPerformance.length;
  const totalLeads = learningMemory.contentPerformance.reduce((sum, c) => sum + c.leads, 0);
  const avgConversionRate = totalContent > 0 
    ? learningMemory.contentPerformance.reduce((sum, c) => sum + c.conversionRate, 0) / totalContent
    : 0;
  
  return {
    topPlatform: platforms[0]?.platform || null,
    topFormat: patterns.formats[0]?.format || null,
    topTopic: patterns.topics[0]?.topic || null,
    topCTA: patterns.ctas[0]?.cta || null,
    totalContent,
    totalLeads,
    avgConversionRate
  };
}

/**
 * Export learning memory
 */
export function getLearningMemory(): LearningMemory {
  return { ...learningMemory };
}
