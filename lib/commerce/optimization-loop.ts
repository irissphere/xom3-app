// Commerce Engine - Optimization Loop
// The system that makes the commerce organism self-improving

import {
  OptimizationCycle,
  PerformanceAnalysis,
  PerformancePattern,
  PerformanceAnomaly,
  OptimizationAdjustment,
  OptimizationResults,
  OptimizationObject,
  OptimizationType,
  OptimizationStatus,
} from "./optimization-types";
import { ProductObject } from "./types";
import { AdObject } from "./ad-types";
import { FunnelObject } from "./funnel-types";
import { StoreObject } from "./store-types";
import { RevenueAttributionObject } from "./revenue-types";
import { FulfillmentObject } from "./fulfillment-types";
import { RevenueEvent } from "./revenue-types";
import { emitSignal } from "@/lib/uoi/signals";
import { emitStateUpdate } from "@/lib/hse/signals";

// ============================================================================
// MODULE 1: PRODUCT EVOLUTION ENGINE
// ============================================================================

/**
 * Product Evolution Engine - Evolves products based on performance data
 */
export async function evolveProduct(
  productObject: ProductObject,
  revenueAttributions: RevenueAttributionObject[],
  period: { start: string; end: string }
): Promise<OptimizationAdjustment[]> {
  const adjustments: OptimizationAdjustment[] = [];

  // Analyze product performance
  const productRevenue = revenueAttributions
    .filter(a => a.product_id === productObject.id)
    .reduce((sum, a) => sum + a.revenue, 0);

  const productProfitability = revenueAttributions
    .filter(a => a.product_id === productObject.id)
    .map(a => a.sku_profitability)
    .find(p => p !== undefined);

  // Adjustments based on performance
  if (productProfitability && productProfitability.margin < 30) {
    adjustments.push({
      id: `adjustment_product_${productObject.id}_pricing`,
      type: "product",
      element: "price",
      action: "increase",
      value: productObject.recommended_price * 1.1, // 10% increase
      reason: "Low margin detected. Increase price to improve profitability.",
      expectedImpact: "Increase margin by 10%",
      priority: "high",
    });
  }

  if (productObject.trend_score < 50) {
    adjustments.push({
      id: `adjustment_product_${productObject.id}_trend`,
      type: "product",
      element: "trend_alignment",
      action: "replace",
      value: "Focus on trending categories",
      reason: "Low trend score. Align with current trends.",
      expectedImpact: "Increase trend score and demand",
      priority: "medium",
    });
  }

  // Emit signal
  await emitSignal({
    source: "commerce:optimization-loop:product-evolution",
    type: "product_evolved",
    priority: "low",
    payload: {
      productId: productObject.id,
      adjustmentCount: adjustments.length,
    },
  });

  return adjustments;
}

// ============================================================================
// MODULE 2: AD EVOLUTION ENGINE
// ============================================================================

/**
 * Ad Evolution Engine - Evolves ads based on ROAS data
 */
export async function evolveAd(
  adObject: AdObject,
  revenueAttributions: RevenueAttributionObject[],
  period: { start: string; end: string }
): Promise<OptimizationAdjustment[]> {
  const adjustments: OptimizationAdjustment[] = [];

  // Analyze ad performance
  const adRevenue = revenueAttributions
    .filter(a => a.ad_id === adObject.ad_id)
    .reduce((sum, a) => sum + a.revenue, 0);

  const adROAS = adObject.performance.roas;

  // Adjustments based on ROAS
  if (adROAS < 2.0) {
    adjustments.push({
      id: `adjustment_ad_${adObject.ad_id}_pause`,
      type: "ad",
      element: "status",
      action: "remove",
      value: "paused",
      reason: "ROAS below 2.0. Pause ad to prevent losses.",
      expectedImpact: "Stop wasting ad spend",
      priority: "high",
    });
  } else if (adROAS < 3.0) {
    adjustments.push({
      id: `adjustment_ad_${adObject.ad_id}_creative`,
      type: "ad",
      element: "creative",
      action: "replace",
      value: "Test new creatives",
      reason: "ROAS below target. Test new creative variations.",
      expectedImpact: "Improve CTR and conversion rate",
      priority: "medium",
    });
  } else if (adROAS >= 4.0) {
    adjustments.push({
      id: `adjustment_ad_${adObject.ad_id}_scale`,
      type: "ad",
      element: "budget",
      action: "increase",
      value: adObject.budget.daily * 1.5, // 50% increase
      reason: "High ROAS. Scale budget to increase revenue.",
      expectedImpact: "Increase revenue by 50%",
      priority: "high",
    });
  }

  // Creative optimization
  if (adObject.performance.ctr < 1.0) {
    adjustments.push({
      id: `adjustment_ad_${adObject.ad_id}_headline`,
      type: "ad",
      element: "headline",
      action: "replace",
      value: "Test new headlines",
      reason: "Low CTR. Test new headline variations.",
      expectedImpact: "Improve click-through rate",
      priority: "medium",
    });
  }

  // Emit signal
  await emitSignal({
    source: "commerce:optimization-loop:ad-evolution",
    type: "ad_evolved",
    priority: "low",
    payload: {
      adId: adObject.ad_id,
      roas: adROAS,
      adjustmentCount: adjustments.length,
    },
  });

  return adjustments;
}

// ============================================================================
// MODULE 3: FUNNEL EVOLUTION ENGINE
// ============================================================================

/**
 * Funnel Evolution Engine - Evolves funnels based on conversion data
 */
export async function evolveFunnel(
  funnelObject: FunnelObject,
  revenueAttributions: RevenueAttributionObject[],
  period: { start: string; end: string }
): Promise<OptimizationAdjustment[]> {
  const adjustments: OptimizationAdjustment[] = [];

  // Analyze funnel performance
  const funnelRevenue = revenueAttributions
    .filter(a => a.funnel_id === funnelObject.funnel_id)
    .reduce((sum, a) => sum + a.revenue, 0);

  // Landing page optimization
  if (funnelObject.optimization_score < 70) {
    adjustments.push({
      id: `adjustment_funnel_${funnelObject.funnel_id}_landing`,
      type: "funnel",
      element: "landing_page",
      action: "replace",
      value: "Optimize hero section and CTAs",
      reason: "Low optimization score. Improve landing page conversion.",
      expectedImpact: "Increase landing page conversion rate",
      priority: "high",
    });
  }

  // Upsell optimization
  const upsellAcceptance = calculateUpsellAcceptance(funnelObject, revenueAttributions);
  if (upsellAcceptance < 20) {
    adjustments.push({
      id: `adjustment_funnel_${funnelObject.funnel_id}_upsell`,
      type: "funnel",
      element: "upsells",
      action: "replace",
      value: "Test new upsell offers and timing",
      reason: "Low upsell acceptance. Test new upsell strategies.",
      expectedImpact: "Increase AOV through better upsells",
      priority: "medium",
    });
  }

  // Checkout optimization
  if (funnelObject.checkout.formOptimization.frictionReduction.length < 3) {
    adjustments.push({
      id: `adjustment_funnel_${funnelObject.funnel_id}_checkout`,
      type: "funnel",
      element: "checkout",
      action: "add",
      value: "Add guest checkout and auto-fill",
      reason: "Checkout friction detected. Reduce friction to improve conversion.",
      expectedImpact: "Reduce cart abandonment",
      priority: "high",
    });
  }

  // Emit signal
  await emitSignal({
    source: "commerce:optimization-loop:funnel-evolution",
    type: "funnel_evolved",
    priority: "low",
    payload: {
      funnelId: funnelObject.funnel_id,
      adjustmentCount: adjustments.length,
    },
  });

  return adjustments;
}

function calculateUpsellAcceptance(
  funnelObject: FunnelObject,
  revenueAttributions: RevenueAttributionObject[]
): number {
  // Simplified - in production, track actual upsell acceptance
  return Math.random() * 30 + 10; // 10-40% simulated
}

// ============================================================================
// MODULE 4: PRICING EVOLUTION ENGINE
// ============================================================================

/**
 * Pricing Evolution Engine - Evolves pricing based on margin data
 */
export async function evolvePricing(
  productObject: ProductObject,
  revenueAttributions: RevenueAttributionObject[],
  period: { start: string; end: string }
): Promise<OptimizationAdjustment[]> {
  const adjustments: OptimizationAdjustment[] = [];

  // Analyze pricing performance
  const skuProfitability = revenueAttributions
    .filter(a => a.product_id === productObject.id)
    .map(a => a.sku_profitability)
    .find(p => p !== undefined);

  const currentPrice = productObject.recommended_price;
  const currentMargin = skuProfitability?.margin || productObject.metadata.pricing?.marginAnalysis.recommended || 0;

  // Price adjustments based on margin and demand
  if (currentMargin < 30) {
    // Low margin - increase price
    adjustments.push({
      id: `adjustment_pricing_${productObject.id}_increase`,
      type: "pricing",
      element: "price",
      action: "increase",
      value: currentPrice * 1.15, // 15% increase
      reason: "Low margin. Increase price to improve profitability.",
      expectedImpact: "Increase margin by 15%",
      priority: "high",
    });
  } else if (currentMargin > 60) {
    // High margin - test lower price for volume
    adjustments.push({
      id: `adjustment_pricing_${productObject.id}_decrease`,
      type: "pricing",
      element: "price",
      action: "decrease",
      value: currentPrice * 0.9, // 10% decrease
      reason: "High margin. Test lower price to increase volume.",
      expectedImpact: "Increase sales volume while maintaining good margin",
      priority: "medium",
    });
  }

  // Competitor pricing adjustments
  const competitorPricing = productObject.metadata.pricing?.competitorPricing;
  if (competitorPricing && currentPrice > competitorPricing.average * 1.2) {
    adjustments.push({
      id: `adjustment_pricing_${productObject.id}_competitive`,
      type: "pricing",
      element: "price",
      action: "decrease",
      value: competitorPricing.average * 1.05, // 5% above competitor average
      reason: "Price significantly above competitors. Adjust for competitiveness.",
      expectedImpact: "Improve price competitiveness",
      priority: "medium",
    });
  }

  // Emit signal
  await emitSignal({
    source: "commerce:optimization-loop:pricing-evolution",
    type: "pricing_evolved",
    priority: "low",
    payload: {
      productId: productObject.id,
      currentPrice,
      adjustmentCount: adjustments.length,
    },
  });

  return adjustments;
}

// ============================================================================
// MODULE 5: STORE EVOLUTION ENGINE
// ============================================================================

/**
 * Store Evolution Engine - Evolves stores based on performance data
 */
export async function evolveStore(
  storeObject: StoreObject,
  revenueAttributions: RevenueAttributionObject[],
  period: { start: string; end: string }
): Promise<OptimizationAdjustment[]> {
  const adjustments: OptimizationAdjustment[] = [];

  // Analyze store performance
  const storeRevenue = revenueAttributions
    .filter(a => a.store_id === storeObject.store_id)
    .reduce((sum, a) => sum + a.revenue, 0);

  // Store optimization score
  if (storeObject.optimization_score < 70) {
    adjustments.push({
      id: `adjustment_store_${storeObject.store_id}_optimization`,
      type: "store",
      element: "optimization",
      action: "increase",
      value: "Add more products and collections",
      reason: "Low optimization score. Add products and improve structure.",
      expectedImpact: "Improve store optimization score",
      priority: "high",
    });
  }

  // Branding optimization
  if (!storeObject.branding.logo) {
    adjustments.push({
      id: `adjustment_store_${storeObject.store_id}_branding`,
      type: "store",
      element: "branding",
      action: "add",
      value: "Add logo and improve branding",
      reason: "Missing logo. Improve branding for trust and recognition.",
      expectedImpact: "Improve brand recognition and trust",
      priority: "medium",
    });
  }

  // Collection optimization
  if (storeObject.collections.length < 3) {
    adjustments.push({
      id: `adjustment_store_${storeObject.store_id}_collections`,
      type: "store",
      element: "collections",
      action: "add",
      value: "Add more collections",
      reason: "Few collections. Add more to improve navigation and discovery.",
      expectedImpact: "Improve product discovery and navigation",
      priority: "medium",
    });
  }

  // Emit signal
  await emitSignal({
    source: "commerce:optimization-loop:store-evolution",
    type: "store_evolved",
    priority: "low",
    payload: {
      storeId: storeObject.store_id,
      adjustmentCount: adjustments.length,
    },
  });

  return adjustments;
}

// ============================================================================
// MODULE 6: PRODUCT PERFORMANCE ANALYZER
// ============================================================================

/**
 * Product Performance Analyzer - Evaluates demand, margin, refund rate, LTV, repeat purchase rate
 */
export async function analyzeProductPerformance(
  productObject: ProductObject,
  revenueAttributions: RevenueAttributionObject[],
  revenueEvents: RevenueEvent[],
  period: { start: string; end: string }
): Promise<{
  demand: number; // 0-100
  margin: number; // percentage
  refundRate: number; // percentage
  ltv: number;
  repeatPurchaseRate: number; // percentage
  recommendation: "scale" | "kill" | "evolve" | "maintain";
}> {
  // Calculate demand
  const demand = productObject.demand_score;

  // Calculate margin
  const margin = revenueAttributions
    .filter(a => a.product_id === productObject.id)
    .map(a => a.sku_profitability?.margin)
    .find(m => m !== undefined) || productObject.metadata.pricing?.marginAnalysis.recommended || 0;

  // Calculate refund rate (simplified - would track actual refunds)
  const refundRate = 5; // 5% default, would be calculated from refund data

  // Calculate LTV
  const ltv = revenueAttributions
    .filter(a => a.product_id === productObject.id)
    .map(a => a.ltv.ltv)
    .reduce((sum, l) => sum + l, 0) / revenueAttributions.length || 0;

  // Calculate repeat purchase rate
  const customerEvents = revenueEvents.filter(e => e.productId === productObject.id);
  const uniqueCustomers = new Set(customerEvents.map(e => e.customerId));
  const repeatCustomers = customerEvents.filter((e, i, arr) => 
    arr.filter(e2 => e2.customerId === e.customerId).length > 1
  ).length;
  const repeatPurchaseRate = uniqueCustomers.size > 0 
    ? (repeatCustomers / uniqueCustomers.size) * 100 
    : 0;

  // Generate recommendation
  let recommendation: "scale" | "kill" | "evolve" | "maintain" = "maintain";
  if (demand >= 70 && margin >= 40 && ltv >= 300 && repeatPurchaseRate >= 20) {
    recommendation = "scale";
  } else if (demand < 40 || margin < 20 || refundRate > 15) {
    recommendation = "kill";
  } else if (demand < 60 || margin < 30) {
    recommendation = "evolve";
  }

  // Emit signal
  await emitSignal({
    source: "commerce:optimization-loop:product-performance-analyzer",
    type: "product_performance_analyzed",
    priority: "low",
    payload: {
      productId: productObject.id,
      recommendation,
      demand,
      margin,
    },
  });

  return {
    demand,
    margin,
    refundRate,
    ltv,
    repeatPurchaseRate,
    recommendation,
  };
}

// ============================================================================
// MODULE 7: FUNNEL PERFORMANCE ANALYZER
// ============================================================================

/**
 * Funnel Performance Analyzer - Evaluates landing page, product page, upsell, checkout, post-purchase
 */
export async function analyzeFunnelPerformance(
  funnelObject: FunnelObject,
  revenueAttributions: RevenueAttributionObject[],
  period: { start: string; end: string }
): Promise<{
  landingPageConversion: number; // percentage
  productPageConversion: number; // percentage
  upsellAcceptance: number; // percentage
  checkoutFriction: number; // 0-100, higher = more friction
  postPurchaseFlow: number; // 0-100, score
  leaks: string[]; // Where money is leaking
}> {
  // Landing page conversion (simplified)
  const landingPageConversion = funnelObject.optimization_score * 0.5; // Simplified

  // Product page conversion (simplified)
  const productPageConversion = funnelObject.optimization_score * 0.6; // Simplified

  // Upsell acceptance
  const upsellAcceptance = calculateUpsellAcceptance(funnelObject, revenueAttributions);

  // Checkout friction (inverted - lower friction = higher score)
  const checkoutFriction = 100 - (funnelObject.checkout.formOptimization.frictionReduction.length * 20);

  // Post-purchase flow score
  const postPurchaseFlow = calculatePostPurchaseFlowScore(funnelObject);

  // Identify leaks
  const leaks: string[] = [];
  if (landingPageConversion < 2.0) {
    leaks.push("Landing page conversion too low");
  }
  if (upsellAcceptance < 15) {
    leaks.push("Upsell acceptance too low");
  }
  if (checkoutFriction > 50) {
    leaks.push("Checkout friction too high");
  }
  if (postPurchaseFlow < 50) {
    leaks.push("Post-purchase flow needs improvement");
  }

  // Emit signal
  await emitSignal({
    source: "commerce:optimization-loop:funnel-performance-analyzer",
    type: "funnel_performance_analyzed",
    priority: leaks.length > 0 ? "high" : "low",
    payload: {
      funnelId: funnelObject.funnel_id,
      leakCount: leaks.length,
    },
  });

  return {
    landingPageConversion,
    productPageConversion,
    upsellAcceptance,
    checkoutFriction,
    postPurchaseFlow,
    leaks,
  };
}

function calculatePostPurchaseFlowScore(funnelObject: FunnelObject): number {
  let score = 0;

  // Thank-you page
  if (funnelObject.post_purchase.thankYouPage.headline) score += 20;
  if (funnelObject.post_purchase.thankYouPage.trackingInfo) score += 20;

  // Cross-sell
  if (funnelObject.post_purchase.crossSell.length > 0) score += 20;

  // Email sequence
  if (funnelObject.post_purchase.emailSequence.length >= 3) score += 20;

  // SMS follow-up
  if (funnelObject.post_purchase.smsFollowUp.length > 0) score += 10;

  // Review request
  if (funnelObject.post_purchase.reviewRequest.enabled) score += 10;

  return score;
}

// ============================================================================
// MODULE 8: AD PERFORMANCE ANALYZER
// ============================================================================

/**
 * Ad Performance Analyzer - Evaluates creative fatigue, audience decay, ROAS trends, CPA spikes, CTR drops
 */
export async function analyzeAdPerformance(
  adObject: AdObject,
  revenueAttributions: RevenueAttributionObject[],
  period: { start: string; end: string }
): Promise<{
  creativeFatigue: number; // 0-100, higher = more fatigue
  audienceDecay: number; // 0-100, higher = more decay
  roasTrend: "rising" | "falling" | "stable";
  cpaSpike: boolean;
  ctrDrop: boolean;
  recommendation: "rotate" | "refresh" | "scale" | "pause";
}> {
  // Creative fatigue (based on impressions and CTR decline)
  const creativeFatigue = adObject.performance.impressions > 100000 
    ? Math.min(100, (adObject.performance.impressions / 100000) * 50)
    : 0;

  // Audience decay (simplified - would track audience performance over time)
  const audienceDecay = adObject.performance.ctr < 1.0 ? 50 : 0;

  // ROAS trend
  let roasTrend: "rising" | "falling" | "stable" = "stable";
  // In production, would compare current ROAS to historical
  if (adObject.performance.roas >= 4.0) {
    roasTrend = "rising";
  } else if (adObject.performance.roas < 2.0) {
    roasTrend = "falling";
  }

  // CPA spike (if CPA > $50)
  const cpaSpike = adObject.performance.cpa > 50;

  // CTR drop (if CTR < 1%)
  const ctrDrop = adObject.performance.ctr < 1.0;

  // Generate recommendation
  let recommendation: "rotate" | "refresh" | "scale" | "pause" = "refresh";
  if (adObject.performance.roas < 2.0 || cpaSpike) {
    recommendation = "pause";
  } else if (creativeFatigue > 70 || ctrDrop) {
    recommendation = "rotate";
  } else if (adObject.performance.roas >= 4.0 && !ctrDrop) {
    recommendation = "scale";
  } else {
    recommendation = "refresh";
  }

  // Emit signal
  await emitSignal({
    source: "commerce:optimization-loop:ad-performance-analyzer",
    type: "ad_performance_analyzed",
    priority: recommendation === "pause" ? "high" : "low",
    payload: {
      adId: adObject.ad_id,
      recommendation,
      roas: adObject.performance.roas,
    },
  });

  return {
    creativeFatigue,
    audienceDecay,
    roasTrend,
    cpaSpike,
    ctrDrop,
    recommendation,
  };
}

// ============================================================================
// MODULE 9: PRICING & MARGIN OPTIMIZER
// ============================================================================

/**
 * Pricing & Margin Optimizer - Adjusts product price, bundle price, upsell price, shipping price
 */
export async function optimizePricingAndMargin(
  productObject: ProductObject,
  funnelObject: FunnelObject,
  revenueAttributions: RevenueAttributionObject[],
  period: { start: string; end: string }
): Promise<{
  productPrice: number;
  bundlePrices: Record<string, number>;
  upsellPrices: Record<string, number>;
  shippingPrice: number;
  expectedImpact: string;
}> {
  const currentPrice = productObject.recommended_price;
  const margin = revenueAttributions
    .filter(a => a.product_id === productObject.id)
    .map(a => a.sku_profitability?.margin)
    .find(m => m !== undefined) || productObject.metadata.pricing?.marginAnalysis.recommended || 0;

  // Optimize product price
  let productPrice = currentPrice;
  if (margin < 30) {
    // Low margin - increase price
    productPrice = currentPrice * 1.15; // 15% increase
  } else if (margin > 60) {
    // High margin - test lower price for volume
    productPrice = currentPrice * 0.95; // 5% decrease
  }

  // Optimize bundle prices
  const bundlePrices: Record<string, number> = {};
  funnelObject.bundles.forEach(bundle => {
    const bundleTotal = bundle.products.reduce((sum, productId) => {
      // Would get product price from product objects
      return sum + currentPrice;
    }, 0);
    bundlePrices[bundle.id] = bundleTotal * 0.85; // 15% discount
  });

  // Optimize upsell prices
  const upsellPrices: Record<string, number> = {};
  funnelObject.upsells.forEach(upsell => {
    // Would get product price from product objects
    upsellPrices[upsell.id] = currentPrice * 0.9; // 10% discount
  });

  // Optimize shipping price (free shipping threshold)
  const shippingPrice = 0; // Free shipping for orders over threshold

  // Emit signal
  await emitSignal({
    source: "commerce:optimization-loop:pricing-margin-optimizer",
    type: "pricing_optimized",
    priority: "low",
    payload: {
      productId: productObject.id,
      currentPrice,
      optimizedPrice: productPrice,
      margin,
    },
  });

  return {
    productPrice,
    bundlePrices,
    upsellPrices,
    shippingPrice,
    expectedImpact: `Optimize pricing to maximize profit without killing conversion. Expected margin: ${margin >= 30 ? margin : margin + 15}%`,
  };
}

// ============================================================================
// MODULE 10: CUSTOMER BEHAVIOR ENGINE
// ============================================================================

/**
 * Customer Behavior Engine - Tracks cohorts, LTV curves, repurchase cycles, churn signals
 */
export async function analyzeCustomerBehavior(
  revenueAttributions: RevenueAttributionObject[],
  revenueEvents: RevenueEvent[],
  period: { start: string; end: string }
): Promise<{
  cohorts: Array<{
    cohort: string;
    customers: number;
    ltv: number;
    retentionRate: number;
  }>;
  ltvCurves: Array<{
    daysSinceFirstPurchase: number;
    averageLtv: number;
  }>;
  repurchaseCycles: Array<{
    averageDays: number;
    frequency: number;
  }>;
  churnSignals: Array<{
    customerId: string;
    signal: string;
    severity: "high" | "medium" | "low";
  }>;
}> {
  // Group by cohorts
  const cohortMap = new Map<string, any[]>();
  revenueAttributions.forEach(a => {
    const cohort = a.ltv.cohort;
    if (!cohortMap.has(cohort)) {
      cohortMap.set(cohort, []);
    }
    cohortMap.get(cohort)!.push(a);
  });

  const cohorts = Array.from(cohortMap.entries()).map(([cohort, attributions]) => {
    const customers = new Set(attributions.map(a => a.customer_id)).size;
    const ltv = attributions.reduce((sum, a) => sum + a.ltv.ltv, 0) / attributions.length;
    const retentionRate = attributions
      .filter(a => a.ltv.purchaseCount > 1)
      .length / attributions.length * 100;

    return {
      cohort,
      customers,
      ltv: Math.floor(ltv),
      retentionRate: Math.floor(retentionRate * 100) / 100,
    };
  });

  // LTV curves (simplified)
  const ltvCurves = [
    { daysSinceFirstPurchase: 30, averageLtv: 100 },
    { daysSinceFirstPurchase: 60, averageLtv: 150 },
    { daysSinceFirstPurchase: 90, averageLtv: 200 },
    { daysSinceFirstPurchase: 180, averageLtv: 300 },
  ];

  // Repurchase cycles
  const repurchaseCycles: Array<{ averageDays: number; frequency: number }> = [];
  const customerEvents = new Map<string, RevenueEvent[]>();
  revenueEvents.forEach(e => {
    if (!customerEvents.has(e.customerId)) {
      customerEvents.set(e.customerId, []);
    }
    customerEvents.get(e.customerId)!.push(e);
  });

  customerEvents.forEach((events, customerId) => {
    if (events.length > 1) {
      const sortedEvents = events.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      const daysBetween = (new Date(sortedEvents[1].timestamp).getTime() - 
        new Date(sortedEvents[0].timestamp).getTime()) / (1000 * 60 * 60 * 24);
      repurchaseCycles.push({
        averageDays: Math.floor(daysBetween),
        frequency: events.length,
      });
    }
  });

  // Churn signals
  const churnSignals: Array<{ customerId: string; signal: string; severity: "high" | "medium" | "low" }> = [];
  revenueAttributions.forEach(a => {
    const daysSinceLastPurchase = (Date.now() - new Date(a.ltv.lastPurchaseDate).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceLastPurchase > 90 && a.ltv.purchaseCount === 1) {
      churnSignals.push({
        customerId: a.customer_id,
        signal: "No repurchase after 90 days",
        severity: "high",
      });
    } else if (daysSinceLastPurchase > 60) {
      churnSignals.push({
        customerId: a.customer_id,
        signal: "No activity for 60+ days",
        severity: "medium",
      });
    }
  });

  // Emit signal
  await emitSignal({
    source: "commerce:optimization-loop:customer-behavior-engine",
    type: "customer_behavior_analyzed",
    priority: "low",
    payload: {
      cohortCount: cohorts.length,
      churnSignalCount: churnSignals.length,
    },
  });

  return {
    cohorts,
    ltvCurves,
    repurchaseCycles,
    churnSignals,
  };
}

// ============================================================================
// MODULE 11: EVOLUTION ENGINE
// ============================================================================

/**
 * Evolution Engine - Regenerates creatives, funnels, product pages, bundles, audiences, offers
 */
export async function evolveCommerceElements(
  productObject: ProductObject,
  adObject: AdObject,
  funnelObject: FunnelObject,
  storeObject: StoreObject,
  revenueAttributions: RevenueAttributionObject[]
): Promise<{
  creatives: any;
  funnels: any;
  productPages: any;
  bundles: any;
  audiences: any;
  offers: any;
}> {
  // Regenerate creatives (from Product Object recommended creatives)
  const creatives = {
    hooks: productObject.recommended_creatives?.hooks || [],
    angles: productObject.recommended_creatives?.angles || [],
    headlines: adObject.creative.headlines,
    descriptions: adObject.creative.descriptions,
  };

  // Regenerate funnels (optimize based on performance)
  const funnels = {
    landingPage: funnelObject.landing_page,
    productPage: funnelObject.product_page,
    upsells: funnelObject.upsells,
    downsells: funnelObject.downsells,
    bundles: funnelObject.bundles,
  };

  // Regenerate product pages (from Store Object)
  const productPages = storeObject.products.map(p => ({
    id: p.id,
    page: p.page,
    seo: p.seo,
  }));

  // Regenerate bundles (from Funnel Object)
  const bundles = funnelObject.bundles.map(b => ({
    id: b.id,
    name: b.name,
    products: b.products,
    price: b.price,
    savings: b.savings,
  }));

  // Regenerate audiences (from Ad Object)
  const audiences = {
    demographics: adObject.targeting.demographics,
    interests: adObject.targeting.interests,
    behaviors: adObject.targeting.behaviors,
    lookalike: adObject.targeting.lookalike,
    retargeting: adObject.targeting.retargeting,
  };

  // Regenerate offers (from Funnel Object upsells/downsells)
  const offers = {
    upsells: funnelObject.upsells.map(u => ({
      id: u.id,
      title: u.title,
      price: u.price,
      discount: u.discount,
    })),
    downsells: funnelObject.downsells.map(d => ({
      id: d.id,
      title: d.title,
      price: d.price,
      discount: d.discount,
    })),
  };

  // Emit signal
  await emitSignal({
    source: "commerce:optimization-loop:evolution-engine",
    type: "commerce_elements_evolved",
    priority: "high",
    payload: {
      productId: productObject.id,
      creativeCount: creatives.hooks.length,
      bundleCount: bundles.length,
    },
  });

  return {
    creatives,
    funnels,
    productPages,
    bundles,
    audiences,
    offers,
  };
}

// ============================================================================
// MODULE 12: PERFORMANCE ANALYZER (ENHANCED)
// ============================================================================

/**
 * Performance Analyzer - Analyzes all commerce data for patterns
 */
export async function analyzePerformance(
  type: OptimizationType,
  targetId: string,
  revenueAttributions: RevenueAttributionObject[],
  revenueEvents: RevenueEvent[],
  period: { start: string; end: string }
): Promise<PerformanceAnalysis> {
  // Filter data by target
  let filteredAttributions = revenueAttributions;
  let filteredEvents = revenueEvents;

  switch (type) {
    case "product":
      filteredAttributions = revenueAttributions.filter(a => a.product_id === targetId);
      filteredEvents = revenueEvents.filter(e => e.productId === targetId);
      break;
    case "ad":
      filteredAttributions = revenueAttributions.filter(a => a.ad_id === targetId);
      break;
    case "funnel":
      filteredAttributions = revenueAttributions.filter(a => a.funnel_id === targetId);
      break;
    case "store":
      filteredAttributions = revenueAttributions.filter(a => a.store_id === targetId);
      break;
  }

  // Calculate metrics
  const revenue = filteredAttributions.reduce((sum, a) => sum + a.revenue, 0);
  const orders = filteredEvents.length;
  const customers = new Set(filteredEvents.map(e => e.customerId)).size;

  // Calculate ROAS (if ad)
  let roas: number | undefined;
  if (type === "ad") {
    // Would get from ad performance data
    roas = 3.5; // Simulated
  }

  // Calculate CPA (if ad)
  let cpa: number | undefined;
  if (type === "ad" && orders > 0) {
    // Would get from ad spend data
    cpa = 25; // Simulated
  }

  // Calculate conversion rate
  let conversionRate: number | undefined;
  // Would calculate from funnel/landing page data

  // Calculate margin
  const margin = filteredAttributions
    .map(a => a.sku_profitability?.margin)
    .filter(m => m !== undefined)[0] || 0;

  // Calculate LTV
  const ltv = filteredAttributions
    .map(a => a.ltv.ltv)
    .reduce((sum, l) => sum + l, 0) / filteredAttributions.length || 0;

  // Detect patterns
  const patterns = detectPatterns(filteredAttributions, filteredEvents, period);

  // Identify winners and losers
  const winners = identifyWinners(filteredAttributions);
  const losers = identifyLosers(filteredAttributions);

  // Detect anomalies
  const anomalies = detectAnomalies(filteredAttributions, filteredEvents, period);

  // Emit signal
  await emitSignal({
    source: "commerce:optimization-loop:performance-analyzer",
    type: "performance_analyzed",
    priority: "low",
    payload: {
      type,
      targetId,
      revenue: Math.floor(revenue),
      patterns: patterns.length,
    },
  });

  return {
    period,
    metrics: {
      revenue,
      orders,
      customers,
      roas,
      cpa,
      conversionRate,
      margin,
      ltv,
    },
    patterns,
    winners,
    losers,
    anomalies,
  };
}

function detectPatterns(
  attributions: RevenueAttributionObject[],
  events: RevenueEvent[],
  period: { start: string; end: string }
): PerformancePattern[] {
  const patterns: PerformancePattern[] = [];

  // Trend pattern
  if (attributions.length > 10) {
    const revenueByDay = groupByDay(attributions);
    const trend = calculateTrend(revenueByDay);
    if (trend > 0) {
      patterns.push({
        type: "trend",
        description: "Revenue trending upward",
        confidence: 75,
        impact: "high",
      });
    }
  }

  // Seasonal pattern
  const month = new Date().getMonth();
  if (month === 10 || month === 11) {
    patterns.push({
      type: "seasonal",
      description: "Holiday season - expect increased demand",
      confidence: 90,
      impact: "high",
    });
  }

  return patterns;
}

function groupByDay(attributions: RevenueAttributionObject[]): Record<string, number> {
  const byDay: Record<string, number> = {};
  attributions.forEach(a => {
    const day = new Date(a.attribution.calculatedAt).toISOString().split("T")[0];
    byDay[day] = (byDay[day] || 0) + a.revenue;
  });
  return byDay;
}

function calculateTrend(revenueByDay: Record<string, number>): number {
  const days = Object.keys(revenueByDay).sort();
  if (days.length < 2) return 0;

  const firstHalf = days.slice(0, Math.floor(days.length / 2));
  const secondHalf = days.slice(Math.floor(days.length / 2));

  const firstAvg = firstHalf.reduce((sum, day) => sum + (revenueByDay[day] || 0), 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, day) => sum + (revenueByDay[day] || 0), 0) / secondHalf.length;

  return ((secondAvg - firstAvg) / firstAvg) * 100; // Percentage change
}

function identifyWinners(attributions: RevenueAttributionObject[]): string[] {
  return attributions
    .filter(a => a.profitability_score >= 70)
    .map(a => a.product_id || a.ad_id || a.funnel_id || "");
}

function identifyLosers(attributions: RevenueAttributionObject[]): string[] {
  return attributions
    .filter(a => a.profitability_score < 50)
    .map(a => a.product_id || a.ad_id || a.funnel_id || "");
}

function detectAnomalies(
  attributions: RevenueAttributionObject[],
  events: RevenueEvent[],
  period: { start: string; end: string }
): PerformanceAnomaly[] {
  const anomalies: PerformanceAnomaly[] = [];

  // Revenue spike detection
  if (attributions.length > 0) {
    const avgRevenue = attributions.reduce((sum, a) => sum + a.revenue, 0) / attributions.length;
    const maxRevenue = Math.max(...attributions.map(a => a.revenue));
    if (maxRevenue > avgRevenue * 2) {
      anomalies.push({
        type: "spike",
        description: "Revenue spike detected",
        severity: "high",
        detectedAt: new Date().toISOString(),
      });
    }
  }

  return anomalies;
}

// ============================================================================
// MODULE 7: ADJUSTMENT GENERATOR
// ============================================================================

/**
 * Adjustment Generator - Generates optimization adjustments
 */
export async function generateAdjustments(
  type: OptimizationType,
  targetId: string,
  analysis: PerformanceAnalysis
): Promise<OptimizationAdjustment[]> {
  const adjustments: OptimizationAdjustment[] = [];

  // Generate adjustments based on analysis
  if (analysis.metrics.roas && analysis.metrics.roas < 2.0) {
    adjustments.push({
      id: `adjustment_${type}_${targetId}_roas`,
      type,
      element: "performance",
      action: "decrease",
      value: "Reduce budget or pause",
      reason: `ROAS below 2.0 (${analysis.metrics.roas.toFixed(2)}). Not profitable.`,
      expectedImpact: "Stop wasting money",
      priority: "high",
    });
  }

  if (analysis.metrics.margin && analysis.metrics.margin < 30) {
    adjustments.push({
      id: `adjustment_${type}_${targetId}_margin`,
      type,
      element: "margin",
      action: "increase",
      value: "Increase price or reduce costs",
      reason: `Margin below 30% (${analysis.metrics.margin.toFixed(1)}%). Low profitability.`,
      expectedImpact: "Improve profitability",
      priority: "high",
    });
  }

  // Adjustments based on winners
  if (analysis.winners.length > 0) {
    adjustments.push({
      id: `adjustment_${type}_${targetId}_scale_winners`,
      type,
      element: "winners",
      action: "increase",
      value: "Scale winning elements",
      reason: `${analysis.winners.length} winning elements identified. Scale these.`,
      expectedImpact: "Increase revenue by scaling winners",
      priority: "high",
    });
  }

  // Adjustments based on losers
  if (analysis.losers.length > 0) {
    adjustments.push({
      id: `adjustment_${type}_${targetId}_remove_losers`,
      type,
      element: "losers",
      action: "remove",
      value: "Remove or fix losing elements",
      reason: `${analysis.losers.length} losing elements identified. Remove or fix these.`,
      expectedImpact: "Stop wasting resources on losers",
      priority: "medium",
    });
  }

  // Pattern-based adjustments
  for (const pattern of analysis.patterns) {
    if (pattern.type === "trend" && pattern.impact === "high") {
      adjustments.push({
        id: `adjustment_${type}_${targetId}_trend`,
        type,
        element: "trend_alignment",
        action: "add",
        value: "Capitalize on trending pattern",
        reason: pattern.description,
        expectedImpact: "Increase revenue by capitalizing on trend",
        priority: "medium",
      });
    }
  }

  // Emit signal
  await emitSignal({
    source: "commerce:optimization-loop:adjustment-generator",
    type: "adjustments_generated",
    priority: "low",
    payload: {
      type,
      targetId,
      adjustmentCount: adjustments.length,
    },
  });

  return adjustments;
}

// ============================================================================
// MODULE 8: OPTIMIZATION LOOP OBJECT GENERATOR
// ============================================================================

/**
 * Optimization Loop Object Generator - Creates complete optimization object
 */
export async function generateOptimizationObject(
  type: OptimizationType,
  targetId: string,
  productObject?: ProductObject,
  adObject?: AdObject,
  funnelObject?: FunnelObject,
  storeObject?: StoreObject,
  revenueAttributions: RevenueAttributionObject[] = [],
  revenueEvents: RevenueEvent[] = [],
  period: { start: string; end: string } = {
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    end: new Date().toISOString(),
  }
): Promise<OptimizationObject> {
  const optimizationId = `optimization_${type}_${targetId}_${Date.now()}`;

  // 1. Analyze performance (enhanced with specific analyzers)
  const analysis = await analyzePerformance(type, targetId, revenueAttributions, revenueEvents, period);

  // 2. Run specific performance analyzers
  let productAnalysis: any;
  let funnelAnalysis: any;
  let adAnalysis: any;
  let pricingOptimization: any;
  let customerBehavior: any;

  if (productObject) {
    productAnalysis = await analyzeProductPerformance(productObject, revenueAttributions, revenueEvents, period);
  }

  if (funnelObject) {
    funnelAnalysis = await analyzeFunnelPerformance(funnelObject, revenueAttributions, period);
  }

  if (adObject) {
    adAnalysis = await analyzeAdPerformance(adObject, revenueAttributions, period);
  }

  if (productObject && funnelObject) {
    pricingOptimization = await optimizePricingAndMargin(productObject, funnelObject, revenueAttributions, period);
  }

  customerBehavior = await analyzeCustomerBehavior(revenueAttributions, revenueEvents, period);

  // 3. Generate adjustments based on type
  let adjustments: OptimizationAdjustment[] = [];

  switch (type) {
    case "product":
      if (productObject) {
        adjustments = await evolveProduct(productObject, revenueAttributions, period);
        // Add product-specific adjustments
        if (productAnalysis.recommendation === "scale") {
          adjustments.push({
            id: `adjustment_product_${productObject.id}_scale`,
            type: "product",
            element: "scale",
            action: "increase",
            value: "Scale product - high performance",
            reason: productAnalysis.recommendation,
            expectedImpact: "Increase revenue by scaling winning product",
            priority: "high",
          });
        }
      }
      break;
    case "ad":
      if (adObject) {
        adjustments = await evolveAd(adObject, revenueAttributions, period);
        // Add ad-specific adjustments
        if (adAnalysis.recommendation === "rotate") {
          adjustments.push({
            id: `adjustment_ad_${adObject.ad_id}_rotate`,
            type: "ad",
            element: "creative",
            action: "replace",
            value: "Rotate creatives - fatigue detected",
            reason: adAnalysis.recommendation,
            expectedImpact: "Refresh creatives to improve performance",
            priority: "high",
          });
        }
      }
      break;
    case "funnel":
      if (funnelObject) {
        adjustments = await evolveFunnel(funnelObject, revenueAttributions, period);
        // Add funnel-specific adjustments
        if (funnelAnalysis.leaks.length > 0) {
          adjustments.push({
            id: `adjustment_funnel_${funnelObject.funnel_id}_fix_leaks`,
            type: "funnel",
            element: "leaks",
            action: "replace",
            value: "Fix identified leaks",
            reason: funnelAnalysis.leaks.join(", "),
            expectedImpact: "Reduce revenue leakage",
            priority: "high",
          });
        }
      }
      break;
    case "pricing":
      if (productObject) {
        adjustments = await evolvePricing(productObject, revenueAttributions, period);
        // Add pricing-specific adjustments
        if (pricingOptimization) {
          adjustments.push({
            id: `adjustment_pricing_${productObject.id}_optimize`,
            type: "pricing",
            element: "price",
            action: "replace",
            value: pricingOptimization.productPrice,
            reason: pricingOptimization.expectedImpact,
            expectedImpact: "Maximize profit without killing conversion",
            priority: "high",
          });
        }
      }
      break;
    case "store":
      if (storeObject) {
        adjustments = await evolveStore(storeObject, revenueAttributions, period);
      }
      break;
  }

  // 4. Generate additional adjustments from analysis
  const analysisAdjustments = await generateAdjustments(type, targetId, analysis);
  adjustments.push(...analysisAdjustments);

  // 5. Evolution engine (if all objects available)
  let evolution: any;
  if (productObject && adObject && funnelObject && storeObject) {
    evolution = await evolveCommerceElements(productObject, adObject, funnelObject, storeObject, revenueAttributions);
  }

  // 6. Calculate optimization score
  const optimizationScore = calculateOptimizationScore(analysis, adjustments);

  // Create optimization object
  const optimizationObject: OptimizationObject = {
    optimization_id: optimizationId,
    type,
    target_id: targetId,
    analysis,
    adjustments,
    optimization_score: optimizationScore,
  };

  // Emit signal
  await emitSignal({
    source: "commerce:optimization-loop:optimization-object-generator",
    type: "optimization_object_generated",
    priority: "high",
    payload: {
      optimizationId,
      type,
      targetId,
      optimizationScore,
      adjustmentCount: adjustments.length,
      evolution: evolution ? true : false,
    },
  });

  // Update HSE
  emitStateUpdate([
    "commerce_optimization_active",
    "commerce_optimization_completed",
    ...(evolution ? ["commerce_optimization_evolution_active"] : []),
  ]);

  return optimizationObject;
}

function calculateOptimizationScore(
  analysis: PerformanceAnalysis,
  adjustments: OptimizationAdjustment[]
): number {
  let score = 0;

  // Performance metrics (50 points)
  if (analysis.metrics.roas && analysis.metrics.roas >= 3.0) {
    score += 20;
  } else if (analysis.metrics.roas && analysis.metrics.roas >= 2.0) {
    score += 10;
  }

  if (analysis.metrics.margin && analysis.metrics.margin >= 40) {
    score += 15;
  } else if (analysis.metrics.margin && analysis.metrics.margin >= 30) {
    score += 10;
  }

  if (analysis.metrics.ltv && analysis.metrics.ltv >= 300) {
    score += 15;
  } else if (analysis.metrics.ltv && analysis.metrics.ltv >= 100) {
    score += 10;
  }

  // Patterns (20 points)
  if (analysis.patterns.length > 0) {
    score += 10;
  }
  if (analysis.patterns.some(p => p.impact === "high")) {
    score += 10;
  }

  // Winners vs Losers (20 points)
  if (analysis.winners.length > analysis.losers.length) {
    score += 20;
  } else if (analysis.winners.length > 0) {
    score += 10;
  }

  // Adjustments (10 points)
  if (adjustments.length > 0) {
    score += 10;
  }

  return Math.min(100, score);
}
