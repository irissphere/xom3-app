// Broadcast Engine - Agent Workflow: Priority Module
// Ranks tasks by lead tier, urgency, platform, time since signal, trend alignment

import { LeadObject } from "../funnel-modules/lead-intake";
import { RoutingDecision } from "../funnel-modules/routing";
import { Task } from "../funnel-modules/task";

export interface TaskPriority {
  taskId: string;
  priority: number; // 0-100, higher = more urgent
  rank: number; // Position in queue
  factors: {
    leadTier: number; // 0-40 points
    urgency: number; // 0-30 points
    timeSinceSignal: number; // 0-20 points (older = higher)
    platform: number; // 0-10 points
    trendAlignment: number; // 0-10 points
  };
  reasoning: string;
}

/**
 * Calculate task priority
 */
export function calculateTaskPriority(
  task: Task,
  lead: LeadObject,
  routing: RoutingDecision,
  timeSinceSignal: number // Minutes since signal
): TaskPriority {
  const factors = {
    leadTier: 0,
    urgency: 0,
    timeSinceSignal: 0,
    platform: 0,
    trendAlignment: 0
  };
  
  // Lead tier scoring (0-40 points)
  switch (lead.leadTier) {
    case "hot":
      factors.leadTier = 40;
      break;
    case "warm":
      factors.leadTier = 30;
      break;
    case "interested":
      factors.leadTier = 20;
      break;
    case "cold":
      factors.leadTier = 10;
      break;
    default:
      factors.leadTier = 5;
  }
  
  // Urgency scoring (0-30 points)
  switch (routing.urgency) {
    case "high":
      factors.urgency = 30;
      break;
    case "medium":
      factors.urgency = 20;
      break;
    case "low":
      factors.urgency = 10;
      break;
  }
  
  // Time since signal scoring (0-20 points)
  // Older signals get higher priority (up to 24 hours)
  if (timeSinceSignal > 24 * 60) {
    factors.timeSinceSignal = 20; // 24+ hours = max priority
  } else if (timeSinceSignal > 12 * 60) {
    factors.timeSinceSignal = 15; // 12-24 hours
  } else if (timeSinceSignal > 6 * 60) {
    factors.timeSinceSignal = 10; // 6-12 hours
  } else if (timeSinceSignal > 1 * 60) {
    factors.timeSinceSignal = 5; // 1-6 hours
  } else {
    factors.timeSinceSignal = 0; // < 1 hour
  }
  
  // Platform scoring (0-10 points)
  // Some platforms are more valuable
  const platformScores: Record<string, number> = {
    "instagram": 10,
    "tiktok": 8,
    "youtube": 7,
    "linkedin": 9,
    "facebook": 6,
    "twitter": 5
  };
  factors.platform = platformScores[lead.platform] || 5;
  
  // Trend alignment scoring (0-10 points)
  // If lead is aligned with trending topic, boost priority
  if (routing.entryPoint === "trend_spike") {
    factors.trendAlignment = 10;
  } else if (lead.metadata.classification?.trendAlignment) {
    factors.trendAlignment = 5;
  } else {
    factors.trendAlignment = 0;
  }
  
  // Calculate total priority
  const priority = Math.min(100, 
    factors.leadTier + 
    factors.urgency + 
    factors.timeSinceSignal + 
    factors.platform + 
    factors.trendAlignment
  );
  
  // Generate reasoning
  const reasoning = `Priority ${priority}/100: ${lead.leadTier} lead (${factors.leadTier}pts), ${routing.urgency} urgency (${factors.urgency}pts), ${timeSinceSignal}min since signal (${factors.timeSinceSignal}pts), ${lead.platform} platform (${factors.platform}pts), ${factors.trendAlignment > 0 ? "trend-aligned" : "no trend"} (${factors.trendAlignment}pts)`;
  
  return {
    taskId: task.id,
    priority,
    rank: 0, // Will be set when ranking multiple tasks
    factors,
    reasoning
  };
}

/**
 * Rank tasks by priority
 */
export function rankTasks(
  tasks: Array<{
    task: Task;
    lead: LeadObject;
    routing: RoutingDecision;
    timeSinceSignal: number;
  }>
): TaskPriority[] {
  const priorities = tasks.map(({ task, lead, routing, timeSinceSignal }) =>
    calculateTaskPriority(task, lead, routing, timeSinceSignal)
  );
  
  // Sort by priority (highest first)
  priorities.sort((a, b) => b.priority - a.priority);
  
  // Assign ranks
  priorities.forEach((p, index) => {
    p.rank = index + 1;
  });
  
  return priorities;
}

/**
 * Get top priority tasks for agent
 */
export function getTopPriorityTasks(
  tasks: Array<{
    task: Task;
    lead: LeadObject;
    routing: RoutingDecision;
    timeSinceSignal: number;
  }>,
  limit: number = 10
): TaskPriority[] {
  const ranked = rankTasks(tasks);
  return ranked.slice(0, limit);
}
