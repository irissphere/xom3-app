// Commerce Engine - Type Definitions
// The system that turns products → stores → funnels → ads → orders → revenue

export type ProductCategory =
  | "physical"
  | "digital"
  | "service"
  | "subscription"
  | "course"
  | "coaching"
  | "saas";

export type ProductSource =
  | "dropshipping"
  | "print_on_demand"
  | "wholesale"
  | "manufacturing"
  | "digital_creation"
  | "affiliate";

export interface Product {
  id: string;
  name: string;
  description: string;
  category: ProductCategory;
  source: ProductSource;
  price: number;
  cost: number;
  margin: number; // percentage
  profit: number; // absolute
  score: number; // 0-100, overall product score
  status: "researching" | "validated" | "launched" | "paused" | "archived";
  metadata: {
    images?: string[];
    tags?: string[];
    keywords?: string[];
    competitorCount?: number;
    marketSize?: number;
    demandScore?: number; // 0-100
    trendScore?: number; // 0-100
    competitionScore?: number; // 0-100, lower = less competition
    marginScore?: number; // 0-100
    validationScore?: number; // 0-100
  };
  research?: ProductResearch;
  competitorAnalysis?: CompetitorAnalysis;
  pricing?: PricingIntelligence;
  createdAt: string;
  updatedAt: string;
}

export interface ProductResearch {
  productId: string;
  trendSignals: TrendSignal[];
  marketData: MarketData;
  demandForecast: DemandForecast;
  validationScore: number; // 0-100
  researchDate: string;
}

export interface TrendSignal {
  keyword: string;
  platform: "google" | "tiktok" | "instagram" | "youtube" | "amazon" | "etsy";
  volume: number;
  velocity: number; // growth rate
  momentum: number; // 0-100
  relevance: number; // 0-100
  detectedAt: string;
}

export interface MarketData {
  marketSize: number; // estimated market size
  growthRate: number; // percentage
  seasonality?: {
    peakMonths: string[];
    lowMonths: string[];
  };
  demographics?: {
    ageRange: string;
    gender: string;
    interests: string[];
  };
}

export interface DemandForecast {
  shortTerm: number; // next 30 days
  mediumTerm: number; // next 90 days
  longTerm: number; // next 365 days
  confidence: number; // 0-100
}

export interface CompetitorAnalysis {
  productId: string;
  competitors: Competitor[];
  averagePrice: number;
  priceRange: {
    min: number;
    max: number;
    median: number;
  };
  marketShare: {
    topCompetitor: number; // percentage
    top3Competitors: number; // percentage
    others: number; // percentage
  };
  competitiveAdvantage?: string[];
  competitiveDisadvantage?: string[];
  analyzedAt: string;
}

export interface Competitor {
  name: string;
  platform: "shopify" | "amazon" | "etsy" | "ebay" | "other";
  price: number;
  rating?: number;
  reviews?: number;
  shipping?: string;
  features?: string[];
  strengths?: string[];
  weaknesses?: string[];
}

export interface PricingIntelligence {
  productId: string;
  currentPrice: number;
  recommendedPrice: number;
  priceRange: {
    min: number;
    max: number;
    optimal: number;
  };
  marginAnalysis: {
    current: number;
    recommended: number;
    minAcceptable: number;
  };
  elasticity?: number; // price elasticity of demand
  competitorPricing: {
    average: number;
    median: number;
    range: {
      min: number;
      max: number;
    };
  };
  analyzedAt: string;
}

export interface ProductScore {
  productId: string;
  overall: number; // 0-100
  components: {
    demand: number; // 0-100
    competition: number; // 0-100, inverted (lower competition = higher score)
    margin: number; // 0-100
    trend: number; // 0-100
    validation: number; // 0-100
  };
  weighted: {
    demand: number; // weighted score
    competition: number;
    margin: number;
    trend: number;
    validation: number;
  };
  calculatedAt: string;
}

export interface ProductRecommendation {
  product: Product;
  score: ProductScore;
  reasoning: string;
  priority: "high" | "medium" | "low";
  actionItems: string[];
  estimatedRevenue?: number;
  estimatedProfit?: number;
  riskLevel: "low" | "medium" | "high";
}

// Product Intelligence Engine - Complete Product Object
export interface ProductObject {
  id: string;
  name: string;
  category: string;
  trend_score: number; // 0-100
  demand_score: number; // 0-100
  margin_score: number; // 0-100
  saturation_score: number; // 0-100, inverted (lower saturation = higher score)
  validation_status: "validated" | "rejected" | "pending";
  recommended_price: number;
  recommended_creatives?: {
    hooks: string[];
    angles: string[];
    formats: string[];
    platforms: string[];
  };
  recommended_funnel?: {
    type: "landing_page" | "shopify_store" | "direct_link";
    upsells: string[];
    downsells: string[];
    bundles: string[];
  };
  recommended_audience?: {
    demographics: string[];
    interests: string[];
    behaviors: string[];
    platforms: string[];
  };
  metadata: {
    trendSignals: TrendSignal[];
    competitors: Competitor[];
    marketData: MarketData;
    pricing: PricingIntelligence;
    validation: ProductValidation;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ProductValidation {
  productId: string;
  socialProof: {
    score: number; // 0-100
    signals: string[];
  };
  competitorProof: {
    score: number; // 0-100
    signals: string[];
  };
  trendVelocity: {
    score: number; // 0-100
    velocity: number;
  };
  marginViability: {
    score: number; // 0-100
    viable: boolean;
  };
  fulfillmentFeasibility: {
    score: number; // 0-100
    feasible: boolean;
  };
  overall: number; // 0-100
  validatedAt: string;
}

export interface DemandScore {
  productId: string;
  searchVolume: number; // 0-100
  engagement: number; // 0-100
  savesShares: number; // 0-100
  adSpend: number; // 0-100, inverted (less ad spend = higher opportunity)
  adFrequency: number; // 0-100, inverted (less frequency = less saturation)
  sentiment: number; // 0-100
  overall: number; // 0-100
  saturation: number; // 0-100, inverted (lower = less saturated)
  opportunity: number; // 0-100
  calculatedAt: string;
}

export interface MarginCalculation {
  productId: string;
  costOfGoods: number;
  shippingCost: number;
  adCost: number; // estimated
  fulfillmentCost: number;
  totalCost: number;
  breakEvenROAS: number; // ROAS needed to break even
  profitMargin: number; // percentage
  marginScore: number; // 0-100
  pricingRecommendation: {
    min: number;
    optimal: number;
    max: number;
  };
  calculatedAt: string;
}
