// Broadcast Engine - Agent Workflow: Close Module
// Tracks conversion, revenue, attribution, agent performance

import { LeadObject } from "../funnel-modules/lead-intake";
import { RoutingDecision } from "../funnel-modules/routing";
import { Task } from "../funnel-modules/task";
import { AgentAction } from "./action";

export interface ConversionData {
  leadId: string;
  clientId: string;
  taskId: string;
  agentId: string;
  converted: boolean;
  revenue?: number;
  conversionTime?: number; // Minutes from lead creation to conversion
  platform: string;
  entryPoint: string;
  contentId?: string;
  attribution: {
    sourcePost?: string;
    sourceContent?: string;
    sourceTrend?: string;
  };
  timestamp: string;
}

export interface AgentPerformance {
  agentId: string;
  totalLeads: number;
  convertedLeads: number;
  conversionRate: number;
  totalRevenue: number;
  avgRevenuePerLead: number;
  avgConversionTime: number;
  platformBreakdown: Record<string, {
    leads: number;
    converted: number;
    revenue: number;
  }>;
  entryPointBreakdown: Record<string, {
    leads: number;
    converted: number;
    revenue: number;
  }>;
}

/**
 * Record conversion
 */
export async function recordConversion(
  lead: LeadObject,
  routing: RoutingDecision,
  task: Task,
  agentId: string,
  converted: boolean,
  revenue?: number,
  conversionTime?: number
): Promise<ConversionData> {
  const conversion: ConversionData = {
    leadId: lead.id,
    clientId: task.clientId,
    taskId: task.id,
    agentId,
    converted,
    revenue,
    conversionTime,
    platform: lead.platform,
    entryPoint: routing.entryPoint,
    contentId: lead.sourcePostId,
    attribution: {
      sourcePost: lead.sourcePostId,
      sourceContent: lead.content.substring(0, 100),
      sourceTrend: routing.entryPoint === "trend_spike" ? "trend_aligned" : undefined
    },
    timestamp: new Date().toISOString()
  };
  
  // Emit conversion feedback signal
  const { emitConversionFeedbackSignal } = await import("../funnel-modules/hyperstate-uoi");
  await emitConversionFeedbackSignal(lead, routing, {
    converted,
    revenue,
    conversionTime,
    platform: lead.platform,
    contentId: lead.sourcePostId
  });
  
  // In production, store in database
  // For now, emit signal
  const { emitSignal } = await import("@/lib/uoi/signals");
  emitSignal({
    source: "broadcast_engine",
    type: "conversion_recorded",
    payload: conversion,
    priority: "medium"
  });
  
  return conversion;
}

/**
 * Calculate agent performance
 */
export function calculateAgentPerformance(
  conversions: ConversionData[]
): AgentPerformance {
  const agentMap = new Map<string, ConversionData[]>();
  
  // Group by agent
  for (const conversion of conversions) {
    if (!agentMap.has(conversion.agentId)) {
      agentMap.set(conversion.agentId, []);
    }
    agentMap.get(conversion.agentId)!.push(conversion);
  }
  
  // Calculate performance for each agent
  const performances: AgentPerformance[] = [];
  
  for (const [agentId, agentConversions] of Array.from(agentMap.entries())) {
    const totalLeads = agentConversions.length;
    const convertedLeads = agentConversions.filter(c => c.converted).length;
    const conversionRate = totalLeads > 0 ? convertedLeads / totalLeads : 0;
    const totalRevenue = agentConversions
      .filter(c => c.converted && c.revenue)
      .reduce((sum, c) => sum + (c.revenue || 0), 0);
    const avgRevenuePerLead = convertedLeads > 0 ? totalRevenue / convertedLeads : 0;
    
    const conversionTimes = agentConversions
      .filter(c => c.converted && c.conversionTime)
      .map(c => c.conversionTime || 0);
    const avgConversionTime = conversionTimes.length > 0
      ? conversionTimes.reduce((sum, t) => sum + t, 0) / conversionTimes.length
      : 0;
    
    // Platform breakdown
    const platformBreakdown: Record<string, { leads: number; converted: number; revenue: number }> = {};
    for (const conversion of agentConversions) {
      if (!platformBreakdown[conversion.platform]) {
        platformBreakdown[conversion.platform] = { leads: 0, converted: 0, revenue: 0 };
      }
      platformBreakdown[conversion.platform].leads++;
      if (conversion.converted) {
        platformBreakdown[conversion.platform].converted++;
        platformBreakdown[conversion.platform].revenue += conversion.revenue || 0;
      }
    }
    
    // Entry point breakdown
    const entryPointBreakdown: Record<string, { leads: number; converted: number; revenue: number }> = {};
    for (const conversion of agentConversions) {
      if (!entryPointBreakdown[conversion.entryPoint]) {
        entryPointBreakdown[conversion.entryPoint] = { leads: 0, converted: 0, revenue: 0 };
      }
      entryPointBreakdown[conversion.entryPoint].leads++;
      if (conversion.converted) {
        entryPointBreakdown[conversion.entryPoint].converted++;
        entryPointBreakdown[conversion.entryPoint].revenue += conversion.revenue || 0;
      }
    }
    
    performances.push({
      agentId,
      totalLeads,
      convertedLeads,
      conversionRate,
      totalRevenue,
      avgRevenuePerLead,
      avgConversionTime,
      platformBreakdown,
      entryPointBreakdown
    });
  }
  
  // Return first agent (in production, return all or specific agent)
  return performances[0] || {
    agentId: "",
    totalLeads: 0,
    convertedLeads: 0,
    conversionRate: 0,
    totalRevenue: 0,
    avgRevenuePerLead: 0,
    avgConversionTime: 0,
    platformBreakdown: {},
    entryPointBreakdown: {}
  };
}

/**
 * Get attribution data for content
 */
export function getContentAttribution(
  conversions: ConversionData[],
  contentId: string
): {
  leads: number;
  converted: number;
  revenue: number;
  conversionRate: number;
} {
  const contentConversions = conversions.filter(c => c.contentId === contentId);
  const leads = contentConversions.length;
  const converted = contentConversions.filter(c => c.converted).length;
  const revenue = contentConversions
    .filter(c => c.converted && c.revenue)
    .reduce((sum, c) => sum + (c.revenue || 0), 0);
  const conversionRate = leads > 0 ? converted / leads : 0;
  
  return {
    leads,
    converted,
    revenue,
    conversionRate
  };
}
