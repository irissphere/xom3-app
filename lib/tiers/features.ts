// Tier Feature Matrix
// Defines what each tier includes

import { TierConfig, SubscriptionTier, TierLimits, FeatureKey } from "./types";

/**
 * Tier Configuration Registry
 * Source of truth for all subscription tiers
 */
export const TIER_CONFIGS: Record<SubscriptionTier, TierConfig> = {
  free: {
    id: "free",
    name: "Free",
    description: "Basic dashboard access to view signals",
    price: 0,
    priceLabel: "Free forever",
    limits: {
      creditsPerMonth: 100,
      leadsPerMonth: 10,
      smsPerMonth: 0,
      voiceCalls: false,
      socialPostsPerMonth: 0,
      appointments: false,
      workflows: 0,
      ecommerce: "none",
    },
    features: [
      "Dashboard access",
      "Basic analytics",
      "Email support",
      "$1 credit monthly",
    ],
    cta: "Get Started",
    ctaVariant: "outline",
  },

  trial: {
    id: "trial",
    name: "$15 Trial",
    description: "Test the cockpit with a $15 credit",
    price: 0,
    priceLabel: "Free trial",
    limits: {
      creditsPerMonth: 1500,
      leadsPerMonth: "unlimited",
      smsPerMonth: 100,
      voiceCalls: true,
      socialPostsPerMonth: "unlimited",
      appointments: true,
      workflows: "unlimited",
      ecommerce: "full",
    },
    features: [
      "$15 credit included",
      "Full automation suite",
      "No credit card required",
      "Voice & SMS enabled",
    ],
    cta: "Start Free Trial",
    ctaVariant: "primary",
  },

  starter: {
    id: "starter",
    name: "Starter",
    description: "For solo operators getting started with automation",
    price: 49,
    priceLabel: "$49/month",
    stripePriceId: process.env.STRIPE_PRICE_XOM3_STARTER,
    limits: {
      creditsPerMonth: 5000,
      leadsPerMonth: 500,
      smsPerMonth: 500,
      voiceCalls: false,
      socialPostsPerMonth: 20,
      appointments: false,
      workflows: 5,
      ecommerce: "none",
    },
    features: [
      "$50 credit monthly",
      "500 leads & SMS",
      "20 social posts",
      "5 automation workflows",
      "CRM integration",
      "Email support",
    ],
    cta: "Choose Starter",
    ctaVariant: "outline",
  },

  growth: {
    id: "growth",
    name: "Growth",
    description: "Bridging the gap for active teams",
    price: 99,
    priceLabel: "$99/month",
    stripePriceId: process.env.STRIPE_PRICE_XOM3_GROWTH,
    limits: {
      creditsPerMonth: 10000,
      leadsPerMonth: 1000,
      smsPerMonth: 1000,
      voiceCalls: true,
      socialPostsPerMonth: 100,
      appointments: true,
      workflows: 20,
      ecommerce: "basic",
    },
    features: [
      "$100 credit monthly",
      "1,000 leads & SMS",
      "100 social posts",
      "Appointment scheduling",
      "20 automation workflows",
      "Basic ecommerce",
    ],
    cta: "Upgrade to Growth",
    ctaVariant: "outline",
  },

  pro: {
    id: "pro",
    name: "Pro",
    description: "Full automation power for serious operators",
    price: 149,
    priceLabel: "$149/month",
    stripePriceId: process.env.STRIPE_PRICE_XOM3_PRO,
    popular: true,
    limits: {
      creditsPerMonth: 20000,
      leadsPerMonth: "unlimited",
      smsPerMonth: "unlimited",
      voiceCalls: true,
      socialPostsPerMonth: "unlimited",
      appointments: true,
      workflows: "unlimited",
      ecommerce: "basic",
    },
    features: [
      "$200 credit monthly",
      "Unlimited leads & SMS",
      "Voice call automation",
      "Unlimited social posts",
      "Unlimited workflows",
      "Priority support",
    ],
    cta: "Go Pro",
    ctaVariant: "primary",
  },

  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    description: "Custom solutions for agencies and large teams",
    price: "custom",
    priceLabel: "Contact us",
    limits: {
      creditsPerMonth: "unlimited",
      leadsPerMonth: "unlimited",
      smsPerMonth: "unlimited",
      voiceCalls: true,
      socialPostsPerMonth: "unlimited",
      appointments: true,
      workflows: "unlimited",
      ecommerce: "full",
    },
    features: [
      "Unlimited credits",
      "Multi-location support",
      "Custom integrations",
      "Advanced AI agents",
      "White-label options",
      "Dedicated account manager",
    ],
    cta: "Contact Sales",
    ctaVariant: "secondary",
  },

  promoter: {
    id: "promoter",
    name: "Promoter",
    description: "Free access for active referral partners",
    price: 0,
    priceLabel: "Performance-based",
    limits: {
      creditsPerMonth: 10000,       // $100 worth of credits
      leadsPerMonth: "unlimited",
      smsPerMonth: 500,
      voiceCalls: true,
      socialPostsPerMonth: "unlimited",
      appointments: true,
      workflows: 10,
      ecommerce: "basic",
    },
    features: [
      "Full Pro-level access",
      "$100 monthly credits",
      "10% referral commission",
      "30-day grace period",
      "Must refer 1+ client/month",
      "Converts to paid if inactive",
    ],
    cta: "Apply as Promoter",
    ctaVariant: "secondary",
  },
};

/**
 * Get tier configuration by ID
 */
export function getTierConfig(tier: SubscriptionTier): TierConfig {
  return TIER_CONFIGS[tier];
}

/**
 * Get all tiers in display order
 */
export function getTiersInOrder(): TierConfig[] {
  return [
    TIER_CONFIGS.free,
    TIER_CONFIGS.starter,
    TIER_CONFIGS.growth,
    TIER_CONFIGS.pro,
    TIER_CONFIGS.enterprise,
  ];
}

/**
 * Get tiers for pricing page (excludes trial - trial is a state, not a tier to purchase)
 */
export function getPricingTiers(): TierConfig[] {
  return getTiersInOrder();
}

/**
 * Check if a feature is available for a tier
 */
export function hasFeature(tier: SubscriptionTier, feature: FeatureKey): boolean {
  const config = TIER_CONFIGS[tier];
  const limits = config.limits;

  switch (feature) {
    case "dashboard":
      return true;
    case "leads":
      return limits.leadsPerMonth !== 0;
    case "sms":
      return limits.smsPerMonth !== 0;
    case "voice":
      return limits.voiceCalls;
    case "social":
      return limits.socialPostsPerMonth !== 0;
    case "appointments":
      return limits.appointments;
    case "workflows":
      return limits.workflows !== 0;
    case "ecommerce":
      return limits.ecommerce !== "none";
    default:
      return false;
  }
}

/**
 * Get the limit for a specific feature
 */
export function getFeatureLimit(
  tier: SubscriptionTier,
  feature: FeatureKey
): number | "unlimited" | boolean {
  const limits = TIER_CONFIGS[tier].limits;

  switch (feature) {
    case "leads":
      return limits.leadsPerMonth;
    case "sms":
      return limits.smsPerMonth;
    case "voice":
      return limits.voiceCalls;
    case "social":
      return limits.socialPostsPerMonth;
    case "appointments":
      return limits.appointments;
    case "workflows":
      return limits.workflows;
    case "ecommerce":
      return limits.ecommerce !== "none";
    default:
      return false;
  }
}

/**
 * Get minimum tier required for a feature
 */
export function getMinimumTierForFeature(feature: FeatureKey): SubscriptionTier {
  const tiers: SubscriptionTier[] = ["free", "starter", "growth", "pro", "enterprise"];
  
  for (const tier of tiers) {
    if (hasFeature(tier, feature)) {
      return tier;
    }
  }
  
  return "enterprise";
}

/**
 * Compare two tiers, returns positive if a > b
 */
export function compareTiers(a: SubscriptionTier, b: SubscriptionTier): number {
  // Promoter is roughly equivalent to Growth tier in terms of access
  const order: SubscriptionTier[] = ["free", "trial", "starter", "promoter", "growth", "pro", "enterprise"];
  return order.indexOf(a) - order.indexOf(b);
}

/**
 * Check if user can upgrade to a tier
 */
export function canUpgradeTo(
  currentTier: SubscriptionTier,
  targetTier: SubscriptionTier
): boolean {
  return compareTiers(targetTier, currentTier) > 0;
}

/**
 * Get suggested upgrade tier
 */
export function getSuggestedUpgrade(currentTier: SubscriptionTier): SubscriptionTier | null {
  const upgrades: Record<SubscriptionTier, SubscriptionTier | null> = {
    free: "starter",
    trial: "growth",
    starter: "growth",
    promoter: "pro",  // Promoters can upgrade to Pro for more features
    growth: "pro",
    pro: "enterprise",
    enterprise: null,
  };
  
  return upgrades[currentTier];
}
