// Broadcast Engine - CTA Generator Module
// Generates soft, hard, funnel-specific, seasonal, and trend-aligned CTAs

import { Platform } from "../types";
import { ClassifiedTrend } from "../trend-engine";

export type CTAStyle = 
  | "soft"        // Soft, non-pushy
  | "hard"        // Direct, action-oriented
  | "question"    // Question-based
  | "funnel"      // Funnel-specific
  | "seasonal"    // Seasonal context
  | "trend"       // Trend-aligned

export interface CTA {
  text: string;
  style: CTAStyle;
  platform: Platform;
  score: number; // 0-100, based on performance, context, etc.
}

export interface CTAContext {
  platform: Platform;
  funnelStage?: string;
  seasonalContext?: string; // "open_enrollment", "tax_season", etc.
  trend?: ClassifiedTrend;
  performanceData?: {
    bestPerformingCTA?: CTAStyle;
    ctaPerformance?: Record<CTAStyle, number>; // Conversion rates
  };
}

/**
 * Generate soft CTA
 */
export function generateSoftCTA(platform: Platform): CTA {
  const ctas: Record<Platform, string> = {
    youtube: "Want to learn more? Check the description below.",
    tiktok: "Want to know more? Follow for daily tips!",
    instagram: "Curious? Link in bio 👆",
    reels: "Link in bio for more! 👆",
    facebook: "Interested? Learn more in the comments.",
    linkedin: "Want to discuss? Let's connect.",
    twitter: "Want to learn more? Check the thread 👇",
    shorts: "Want the full guide? Link in description."
  };
  
  return {
    text: ctas[platform] || "Want to learn more?",
    style: "soft",
    platform,
    score: 70
  };
}

/**
 * Generate hard CTA
 */
export function generateHardCTA(platform: Platform): CTA {
  const ctas: Record<Platform, string> = {
    youtube: "Get started today → xom3.io",
    tiktok: "DM me 'HELP' for options",
    instagram: "Click the link in bio to get started 👆",
    reels: "Link in bio to get started NOW 👆",
    facebook: "Visit xom3.io to get started today",
    linkedin: "Schedule a consultation → xom3.io",
    twitter: "Get started → xom3.io",
    shorts: "Get started → Link in description"
  };
  
  return {
    text: ctas[platform] || "Get started today → xom3.io",
    style: "hard",
    platform,
    score: 80
  };
}

/**
 * Generate question CTA
 */
export function generateQuestionCTA(platform: Platform): CTA {
  const ctas: Record<Platform, string> = {
    youtube: "Ready to get started?",
    tiktok: "Have questions? DM me!",
    instagram: "Questions? DM me!",
    reels: "Questions? Link in bio 👆",
    facebook: "Have questions? Comment below!",
    linkedin: "Want to discuss? Let's connect.",
    twitter: "Questions? Reply to this thread!",
    shorts: "Ready to learn more?"
  };
  
  return {
    text: ctas[platform] || "Ready to get started?",
    style: "question",
    platform,
    score: 75
  };
}

/**
 * Generate funnel-specific CTA
 */
export function generateFunnelCTA(platform: Platform, funnelStage: string): CTA {
  const ctas: Record<string, Record<Platform, string>> = {
    new_lead: {
      youtube: "New to this? Start here → xom3.io",
      tiktok: "New here? Follow for daily tips!",
      instagram: "New? Link in bio to get started 👆",
      reels: "New? Link in bio 👆",
      facebook: "New? Visit xom3.io to learn more",
      linkedin: "New? Let's connect and discuss.",
      twitter: "New? Check the thread for more 👇",
      shorts: "New? Link in description"
    },
    warm_lead: {
      youtube: "Ready to take the next step? → xom3.io",
      tiktok: "Ready? DM me 'NEXT' for options",
      instagram: "Ready? Link in bio 👆",
      reels: "Ready? Link in bio 👆",
      facebook: "Ready? Visit xom3.io",
      linkedin: "Ready? Schedule a call → xom3.io",
      twitter: "Ready? Get started → xom3.io",
      shorts: "Ready? Link in description"
    },
    interested: {
      youtube: "Want to compare options? → xom3.io",
      tiktok: "Want options? DM me!",
      instagram: "Want options? Link in bio 👆",
      reels: "Want options? Link in bio 👆",
      facebook: "Want options? Visit xom3.io",
      linkedin: "Want to discuss options? Let's connect.",
      twitter: "Want options? Check xom3.io",
      shorts: "Want options? Link in description"
    }
  };
  
  const stageCTAs = ctas[funnelStage] || ctas.new_lead;
  
  return {
    text: stageCTAs[platform] || "Get started → xom3.io",
    style: "funnel",
    platform,
    score: 85
  };
}

/**
 * Generate seasonal CTA
 */
export function generateSeasonalCTA(platform: Platform, seasonalContext: string): CTA {
  const ctas: Record<string, Record<Platform, string>> = {
    open_enrollment: {
      youtube: "Open enrollment is here! Get help → xom3.io",
      tiktok: "Open enrollment! DM me 'ENROLL' for help",
      instagram: "Open enrollment! Link in bio 👆",
      reels: "Open enrollment! Link in bio 👆",
      facebook: "Open enrollment! Visit xom3.io",
      linkedin: "Open enrollment! Schedule a consultation → xom3.io",
      twitter: "Open enrollment! Get help → xom3.io",
      shorts: "Open enrollment! Link in description"
    },
    tax_season: {
      youtube: "Tax season tip! Learn more → xom3.io",
      tiktok: "Tax season! Save this for later 💾",
      instagram: "Tax season tip! Link in bio 👆",
      reels: "Tax season! Link in bio 👆",
      facebook: "Tax season tip! Visit xom3.io",
      linkedin: "Tax season! Get help → xom3.io",
      twitter: "Tax season tip! Check xom3.io",
      shorts: "Tax season! Link in description"
    }
  };
  
  const seasonalCTAs = ctas[seasonalContext] || ctas.open_enrollment;
  
  return {
    text: seasonalCTAs[platform] || "Learn more → xom3.io",
    style: "seasonal",
    platform,
    score: 90
  };
}

/**
 * Generate trend-aligned CTA
 */
export function generateTrendCTA(platform: Platform, trend: ClassifiedTrend): CTA {
  let text = "";
  const label =
    (trend.signal as any)?.value ||
    (trend.signal as any)?.keyword ||
    (trend.signal as any)?.topic ||
    (trend.signal as any)?.term ||
    "This";
  
  if (trend.category === "breakout") {
    text = `${label} is trending! Learn more → xom3.io`;
  } else if (trend.category === "sustained") {
    text = `${label} is growing. Get ahead → xom3.io`;
  } else {
    text = `${label} is trending. Learn more → xom3.io`;
  }
  
  // Platform-specific adjustments
  if (platform === "instagram" || platform === "tiktok" || platform === "reels") {
    text = `${label} is trending! Link in bio 👆`;
  }
  
  return {
    text,
    style: "trend",
    platform,
    score: trend.opportunity
  };
}

/**
 * Generate multiple CTA variations
 */
export function generateCTAVariations(context: CTAContext): CTA[] {
  const { platform, funnelStage, seasonalContext, trend, performanceData } = context;
  
  const ctas: CTA[] = [];
  
  // Generate base CTAs
  ctas.push(generateSoftCTA(platform));
  ctas.push(generateHardCTA(platform));
  ctas.push(generateQuestionCTA(platform));
  
  // Add funnel-specific CTA if stage provided
  if (funnelStage) {
    ctas.push(generateFunnelCTA(platform, funnelStage));
  }
  
  // Add seasonal CTA if context provided
  if (seasonalContext) {
    ctas.push(generateSeasonalCTA(platform, seasonalContext));
  }
  
  // Add trend CTA if trend exists
  if (trend) {
    ctas.push(generateTrendCTA(platform, trend));
  }
  
  // Boost scores based on performance data
  if (performanceData?.ctaPerformance) {
    for (const cta of ctas) {
      const performance = performanceData.ctaPerformance[cta.style];
      if (performance) {
        cta.score = Math.min(100, cta.score + (performance * 20)); // Boost by performance
      }
    }
  }
  
  // Sort by score (highest first)
  ctas.sort((a, b) => b.score - a.score);
  
  return ctas;
}

/**
 * Get best CTA for context
 */
export function getBestCTA(context: CTAContext): CTA {
  const ctas = generateCTAVariations(context);
  return ctas[0]; // Highest scoring CTA
}
