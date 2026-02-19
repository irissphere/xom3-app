// Commerce Engine - Revenue Attribution Engine Type Definitions
// The system that maps product → ad → customer → revenue

import { ProductObject } from "./types";
import { AdObject } from "./ad-types";
import { FunnelObject } from "./funnel-types";
import { StoreObject } from "./store-types";

export interface RevenueEvent {
  id: string;
  orderId: string;
  customerId: string;
  productId: string;
  amount: number;
  quantity: number;
  timestamp: string;
  metadata: {
    adId?: string;
    funnelId?: string;
    storeId?: string;
    channel?: string;
    campaignId?: string;
    creativeId?: string;
    audienceId?: string;
  };
}

export interface RevenueAttribution {
  revenueId: string;
  productId: string;
  adId?: string;
  funnelId?: string;
  storeId?: string;
  customerId: string;
  attributionModel: "first_touch" | "last_touch" | "multi_touch" | "linear" | "time_decay";
  touchpoints: AttributionTouchpoint[];
  attributedRevenue: number;
  attributionBreakdown: {
    product: number;
    ad: number;
    funnel: number;
    store: number;
    organic?: number;
  };
  calculatedAt: string;
}

export interface AttributionTouchpoint {
  id: string;
  type: "ad_click" | "funnel_visit" | "store_visit" | "product_view" | "cart_add" | "checkout";
  timestamp: string;
  channel: string;
  source: string;
  weight: number; // 0-1, attribution weight
}

export interface LTVData {
  customerId: string;
  productId: string;
  firstPurchaseDate: string;
  lastPurchaseDate: string;
  totalRevenue: number;
  purchaseCount: number;
  averageOrderValue: number;
  ltv: number; // Lifetime Value
  predictedLtv?: number;
  cohort: string;
  segment: "high" | "medium" | "low";
  calculatedAt: string;
}

export interface CohortAnalysis {
  cohortId: string;
  cohortType: "product" | "ad" | "funnel" | "customer_segment" | "date";
  cohortValue: string; // Product ID, Ad ID, Funnel ID, Segment, or Date
  customers: number;
  revenue: number;
  averageOrderValue: number;
  ltv: number;
  retentionRate: number; // 0-100
  churnRate: number; // 0-100
  period: {
    start: string;
    end: string;
  };
  breakdown: {
    byProduct?: Record<string, number>;
    byAd?: Record<string, number>;
    byFunnel?: Record<string, number>;
  };
}

export interface SKUProfitability {
  sku: string;
  productId: string;
  productName: string;
  revenue: number;
  cost: number;
  profit: number;
  margin: number; // percentage
  quantitySold: number;
  averagePrice: number;
  profitabilityScore: number; // 0-100
  period: {
    start: string;
    end: string;
  };
}

export interface ChannelAttribution {
  channel: string; // "meta", "google", "tiktok", "organic", "direct"
  revenue: number;
  orders: number;
  customers: number;
  averageOrderValue: number;
  roas: number;
  cpa: number;
  ltv: number;
  profitability: number;
  period: {
    start: string;
    end: string;
  };
  breakdown: {
    byProduct: Record<string, number>;
    byAd?: Record<string, number>;
    byFunnel?: Record<string, number>;
  };
}

export interface CampaignROI {
  campaignId: string;
  campaignName: string;
  platform: string;
  spend: number;
  revenue: number;
  orders: number;
  roas: number;
  cpa: number;
  profit: number;
  margin: number;
  ltvAdjustedRoas: number;
  profitabilityScore: number; // 0-100
  period: {
    start: string;
    end: string;
  };
  breakdown: {
    byAdSet: Record<string, number>;
    byCreative: Record<string, number>;
    byAudience: Record<string, number>;
  };
}

export interface RevenueAttributionObject {
  attribution_id: string;
  product_id: string;
  ad_id?: string;
  funnel_id?: string;
  store_id?: string;
  customer_id: string;
  revenue: number;
  attribution: RevenueAttribution;
  ltv: LTVData;
  cohort?: CohortAnalysis;
  sku_profitability?: SKUProfitability;
  channel_attribution?: ChannelAttribution;
  campaign_roi?: CampaignROI;
  profitability_score: number; // 0-100
}
