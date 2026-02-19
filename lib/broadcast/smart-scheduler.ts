// Broadcast Engine - Smart Scheduler
// Decides optimal posting times based on performance, trends, and audience behavior

import { Platform } from "./types";
import { PostingStrategy } from "./adaptive-strategy";

export interface OptimalPostTime {
  platform: Platform;
  hour: number; // 0-23
  dayOfWeek: number; // 0-6 (Sunday = 0)
  score: number; // 0-100, how optimal this time is
  reason: string;
}

export interface ScheduleRecommendation {
  platform: Platform;
  optimalTimes: OptimalPostTime[];
  frequency: number; // posts per day
  priority: number; // 0-100
  nextPostTime: string; // ISO timestamp
}

/**
 * Default optimal posting times by platform (based on industry data)
 */
const DEFAULT_OPTIMAL_TIMES: Record<Platform, number[]> = {
  youtube: [14, 15, 16, 17], // 2-5 PM
  shorts: [12, 13, 14, 15, 16, 17, 18, 19, 20], // 12-8 PM
  tiktok: [18, 19, 20, 21, 22], // 6-10 PM
  instagram: [11, 12, 13, 14, 15, 16, 17], // 11 AM-5 PM
  reels: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20], // 11 AM-8 PM
  facebook: [9, 10, 11, 12, 13, 14, 15, 16], // 9 AM-4 PM
  linkedin: [8, 9, 10, 11, 12, 13, 14, 15, 16], // 8 AM-4 PM
  twitter: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18] // 8 AM-6 PM
};

/**
 * Calculate optimal posting time based on historical performance
 */
export function calculateOptimalTime(
  platform: Platform,
  engagementByHour: Record<number, number>,
  engagementByDay: Record<number, number>
): OptimalPostTime[] {
  const optimal: OptimalPostTime[] = [];
  const defaultTimes = DEFAULT_OPTIMAL_TIMES[platform];
  
  // If we have historical data, use it
  if (Object.keys(engagementByHour).length > 0) {
    // Find top 3 hours with highest engagement
    const sortedHours = Object.entries(engagementByHour)
      .map(([hour, engagement]) => ({ hour: parseInt(hour), engagement }))
      .sort((a, b) => b.engagement - a.engagement)
      .slice(0, 3);
    
    for (const { hour, engagement } of sortedHours) {
      // Find best day of week for this hour
      const bestDay = Object.entries(engagementByDay)
        .map(([day, engagement]) => ({ day: parseInt(day), engagement }))
        .sort((a, b) => b.engagement - a.engagement)[0]?.day || 1; // Default to Monday
      
      optimal.push({
        platform,
        hour,
        dayOfWeek: bestDay,
        score: Math.min(100, engagement * 10), // Normalize to 0-100
        reason: `Historical engagement: ${engagement.toFixed(2)}%`
      });
    }
  } else {
    // Use default times
    for (const hour of defaultTimes.slice(0, 3)) {
      optimal.push({
        platform,
        hour,
        dayOfWeek: 1, // Monday (most active day)
        score: 70, // Default score
        reason: "Default optimal time based on platform data"
      });
    }
  }
  
  return optimal;
}

/**
 * Calculate next optimal posting time
 */
export function calculateNextPostTime(
  platform: Platform,
  optimalTimes: OptimalPostTime[],
  lastPostTime?: string
): string {
  const now = new Date();
  const currentHour = now.getHours();
  const currentDay = now.getDay();
  
  // Find next optimal time
  for (const optimal of optimalTimes.sort((a, b) => a.hour - b.hour)) {
    const targetDate = new Date(now);
    targetDate.setHours(optimal.hour, 0, 0, 0);
    
    // If time has passed today, schedule for tomorrow
    if (targetDate <= now) {
      targetDate.setDate(targetDate.getDate() + 1);
    }
    
    // Adjust to optimal day of week if needed
    const dayDiff = optimal.dayOfWeek - targetDate.getDay();
    if (dayDiff > 0) {
      targetDate.setDate(targetDate.getDate() + dayDiff);
    }
    
    return targetDate.toISOString();
  }
  
  // Default: schedule for next hour
  const nextHour = new Date(now);
  nextHour.setHours(currentHour + 1, 0, 0, 0);
  return nextHour.toISOString();
}

/**
 * Build schedule recommendation for platform
 */
export function buildScheduleRecommendation(
  platform: Platform,
  strategy?: PostingStrategy,
  engagementByHour?: Record<number, number>,
  engagementByDay?: Record<number, number>
): ScheduleRecommendation {
  const optimalTimes = calculateOptimalTime(
    platform,
    engagementByHour || {},
    engagementByDay || {}
  );
  
  const frequency = strategy?.frequency || 1; // Default 1 post/day
  const priority = strategy?.priority || 50; // Default priority
  
  const nextPostTime = calculateNextPostTime(platform, optimalTimes);
  
  return {
    platform,
    optimalTimes,
    frequency,
    priority,
    nextPostTime
  };
}

/**
 * Build schedule recommendations for all platforms
 */
export function buildAllScheduleRecommendations(
  platforms: Platform[],
  strategies?: PostingStrategy[],
  engagementData?: Record<Platform, {
    byHour: Record<number, number>;
    byDay: Record<number, number>;
  }>
): ScheduleRecommendation[] {
  return platforms.map(platform => {
    const strategy = strategies?.find(s => s.platform === platform);
    const engagement = engagementData?.[platform];
    
    return buildScheduleRecommendation(
      platform,
      strategy,
      engagement?.byHour,
      engagement?.byDay
    );
  });
}

/**
 * Determine posting order (which platform to post to first)
 */
export function determinePostingOrder(
  recommendations: ScheduleRecommendation[]
): Platform[] {
  // Sort by priority (highest first), then by next post time (earliest first)
  return recommendations
    .sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      return new Date(a.nextPostTime).getTime() - new Date(b.nextPostTime).getTime();
    })
    .map(r => r.platform);
}
