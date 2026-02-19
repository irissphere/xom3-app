// Broadcast Engine - Optimization Loop: Pattern Detector
// Finds repeating patterns, seasonal cycles, platform shifts, audience behavior changes

import { ContentPerformance } from "../learning-engine";
import { ConversionData } from "../agent-workflow/close";
import { RevenueAttribution } from "../revenue-attribution/revenue-tracker";

export interface DetectedPattern {
  id: string;
  type: "repeating" | "seasonal" | "platform_shift" | "audience_change" | "trend_cycle";
  description: string;
  confidence: number; // 0-1
  frequency: number; // How often it occurs
  impact: "high" | "medium" | "low";
  recommendation: string;
  metadata: {
    startDate?: string;
    endDate?: string;
    cycleLength?: number; // Days
    affectedPlatforms?: string[];
    affectedTopics?: string[];
  };
}

/**
 * Detect repeating patterns
 */
export function detectRepeatingPatterns(
  performances: ContentPerformance[]
): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];
  
  // Group by day of week
  const byDayOfWeek: Record<number, ContentPerformance[]> = {};
  for (const perf of performances) {
    const date = new Date(perf.timestamp);
    const dayOfWeek = date.getDay();
    if (!byDayOfWeek[dayOfWeek]) {
      byDayOfWeek[dayOfWeek] = [];
    }
    byDayOfWeek[dayOfWeek].push(perf);
  }
  
  // Find days with consistently high performance
  for (const [day, perfs] of Object.entries(byDayOfWeek)) {
    const avgEngagement = perfs.reduce((sum, p) => sum + p.engagement, 0) / perfs.length;
    const avgLeads = perfs.reduce((sum, p) => sum + p.leads, 0) / perfs.length;
    
    if (avgEngagement > 100 && avgLeads > 2) {
      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      patterns.push({
        id: `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: "repeating",
        description: `${dayNames[parseInt(day)]} consistently shows high performance`,
        confidence: 0.7,
        frequency: perfs.length,
        impact: "medium",
        recommendation: `Increase posting frequency on ${dayNames[parseInt(day)]}`,
        metadata: {
          affectedPlatforms: Array.from(new Set(perfs.map(p => p.platform)))
        }
      });
    }
  }
  
  return patterns;
}

/**
 * Detect seasonal cycles
 */
export function detectSeasonalCycles(
  performances: ContentPerformance[],
  conversions: ConversionData[]
): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];
  
  // Group by month
  const byMonth: Record<number, {
    performances: ContentPerformance[];
    conversions: ConversionData[];
  }> = {};
  
  for (const perf of performances) {
    const date = new Date(perf.timestamp);
    const month = date.getMonth();
    if (!byMonth[month]) {
      byMonth[month] = { performances: [], conversions: [] };
    }
    byMonth[month].performances.push(perf);
  }
  
  for (const conv of conversions) {
    const date = new Date(conv.timestamp);
    const month = date.getMonth();
    if (!byMonth[month]) {
      byMonth[month] = { performances: [], conversions: [] };
    }
    byMonth[month].conversions.push(conv);
  }
  
  // Detect open enrollment season (October-December)
  const openEnrollmentMonths = [9, 10, 11]; // Oct, Nov, Dec
  const openEnrollmentData = openEnrollmentMonths.map(m => byMonth[m]).filter(Boolean);
  
  if (openEnrollmentData.length > 0) {
    const avgLeads = openEnrollmentData.reduce((sum, d) => 
      sum + d.performances.reduce((s, p) => s + p.leads, 0), 0
    ) / openEnrollmentData.length;
    
    if (avgLeads > 10) {
      patterns.push({
        id: `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: "seasonal",
        description: "Open enrollment season shows increased lead volume",
        confidence: 0.9,
        frequency: 3, // 3 months
        impact: "high",
        recommendation: "Prepare open enrollment content series in advance",
        metadata: {
          startDate: "October",
          endDate: "December",
          cycleLength: 90,
          affectedTopics: ["open enrollment", "health insurance", "benefits"]
        }
      });
    }
  }
  
  return patterns;
}

/**
 * Detect platform shifts
 */
export function detectPlatformShifts(
  performances: ContentPerformance[]
): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];
  
  // Group by platform and time period
  const recent = performances.filter(p => {
    const daysSince = (Date.now() - new Date(p.timestamp).getTime()) / (1000 * 60 * 60 * 24);
    return daysSince <= 30;
  });
  
  const older = performances.filter(p => {
    const daysSince = (Date.now() - new Date(p.timestamp).getTime()) / (1000 * 60 * 60 * 24);
    return daysSince > 30 && daysSince <= 90;
  });
  
  // Calculate engagement rates by platform
  const platformEngagement: Record<string, { recent: number; older: number }> = {};
  
  for (const perf of recent) {
    if (!platformEngagement[perf.platform]) {
      platformEngagement[perf.platform] = { recent: 0, older: 0 };
    }
    platformEngagement[perf.platform].recent += perf.engagement / perf.reach;
  }
  
  for (const perf of older) {
    if (!platformEngagement[perf.platform]) {
      platformEngagement[perf.platform] = { recent: 0, older: 0 };
    }
    platformEngagement[perf.platform].older += perf.engagement / perf.reach;
  }
  
  // Detect significant shifts (>50% change)
  for (const [platform, rates] of Object.entries(platformEngagement)) {
    if (rates.older > 0) {
      const change = (rates.recent - rates.older) / rates.older;
      
      if (Math.abs(change) > 0.5) {
        patterns.push({
          id: `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: "platform_shift",
          description: `${platform} engagement ${change > 0 ? "increased" : "decreased"} by ${(Math.abs(change) * 100).toFixed(1)}%`,
          confidence: 0.8,
          frequency: 1,
          impact: change > 0 ? "high" : "medium",
          recommendation: change > 0 
            ? `Increase investment in ${platform}`
            : `Review ${platform} strategy and consider reducing frequency`,
          metadata: {
            affectedPlatforms: [platform]
          }
        });
      }
    }
  }
  
  return patterns;
}

/**
 * Detect audience behavior changes
 */
export function detectAudienceBehaviorChanges(
  performances: ContentPerformance[],
  conversions: ConversionData[]
): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];
  
  // Group by topic
  const topicPerformance: Record<string, {
    recent: { engagement: number; leads: number; count: number };
    older: { engagement: number; leads: number; count: number };
  }> = {};
  
  const recent = performances.filter(p => {
    const daysSince = (Date.now() - new Date(p.timestamp).getTime()) / (1000 * 60 * 60 * 24);
    return daysSince <= 30;
  });
  
  const older = performances.filter(p => {
    const daysSince = (Date.now() - new Date(p.timestamp).getTime()) / (1000 * 60 * 60 * 24);
    return daysSince > 30 && daysSince <= 90;
  });
  
  for (const perf of recent) {
    for (const topic of perf.metadata.topics || []) {
      if (!topicPerformance[topic]) {
        topicPerformance[topic] = {
          recent: { engagement: 0, leads: 0, count: 0 },
          older: { engagement: 0, leads: 0, count: 0 }
        };
      }
      topicPerformance[topic].recent.engagement += perf.engagement;
      topicPerformance[topic].recent.leads += perf.leads;
      topicPerformance[topic].recent.count++;
    }
  }
  
  for (const perf of older) {
    for (const topic of perf.metadata.topics || []) {
      if (!topicPerformance[topic]) {
        topicPerformance[topic] = {
          recent: { engagement: 0, leads: 0, count: 0 },
          older: { engagement: 0, leads: 0, count: 0 }
        };
      }
      topicPerformance[topic].older.engagement += perf.engagement;
      topicPerformance[topic].older.leads += perf.leads;
      topicPerformance[topic].older.count++;
    }
  }
  
  // Detect significant topic shifts
  for (const [topic, data] of Object.entries(topicPerformance)) {
    if (data.older.count > 0 && data.recent.count > 0) {
      const recentAvgLeads = data.recent.leads / data.recent.count;
      const olderAvgLeads = data.older.leads / data.older.count;
      
      if (olderAvgLeads > 0) {
        const change = (recentAvgLeads - olderAvgLeads) / olderAvgLeads;
        
        if (Math.abs(change) > 0.5) {
          patterns.push({
            id: `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: "audience_change",
            description: `Topic "${topic}" ${change > 0 ? "gained" : "lost"} ${(Math.abs(change) * 100).toFixed(1)}% lead generation`,
            confidence: 0.7,
            frequency: 1,
            impact: change > 0 ? "high" : "medium",
            recommendation: change > 0
              ? `Increase content production for "${topic}"`
              : `Review and potentially reduce "${topic}" content`,
            metadata: {
              affectedTopics: [topic]
            }
          });
        }
      }
    }
  }
  
  return patterns;
}

/**
 * Detect trend cycles
 */
export function detectTrendCycles(
  attributions: RevenueAttribution[]
): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];
  
  // Group by trend
  const trendPerformance: Record<string, RevenueAttribution[]> = {};
  
  for (const attr of attributions) {
    if (attr.trendId) {
      if (!trendPerformance[attr.trendId]) {
        trendPerformance[attr.trendId] = [];
      }
      trendPerformance[attr.trendId].push(attr);
    }
  }
  
  // Detect trends with consistent revenue
  for (const [trendId, attrs] of Object.entries(trendPerformance)) {
    if (attrs.length >= 3) {
      const totalRevenue = attrs.reduce((sum, a) => sum + a.amount, 0);
      const avgRevenue = totalRevenue / attrs.length;
      
      if (avgRevenue > 500) {
        patterns.push({
          id: `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: "trend_cycle",
          description: `Trend "${trendId}" consistently generates revenue`,
          confidence: 0.8,
          frequency: attrs.length,
          impact: "high",
          recommendation: `Continue capitalizing on "${trendId}" trend`,
          metadata: {
            affectedTopics: [trendId]
          }
        });
      }
    }
  }
  
  return patterns;
}

/**
 * Detect all patterns
 */
export function detectAllPatterns(
  performances: ContentPerformance[],
  conversions: ConversionData[],
  attributions: RevenueAttribution[]
): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];
  
  patterns.push(...detectRepeatingPatterns(performances));
  patterns.push(...detectSeasonalCycles(performances, conversions));
  patterns.push(...detectPlatformShifts(performances));
  patterns.push(...detectAudienceBehaviorChanges(performances, conversions));
  patterns.push(...detectTrendCycles(attributions));
  
  // Sort by impact and confidence
  patterns.sort((a, b) => {
    const impactOrder = { high: 3, medium: 2, low: 1 };
    if (impactOrder[a.impact] !== impactOrder[b.impact]) {
      return impactOrder[b.impact] - impactOrder[a.impact];
    }
    return b.confidence - a.confidence;
  });
  
  return patterns;
}
