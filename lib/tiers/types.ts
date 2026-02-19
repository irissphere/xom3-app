// Tier System Types
// Multi-agent subscription tier definitions

export type SubscriptionTier = 
  | "free" 
  | "trial" 
  | "starter" 
  | "growth" 
  | "pro" 
  | "enterprise"
  | "promoter";  // Special tier for sales/referral partners

export type FeatureKey = 
  | "dashboard"
  | "leads"
  | "sms"
  | "voice"
  | "social"
  | "appointments"
  | "workflows"
  | "ecommerce";

export interface TierLimits {
  creditsPerMonth: number | "unlimited";
  leadsPerMonth: number | "unlimited";
  smsPerMonth: number | "unlimited";
  voiceCalls: boolean;
  socialPostsPerMonth: number | "unlimited";
  appointments: boolean;
  workflows: number | "unlimited";
  ecommerce: "none" | "basic" | "full";
}

export interface TierConfig {
  id: SubscriptionTier;
  name: string;
  description: string;
  price: number | "custom";
  priceLabel: string;
  stripePriceId?: string;
  popular?: boolean;
  limits: TierLimits;
  features: string[];
  cta: string;
  ctaVariant: "primary" | "secondary" | "outline";
}

export interface UserSubscription {
  tier: SubscriptionTier;
  userId: string;
  subscribed: boolean;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  status?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
  canceledAt?: string;
  createdAt?: string;
  trialStartedAt?: string;
  trialEndsAt?: string;
  updatedAt: string;
  source?: "webhook" | "stripe_check" | "manual";
}

export interface UsageRecord {
  userId: string;
  period: string; // YYYY-MM format
  leads: number;
  sms: number;
  voiceCalls: number;
  socialPosts: number;
  appointments: number;
  workflowRuns: number;
  updatedAt: string;
}

export interface FeatureAccess {
  allowed: boolean;
  limit: number | "unlimited";
  used: number;
  remaining: number | "unlimited";
  upgradeRequired?: SubscriptionTier;
}

export interface TrialStatus {
  isActive: boolean;
  daysRemaining: number;
  endsAt: string | null;
  expired: boolean;
}

// Promoter Tier Performance Requirements
export interface PromoterRequirements {
  // Minimum referrals required per period
  minReferralsPerMonth: number;
  // Grace period (days) before requirements kick in
  gracePeriodDays: number;
  // Review period (days) to meet requirements
  reviewPeriodDays: number;
  // What happens on failure: "downgrade" to free, "convert" to paid, "suspend"
  failureAction: "downgrade" | "convert" | "suspend";
}

export interface PromoterStatus {
  userId: string;
  tier: "promoter";
  // When they became a promoter
  startedAt: string;
  // Grace period end date
  gracePeriodEndsAt: string;
  // Current review period start
  currentPeriodStart: string;
  // Current review period end
  currentPeriodEnd: string;
  // Performance metrics
  referralsThisPeriod: number;
  totalReferrals: number;
  totalEarningsCents: number;
  // Status
  inGracePeriod: boolean;
  meetsRequirements: boolean;
  warningIssued: boolean;
  warningIssuedAt?: string;
  // If they failed and action was taken
  actionTaken?: "downgrade" | "convert" | "suspend";
  actionTakenAt?: string;
}

export const DEFAULT_PROMOTER_REQUIREMENTS: PromoterRequirements = {
  minReferralsPerMonth: 1,  // At least 1 referral per month
  gracePeriodDays: 30,       // 30 days to get started
  reviewPeriodDays: 30,      // Monthly review
  failureAction: "convert",  // Convert to paid if they fail
};
