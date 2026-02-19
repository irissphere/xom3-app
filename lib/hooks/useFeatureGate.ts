"use client";

import { useEffect, useState, useCallback } from "react";
import { 
  SubscriptionTier, 
  FeatureKey, 
  FeatureAccess, 
  UsageRecord 
} from "@/lib/tiers/types";
import { 
  hasFeature, 
  getFeatureLimit, 
  getMinimumTierForFeature,
  getSuggestedUpgrade 
} from "@/lib/tiers/features";
import { Role } from "@/lib/auth/roles";

interface UseFeatureGateOptions {
  userId?: string;
  tier?: SubscriptionTier;
}

interface UseFeatureGateReturn {
  tier: SubscriptionTier;
  role: Role | null;
  loading: boolean;
  checkFeature: (feature: FeatureKey) => FeatureAccess;
  canUse: (feature: FeatureKey) => boolean;
  getLimit: (feature: FeatureKey) => number | "unlimited";
  usage: UsageRecord | null;
  suggestedUpgrade: SubscriptionTier | null;
  refresh: () => Promise<void>;
}

/**
 * Hook to check feature access based on subscription tier
 */
export function useFeatureGate(options: UseFeatureGateOptions = {}): UseFeatureGateReturn {
  const [tier, setTier] = useState<SubscriptionTier>(options.tier || "free");
  const [role, setRole] = useState<Role | null>(null);
  const [usage, setUsage] = useState<UsageRecord | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSubscription = useCallback(async () => {
    if (options.tier) {
      setTier(options.tier);
      setLoading(false);
      return;
    }

    try {
      // Fast path: Check user email directly for admin/enterprise access
      // This avoids waiting for the API and fixes the "Free Tier" flash
      const { data: { user } } = await import("@/lib/supabase/client").then(m => m.supabase.auth.getUser());
      
      const email = user?.email || "";
      const isPreston = email === "preston.chenault@xom3.io" || 
                        email === "prestonjchenault@outlook.com" || 
                        email === "preston.chenault@pulseverabenefits.com" ||
                        email.endsWith("@xom3.io");

      if (isPreston) {
        setTier("enterprise");
        setRole("admin");
        setUsage(null);
        setLoading(false);
        // We can still fetch in background to sync usage if needed, but UI is unblocked
        return;
      }

      const res = await fetch("/api/subscription/status", {
        headers: { "Content-Type": "application/json" },
      });
      
      if (res.ok) {
        const data = await res.json();
        setTier(data.effectiveTier || "free");
        setRole(data.role || null);
        setUsage(data.usage || null);
      }
    } catch (err) {
      console.error("Failed to fetch subscription:", err);
    } finally {
      setLoading(false);
    }
  }, [options.tier]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const checkFeature = useCallback((feature: FeatureKey): FeatureAccess => {
    // Admins bypass all tier limits
    const isAdmin = role === "admin";
    
    if (isAdmin) {
      return {
        allowed: true,
        limit: "unlimited",
        used: 0,
        remaining: "unlimited",
        upgradeRequired: undefined,
      };
    }

    const allowed = hasFeature(tier, feature);
    const rawLimit = getFeatureLimit(tier, feature);
    const limit: number | "unlimited" =
      rawLimit === "unlimited"
        ? "unlimited"
        : typeof rawLimit === "number"
          ? rawLimit
          : rawLimit === true
            ? "unlimited"
            : 0;
    
    // Get usage for this feature
    let used = 0;
    if (usage) {
      switch (feature) {
        case "leads":
          used = usage.leads;
          break;
        case "sms":
          used = usage.sms;
          break;
        case "voice":
          used = usage.voiceCalls;
          break;
        case "social":
          used = usage.socialPosts;
          break;
        case "appointments":
          used = usage.appointments;
          break;
        case "workflows":
          used = usage.workflowRuns;
          break;
      }
    }

    // Calculate remaining
    let remaining: number | "unlimited" = "unlimited";
    if (typeof limit === "number") {
      remaining = Math.max(0, limit - used);
    }

    // Check if upgrade is needed
    const upgradeRequired = !allowed ? getMinimumTierForFeature(feature) : undefined;

    return {
      allowed: allowed && (remaining === "unlimited" || remaining > 0),
      limit,
      used,
      remaining,
      upgradeRequired,
    };
  }, [tier, role, usage]);

  const canUse = useCallback((feature: FeatureKey): boolean => {
    return checkFeature(feature).allowed;
  }, [checkFeature]);

  const getLimit = useCallback((feature: FeatureKey): number | "unlimited" => {
    // Admins get unlimited for all features
    if (role === "admin") return "unlimited";
    
    const rawLimit = getFeatureLimit(tier, feature);
    if (rawLimit === "unlimited") return "unlimited";
    if (typeof rawLimit === "number") return rawLimit;
    return rawLimit === true ? "unlimited" : 0;
  }, [tier, role]);

  const suggestedUpgrade = getSuggestedUpgrade(tier);

  return {
    tier,
    role,
    loading,
    checkFeature,
    canUse,
    getLimit,
    usage,
    suggestedUpgrade,
    refresh: fetchSubscription,
  };
}

/**
 * Simple hook to check if a specific feature is allowed
 */
export function useCanUseFeature(feature: FeatureKey, tier?: SubscriptionTier): boolean {
  const { canUse, loading } = useFeatureGate({ tier });
  
  if (loading) return false;
  return canUse(feature);
}
