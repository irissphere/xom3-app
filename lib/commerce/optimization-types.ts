// Commerce Engine - Optimization Loop Type Definitions
// The system that makes the commerce organism self-improving

import { ProductObject } from "./types";
import { AdObject } from "./ad-types";
import { FunnelObject } from "./funnel-types";
import { StoreObject } from "./store-types";
import { RevenueAttributionObject } from "./revenue-types";
import { FulfillmentObject } from "./fulfillment-types";

export type OptimizationType = "product" | "ad" | "funnel" | "pricing" | "store";
export type OptimizationStatus = "analyzing" | "adjusting" | "deployed" | "measuring" | "completed";

export interface OptimizationCycle {
  id: string;
  type: OptimizationType;
  status: OptimizationStatus;
  targetId: string; // Product ID, Ad ID, Funnel ID, etc.
  analysis: PerformanceAnalysis;
  adjustments: OptimizationAdjustment[];
  deployedAt?: string;
  measuredAt?: string;
  results?: OptimizationResults;
  createdAt: string;
  updatedAt: string;
}

export interface PerformanceAnalysis {
  period: {
    start: string;
    end: string;
  };
  metrics: {
    revenue: number;
    orders: number;
    customers: number;
    roas?: number;
    cpa?: number;
    conversionRate?: number;
    margin?: number;
    ltv?: number;
  };
  patterns: PerformancePattern[];
  winners: string[]; // IDs of winning elements
  losers: string[]; // IDs of losing elements
  anomalies: PerformanceAnomaly[];
}

export interface PerformancePattern {
  type: "trend" | "seasonal" | "correlation" | "causation";
  description: string;
  confidence: number; // 0-100
  impact: "high" | "medium" | "low";
}

export interface PerformanceAnomaly {
  type: "spike" | "drop" | "outlier";
  description: string;
  severity: "high" | "medium" | "low";
  detectedAt: string;
}

export interface OptimizationAdjustment {
  id: string;
  type: "product" | "ad" | "funnel" | "pricing" | "store";
  element: string; // What to adjust
  action: "increase" | "decrease" | "replace" | "remove" | "add";
  value?: any; // New value
  reason: string;
  expectedImpact: string;
  priority: "high" | "medium" | "low";
}

export interface OptimizationResults {
  before: {
    revenue: number;
    orders: number;
    roas?: number;
    conversionRate?: number;
  };
  after: {
    revenue: number;
    orders: number;
    roas?: number;
    conversionRate?: number;
  };
  improvement: {
    revenue: number; // Percentage
    orders: number; // Percentage
    roas?: number; // Percentage
    conversionRate?: number; // Percentage
  };
  success: boolean;
}

export interface OptimizationObject {
  optimization_id: string;
  type: OptimizationType;
  target_id: string;
  analysis: PerformanceAnalysis;
  adjustments: OptimizationAdjustment[];
  results?: OptimizationResults;
  optimization_score: number; // 0-100
}
