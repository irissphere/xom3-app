import { loadJson, saveJson } from "@/lib/system/persistence";
import { SubscriptionTier, UserSubscription, TrialStatus } from "@/lib/tiers/types";

export type StoredSubscriptionRecord = UserSubscription;

// Trial duration in days
const TRIAL_DURATION_DAYS = 30;

function keyFor(tier: SubscriptionTier, userId: string) {
  return `stripe_sub_${tier}:${userId}`;
}

function userKeyFor(userId: string) {
  return `user_sub:${userId}`;
}

function fileNameFor(tier: SubscriptionTier, userId: string) {
  const safe = userId.replace(/[^a-zA-Z0-9:_-]/g, "").slice(0, 128) || "unknown";
  return `stripe_sub_${tier}__${safe}.json`;
}

function userFileNameFor(userId: string) {
  const safe = userId.replace(/[^a-zA-Z0-9:_-]/g, "").slice(0, 128) || "unknown";
  return `user_sub__${safe}.json`;
}

function eventKeyFor(eventId: string) {
  return `stripe_event:${eventId}`;
}

function eventFileNameFor(eventId: string) {
  const safe = eventId.replace(/[^a-zA-Z0-9:_-]/g, "").slice(0, 128) || "unknown";
  return `stripe_event__${safe}.json`;
}

/**
 * Load subscription record for a user
 */
export async function loadSubscriptionRecord(opts: {
  userId: string;
}): Promise<StoredSubscriptionRecord | null> {
  const { userId } = opts;
  const record = await loadJson<StoredSubscriptionRecord | null>({
    key: userKeyFor(userId),
    fileName: userFileNameFor(userId),
    fallback: null,
  });
  if (!record) return null;
  return record;
}

/**
 * Load subscription by tier (legacy support)
 */
export async function loadSubscriptionByTier(opts: {
  tier: SubscriptionTier;
  userId: string;
}): Promise<StoredSubscriptionRecord | null> {
  const { tier, userId } = opts;
  const record = await loadJson<StoredSubscriptionRecord | null>({
    key: keyFor(tier, userId),
    fileName: fileNameFor(tier, userId),
    fallback: null,
  });
  if (!record) return null;
  return record;
}

/**
 * Save subscription record
 */
export async function saveSubscriptionRecord(record: StoredSubscriptionRecord): Promise<void> {
  const { userId, tier } = record;
  
  // Save to user-keyed location (primary)
  await saveJson({
    key: userKeyFor(userId),
    fileName: userFileNameFor(userId),
    value: record,
  });
  
  // Also save to tier-keyed location (legacy compatibility)
  await saveJson({
    key: keyFor(tier, userId),
    fileName: fileNameFor(tier, userId),
    value: record,
  });
}

/**
 * Start a trial for a user
 */
export async function startTrial(userId: string): Promise<StoredSubscriptionRecord> {
  const now = new Date();
  const trialEnds = new Date(now.getTime() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000);
  
  const record: StoredSubscriptionRecord = {
    tier: "trial",
    userId,
    subscribed: true,
    trialStartedAt: now.toISOString(),
    trialEndsAt: trialEnds.toISOString(),
    updatedAt: now.toISOString(),
    source: "manual",
  };
  
  await saveSubscriptionRecord(record);
  return record;
}

/**
 * Get trial status for a user
 */
export function getTrialStatus(record: StoredSubscriptionRecord | null): TrialStatus {
  if (!record || record.tier !== "trial" || !record.trialEndsAt) {
    return {
      isActive: false,
      daysRemaining: 0,
      endsAt: null,
      expired: false,
    };
  }
  
  const now = new Date();
  const endsAt = new Date(record.trialEndsAt);
  const msRemaining = endsAt.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(msRemaining / (24 * 60 * 60 * 1000)));
  const expired = msRemaining <= 0;
  
  return {
    isActive: !expired,
    daysRemaining,
    endsAt: record.trialEndsAt,
    expired,
  };
}

/**
 * Get effective tier (accounts for expired trials)
 */
export function getEffectiveTier(record: StoredSubscriptionRecord | null): SubscriptionTier {
  if (!record) return "free";
  
  if (record.tier === "trial") {
    const trialStatus = getTrialStatus(record);
    if (trialStatus.expired) {
      return "free";
    }
  }
  
  return record.tier;
}

/**
 * Check if a Stripe event was already processed
 */
export async function wasStripeEventProcessed(eventId: string): Promise<boolean> {
  if (!eventId) return false;
  const processed = await loadJson<boolean>({
    key: eventKeyFor(eventId),
    fileName: eventFileNameFor(eventId),
    fallback: false,
  });
  return Boolean(processed);
}

/**
 * Mark a Stripe event as processed
 */
export async function markStripeEventProcessed(eventId: string): Promise<void> {
  if (!eventId) return;
  await saveJson({
    key: eventKeyFor(eventId),
    fileName: eventFileNameFor(eventId),
    value: true,
  });
}

/**
 * Upgrade user to a new tier
 */
export async function upgradeTier(
  userId: string,
  newTier: SubscriptionTier,
  stripeData?: {
    customerId?: string;
    subscriptionId?: string;
  }
): Promise<StoredSubscriptionRecord> {
  const existing = await loadSubscriptionRecord({ userId });
  
  const record: StoredSubscriptionRecord = {
    tier: newTier,
    userId,
    subscribed: true,
    stripeCustomerId: stripeData?.customerId || existing?.stripeCustomerId,
    stripeSubscriptionId: stripeData?.subscriptionId || existing?.stripeSubscriptionId,
    trialStartedAt: existing?.trialStartedAt,
    trialEndsAt: existing?.trialEndsAt,
    updatedAt: new Date().toISOString(),
    source: stripeData ? "webhook" : "manual",
  };
  
  await saveSubscriptionRecord(record);
  return record;
}

/**
 * Cancel subscription (downgrade to free)
 */
export async function cancelSubscription(userId: string): Promise<StoredSubscriptionRecord> {
  const existing = await loadSubscriptionRecord({ userId });
  
  const record: StoredSubscriptionRecord = {
    tier: "free",
    userId,
    subscribed: false,
    stripeCustomerId: existing?.stripeCustomerId,
    stripeSubscriptionId: undefined,
    trialStartedAt: existing?.trialStartedAt,
    trialEndsAt: existing?.trialEndsAt,
    updatedAt: new Date().toISOString(),
    source: "manual",
  };
  
  await saveSubscriptionRecord(record);
  return record;
}
