// Broadcast Engine - Revenue Attribution: ROI Calculator
// Calculates ROI for content, platforms, trends, agents, funnel entry points

import { RevenueAttribution } from "./revenue-tracker";
import { ConversionData } from "../agent-workflow/close";

export interface ContentROI {
  postId: string;
  platform: string;
  title?: string;
  postedAt?: string;
  totalViews: number;
  totalEngagement: number;
  totalLeads: number;
  convertedLeads: number;
  totalRevenue: number;
  attributedRevenue: number;
  roi: number; // (attributedRevenue / cost) * 100, or attributedRevenue if cost = 0
  conversionRate: number;
  revenuePerView: number;
  revenuePerLead: number;
}

export interface PlatformROI {
  platform: string;
  totalPosts: number;
  totalViews: number;
  totalEngagement: number;
  totalLeads: number;
  convertedLeads: number;
  totalRevenue: number;
  attributedRevenue: number;
  roi: number;
  conversionRate: number;
  revenuePerPost: number;
  revenuePerLead: number;
}

export interface TrendROI {
  trendId: string;
  trendType: string;
  keyword?: string;
  totalPosts: number;
  totalLeads: number;
  convertedLeads: number;
  totalRevenue: number;
  attributedRevenue: number;
  roi: number;
  conversionRate: number;
  revenuePerPost: number;
}

export interface AgentROI {
  agentId: string;
  totalLeads: number;
  convertedLeads: number;
  totalRevenue: number;
  avgRevenuePerLead: number;
  conversionRate: number;
  avgConversionTime: number;
  roi: number; // Based on agent cost vs revenue
}

export interface FunnelEntryPointROI {
  entryPoint: string;
  totalLeads: number;
  convertedLeads: number;
  totalRevenue: number;
  avgRevenuePerLead: number;
  conversionRate: number;
  avgConversionTime: number;
  roi: number;
}

/**
 * Calculate content ROI
 */
export function calculateContentROI(
  postId: string,
  platform: string,
  attributions: RevenueAttribution[],
  conversions: ConversionData[],
  engagementData?: {
    views?: number;
    likes?: number;
    comments?: number;
    shares?: number;
  }
): ContentROI {
  const postAttributions = attributions.filter(a => 
    a.postId === postId ||
    a.attribution.firstTouch.postId === postId ||
    a.attribution.leadTouch.postId === postId ||
    a.attribution.funnelTouch.postId === postId ||
    a.attribution.closeTouch.postId === postId
  );
  
  const postConversions = conversions.filter(c => c.contentId === postId);
  
  const totalViews = engagementData?.views || 0;
  const totalEngagement = (engagementData?.likes || 0) + 
                         (engagementData?.comments || 0) + 
                         (engagementData?.shares || 0);
  const totalLeads = postConversions.length;
  const convertedLeads = postConversions.filter(c => c.converted).length;
  const totalRevenue = postAttributions.reduce((sum, a) => sum + a.amount, 0);
  
  // Calculate attributed revenue using weights
  const attributedRevenue = postAttributions.reduce((sum, a) => {
    let attribution = 0;
    
    if (a.attribution.firstTouch.postId === postId) {
      attribution += a.amount * a.attribution.firstTouch.weight;
    }
    if (a.attribution.leadTouch.postId === postId) {
      attribution += a.amount * a.attribution.leadTouch.weight;
    }
    if (a.attribution.funnelTouch.postId === postId) {
      attribution += a.amount * a.attribution.funnelTouch.weight;
    }
    if (a.attribution.closeTouch.postId === postId) {
      attribution += a.amount * a.attribution.closeTouch.weight;
    }
    
    return sum + attribution;
  }, 0);
  
  const conversionRate = totalLeads > 0 ? convertedLeads / totalLeads : 0;
  const revenuePerView = totalViews > 0 ? attributedRevenue / totalViews : 0;
  const revenuePerLead = totalLeads > 0 ? attributedRevenue / totalLeads : 0;
  
  // ROI = attributedRevenue (assuming cost = 0 for now, or can be calculated as (revenue - cost) / cost * 100)
  const roi = attributedRevenue; // In production, calculate as (revenue - cost) / cost * 100
  
  return {
    postId,
    platform,
    totalViews,
    totalEngagement,
    totalLeads,
    convertedLeads,
    totalRevenue,
    attributedRevenue,
    roi,
    conversionRate,
    revenuePerView,
    revenuePerLead
  };
}

/**
 * Calculate platform ROI
 */
export function calculatePlatformROI(
  platform: string,
  attributions: RevenueAttribution[],
  conversions: ConversionData[],
  postsData?: Array<{
    postId: string;
    views?: number;
    engagement?: number;
  }>
): PlatformROI {
  const platformAttributions = attributions.filter(a => a.platform === platform);
  const platformConversions = conversions.filter(c => c.platform === platform);
  const platformPosts = postsData?.filter(p => 
    platformAttributions.some(a => a.postId === p.postId)
  ) || [];
  
  const totalPosts = platformPosts.length;
  const totalViews = platformPosts.reduce((sum, p) => sum + (p.views || 0), 0);
  const totalEngagement = platformPosts.reduce((sum, p) => sum + (p.engagement || 0), 0);
  const totalLeads = platformConversions.length;
  const convertedLeads = platformConversions.filter(c => c.converted).length;
  const totalRevenue = platformAttributions.reduce((sum, a) => sum + a.amount, 0);
  
  // Calculate attributed revenue
  const attributedRevenue = platformAttributions.reduce((sum, a) => {
    let attribution = 0;
    
    if (a.attribution.firstTouch.platform === platform) {
      attribution += a.amount * a.attribution.firstTouch.weight;
    }
    if (a.attribution.leadTouch.platform === platform) {
      attribution += a.amount * a.attribution.leadTouch.weight;
    }
    if (a.attribution.funnelTouch.platform === platform) {
      attribution += a.amount * a.attribution.funnelTouch.weight;
    }
    if (a.attribution.closeTouch.platform === platform) {
      attribution += a.amount * a.attribution.closeTouch.weight;
    }
    
    return sum + attribution;
  }, 0);
  
  const conversionRate = totalLeads > 0 ? convertedLeads / totalLeads : 0;
  const revenuePerPost = totalPosts > 0 ? attributedRevenue / totalPosts : 0;
  const revenuePerLead = totalLeads > 0 ? attributedRevenue / totalLeads : 0;
  const roi = attributedRevenue; // In production, calculate with costs
  
  return {
    platform,
    totalPosts,
    totalViews,
    totalEngagement,
    totalLeads,
    convertedLeads,
    totalRevenue,
    attributedRevenue,
    roi,
    conversionRate,
    revenuePerPost,
    revenuePerLead
  };
}

/**
 * Calculate trend ROI
 */
export function calculateTrendROI(
  trendId: string,
  trendType: string,
  attributions: RevenueAttribution[],
  conversions: ConversionData[],
  postsData?: Array<{ postId: string }>
): TrendROI {
  const trendAttributions = attributions.filter(a => a.trendId === trendId);
  const trendConversions = conversions.filter(c => 
    trendAttributions.some(a => a.leadId === c.leadId)
  );
  const trendPosts = postsData?.filter(p => 
    trendAttributions.some(a => a.postId === p.postId)
  ) || [];
  
  const totalPosts = trendPosts.length;
  const totalLeads = trendConversions.length;
  const convertedLeads = trendConversions.filter(c => c.converted).length;
  const totalRevenue = trendAttributions.reduce((sum, a) => sum + a.amount, 0);
  
  // Calculate attributed revenue (including trend touch)
  const attributedRevenue = trendAttributions.reduce((sum, a) => {
    let attribution = 0;
    
    // Base attribution from content touches
    if (a.attribution.firstTouch.postId) {
      attribution += a.amount * a.attribution.firstTouch.weight * 0.5; // Reduce weight for trend
    }
    if (a.attribution.leadTouch.postId) {
      attribution += a.amount * a.attribution.leadTouch.weight * 0.5;
    }
    
    // Trend touch attribution
    if (a.attribution.trendTouch && a.attribution.trendTouch.trendId === trendId) {
      attribution += a.amount * a.attribution.trendTouch.weight;
    }
    
    return sum + attribution;
  }, 0);
  
  const conversionRate = totalLeads > 0 ? convertedLeads / totalLeads : 0;
  const revenuePerPost = totalPosts > 0 ? attributedRevenue / totalPosts : 0;
  const roi = attributedRevenue;
  
  return {
    trendId,
    trendType,
    totalPosts,
    totalLeads,
    convertedLeads,
    totalRevenue,
    attributedRevenue,
    roi,
    conversionRate,
    revenuePerPost
  };
}

/**
 * Calculate agent ROI
 */
export function calculateAgentROI(
  agentId: string,
  conversions: ConversionData[],
  attributions: RevenueAttribution[],
  agentCost?: number // Monthly cost per agent
): AgentROI {
  const agentConversions = conversions.filter(c => c.agentId === agentId);
  const agentAttributions = attributions.filter(a => a.agentId === agentId);
  
  const totalLeads = agentConversions.length;
  const convertedLeads = agentConversions.filter(c => c.converted).length;
  const totalRevenue = agentAttributions.reduce((sum, a) => sum + a.amount, 0);
  const avgRevenuePerLead = convertedLeads > 0 ? totalRevenue / convertedLeads : 0;
  const conversionRate = totalLeads > 0 ? convertedLeads / totalLeads : 0;
  
  const conversionTimes = agentConversions
    .filter(c => c.converted && c.conversionTime)
    .map(c => c.conversionTime || 0);
  const avgConversionTime = conversionTimes.length > 0
    ? conversionTimes.reduce((sum, t) => sum + t, 0) / conversionTimes.length
    : 0;
  
  // ROI = (revenue - cost) / cost * 100, or revenue if cost = 0
  const roi = agentCost && agentCost > 0 
    ? ((totalRevenue - agentCost) / agentCost) * 100 
    : totalRevenue;
  
  return {
    agentId,
    totalLeads,
    convertedLeads,
    totalRevenue,
    avgRevenuePerLead,
    conversionRate,
    avgConversionTime,
    roi
  };
}

/**
 * Calculate funnel entry point ROI
 */
export function calculateFunnelEntryPointROI(
  entryPoint: string,
  conversions: ConversionData[],
  attributions: RevenueAttribution[]
): FunnelEntryPointROI {
  const entryConversions = conversions.filter(c => c.entryPoint === entryPoint);
  const entryAttributions = attributions.filter(a => 
    entryConversions.some(c => c.leadId === a.leadId)
  );
  
  const totalLeads = entryConversions.length;
  const convertedLeads = entryConversions.filter(c => c.converted).length;
  const totalRevenue = entryAttributions.reduce((sum, a) => sum + a.amount, 0);
  const avgRevenuePerLead = convertedLeads > 0 ? totalRevenue / convertedLeads : 0;
  const conversionRate = totalLeads > 0 ? convertedLeads / totalLeads : 0;
  
  const conversionTimes = entryConversions
    .filter(c => c.converted && c.conversionTime)
    .map(c => c.conversionTime || 0);
  const avgConversionTime = conversionTimes.length > 0
    ? conversionTimes.reduce((sum, t) => sum + t, 0) / conversionTimes.length
    : 0;
  
  const roi = totalRevenue; // In production, calculate with costs
  
  return {
    entryPoint,
    totalLeads,
    convertedLeads,
    totalRevenue,
    avgRevenuePerLead,
    conversionRate,
    avgConversionTime,
    roi
  };
}

/**
 * Get top performing content by ROI
 */
export function getTopPerformingContent(
  rois: ContentROI[],
  limit: number = 10
): ContentROI[] {
  return rois
    .sort((a, b) => b.roi - a.roi)
    .slice(0, limit);
}

/**
 * Get top performing platforms by ROI
 */
export function getTopPerformingPlatforms(
  rois: PlatformROI[],
  limit: number = 5
): PlatformROI[] {
  return rois
    .sort((a, b) => b.roi - a.roi)
    .slice(0, limit);
}
