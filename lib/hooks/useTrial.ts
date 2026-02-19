"use client";

import { useEffect, useState, useCallback } from "react";
import { TrialStatus, SubscriptionTier } from "@/lib/tiers/types";

interface UseTrialReturn {
  trial: TrialStatus;
  loading: boolean;
  startTrial: () => Promise<boolean>;
  refresh: () => Promise<void>;
  effectiveTier: SubscriptionTier;
}

const DEFAULT_TRIAL: TrialStatus = {
  isActive: false,
  daysRemaining: 0,
  endsAt: null,
  expired: false,
};

/**
 * Hook to manage trial status
 */
export function useTrial(): UseTrialReturn {
  const [trial, setTrial] = useState<TrialStatus>(DEFAULT_TRIAL);
  const [effectiveTier, setEffectiveTier] = useState<SubscriptionTier>("free");
  const [loading, setLoading] = useState(true);

  const fetchTrialStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/subscription/status", {
        headers: { "Content-Type": "application/json" },
      });
      
      if (res.ok) {
        const data = await res.json();
        setTrial(data.trial || DEFAULT_TRIAL);
        setEffectiveTier(data.effectiveTier || "free");
      }
    } catch (err) {
      console.error("Failed to fetch trial status:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrialStatus();
  }, [fetchTrialStatus]);

  const startTrial = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch("/api/subscription/start-trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      
      if (res.ok) {
        await fetchTrialStatus();
        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to start trial:", err);
      return false;
    }
  }, [fetchTrialStatus]);

  return {
    trial,
    loading,
    startTrial,
    refresh: fetchTrialStatus,
    effectiveTier,
  };
}

/**
 * Format trial days remaining for display
 */
export function formatTrialDays(days: number): string {
  if (days === 0) return "Trial expired";
  if (days === 1) return "1 day left";
  return `${days} days left`;
}

/**
 * Get urgency level for trial banner
 */
export function getTrialUrgency(days: number): "low" | "medium" | "high" | "expired" {
  if (days <= 0) return "expired";
  if (days <= 2) return "high";
  if (days <= 5) return "medium";
  return "low";
}
