// Commerce Engine - Main Exports
// The system that turns products → stores → funnels → ads → orders → revenue

export * from "./types";

// Product Intelligence Engine
export {
  researchProduct,
  analyzeCompetitors,
  analyzePricing,
  calculateProductScore,
  recommendProduct,
  batchResearchProducts,
} from "./product-intelligence";

// Product Intelligence Engine Modules (6 Core Modules)
export {
  scanTrends,
  analyzeCompetitorsDeep,
  scoreDemand,
  calculateMargin,
  validateProduct,
  generateProductObject,
} from "./product-intelligence-modules";

// Store Engine
export * from "./store-types";
export {
  buildStore,
  generateProductPage,
  buildCollections,
  applyBranding,
  buildProductVariants,
  buildProductInventory,
  generateStoreObject,
} from "./store-engine";

// Funnel Engine
export * from "./funnel-types";
export {
  generateLandingPage,
  optimizeProductPage,
  generateUpsells,
  generateDownsells,
  generateBundles,
  optimizeCheckout,
  generatePostPurchase,
  generateFunnelObject,
} from "./funnel-engine";

// Ad Engine
export * from "./ad-types";
export {
  generateAdCreatives,
  generateAdTargeting,
  createAdTest,
  trackAdPerformance,
  optimizeROAS,
  createMultiPlatformAd,
  generateAdObject,
} from "./ad-engine";

// Revenue Attribution Engine
export * from "./revenue-types";
export {
  mapRevenueAttribution,
  calculateLTV,
  analyzeCohort,
  calculateSKUProfitability,
  attributeByChannel,
  calculateCampaignROI,
  generateRevenueAttributionObject,
} from "./revenue-attribution-engine";

// Fulfillment Engine
export * from "./fulfillment-types";
export {
  syncSupplier,
  routeOrder,
  processShipping,
  sendCustomerNotifications,
  resolveIssue,
  generateFulfillmentObject,
} from "./fulfillment-engine";

// Optimization Loop
export * from "./optimization-types";
export {
  evolveProduct,
  evolveAd,
  evolveFunnel,
  evolvePricing,
  evolveStore,
  analyzeProductPerformance,
  analyzeFunnelPerformance,
  analyzeAdPerformance,
  optimizePricingAndMargin,
  analyzeCustomerBehavior,
  evolveCommerceElements,
  analyzePerformance,
  generateAdjustments,
  generateOptimizationObject,
} from "./optimization-loop";
