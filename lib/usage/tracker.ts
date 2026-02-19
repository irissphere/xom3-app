// Usage Tracking System
// Tracks feature usage per user per billing period

import { loadJson, saveJson } from "@/lib/system/persistence";
import { UsageRecord, FeatureKey, SubscriptionTier } from "@/lib/tiers/types";
import { getFeatureLimit } from "@/lib/tiers/features";

/**
 * Get current billing period (YYYY-MM format)
 */
export function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Generate storage key for usage record
 */
function usageKeyFor(userId: string, period: string) {
  return `usage:${userId}:${period}`;
}

function usageFileNameFor(userId: string, period: string) {
  const safe = userId.replace(/[^a-zA-Z0-9:_-]/g, "").slice(0, 128) || "unknown";
  return `usage__${safe}__${period}.json`;
}

/**
 * Load usage record for a user
 */
export async function loadUsageRecord(
  userId: string,
  period?: string
): Promise<UsageRecord> {
  const currentPeriod = period || getCurrentPeriod();
  
  const record = await loadJson<UsageRecord | null>({
    key: usageKeyFor(userId, currentPeriod),
    fileName: usageFileNameFor(userId, currentPeriod),
    fallback: null,
  });

  if (record) {
    return record;
  }

  // Return empty record for new period
  return {
    userId,
    period: currentPeriod,
    leads: 0,
    sms: 0,
    voiceCalls: 0,
    socialPosts: 0,
    appointments: 0,
    workflowRuns: 0,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Save usage record
 */
export async function saveUsageRecord(record: UsageRecord): Promise<void> {
  await saveJson({
    key: usageKeyFor(record.userId, record.period),
    fileName: usageFileNameFor(record.userId, record.period),
    value: {
      ...record,
      updatedAt: new Date().toISOString(),
    },
  });
}

/**
 * Increment usage for a specific feature
 */
export async function incrementUsage(
  userId: string,
  feature: FeatureKey,
  amount: number = 1
): Promise<UsageRecord> {
  const record = await loadUsageRecord(userId);

  switch (feature) {
    case "leads":
      record.leads += amount;
      break;
    case "sms":
      record.sms += amount;
      break;
    case "voice":
      record.voiceCalls += amount;
      break;
    case "social":
      record.socialPosts += amount;
      break;
    case "appointments":
      record.appointments += amount;
      break;
    case "workflows":
      record.workflowRuns += amount;
      break;
  }

  await saveUsageRecord(record);
  return record;
}

/**
 * Check if user can use a feature based on their tier limits
 */
export async function canUseFeature(
  userId: string,
  tier: SubscriptionTier,
  feature: FeatureKey
): Promise<{
  allowed: boolean;
  used: number;
  limit: number | "unlimited";
  remaining: number | "unlimited";
}> {
  const record = await loadUsageRecord(userId);
  const limit = getFeatureLimit(tier, feature);

  // Boolean features (voice, appointments)
  if (typeof limit === "boolean") {
    return {
      allowed: limit,
      used: 0,
      limit: limit ? "unlimited" : 0,
      remaining: limit ? "unlimited" : 0,
    };
  }

  // Unlimited features
  if (limit === "unlimited") {
    return {
      allowed: true,
      used: getUsageForFeature(record, feature),
      limit: "unlimited",
      remaining: "unlimited",
    };
  }

  // Numeric limits
  const used = getUsageForFeature(record, feature);
  const remaining = Math.max(0, limit - used);

  return {
    allowed: remaining > 0,
    used,
    limit,
    remaining,
  };
}

/**
 * Get usage count for a specific feature
 */
function getUsageForFeature(record: UsageRecord, feature: FeatureKey): number {
  switch (feature) {
    case "leads":
      return record.leads;
    case "sms":
      return record.sms;
    case "voice":
      return record.voiceCalls;
    case "social":
      return record.socialPosts;
    case "appointments":
      return record.appointments;
    case "workflows":
      return record.workflowRuns;
    default:
      return 0;
  }
}

/**
 * Get usage summary for display
 */
export async function getUsageSummary(
  userId: string,
  tier: SubscriptionTier
): Promise<{
  leads: { used: number; limit: number | "unlimited"; percent: number };
  sms: { used: number; limit: number | "unlimited"; percent: number };
  social: { used: number; limit: number | "unlimited"; percent: number };
  workflows: { used: number; limit: number | "unlimited"; percent: number };
}> {
  const record = await loadUsageRecord(userId);

  const getPercent = (used: number, limit: number | "unlimited" | boolean): number => {
    if (limit === "unlimited" || typeof limit === "boolean") return 0;
    if (limit === 0) return 100;
    return Math.min(100, Math.round((used / limit) * 100));
  };

  const leadsLimit = getFeatureLimit(tier, "leads");
  const smsLimit = getFeatureLimit(tier, "sms");
  const socialLimit = getFeatureLimit(tier, "social");
  const workflowsLimit = getFeatureLimit(tier, "workflows");

  return {
    leads: {
      used: record.leads,
      limit: typeof leadsLimit === "boolean" ? (leadsLimit ? "unlimited" : 0) : leadsLimit,
      percent: getPercent(record.leads, leadsLimit),
    },
    sms: {
      used: record.sms,
      limit: typeof smsLimit === "boolean" ? (smsLimit ? "unlimited" : 0) : smsLimit,
      percent: getPercent(record.sms, smsLimit),
    },
    social: {
      used: record.socialPosts,
      limit: typeof socialLimit === "boolean" ? (socialLimit ? "unlimited" : 0) : socialLimit,
      percent: getPercent(record.socialPosts, socialLimit),
    },
    workflows: {
      used: record.workflowRuns,
      limit: typeof workflowsLimit === "boolean" ? (workflowsLimit ? "unlimited" : 0) : workflowsLimit,
      percent: getPercent(record.workflowRuns, workflowsLimit),
    },
  };
}

/**
 * Reset usage for a new billing period (call from webhook or cron)
 */
export async function resetUsageForNewPeriod(userId: string): Promise<UsageRecord> {
  const newRecord: UsageRecord = {
    userId,
    period: getCurrentPeriod(),
    leads: 0,
    sms: 0,
    voiceCalls: 0,
    socialPosts: 0,
    appointments: 0,
    workflowRuns: 0,
    updatedAt: new Date().toISOString(),
  };

  await saveUsageRecord(newRecord);
  return newRecord;
}
