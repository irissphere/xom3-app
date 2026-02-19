/**
 * SpaceBaddie Data Hook
 * Provides live data from SpaceBaddie APIs for dashboard, studio, and automation
 * AKV: SpaceBaddie Sovereign - Data Layer
 */

import { useState, useEffect, useCallback } from 'react';

// Types
export interface SpaceBaddieMetrics {
  postsMade: number;
  reach: number;
  leads: number;
  revenue: number;
  hasData: boolean;
  totalRenders: number;
  queuedPosts: number;
  connectedPlatforms: number;
  totalEngagement: number;
  successRate: number;
  postsThisWeek: number;
  postsThisMonth: number;
  reachThisWeek: number;
  platformStats: Record<string, {
    posts: number;
    reach: number;
    engagement: number;
  }>;
}

export interface AvatarProfile {
  profile_id?: string;
  display_name?: string;
  base_model: string;
  voice_provider: string;
  voice_id?: string;
  voice_language: string;
  voice_style: string;
  face_id?: string;
  default_scene_type: string;
  default_aspect_ratio: string;
  default_lens_type: string;
  default_lens_intensity: number;
  effect_brightness: number;
  effect_contrast: number;
  effect_saturation: number;
  effect_hue: number;
  effect_blur: number;
  effect_vignette: number;
  customizations?: any[];
}

export interface RenderHistoryItem {
  job_id: string;
  job_type: string;
  status: string;
  output_url?: string;
  thumbnail_url?: string;
  created_at: string;
}

export interface PlatformConnection {
  platform: string;
  status: 'connected' | 'disconnected' | 'expired' | 'error';
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  dailyLimit: number;
  postsToday: number;
  lastPostAt?: string;
  connectedAt?: string;
  errorMessage?: string;
}

export interface QueueItem {
  postId: string;
  contentType: 'video' | 'image' | 'text';
  contentText?: string;
  contentUrl?: string;
  contentThumbnailUrl?: string;
  platforms: string[];
  scheduledTime?: string;
  status: 'queued' | 'posting' | 'posted' | 'failed' | 'cancelled';
  createdAt: string;
}

export interface DeviceStatus {
  deviceId: string;
  isLocked: boolean;
  freeGenerationsUsed: number;
  freeGenerationsRemaining: number;
  freePostsUsed: number;
  freePostsRemaining: number;
  canGenerate: boolean;
  canPost: boolean;
}

// Default metrics when not loaded
const DEFAULT_METRICS: SpaceBaddieMetrics = {
  postsMade: 0,
  reach: 0,
  leads: 0,
  revenue: 0,
  hasData: false,
  totalRenders: 0,
  queuedPosts: 0,
  connectedPlatforms: 0,
  totalEngagement: 0,
  successRate: 100,
  postsThisWeek: 0,
  postsThisMonth: 0,
  reachThisWeek: 0,
  platformStats: {},
};

/**
 * Hook to fetch and manage SpaceBaddie metrics
 */
export function useSpaceBaddieMetrics() {
  const [metrics, setMetrics] = useState<SpaceBaddieMetrics>(DEFAULT_METRICS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/spacebaddie/metrics');
      const data = await res.json();
      
      if (data.ok && data.metrics) {
        setMetrics(data.metrics);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch metrics');
      }
    } catch (err) {
      setError('Network error fetching metrics');
      console.error('[useSpaceBaddieMetrics] Error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return { metrics, loading, error, refetch: fetchMetrics };
}

/**
 * Hook to fetch and manage avatar profile
 */
export function useAvatarProfile() {
  const [profile, setProfile] = useState<AvatarProfile | null>(null);
  const [recentRenders, setRecentRenders] = useState<RenderHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/spacebaddie/profile');
      const data = await res.json();
      
      if (data.ok) {
        setProfile(data.profile || data.defaults);
        setRecentRenders(data.recentRenders || []);
        setError(null);
      } else if (data.code === 'AUTH_REQUIRED') {
        setProfile(data.defaults || null);
      } else {
        setError(data.error || 'Failed to fetch profile');
      }
    } catch (err) {
      setError('Network error fetching profile');
      console.error('[useAvatarProfile] Error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveProfile = useCallback(async (updates: Partial<AvatarProfile>) => {
    try {
      const res = await fetch('/api/spacebaddie/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      
      if (data.ok && data.profile) {
        setProfile(data.profile);
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (err) {
      return { success: false, error: 'Network error saving profile' };
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return { profile, recentRenders, loading, error, refetch: fetchProfile, saveProfile };
}

/**
 * Hook to fetch and manage social platform connections
 */
export function useSocialConnections() {
  const [platforms, setPlatforms] = useState<PlatformConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConnections = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/spacebaddie/automation/connect');
      const data = await res.json();
      
      if (data.ok && data.platforms) {
        setPlatforms(data.platforms);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch connections');
      }
    } catch (err) {
      setError('Network error fetching connections');
      console.error('[useSocialConnections] Error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const connectPlatform = useCallback(async (platform: string, data?: any) => {
    try {
      const res = await fetch('/api/spacebaddie/automation/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, action: 'connect', ...data }),
      });
      const result = await res.json();
      
      if (result.ok) {
        await fetchConnections(); // Refresh list
        return { success: true };
      }
      return { success: false, error: result.error };
    } catch (err) {
      return { success: false, error: 'Network error' };
    }
  }, [fetchConnections]);

  const disconnectPlatform = useCallback(async (platform: string) => {
    try {
      const res = await fetch('/api/spacebaddie/automation/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, action: 'disconnect' }),
      });
      const result = await res.json();
      
      if (result.ok) {
        await fetchConnections();
        return { success: true };
      }
      return { success: false, error: result.error };
    } catch (err) {
      return { success: false, error: 'Network error' };
    }
  }, [fetchConnections]);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  return { 
    platforms, 
    loading, 
    error, 
    refetch: fetchConnections, 
    connectPlatform, 
    disconnectPlatform 
  };
}

/**
 * Hook to fetch and manage posting queue
 */
export function usePostingQueue() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [summary, setSummary] = useState({ queued: 0, posting: 0, posted: 0, failed: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQueue = useCallback(async (status = 'all') => {
    try {
      setLoading(true);
      const res = await fetch(`/api/spacebaddie/automation/queue?status=${status}`);
      const data = await res.json();
      
      if (data.ok) {
        setQueue(data.queue || []);
        setSummary(data.summary || { queued: 0, posting: 0, posted: 0, failed: 0 });
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch queue');
      }
    } catch (err) {
      setError('Network error fetching queue');
      console.error('[usePostingQueue] Error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const addToQueue = useCallback(async (item: Omit<QueueItem, 'postId' | 'status' | 'createdAt'>) => {
    try {
      const res = await fetch('/api/spacebaddie/automation/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
      const data = await res.json();
      
      if (data.ok) {
        await fetchQueue();
        return { success: true, item: data.item };
      }
      return { success: false, error: data.error };
    } catch (err) {
      return { success: false, error: 'Network error' };
    }
  }, [fetchQueue]);

  const updateQueueItem = useCallback(async (postId: string, action: string, data?: any) => {
    try {
      const res = await fetch('/api/spacebaddie/automation/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, action, ...data }),
      });
      const result = await res.json();
      
      if (result.ok) {
        await fetchQueue();
        return { success: true };
      }
      return { success: false, error: result.error };
    } catch (err) {
      return { success: false, error: 'Network error' };
    }
  }, [fetchQueue]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  return { queue, summary, loading, error, refetch: fetchQueue, addToQueue, updateQueueItem };
}

/**
 * Hook to track device for free-tier enforcement
 */
export function useDeviceTracking() {
  const [status, setStatus] = useState<DeviceStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const checkDevice = useCallback(async () => {
    try {
      setLoading(true);
      
      // Generate a simple fingerprint (in production, use a proper library like FingerprintJS)
      const fingerprint = await generateFingerprint();
      
      const res = await fetch('/api/spacebaddie/device', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          fingerprint,
          userAgent: navigator.userAgent,
          action: 'check'
        }),
      });
      const data = await res.json();
      
      if (data.ok && data.status) {
        setStatus(data.status);
      }
    } catch (err) {
      console.error('[useDeviceTracking] Error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const useGeneration = useCallback(async () => {
    const fingerprint = await generateFingerprint();
    const res = await fetch('/api/spacebaddie/device', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fingerprint, action: 'use_generation' }),
    });
    const data = await res.json();
    if (data.ok) setStatus(data.status);
    return data.ok && data.status?.canGenerate;
  }, []);

  const usePost = useCallback(async () => {
    const fingerprint = await generateFingerprint();
    const res = await fetch('/api/spacebaddie/device', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fingerprint, action: 'use_post' }),
    });
    const data = await res.json();
    if (data.ok) setStatus(data.status);
    return data.ok && data.status?.canPost;
  }, []);

  useEffect(() => {
    checkDevice();
  }, [checkDevice]);

  return { status, loading, checkDevice, useGeneration, usePost };
}

/**
 * Generate a simple device fingerprint
 * In production, use FingerprintJS or similar for better accuracy
 */
async function generateFingerprint(): Promise<string> {
  if (typeof window === 'undefined') return 'server';
  
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 'unknown',
    // Add more entropy in production
  ];
  
  const data = components.join('|');
  
  // Simple hash (use crypto.subtle in production)
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return 'fp_' + Math.abs(hash).toString(36);
}
