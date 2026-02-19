// Commerce Engine - Ad Engine Type Definitions
// The system that turns products → ads → traffic → revenue

import { ProductObject } from "./types";
import { FunnelObject } from "./funnel-types";

export type AdPlatform = "meta" | "google" | "tiktok" | "pinterest" | "snapchat" | "twitter";
export type AdFormat = "image" | "video" | "carousel" | "collection" | "story" | "reels";
export type AdObjective = "traffic" | "conversions" | "engagement" | "awareness" | "sales";
export type AdStatus = "draft" | "active" | "paused" | "archived";

export interface Ad {
  id: string;
  adId: string;
  productId: string;
  funnelId: string;
  platform: AdPlatform;
  format: AdFormat;
  objective: AdObjective;
  status: AdStatus;
  creative: AdCreative;
  targeting: AdTargeting;
  budget: AdBudget;
  performance: AdPerformance;
  optimization: AdOptimization;
  createdAt: string;
  updatedAt: string;
}

export interface AdCreative {
  hooks: string[];
  angles: string[];
  headlines: string[];
  descriptions: string[];
  images: string[];
  videos: string[];
  formats: AdFormat[];
  cta: string;
  landingPage: string;
  trackingUrl: string;
}

export interface AdTargeting {
  demographics: Demographics;
  interests: string[];
  behaviors: string[];
  lookalike?: LookalikeAudience;
  retargeting?: RetargetingAudience;
  customAudiences?: CustomAudience[];
  exclusions?: string[];
}

export interface Demographics {
  ageRange: { min: number; max: number };
  gender: "all" | "male" | "female";
  locations: string[];
  languages: string[];
}

export interface LookalikeAudience {
  source: string; // Source audience ID
  percentage: number; // 1-10%
  country: string;
}

export interface RetargetingAudience {
  websiteVisitors: boolean;
  cartAbandoners: boolean;
  pastPurchasers: boolean;
  lookbackWindow: number; // days
}

export interface CustomAudience {
  id: string;
  name: string;
  type: "email" | "phone" | "customer_list" | "website";
  size?: number;
}

export interface AdBudget {
  daily: number;
  lifetime?: number;
  schedule?: {
    startDate: string;
    endDate: string;
  };
  bidStrategy: "lowest_cost" | "cost_cap" | "bid_cap" | "target_cost";
  bidAmount?: number;
}

export interface AdPerformance {
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  revenue: number;
  roas: number; // Return on Ad Spend
  cpa: number; // Cost Per Acquisition
  ctr: number; // Click-Through Rate
  cpc: number; // Cost Per Click
  conversionRate: number;
  lastUpdated: string;
}

export interface AdOptimization {
  status: "optimizing" | "optimized" | "needs_attention";
  recommendations: OptimizationRecommendation[];
  autoOptimization: boolean;
  lastOptimized: string;
}

export interface OptimizationRecommendation {
  type: "creative" | "targeting" | "budget" | "bid";
  priority: "high" | "medium" | "low";
  description: string;
  expectedImpact: string;
}

export interface AdTest {
  id: string;
  name: string;
  type: "a_b" | "multivariate";
  variants: AdVariant[];
  status: "draft" | "running" | "completed";
  winner?: string; // Variant ID
  confidence: number; // 0-100
  createdAt: string;
  completedAt?: string;
}

export interface AdVariant {
  id: string;
  name: string;
  creative: Partial<AdCreative>;
  targeting?: Partial<AdTargeting>;
  budget?: Partial<AdBudget>;
  performance: AdPerformance;
}

export interface AdObject {
  ad_id: string;
  product_id: string;
  funnel_id: string;
  platform: AdPlatform;
  creative: AdCreative;
  targeting: AdTargeting;
  budget: AdBudget;
  performance: AdPerformance;
  optimization: AdOptimization;
  roas_score: number; // 0-100
}
