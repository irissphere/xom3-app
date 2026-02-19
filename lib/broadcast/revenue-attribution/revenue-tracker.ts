// Broadcast Engine - Revenue Attribution: Revenue Tracker
// Tracks closed deals from HPE and maps them to broadcast content

import { ConversionData } from "../agent-workflow/close";
import { LeadObject } from "../funnel-modules/lead-intake";

export type RevenueSource = 
  | "premium"      // Insurance premium
  | "commission"   // Agent commission
  | "subscription" // Subscription revenue
  | "service"      // Service fee
  | "other";       // Other revenue

export interface RevenueEvent {
  id: string;
  clientId: string;
  agentId: string;
  amount: number;
  source: RevenueSource;
  planType?: string;
  commissionRate?: number;
  commissionAmount?: number;
  timestamp: string;
  metadata: {
    invoiceId?: string;
    billingRecordId?: string;
    hpeStage?: string;
    closedAt?: string;
  };
}

export interface RevenueAttribution {
  revenueId: string;
  clientId: string;
  agentId: string;
  amount: number;
  platform: string;
  postId?: string;
  leadId: string;
  trendId?: string;
  funnelPath: Array<{
    stage: string;
    timestamp: string;
    contentId?: string;
  }>;
  attribution: {
    firstTouch: {
      postId?: string;
      platform?: string;
      timestamp: string;
      weight: number; // 0-1
    };
    leadTouch: {
      postId?: string;
      platform?: string;
      timestamp: string;
      weight: number; // 0-1
    };
    funnelTouch: {
      postId?: string;
      platform?: string;
      timestamp: string;
      weight: number; // 0-1
    };
    closeTouch: {
      postId?: string;
      platform?: string;
      timestamp: string;
      weight: number; // 0-1
    };
    trendTouch?: {
      trendId?: string;
      trendType?: string;
      timestamp: string;
      weight: number; // 0-1
    };
  };
  createdAt: string;
}

/**
 * Track revenue event from HPE
 */
export async function trackRevenueEvent(
  clientId: string,
  agentId: string,
  amount: number,
  source: RevenueSource,
  metadata?: {
    planType?: string;
    commissionRate?: number;
    invoiceId?: string;
    billingRecordId?: string;
    hpeStage?: string;
  }
): Promise<RevenueEvent> {
  const revenue: RevenueEvent = {
    id: `revenue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    clientId,
    agentId,
    amount,
    source,
    planType: metadata?.planType,
    commissionRate: metadata?.commissionRate,
    commissionAmount: metadata?.commissionRate ? amount * metadata.commissionRate : undefined,
    timestamp: new Date().toISOString(),
    metadata: {
      invoiceId: metadata?.invoiceId,
      billingRecordId: metadata?.billingRecordId,
      hpeStage: metadata?.hpeStage,
      closedAt: new Date().toISOString()
    }
  };
  
  // Emit signal for revenue tracking
  const { emitSignal } = await import("@/lib/uoi/signals");
  emitSignal({
    source: "broadcast_engine",
    type: "revenue_tracked",
    payload: revenue,
    priority: "high"
  });
  
  return revenue;
}

/**
 * Map revenue to conversion data
 */
export function mapRevenueToConversion(
  revenue: RevenueEvent,
  conversion: ConversionData
): RevenueAttribution {
  // Build funnel path from conversion data
  const funnelPath = [
    {
      stage: "Prospect",
      timestamp: conversion.timestamp,
      contentId: conversion.contentId
    }
  ];
  
  // Attribution weights (multi-touch model)
  const firstTouchWeight = 0.3; // First content they saw
  const leadTouchWeight = 0.4; // Content that triggered lead
  const funnelTouchWeight = 0.2; // Content that moved them forward
  const closeTouchWeight = 0.1; // Content that influenced close
  
  const attribution: RevenueAttribution["attribution"] = {
    firstTouch: {
      postId: conversion.attribution.sourcePost,
      platform: conversion.platform,
      timestamp: conversion.timestamp,
      weight: firstTouchWeight
    },
    leadTouch: {
      postId: conversion.contentId,
      platform: conversion.platform,
      timestamp: conversion.timestamp,
      weight: leadTouchWeight
    },
    funnelTouch: {
      postId: conversion.contentId,
      platform: conversion.platform,
      timestamp: conversion.timestamp,
      weight: funnelTouchWeight
    },
    closeTouch: {
      postId: conversion.contentId,
      platform: conversion.platform,
      timestamp: conversion.timestamp,
      weight: closeTouchWeight
    }
  };
  
  // Add trend touch if applicable
  if (conversion.attribution.sourceTrend) {
    attribution.trendTouch = {
      trendId: conversion.attribution.sourceTrend,
      timestamp: conversion.timestamp,
      weight: 0.1
    };
  }
  
  return {
    revenueId: revenue.id,
    clientId: revenue.clientId,
    agentId: revenue.agentId,
    amount: revenue.amount,
    platform: conversion.platform,
    postId: conversion.contentId,
    leadId: conversion.leadId,
    trendId: attribution.trendTouch?.trendId,
    funnelPath,
    attribution,
    createdAt: new Date().toISOString()
  };
}

/**
 * Calculate attributed revenue for content
 */
export function calculateAttributedRevenue(
  attributions: RevenueAttribution[],
  postId: string
): {
  totalRevenue: number;
  attributedRevenue: number;
  touchCount: number;
  avgRevenuePerTouch: number;
} {
  const relevantAttributions = attributions.filter(a => 
    a.postId === postId ||
    a.attribution.firstTouch.postId === postId ||
    a.attribution.leadTouch.postId === postId ||
    a.attribution.funnelTouch.postId === postId ||
    a.attribution.closeTouch.postId === postId
  );
  
  const totalRevenue = relevantAttributions.reduce((sum, a) => sum + a.amount, 0);
  
  // Calculate attributed revenue using weights
  const attributedRevenue = relevantAttributions.reduce((sum, a) => {
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
  
  const touchCount = relevantAttributions.length;
  const avgRevenuePerTouch = touchCount > 0 ? attributedRevenue / touchCount : 0;
  
  return {
    totalRevenue,
    attributedRevenue,
    touchCount,
    avgRevenuePerTouch
  };
}
