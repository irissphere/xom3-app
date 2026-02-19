// Commerce Engine - Ad Engine
// The system that turns products → ads → traffic → revenue

import {
  Ad,
  AdCreative,
  AdTargeting,
  AdBudget,
  AdPerformance,
  AdOptimization,
  AdObject,
  AdTest,
  AdVariant,
  AdPlatform,
  AdFormat,
  AdObjective,
} from "./ad-types";
import { ProductObject } from "./types";
import { FunnelObject } from "./funnel-types";
import { emitSignal } from "@/lib/uoi/signals";
import { emitStateUpdate } from "@/lib/hse/signals";

// ============================================================================
// MODULE 1: CREATIVE GENERATOR
// ============================================================================

/**
 * Creative Generator - Generates hooks, angles, formats, platforms, A/B testing variants
 */
export async function generateAdCreatives(
  productObject: ProductObject,
  funnelObject: FunnelObject
): Promise<AdCreative> {
  // 1. Hooks (from Product Object recommended creatives)
  const hooks = productObject.recommended_creatives?.hooks || generateHooks(productObject);

  // 2. Angles (from Product Object recommended creatives)
  const angles = productObject.recommended_creatives?.angles || generateAngles(productObject);

  // 3. Headlines (from hooks and landing page)
  const headlines = generateHeadlines(productObject, funnelObject, hooks);

  // 4. Descriptions (from product description and benefits)
  const descriptions = generateDescriptions(productObject, funnelObject);

  // 5. Images (from product images and landing page)
  const images = generateImages(productObject, funnelObject);

  // 6. Videos (from product videos or generate video concepts)
  const videos = generateVideos(productObject, funnelObject);

  // 7. Formats (from Product Object recommended creatives)
  const formats = productObject.recommended_creatives?.formats || ["image", "video", "carousel"];

  // 8. CTA (from landing page)
  const cta = funnelObject.landing_page.hero.cta || "Shop Now";

  // 9. Landing page URL
  const landingPage = funnelObject.landing_page.seo.title || "";

  // 10. Tracking URL
  const trackingUrl = generateTrackingUrl(productObject.id, funnelObject.funnel_id);

  // Emit signal
  await emitSignal({
    source: "commerce:ad-engine:creative-generator",
    type: "ad_creatives_generated",
    priority: "low",
    payload: {
      productId: productObject.id,
      hookCount: hooks.length,
      headlineCount: headlines.length,
    },
  });

  return {
    hooks,
    angles,
    headlines,
    descriptions,
    images,
    videos,
    formats: formats as AdFormat[],
    cta,
    landingPage,
    trackingUrl,
  };
}

function generateHooks(productObject: ProductObject): string[] {
  return [
    `The ${productObject.name} everyone's talking about`,
    `Transform your ${productObject.category} with ${productObject.name}`,
    `Why ${productObject.name} is trending right now`,
    `The ${productObject.name} that's changing ${productObject.category}`,
  ];
}

function generateAngles(productObject: ProductObject): string[] {
  return [
    "Competitive pricing",
    "Superior quality",
    "Faster shipping",
    "Validated through research",
    "High customer satisfaction",
  ];
}

function generateHeadlines(
  productObject: ProductObject,
  funnelObject: FunnelObject,
  hooks: string[]
): string[] {
  const headlines: string[] = [];

  // From hooks
  headlines.push(...hooks.slice(0, 3));

  // From landing page
  headlines.push(funnelObject.landing_page.hero.headline);

  // From problem/solution
  headlines.push(funnelObject.landing_page.solution.headline);

  // Generated headlines
  headlines.push(
    `Get ${productObject.name} - ${productObject.category} Solution`,
    `${productObject.name} - Validated & Tested`,
    `Join ${funnelObject.landing_page.socialProof.stats?.customers || 10000} Happy Customers`
  );

  return Array.from(new Set(headlines)); // Remove duplicates
}

function generateDescriptions(productObject: ProductObject, funnelObject: FunnelObject): string[] {
  return [
    funnelObject.landing_page.hero.subheadline,
    funnelObject.landing_page.solution.description,
    `Get ${productObject.name} with ${productObject.metadata.validation?.overall || 0}% validation score. ${productObject.metadata.pricing?.marginAnalysis.recommended || 50}% better results.`,
    `Premium ${productObject.name} - ${productObject.category}. Fast shipping. Money-back guarantee.`,
  ];
}

function generateImages(productObject: ProductObject, funnelObject: FunnelObject): string[] {
  const images: string[] = [];

  // From product images
  if (productObject.metadata.trendSignals) {
    // Would be populated from actual product images
    images.push("product_image_1.jpg", "product_image_2.jpg");
  }

  // From landing page
  if (funnelObject.landing_page.hero.image) {
    images.push(funnelObject.landing_page.hero.image);
  }

  return images;
}

function generateVideos(productObject: ProductObject, funnelObject: FunnelObject): string[] {
  const videos: string[] = [];

  // From landing page
  if (funnelObject.landing_page.hero.video) {
    videos.push(funnelObject.landing_page.hero.video);
  }

  // Video concepts (would be generated/created)
  videos.push("product_demo_video.mp4", "testimonial_video.mp4");

  return videos;
}

function generateTrackingUrl(productId: string, funnelId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_URL || "https://xom3.io";
  return `${baseUrl}/shop?ref=ad&product=${productId}&funnel=${funnelId}`;
}

// ============================================================================
// MODULE 2: AUDIENCE TARGETING ENGINE
// ============================================================================

/**
 * Audience Targeting Engine - Demographics, interests, behaviors, lookalike, retargeting
 */
export async function generateAdTargeting(
  productObject: ProductObject,
  funnelObject: FunnelObject
): Promise<AdTargeting> {
  // 1. Demographics (from Product Object recommended audience)
  const demographics = generateDemographics(productObject);

  // 2. Interests (from Product Object recommended audience)
  const interests = productObject.recommended_audience?.interests || generateInterests(productObject);

  // 3. Behaviors (from Product Object recommended audience)
  const behaviors = productObject.recommended_audience?.behaviors || generateBehaviors(productObject);

  // 4. Lookalike audience (if we have customer data)
  const lookalike = generateLookalikeAudience(productObject);

  // 5. Retargeting audience
  const retargeting = generateRetargetingAudience();

  // 6. Custom audiences (if available)
  const customAudiences = generateCustomAudiences(productObject);

  // 7. Exclusions
  const exclusions = generateExclusions();

  // Emit signal
  await emitSignal({
    source: "commerce:ad-engine:audience-targeting",
    type: "ad_targeting_generated",
    priority: "low",
    payload: {
      productId: productObject.id,
      interestCount: interests.length,
      behaviorCount: behaviors.length,
    },
  });

  return {
    demographics,
    interests,
    behaviors,
    lookalike,
    retargeting,
    customAudiences,
    exclusions,
  };
}

function generateDemographics(productObject: ProductObject): any {
  const recommended = productObject.recommended_audience?.demographics || ["25-45", "All genders", "Urban"];

  // Parse demographics
  const ageRange = recommended.find(d => d.includes("-")) || "25-45";
  const [min, max] = ageRange.split("-").map(Number);

  return {
    ageRange: { min: min || 25, max: max || 45 },
    gender: "all" as const,
    locations: ["United States", "Canada", "United Kingdom"],
    languages: ["English"],
  };
}

function generateInterests(productObject: ProductObject): string[] {
  return [
    productObject.category,
    "Shopping",
    "Online Shopping",
    "E-commerce",
    "Lifestyle",
    "Trends",
  ];
}

function generateBehaviors(productObject: ProductObject): string[] {
  return [
    "Online shoppers",
    "Trend followers",
    "Early adopters",
    "Mobile shoppers",
    "Social media users",
  ];
}

function generateLookalikeAudience(productObject: ProductObject): any {
  // In production, would use actual customer data
  return {
    source: `customers_${productObject.id}`,
    percentage: 1, // 1% lookalike
    country: "US",
  };
}

function generateRetargetingAudience(): any {
  return {
    websiteVisitors: true,
    cartAbandoners: true,
    pastPurchasers: true,
    lookbackWindow: 30, // 30 days
  };
}

function generateCustomAudiences(productObject: ProductObject): any[] {
  return [
    {
      id: `customers_${productObject.id}`,
      name: `${productObject.name} Customers`,
      type: "customer_list" as const,
      size: 1000,
    },
  ];
}

function generateExclusions(): string[] {
  return [
    "Past purchasers (for new customer campaigns)",
    "Competitor employees",
  ];
}

// ============================================================================
// MODULE 3: AD TESTING ENGINE
// ============================================================================

/**
 * Ad Testing Engine - A/B tests, multivariate tests, performance tracking
 */
export async function createAdTest(
  productObject: ProductObject,
  funnelObject: FunnelObject,
  type: "a_b" | "multivariate" = "a_b"
): Promise<AdTest> {
  const testId = `test_${productObject.id}_${Date.now()}`;

  // Generate variants
  const variants: AdVariant[] = [];

  if (type === "a_b") {
    // A/B test: Test creative variations
    const creative1 = await generateAdCreatives(productObject, funnelObject);
    const creative2 = await generateAdCreatives(productObject, funnelObject); // Different variation

    variants.push({
      id: `variant_a_${testId}`,
      name: "Variant A",
      creative: creative1,
      performance: createEmptyPerformance(),
    });

    variants.push({
      id: `variant_b_${testId}`,
      name: "Variant B",
      creative: creative2,
      performance: createEmptyPerformance(),
    });
  } else {
    // Multivariate test: Test multiple elements
    const baseCreative = await generateAdCreatives(productObject, funnelObject);

    // Test different headlines
    for (let i = 0; i < 3; i++) {
      variants.push({
        id: `variant_${i}_${testId}`,
        name: `Variant ${i + 1}`,
        creative: {
          ...baseCreative,
          headlines: [baseCreative.headlines[i] || baseCreative.headlines[0]],
        },
        performance: createEmptyPerformance(),
      });
    }
  }

  // Emit signal
  await emitSignal({
    source: "commerce:ad-engine:ad-testing",
    type: "ad_test_created",
    priority: "low",
    payload: {
      testId,
      type,
      variantCount: variants.length,
    },
  });

  return {
    id: testId,
    name: `${productObject.name} Ad Test`,
    type,
    variants,
    status: "draft",
    confidence: 0,
    createdAt: new Date().toISOString(),
  };
}

function createEmptyPerformance(): AdPerformance {
  return {
    impressions: 0,
    clicks: 0,
    conversions: 0,
    spend: 0,
    revenue: 0,
    roas: 0,
    cpa: 0,
    ctr: 0,
    cpc: 0,
    conversionRate: 0,
    lastUpdated: new Date().toISOString(),
  };
}

// ============================================================================
// MODULE 4: PERFORMANCE TRACKING ENGINE
// ============================================================================

/**
 * Performance Tracking Engine - Impressions, clicks, conversions, ROAS, CPA
 */
export async function trackAdPerformance(
  adId: string,
  platform: AdPlatform,
  metrics: Partial<AdPerformance>
): Promise<AdPerformance> {
  // In production, would fetch from platform APIs
  // Meta Ads API, Google Ads API, TikTok Ads API, etc.

  const performance: AdPerformance = {
    impressions: metrics.impressions || 0,
    clicks: metrics.clicks || 0,
    conversions: metrics.conversions || 0,
    spend: metrics.spend || 0,
    revenue: metrics.revenue || 0,
    roas: metrics.revenue && metrics.spend ? metrics.revenue / metrics.spend : 0,
    cpa: metrics.conversions && metrics.spend ? metrics.spend / metrics.conversions : 0,
    ctr: metrics.impressions && metrics.clicks ? (metrics.clicks / metrics.impressions) * 100 : 0,
    cpc: metrics.clicks && metrics.spend ? metrics.spend / metrics.clicks : 0,
    conversionRate: metrics.clicks && metrics.conversions ? (metrics.conversions / metrics.clicks) * 100 : 0,
    lastUpdated: new Date().toISOString(),
  };

  // Emit signal
  await emitSignal({
    source: "commerce:ad-engine:performance-tracking",
    type: "ad_performance_tracked",
    priority: "low",
    payload: {
      adId,
      roas: performance.roas,
      cpa: performance.cpa,
    },
  });

  return performance;
}

// ============================================================================
// MODULE 5: ROAS OPTIMIZER
// ============================================================================

/**
 * ROAS Optimizer - Budget allocation, bid optimization, audience optimization
 */
export async function optimizeROAS(
  ad: Ad,
  performance: AdPerformance
): Promise<AdOptimization> {
  const recommendations: any[] = [];

  // Analyze performance
  if (performance.roas < 2.0) {
    recommendations.push({
      type: "budget",
      priority: "high" as const,
      description: "ROAS below target. Consider reducing budget or pausing ad.",
      expectedImpact: "Reduce wasted spend",
    });
  }

  if (performance.ctr < 1.0) {
    recommendations.push({
      type: "creative",
      priority: "high" as const,
      description: "Low CTR. Test new creatives or headlines.",
      expectedImpact: "Increase click-through rate",
    });
  }

  if (performance.conversionRate < 2.0) {
    recommendations.push({
      type: "targeting",
      priority: "medium" as const,
      description: "Low conversion rate. Refine audience targeting.",
      expectedImpact: "Improve conversion rate",
    });
  }

  if (performance.cpa > 50) {
    recommendations.push({
      type: "bid",
      priority: "medium" as const,
      description: "High CPA. Adjust bid strategy or lower bids.",
      expectedImpact: "Reduce cost per acquisition",
    });
  }

  // Determine optimization status
  let status: "optimizing" | "optimized" | "needs_attention" = "optimized";
  if (recommendations.some(r => r.priority === "high")) {
    status = "needs_attention";
  } else if (performance.roas < 3.0) {
    status = "optimizing";
  }

  // Emit signal
  await emitSignal({
    source: "commerce:ad-engine:roas-optimizer",
    type: "roas_optimized",
    priority: status === "needs_attention" ? "high" : "low",
    payload: {
      adId: ad.adId,
      roas: performance.roas,
      recommendationCount: recommendations.length,
    },
  });

  return {
    status,
    recommendations,
    autoOptimization: true,
    lastOptimized: new Date().toISOString(),
  };
}

// ============================================================================
// MODULE 6: MULTI-PLATFORM AD ORCHESTRATOR
// ============================================================================

/**
 * Multi-Platform Ad Orchestrator - Meta, Google, TikTok, unified management
 */
export async function createMultiPlatformAd(
  productObject: ProductObject,
  funnelObject: FunnelObject,
  platforms: AdPlatform[] = ["meta", "google", "tiktok"]
): Promise<Ad[]> {
  const ads: Ad[] = [];

  // Generate creatives and targeting once
  const creative = await generateAdCreatives(productObject, funnelObject);
  const targeting = await generateAdTargeting(productObject, funnelObject);

  // Create ad for each platform
  for (const platform of platforms) {
    const ad = await createPlatformAd(
      productObject,
      funnelObject,
      platform,
      creative,
      targeting
    );
    ads.push(ad);
  }

  // Emit signal
  await emitSignal({
    source: "commerce:ad-engine:multi-platform-orchestrator",
    type: "multi_platform_ads_created",
    priority: "high",
    payload: {
      productId: productObject.id,
      platformCount: platforms.length,
      adCount: ads.length,
    },
  });

  return ads;
}

async function createPlatformAd(
  productObject: ProductObject,
  funnelObject: FunnelObject,
  platform: AdPlatform,
  creative: AdCreative,
  targeting: AdTargeting
): Promise<Ad> {
  const adId = `ad_${platform}_${productObject.id}_${Date.now()}`;

  // Platform-specific adjustments
  const platformCreative = adjustCreativeForPlatform(creative, platform);
  const platformTargeting = adjustTargetingForPlatform(targeting, platform);

  // Budget
  const budget: AdBudget = {
    daily: 50, // Default $50/day
    bidStrategy: "lowest_cost",
  };

  // Performance (empty initially)
  const performance = createEmptyPerformance();

  // Optimization
  const optimization: AdOptimization = {
    status: "optimizing",
    recommendations: [],
    autoOptimization: true,
    lastOptimized: new Date().toISOString(),
  };

  return {
    id: adId,
    adId,
    productId: productObject.id,
    funnelId: funnelObject.funnel_id,
    platform,
    format: platformCreative.formats[0] || "image",
    objective: "conversions",
    status: "draft",
    creative: platformCreative,
    targeting: platformTargeting,
    budget,
    performance,
    optimization,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function adjustCreativeForPlatform(creative: AdCreative, platform: AdPlatform): AdCreative {
  // Platform-specific creative adjustments
  const platformFormats: Record<AdPlatform, AdFormat[]> = {
    meta: ["image", "video", "carousel", "collection"],
    google: ["image", "video"],
    tiktok: ["video", "reels"],
    pinterest: ["image", "carousel"],
    snapchat: ["image", "video", "story"],
    twitter: ["image", "video"],
  };

  return {
    ...creative,
    formats: platformFormats[platform] || creative.formats,
  };
}

function adjustTargetingForPlatform(targeting: AdTargeting, platform: AdPlatform): AdTargeting {
  // Platform-specific targeting adjustments
  // In production, would adjust based on platform capabilities
  return targeting;
}

// ============================================================================
// MODULE 7: AD OBJECT GENERATOR
// ============================================================================

/**
 * Ad Object Generator - Creates complete Ad Object
 */
export async function generateAdObject(
  productObject: ProductObject,
  funnelObject: FunnelObject,
  platform: AdPlatform = "meta",
  budget?: AdBudget
): Promise<AdObject> {
  const adId = `ad_${platform}_${productObject.id}_${Date.now()}`;

  // 1. Generate creatives
  const creative = await generateAdCreatives(productObject, funnelObject);

  // 2. Generate targeting
  const targeting = await generateAdTargeting(productObject, funnelObject);

  // 3. Set budget
  const adBudget: AdBudget = budget || {
    daily: 50,
    bidStrategy: "lowest_cost",
  };

  // 4. Performance (empty initially, will be populated by tracking)
  const performance = createEmptyPerformance();

  // 5. Optimization
  const optimization = await optimizeROAS(
    {
      id: adId,
      adId,
      productId: productObject.id,
      funnelId: funnelObject.funnel_id,
      platform,
      format: creative.formats[0] || "image",
      objective: "conversions",
      status: "draft",
      creative,
      targeting,
      budget: adBudget,
      performance,
      optimization: {
        status: "optimizing",
        recommendations: [],
        autoOptimization: true,
        lastOptimized: new Date().toISOString(),
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    performance
  );

  // 6. Calculate ROAS score (0-100)
  const roasScore = calculateROASScore(performance);

  // Create ad object
  const adObject: AdObject = {
    ad_id: adId,
    product_id: productObject.id,
    funnel_id: funnelObject.funnel_id,
    platform,
    creative,
    targeting,
    budget: adBudget,
    performance,
    optimization,
    roas_score: roasScore,
  };

  // Emit signal
  await emitSignal({
    source: "commerce:ad-engine:ad-object-generator",
    type: "ad_object_generated",
    priority: "high",
    payload: {
      adId,
      productId: productObject.id,
      platform,
      roasScore,
    },
  });

  // Update HSE
  emitStateUpdate(["commerce_ad_created", "commerce_ad_draft"]);

  return adObject;
}

function calculateROASScore(performance: AdPerformance): number {
  // ROAS score based on performance
  // ROAS > 4.0 = 100 points
  // ROAS > 3.0 = 80 points
  // ROAS > 2.0 = 60 points
  // ROAS > 1.0 = 40 points
  // ROAS < 1.0 = 20 points

  if (performance.roas >= 4.0) return 100;
  if (performance.roas >= 3.0) return 80;
  if (performance.roas >= 2.0) return 60;
  if (performance.roas >= 1.0) return 40;
  return 20;
}
