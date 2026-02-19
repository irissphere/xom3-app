// Commerce Engine - Revenue Attribution Engine
// The system that maps product → ad → customer → revenue

import {
  RevenueEvent,
  RevenueAttribution,
  AttributionTouchpoint,
  LTVData,
  CohortAnalysis,
  SKUProfitability,
  ChannelAttribution,
  CampaignROI,
  RevenueAttributionObject,
} from "./revenue-types";
import { ProductObject } from "./types";
import { AdObject } from "./ad-types";
import { FunnelObject } from "./funnel-types";
import { StoreObject } from "./store-types";
import { emitSignal } from "@/lib/uoi/signals";
import { emitStateUpdate } from "@/lib/hse/signals";

// ============================================================================
// MODULE 1: PRODUCT → AD → CUSTOMER → REVENUE MAPPER
// ============================================================================

/**
 * Product → Ad → Customer → Revenue Mapper - Multi-touch attribution
 */
export async function mapRevenueAttribution(
  revenueEvent: RevenueEvent,
  productObject: ProductObject,
  adObject?: AdObject,
  funnelObject?: FunnelObject,
  storeObject?: StoreObject
): Promise<RevenueAttribution> {
  const attributionId = `attribution_${revenueEvent.id}_${Date.now()}`;

  // Build touchpoints
  const touchpoints: AttributionTouchpoint[] = [];

  // Ad touchpoint
  if (adObject && revenueEvent.metadata.adId) {
    touchpoints.push({
      id: `touchpoint_ad_${revenueEvent.metadata.adId}`,
      type: "ad_click",
      timestamp: revenueEvent.timestamp,
      channel: adObject.platform,
      source: `ad_${adObject.ad_id}`,
      weight: 0.4, // 40% weight for ad click
    });
  }

  // Funnel touchpoint
  if (funnelObject && revenueEvent.metadata.funnelId) {
    touchpoints.push({
      id: `touchpoint_funnel_${revenueEvent.metadata.funnelId}`,
      type: "funnel_visit",
      timestamp: revenueEvent.timestamp,
      channel: funnelObject.landing_page.seo.title,
      source: `funnel_${funnelObject.funnel_id}`,
      weight: 0.3, // 30% weight for funnel visit
    });
  }

  // Store touchpoint
  if (storeObject && revenueEvent.metadata.storeId) {
    touchpoints.push({
      id: `touchpoint_store_${revenueEvent.metadata.storeId}`,
      type: "store_visit",
      timestamp: revenueEvent.timestamp,
      channel: storeObject.domain,
      source: `store_${storeObject.store_id}`,
      weight: 0.2, // 20% weight for store visit
    });
  }

  // Product view touchpoint
  touchpoints.push({
    id: `touchpoint_product_${revenueEvent.productId}`,
    type: "product_view",
    timestamp: revenueEvent.timestamp,
    channel: "store",
    source: `product_${revenueEvent.productId}`,
    weight: 0.1, // 10% weight for product view
  });

  // Calculate attribution breakdown
  const totalWeight = touchpoints.reduce((sum, t) => sum + t.weight, 0);
  const attributionBreakdown = {
    product: (revenueEvent.amount * 0.3) / totalWeight,
    ad: adObject ? (revenueEvent.amount * 0.4) / totalWeight : 0,
    funnel: funnelObject ? (revenueEvent.amount * 0.2) / totalWeight : 0,
    store: storeObject ? (revenueEvent.amount * 0.1) / totalWeight : 0,
    organic: adObject ? 0 : (revenueEvent.amount * 0.3) / totalWeight,
  };

  // Determine attribution model
  let attributionModel: "first_touch" | "last_touch" | "multi_touch" | "linear" | "time_decay" = "multi_touch";
  if (touchpoints.length === 1) {
    attributionModel = "first_touch";
  } else if (touchpoints.length > 3) {
    attributionModel = "time_decay";
  }

  const attribution: RevenueAttribution = {
    revenueId: revenueEvent.id,
    productId: revenueEvent.productId,
    adId: adObject?.ad_id,
    funnelId: funnelObject?.funnel_id,
    storeId: storeObject?.store_id,
    customerId: revenueEvent.customerId,
    attributionModel,
    touchpoints,
    attributedRevenue: revenueEvent.amount,
    attributionBreakdown,
    calculatedAt: new Date().toISOString(),
  };

  // Emit signal
  await emitSignal({
    source: "commerce:revenue-attribution:revenue-mapper",
    type: "revenue_attributed",
    severity: "high",
    payload: {
      revenueId: revenueEvent.id,
      productId: revenueEvent.productId,
      amount: revenueEvent.amount,
      attributionModel,
    },
    timestamp: Date.now(),
  });

  return attribution;
}

// ============================================================================
// MODULE 2: LTV TRACKER
// ============================================================================

/**
 * LTV Tracker - Customer lifetime value calculation and tracking
 */
export async function calculateLTV(
  customerId: string,
  productId: string,
  revenueEvents: RevenueEvent[]
): Promise<LTVData> {
  const customerEvents = revenueEvents.filter(e => e.customerId === customerId && e.productId === productId);

  if (customerEvents.length === 0) {
    throw new Error("No revenue events found for customer");
  }

  const sortedEvents = customerEvents.sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const firstPurchaseDate = sortedEvents[0].timestamp;
  const lastPurchaseDate = sortedEvents[sortedEvents.length - 1].timestamp;
  const totalRevenue = customerEvents.reduce((sum, e) => sum + e.amount, 0);
  const purchaseCount = customerEvents.length;
  const averageOrderValue = totalRevenue / purchaseCount;

  // Calculate LTV (simplified - in production, use predictive models)
  const ltv = totalRevenue * 1.5; // Assume 1.5x multiplier for future purchases

  // Determine segment
  let segment: "high" | "medium" | "low" = "medium";
  if (ltv > 500) {
    segment = "high";
  } else if (ltv < 100) {
    segment = "low";
  }

  // Generate cohort (month-year)
  const cohort = new Date(firstPurchaseDate).toISOString().slice(0, 7); // YYYY-MM

  // Emit signal
  await emitSignal({
    source: "commerce:revenue-attribution:ltv-tracker",
    type: "ltv_calculated",
    severity: "info",
    payload: {
      customerId,
      productId,
      ltv: Math.floor(ltv),
      segment,
    },
    timestamp: Date.now(),
  });

  return {
    customerId,
    productId,
    firstPurchaseDate,
    lastPurchaseDate,
    totalRevenue,
    purchaseCount,
    averageOrderValue,
    ltv: Math.floor(ltv),
    predictedLtv: Math.floor(ltv * 1.2),
    cohort,
    segment,
    calculatedAt: new Date().toISOString(),
  };
}

// ============================================================================
// MODULE 3: COHORT ANALYZER
// ============================================================================

/**
 * Cohort Analyzer - Cohort analysis by product, ad, funnel, customer segment
 */
export async function analyzeCohort(
  cohortType: "product" | "ad" | "funnel" | "customer_segment" | "date",
  cohortValue: string,
  revenueEvents: RevenueEvent[],
  ltvData: LTVData[]
): Promise<CohortAnalysis> {
  const cohortId = `cohort_${cohortType}_${cohortValue}_${Date.now()}`;

  // Filter events by cohort
  let filteredEvents: RevenueEvent[] = [];
  let filteredLTV: LTVData[] = [];

  switch (cohortType) {
    case "product":
      filteredEvents = revenueEvents.filter(e => e.productId === cohortValue);
      filteredLTV = ltvData.filter(l => l.productId === cohortValue);
      break;
    case "ad":
      filteredEvents = revenueEvents.filter(e => e.metadata.adId === cohortValue);
      break;
    case "funnel":
      filteredEvents = revenueEvents.filter(e => e.metadata.funnelId === cohortValue);
      break;
    case "customer_segment":
      filteredLTV = ltvData.filter(l => l.segment === cohortValue);
      filteredEvents = revenueEvents.filter(e => 
        filteredLTV.some(l => l.customerId === e.customerId)
      );
      break;
    case "date":
      const startDate = new Date(cohortValue);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
      filteredEvents = revenueEvents.filter(e => {
        const eventDate = new Date(e.timestamp);
        return eventDate >= startDate && eventDate < endDate;
      });
      filteredLTV = ltvData.filter(l => {
        const firstPurchase = new Date(l.firstPurchaseDate);
        return firstPurchase >= startDate && firstPurchase < endDate;
      });
      break;
  }

  const customers = new Set(filteredEvents.map(e => e.customerId)).size;
  const revenue = filteredEvents.reduce((sum, e) => sum + e.amount, 0);
  const averageOrderValue = filteredEvents.length > 0 ? revenue / filteredEvents.length : 0;
  const ltv = filteredLTV.length > 0 
    ? filteredLTV.reduce((sum, l) => sum + l.ltv, 0) / filteredLTV.length 
    : 0;

  // Calculate retention and churn (simplified)
  const uniqueCustomers = new Set(filteredEvents.map(e => e.customerId));
  const repeatCustomers = filteredEvents.filter((e, i, arr) => 
    arr.filter(e2 => e2.customerId === e.customerId).length > 1
  ).length;
  const retentionRate = uniqueCustomers.size > 0 
    ? (repeatCustomers / uniqueCustomers.size) * 100 
    : 0;
  const churnRate = 100 - retentionRate;

  // Breakdown
  const breakdown: any = {};
  if (cohortType === "product") {
    breakdown.byAd = {};
    breakdown.byFunnel = {};
    filteredEvents.forEach(e => {
      if (e.metadata.adId) {
        breakdown.byAd[e.metadata.adId] = (breakdown.byAd[e.metadata.adId] || 0) + e.amount;
      }
      if (e.metadata.funnelId) {
        breakdown.byFunnel[e.metadata.funnelId] = (breakdown.byFunnel[e.metadata.funnelId] || 0) + e.amount;
      }
    });
  }

  // Period
  const timestamps = filteredEvents.map(e => new Date(e.timestamp).getTime());
  const start = timestamps.length > 0 
    ? new Date(Math.min(...timestamps)).toISOString() 
    : new Date().toISOString();
  const end = timestamps.length > 0 
    ? new Date(Math.max(...timestamps)).toISOString() 
    : new Date().toISOString();

  // Emit signal
  await emitSignal({
    source: "commerce:revenue-attribution:cohort-analyzer",
    type: "cohort_analyzed",
    severity: "info",
    payload: {
      cohortId,
      cohortType,
      customers,
      revenue: Math.floor(revenue),
    },
    timestamp: Date.now(),
  });

  return {
    cohortId,
    cohortType,
    cohortValue,
    customers,
    revenue: Math.floor(revenue),
    averageOrderValue: Math.floor(averageOrderValue * 100) / 100,
    ltv: Math.floor(ltv),
    retentionRate: Math.floor(retentionRate * 100) / 100,
    churnRate: Math.floor(churnRate * 100) / 100,
    period: { start, end },
    breakdown,
  };
}

// ============================================================================
// MODULE 4: SKU PROFITABILITY ENGINE
// ============================================================================

/**
 * SKU Profitability Engine - Profit margin per SKU, product profitability
 */
export async function calculateSKUProfitability(
  sku: string,
  productObject: ProductObject,
  revenueEvents: RevenueEvent[],
  period: { start: string; end: string }
): Promise<SKUProfitability> {
  const skuEvents = revenueEvents.filter(e => 
    e.productId === productObject.id &&
    new Date(e.timestamp) >= new Date(period.start) &&
    new Date(e.timestamp) <= new Date(period.end)
  );

  const revenue = skuEvents.reduce((sum, e) => sum + e.amount, 0);
  const quantitySold = skuEvents.reduce((sum, e) => sum + e.quantity, 0);
  const averagePrice = quantitySold > 0 ? revenue / quantitySold : 0;

  // Cost from product object
  const cost = productObject.metadata.pricing?.marginAnalysis.recommended 
    ? averagePrice * (1 - productObject.metadata.pricing.marginAnalysis.recommended / 100)
    : averagePrice * 0.6; // Default 40% margin

  const totalCost = cost * quantitySold;
  const profit = revenue - totalCost;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

  // Profitability score (0-100)
  let profitabilityScore = 0;
  if (margin >= 50) {
    profitabilityScore = 100;
  } else if (margin >= 40) {
    profitabilityScore = 80;
  } else if (margin >= 30) {
    profitabilityScore = 60;
  } else if (margin >= 20) {
    profitabilityScore = 40;
  } else if (margin >= 10) {
    profitabilityScore = 20;
  }

  // Emit signal
  await emitSignal({
    source: "commerce:revenue-attribution:sku-profitability",
    type: "sku_profitability_calculated",
    severity: "info",
    payload: {
      sku,
      productId: productObject.id,
      margin: Math.floor(margin),
      profitabilityScore,
    },
    timestamp: Date.now(),
  });

  return {
    sku,
    productId: productObject.id,
    productName: productObject.name,
    revenue: Math.floor(revenue * 100) / 100,
    cost: Math.floor(totalCost * 100) / 100,
    profit: Math.floor(profit * 100) / 100,
    margin: Math.floor(margin * 100) / 100,
    quantitySold,
    averagePrice: Math.floor(averagePrice * 100) / 100,
    profitabilityScore,
    period,
  };
}

// ============================================================================
// MODULE 5: CHANNEL ATTRIBUTION ENGINE
// ============================================================================

/**
 * Channel Attribution Engine - Revenue by channel (ad platform, funnel, store)
 */
export async function attributeByChannel(
  channel: string,
  revenueEvents: RevenueEvent[],
  adObjects: AdObject[],
  period: { start: string; end: string }
): Promise<ChannelAttribution> {
  // Filter events by channel and period
  const channelEvents = revenueEvents.filter(e => {
    const eventDate = new Date(e.timestamp);
    return (
      eventDate >= new Date(period.start) &&
      eventDate <= new Date(period.end) &&
      (e.metadata.channel === channel || 
       (channel === "organic" && !e.metadata.adId) ||
       (channel === "direct" && !e.metadata.adId && !e.metadata.funnelId))
    );
  });

  const revenue = channelEvents.reduce((sum, e) => sum + e.amount, 0);
  const orders = channelEvents.length;
  const customers = new Set(channelEvents.map(e => e.customerId)).size;
  const averageOrderValue = orders > 0 ? revenue / orders : 0;

  // Calculate ROAS and CPA from ad objects
  const channelAd = adObjects.find(a => a.platform === channel);
  const spend = channelAd?.performance.spend || 0;
  const roas = spend > 0 ? revenue / spend : 0;
  const cpa = orders > 0 ? spend / orders : 0;

  // Calculate LTV (simplified)
  const ltv = averageOrderValue * 1.5;

  // Profitability
  const profit = revenue * 0.4; // Assume 40% margin
  const profitability = spend > 0 ? (profit / spend) * 100 : 0;

  // Breakdown by product
  const byProduct: Record<string, number> = {};
  channelEvents.forEach(e => {
    byProduct[e.productId] = (byProduct[e.productId] || 0) + e.amount;
  });

  // Breakdown by ad
  const byAd: Record<string, number> = {};
  channelEvents.forEach(e => {
    if (e.metadata.adId) {
      byAd[e.metadata.adId] = (byAd[e.metadata.adId] || 0) + e.amount;
    }
  });

  // Breakdown by funnel
  const byFunnel: Record<string, number> = {};
  channelEvents.forEach(e => {
    if (e.metadata.funnelId) {
      byFunnel[e.metadata.funnelId] = (byFunnel[e.metadata.funnelId] || 0) + e.amount;
    }
  });

  // Emit signal
  await emitSignal({
    source: "commerce:revenue-attribution:channel-attribution",
    type: "channel_attributed",
    severity: "info",
    payload: {
      channel,
      revenue: Math.floor(revenue),
      roas: Math.floor(roas * 100) / 100,
    },
    timestamp: Date.now(),
  });

  return {
    channel,
    revenue: Math.floor(revenue * 100) / 100,
    orders,
    customers,
    averageOrderValue: Math.floor(averageOrderValue * 100) / 100,
    roas: Math.floor(roas * 100) / 100,
    cpa: Math.floor(cpa * 100) / 100,
    ltv: Math.floor(ltv * 100) / 100,
    profitability: Math.floor(profitability * 100) / 100,
    period,
    breakdown: {
      byProduct,
      byAd,
      byFunnel,
    },
  };
}

// ============================================================================
// MODULE 6: CAMPAIGN ROI CALCULATOR
// ============================================================================

/**
 * Campaign ROI Calculator - ROAS by campaign, ad set, creative
 */
export async function calculateCampaignROI(
  campaignId: string,
  campaignName: string,
  platform: string,
  revenueEvents: RevenueEvent[],
  adObjects: AdObject[],
  period: { start: string; end: string }
): Promise<CampaignROI> {
  // Filter events by campaign
  const campaignEvents = revenueEvents.filter(e => 
    e.metadata.campaignId === campaignId &&
    new Date(e.timestamp) >= new Date(period.start) &&
    new Date(e.timestamp) <= new Date(period.end)
  );

  // Get campaign ads
  const campaignAds = adObjects.filter(a => 
    a.platform === platform && 
    revenueEvents.some(e => e.metadata.adId === a.ad_id && e.metadata.campaignId === campaignId)
  );

  const revenue = campaignEvents.reduce((sum, e) => sum + e.amount, 0);
  const orders = campaignEvents.length;
  const spend = campaignAds.reduce((sum, a) => sum + a.performance.spend, 0);
  const roas = spend > 0 ? revenue / spend : 0;
  const cpa = orders > 0 ? spend / orders : 0;

  // Profit
  const profit = revenue * 0.4; // Assume 40% margin
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

  // LTV-adjusted ROAS
  const averageOrderValue = orders > 0 ? revenue / orders : 0;
  const ltv = averageOrderValue * 1.5;
  const ltvAdjustedRoas = spend > 0 ? (ltv * orders) / spend : 0;

  // Profitability score
  let profitabilityScore = 0;
  if (roas >= 4.0) {
    profitabilityScore = 100;
  } else if (roas >= 3.0) {
    profitabilityScore = 80;
  } else if (roas >= 2.0) {
    profitabilityScore = 60;
  } else if (roas >= 1.0) {
    profitabilityScore = 40;
  } else {
    profitabilityScore = 20;
  }

  // Breakdown by ad set, creative, audience
  const byAdSet: Record<string, number> = {};
  const byCreative: Record<string, number> = {};
  const byAudience: Record<string, number> = {};

  campaignEvents.forEach(e => {
    const ad = campaignAds.find(a => a.ad_id === e.metadata.adId);
    if (ad) {
      byAdSet[ad.ad_id] = (byAdSet[ad.ad_id] || 0) + e.amount;
      byCreative[ad.creative.hooks[0] || "unknown"] = (byCreative[ad.creative.hooks[0] || "unknown"] || 0) + e.amount;
    }
  });

  // Emit signal
  await emitSignal({
    source: "commerce:revenue-attribution:campaign-roi",
    type: "campaign_roi_calculated",
    severity: "info",
    payload: {
      campaignId,
      roas: Math.floor(roas * 100) / 100,
      profitabilityScore,
    },
    timestamp: Date.now(),
  });

  return {
    campaignId,
    campaignName,
    platform,
    spend: Math.floor(spend * 100) / 100,
    revenue: Math.floor(revenue * 100) / 100,
    orders,
    roas: Math.floor(roas * 100) / 100,
    cpa: Math.floor(cpa * 100) / 100,
    profit: Math.floor(profit * 100) / 100,
    margin: Math.floor(margin * 100) / 100,
    ltvAdjustedRoas: Math.floor(ltvAdjustedRoas * 100) / 100,
    profitabilityScore,
    period,
    breakdown: {
      byAdSet,
      byCreative,
      byAudience,
    },
  };
}

// ============================================================================
// MODULE 7: REVENUE ATTRIBUTION OBJECT GENERATOR
// ============================================================================

/**
 * Revenue Attribution Object Generator - Creates complete attribution object
 */
export async function generateRevenueAttributionObject(
  revenueEvent: RevenueEvent,
  productObject: ProductObject,
  adObject?: AdObject,
  funnelObject?: FunnelObject,
  storeObject?: StoreObject,
  allRevenueEvents: RevenueEvent[] = [],
  allLTVData: LTVData[] = []
): Promise<RevenueAttributionObject> {
  const attributionId = `attribution_${revenueEvent.id}_${Date.now()}`;

  // 1. Map revenue attribution
  const attribution = await mapRevenueAttribution(
    revenueEvent,
    productObject,
    adObject,
    funnelObject,
    storeObject
  );

  // 2. Calculate LTV
  const ltv = await calculateLTV(
    revenueEvent.customerId,
    revenueEvent.productId,
    allRevenueEvents
  );

  // 3. Analyze cohort (by product)
  const cohort = await analyzeCohort(
    "product",
    revenueEvent.productId,
    allRevenueEvents,
    allLTVData
  );

  // 4. Calculate SKU profitability
  const period = {
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Last 30 days
    end: new Date().toISOString(),
  };
  const skuProfitability = await calculateSKUProfitability(
    `SKU-${revenueEvent.productId}`,
    productObject,
    allRevenueEvents,
    period
  );

  // 5. Channel attribution (if ad exists)
  let channelAttribution: ChannelAttribution | undefined;
  if (adObject) {
    channelAttribution = await attributeByChannel(
      adObject.platform,
      allRevenueEvents,
      adObject ? [adObject] : [],
      period
    );
  }

  // 6. Campaign ROI (if campaign exists)
  let campaignROI: CampaignROI | undefined;
  if (revenueEvent.metadata.campaignId && adObject) {
    campaignROI = await calculateCampaignROI(
      revenueEvent.metadata.campaignId,
      `Campaign ${revenueEvent.metadata.campaignId}`,
      adObject.platform,
      allRevenueEvents,
      adObject ? [adObject] : [],
      period
    );
  }

  // 7. Calculate profitability score
  const profitabilityScore = calculateProfitabilityScore(
    attribution,
    ltv,
    skuProfitability,
    channelAttribution,
    campaignROI
  );

  // Create revenue attribution object
  const revenueAttributionObject: RevenueAttributionObject = {
    attribution_id: attributionId,
    product_id: revenueEvent.productId,
    ad_id: adObject?.ad_id,
    funnel_id: funnelObject?.funnel_id,
    store_id: storeObject?.store_id,
    customer_id: revenueEvent.customerId,
    revenue: revenueEvent.amount,
    attribution,
    ltv,
    cohort,
    sku_profitability: skuProfitability,
    channel_attribution: channelAttribution,
    campaign_roi: campaignROI,
    profitability_score: profitabilityScore,
  };

  // Emit signal
  await emitSignal({
    source: "commerce:revenue-attribution:revenue-attribution-object-generator",
    type: "revenue_attribution_object_generated",
    severity: "high",
    payload: {
      attributionId,
      revenueId: revenueEvent.id,
      profitabilityScore,
    },
    timestamp: Date.now(),
  });

  // Update HSE
  emitStateUpdate(["commerce_revenue_attributed", "commerce_profitability_tracked"]);

  return revenueAttributionObject;
}

function calculateProfitabilityScore(
  attribution: RevenueAttribution,
  ltv: LTVData,
  skuProfitability: SKUProfitability,
  channelAttribution?: ChannelAttribution,
  campaignROI?: CampaignROI
): number {
  let score = 0;

  // LTV (30 points)
  if (ltv.ltv >= 500) {
    score += 30;
  } else if (ltv.ltv >= 300) {
    score += 20;
  } else if (ltv.ltv >= 100) {
    score += 10;
  }

  // SKU Profitability (30 points)
  score += skuProfitability.profitabilityScore * 0.3;

  // Channel Attribution (20 points)
  if (channelAttribution && channelAttribution.roas >= 3.0) {
    score += 20;
  } else if (channelAttribution && channelAttribution.roas >= 2.0) {
    score += 15;
  } else if (channelAttribution && channelAttribution.roas >= 1.0) {
    score += 10;
  }

  // Campaign ROI (20 points)
  if (campaignROI && campaignROI.profitabilityScore >= 80) {
    score += 20;
  } else if (campaignROI && campaignROI.profitabilityScore >= 60) {
    score += 15;
  } else if (campaignROI && campaignROI.profitabilityScore >= 40) {
    score += 10;
  }

  return Math.min(100, Math.floor(score));
}
