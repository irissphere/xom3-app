"use client";

import { useState, useEffect, useCallback } from "react";

export interface Notification {
  id: string;
  severity: "high" | "medium" | "low";
  message: string;
  timestamp: string;
  ruleId?: string;
  ruleName?: string;
  healthScore?: number;
  link?: string;
}

interface UseNotificationsReturn {
  notifications: Notification[];
  unacknowledged: Notification[];
  hasHighSeverity: boolean;
  acknowledge: (id: string) => void;
  acknowledgeAll: () => void;
  refresh: () => Promise<void>;
  loading: boolean;
  error: string | null;
  healthScore: { score: number; status: string } | null;
}

const STORAGE_KEY = "xom3_acknowledged_notifications";
const POLL_INTERVAL = 120000; // 2 minutes

export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [acknowledgedIds, setAcknowledgedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [healthScore, setHealthScore] = useState<{ score: number; status: string } | null>(null);

  // Load acknowledged IDs from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const ids = JSON.parse(stored) as string[];
        setAcknowledgedIds(new Set(ids));
      }
    } catch (err) {
      console.warn("Failed to load acknowledged notifications:", err);
    }
  }, []);

  // Save acknowledged IDs to localStorage
  const saveAcknowledgedIds = useCallback((ids: Set<string>) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(ids)));
    } catch (err) {
      console.warn("Failed to save acknowledged notifications:", err);
    }
  }, []);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/usha/workflows/notifications");
      const data = await res.json();

      if (!res.ok || data.status === "error") {
        throw new Error(data.message || "Failed to fetch notifications");
      }

      setNotifications(data.notifications || []);
      setHealthScore(data.healthScore || null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notifications");
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Poll for updates
  useEffect(() => {
    const interval = setInterval(() => {
      fetchNotifications();
    }, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Acknowledge a single notification
  const acknowledge = useCallback((id: string) => {
    setAcknowledgedIds(prev => {
      const next = new Set(prev);
      next.add(id);
      saveAcknowledgedIds(next);
      return next;
    });
  }, [saveAcknowledgedIds]);

  // Acknowledge all notifications
  const acknowledgeAll = useCallback(() => {
    const allIds = new Set(notifications.map(n => n.id));
    setAcknowledgedIds(allIds);
    saveAcknowledgedIds(allIds);
  }, [notifications, saveAcknowledgedIds]);

  // Filter unacknowledged notifications
  const unacknowledged = notifications.filter(n => !acknowledgedIds.has(n.id));

  // Check for high severity
  const hasHighSeverity = unacknowledged.some(n => n.severity === "high");

  return {
    notifications,
    unacknowledged,
    hasHighSeverity,
    acknowledge,
    acknowledgeAll,
    refresh: fetchNotifications,
    loading,
    error,
    healthScore
  };
}
