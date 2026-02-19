"use client";

import { useEffect, useState, useCallback } from "react";

export interface Transaction {
  id: string;
  type: string;
  amount: number;
  amountFormatted: string;
  balanceAfter: number;
  balanceAfterFormatted: string;
  description: string;
  category: string | null;
  createdAt: string;
}

interface UseTransactionsState {
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
}

/**
 * Hook to fetch transaction history
 */
export function useTransactions(limit: number = 20) {
  const [state, setState] = useState<UseTransactionsState>({
    transactions: [],
    loading: true,
    error: null,
  });

  const fetchTransactions = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const res = await fetch(`/api/credits/transactions?limit=${limit}`, {
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 401) {
          setState({ transactions: [], loading: false, error: null });
          return;
        }
        throw new Error("Failed to fetch transactions");
      }

      const data = await res.json();

      if (data.ok) {
        setState({
          transactions: data.transactions,
          loading: false,
          error: null,
        });
      } else {
        setState(prev => ({ ...prev, loading: false, error: data.error }));
      }
    } catch (err: any) {
      console.error("[useTransactions] Error:", err);
      setState(prev => ({
        ...prev,
        loading: false,
        error: err?.message || "Failed to load transactions",
      }));
    }
  }, [limit]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return {
    ...state,
    refresh: fetchTransactions,
  };
}

/**
 * Format relative time for transaction display
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Get icon for transaction type
 */
export function getTransactionIcon(type: string, category: string | null): string {
  if (type === "deposit" || type === "auto_reload") return "💰";
  if (type === "refund") return "↩️";
  
  if (category) {
    if (category.startsWith("ai")) return "🤖";
    if (category === "sms") return "💬";
    if (category === "email") return "📧";
    if (category === "voice") return "📞";
    if (category.startsWith("social")) return "📱";
    if (category === "workflow") return "⚡";
    if (category === "lead_process") return "👤";
    if (category === "scrape") return "🌐";
  }
  
  return "📊";
}

/**
 * Get color for transaction amount
 */
export function getAmountColor(amount: number): string {
  if (amount > 0) return "#22c55e"; // Green for deposits
  if (amount < 0) return "#94a3b8"; // Gray for usage
  return "#e2e8f0";
}
