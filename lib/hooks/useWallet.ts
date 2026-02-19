"use client";

import { useEffect, useState, useCallback } from "react";

export interface WalletState {
  balance: number;
  balanceFormatted: string;
  trialCredits: number;
  trialActive: boolean;
  trialDaysRemaining: number;
  autoReloadEnabled: boolean;
  totalDeposited: number;
  totalSpent: number;
  lowBalance: boolean;
  criticalBalance: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: WalletState = {
  balance: 0,
  balanceFormatted: "$0.00",
  trialCredits: 0,
  trialActive: false,
  trialDaysRemaining: 0,
  autoReloadEnabled: false,
  totalDeposited: 0,
  totalSpent: 0,
  lowBalance: false,
  criticalBalance: false,
  loading: true,
  error: null,
};

/**
 * Hook to access and manage user's credit wallet
 */
export function useWallet() {
  const [state, setState] = useState<WalletState>(initialState);

  const fetchBalance = useCallback(async () => {
    try {
      const res = await fetch("/api/credits/balance", {
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 401) {
          setState(prev => ({ ...prev, loading: false, error: null }));
          return;
        }
        throw new Error("Failed to fetch balance");
      }

      const data = await res.json();

      if (data.ok) {
        setState({
          balance: data.balance,
          balanceFormatted: data.balanceFormatted,
          trialCredits: data.trialCredits,
          trialActive: data.trialActive,
          trialDaysRemaining: data.trialDaysRemaining,
          autoReloadEnabled: data.autoReloadEnabled,
          totalDeposited: data.totalDeposited,
          totalSpent: data.totalSpent,
          lowBalance: data.lowBalance,
          criticalBalance: data.criticalBalance,
          loading: false,
          error: null,
        });
      } else {
        setState(prev => ({ ...prev, loading: false, error: data.error }));
      }
    } catch (err: any) {
      console.error("[useWallet] Error:", err);
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: err?.message || "Failed to load balance" 
      }));
    }
  }, []);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  /**
   * Purchase credits via Stripe
   */
  const purchaseCredits = useCallback(async (params: {
    packageId?: string;
    amountCents?: number;
  }) => {
    try {
      const res = await fetch("/api/stripe/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          package_id: params.packageId,
          amount_cents: params.amountCents,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      // Redirect to Stripe checkout
      if (data.url) {
        window.location.href = data.url;
      }

      return data;
    } catch (err: any) {
      console.error("[useWallet] Purchase error:", err);
      throw err;
    }
  }, []);

  /**
   * Refresh balance (call after actions that consume credits)
   */
  const refresh = useCallback(() => {
    fetchBalance();
  }, [fetchBalance]);

  return {
    ...state,
    purchaseCredits,
    refresh,
  };
}

/**
 * Format cents as currency
 */
export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Credit packages available for purchase
 */
export const CREDIT_PACKAGES = [
  { id: "pack_5", amount_cents: 500, label: "$5", popular: false },
  { id: "pack_10", amount_cents: 1000, label: "$10", popular: false },
  { id: "pack_25", amount_cents: 2500, label: "$25", popular: true },
  { id: "pack_50", amount_cents: 5000, label: "$50", popular: false },
  { id: "pack_100", amount_cents: 10000, label: "$100", popular: false },
] as const;
