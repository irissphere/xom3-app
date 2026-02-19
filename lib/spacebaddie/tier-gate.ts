// SpaceBaddie Tier Gate
// Maps SpaceBaddie features to xom3.io subscription tiers

import { SubscriptionTier } from '@/lib/tiers/types';

export type SpaceBaddieFeature = 
  | 'video_creation'
  | 'video_download'
  | 'watermark_free'
  | 'social_automation'
  | 'social_analytics'
  | 'insights_dashboard'
  | 'unlimited_videos'
  | 'api_access'
  | 'white_label';

// Feature availability by tier
const FEATURE_MATRIX: Record<SpaceBaddieFeature, SubscriptionTier[]> = {
  video_creation: ['free', 'trial', 'starter', 'growth', 'pro', 'enterprise', 'promoter'],
  video_download: ['free', 'trial', 'starter', 'growth', 'pro', 'enterprise', 'promoter'],
  watermark_free: ['starter', 'growth', 'pro', 'enterprise', 'promoter'],
  social_automation: ['growth', 'pro', 'enterprise', 'promoter'],
  social_analytics: ['growth', 'pro', 'enterprise', 'promoter'],
  insights_dashboard: ['pro', 'enterprise'],
  unlimited_videos: ['pro', 'enterprise'],
  api_access: ['enterprise'],
  white_label: ['enterprise'],
};

// Video limits by tier
const VIDEO_LIMITS: Record<SubscriptionTier, number> = {
  free: 4,
  trial: 20,
  starter: 20,
  growth: 50,
  pro: Infinity,
  enterprise: Infinity,
  promoter: 50,
};

/**
 * Check if a feature is available for a given tier
 */
export function canAccess(tier: SubscriptionTier, feature: SpaceBaddieFeature): boolean {
  const allowedTiers = FEATURE_MATRIX[feature];
  return allowedTiers?.includes(tier) ?? false;
}

/**
 * Get video limit for a tier
 */
export function getVideoLimit(tier: SubscriptionTier): number {
  return VIDEO_LIMITS[tier] ?? 4;
}

/**
 * Get the minimum tier required for a feature
 */
export function getRequiredTier(feature: SpaceBaddieFeature): SubscriptionTier {
  const allowedTiers = FEATURE_MATRIX[feature];
  if (!allowedTiers || allowedTiers.length === 0) return 'enterprise';
  
  // Return lowest tier that has access
  const tierOrder: SubscriptionTier[] = ['free', 'trial', 'starter', 'growth', 'pro', 'enterprise'];
  for (const tier of tierOrder) {
    if (allowedTiers.includes(tier)) return tier;
  }
  return 'enterprise';
}

/**
 * Get upgrade URL for SpaceBaddie users
 */
export function getUpgradeUrl(currentTier: SubscriptionTier, feature?: SpaceBaddieFeature): string {
  const baseUrl = 'https://xom3.io/pricing';
  const params = new URLSearchParams({
    from: 'spacebaddie',
    current: currentTier,
  });
  
  if (feature) {
    params.set('unlock', feature);
  }
  
  return `${baseUrl}?${params.toString()}`;
}

/**
 * Get features available at each tier for display
 */
export function getTierFeatures(tier: SubscriptionTier): SpaceBaddieFeature[] {
  return (Object.keys(FEATURE_MATRIX) as SpaceBaddieFeature[]).filter(
    feature => canAccess(tier, feature)
  );
}

/**
 * Map SpaceBaddie simple tier to xom3 tier
 */
export function mapSpaceBaddieTier(simpleTier: 'free' | 'pro' | 'enterprise'): SubscriptionTier {
  const mapping: Record<string, SubscriptionTier> = {
    free: 'free',
    pro: 'pro',
    enterprise: 'enterprise',
  };
  return mapping[simpleTier] || 'free';
}
