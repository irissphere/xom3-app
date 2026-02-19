'use client';

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { ContentScheduler } from '@/app/spacebaddie/automation/ui/ContentScheduler';
import { PostingQueue } from '@/app/spacebaddie/automation/ui/PostingQueue';
import { ContentCalendar } from '@/app/spacebaddie/automation/ui/ContentCalendar';
import { AutomationState, ContentQueueItem, SocialPlatform } from '@/lib/spacebaddie/types';
import { useFeatureGate } from '@/lib/hooks/useFeatureGate';
import { getTierConfig } from '@/lib/tiers/features';
import { supabase } from '@/lib/supabase/client';
import DashboardShell from '../components/DashboardShell';

// Toast notification component
function Toast({ message, type, onClose }: { message: string; type: 'error' | 'success' | 'info'; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'error' ? 'bg-red-600' : type === 'success' ? 'bg-green-600' : 'bg-blue-600';
  const icon = type === 'error' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️';

  return (
    <div className={`fixed top-4 right-4 z-50 ${bgColor} text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 max-w-md animate-in slide-in-from-right duration-300`}>
      <span className="text-xl">{icon}</span>
      <p className="flex-1 text-sm font-medium">{message}</p>
      <button onClick={onClose} className="text-white/80 hover:text-white text-xl">&times;</button>
    </div>
  );
}

// Platform icon component
const PlatformIcon = ({ platform, size = 'sm' }: { platform: string; size?: 'sm' | 'md' }) => {
  const sizeClass = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  switch (platform) {
    case 'youtube':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={sizeClass}>
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
      );
    case 'tiktok':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={sizeClass}>
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
        </svg>
      );
    case 'instagram':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={sizeClass}>
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
        </svg>
      );
    case 'twitter':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={sizeClass}>
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      );
    case 'facebook':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={sizeClass}>
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      );
    case 'linkedin':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={sizeClass}>
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>
      );
    default:
      return <span className="text-xs">📱</span>;
  }
};

const platformColors: Record<string, string> = {
  youtube: 'bg-red-600',
  tiktok: 'bg-pink-500',
  instagram: 'bg-purple-500',
  twitter: 'bg-gray-800',
  facebook: 'bg-blue-600',
  linkedin: 'bg-blue-700',
};

type TabType = 'schedule' | 'queue' | 'calendar';

// Compact Platform Status Row
function PlatformStatusRow({ 
  platforms, 
  onConnect, 
  expanded, 
  onToggle,
  loading 
}: { 
  platforms: SocialPlatform[]; 
  onConnect: (name: string, connected: boolean) => void;
  expanded: boolean;
  onToggle: () => void;
  loading: boolean;
}) {
  const [connecting, setConnecting] = useState<string | null>(null);
  const connectedCount = platforms.filter(p => p.connected).length;

  const handleConnect = async (platformName: string) => {
    const platform = platforms.find(p => p.name === platformName);
    if (platform?.connected) {
      onConnect(platformName, false);
      return;
    }

    setConnecting(platformName);
    
    const oauthUrls: Record<string, string> = {
      youtube: '/api/social/connect/youtube',
      tiktok: '/api/social/connect/tiktok',
      instagram: '/api/social/connect/instagram',
      twitter: '/api/social/connect/twitter',
      facebook: '/api/social/connect/facebook',
      linkedin: '/api/social/connect/linkedin',
    };
    
    const oauthUrl = oauthUrls[platformName];
    if (oauthUrl && typeof window !== 'undefined') {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setConnecting(null);
        window.location.href = `/spacebaddie/login?redirect=${encodeURIComponent(oauthUrl)}&message=Please sign in to connect your ${platformName} account`;
        return;
      }
      
      try {
        await fetch('/api/auth/sync-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          }),
        });
      } catch (error) {
        console.error('Failed to sync session:', error);
      }
      
      window.localStorage.setItem('social_connect_return', window.location.href);
      const connectUrl = new URL(oauthUrl, window.location.origin);
      connectUrl.searchParams.set('access_token', session.access_token);
      connectUrl.searchParams.set('user_id', session.user.id);
      window.location.href = connectUrl.toString();
    }
  };

  const platformAccentColors: Record<string, string> = {
    youtube: '#FF0000',
    tiktok: '#FF2D55',
    instagram: '#C13584',
    twitter: '#1DA1F2',
    facebook: '#1877F2',
    linkedin: '#0077B5',
  };

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '20px',
      overflow: 'hidden',
    }}>
      {/* Collapsed View - Always visible */}
      <button 
        onClick={onToggle}
        style={{
          width: '100%',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          transition: 'background 0.2s',
        }}
        onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
        onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '18px' }}>🔗</span>
          <span style={{ color: '#fff', fontWeight: 600, fontSize: '14px' }}>Connected Platforms</span>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '3px 10px',
            borderRadius: '20px',
            background: connectedCount > 0 ? 'rgba(0,212,212,0.1)' : 'rgba(255,255,255,0.06)',
            border: connectedCount > 0 ? '1px solid rgba(0,212,212,0.25)' : '1px solid rgba(255,255,255,0.1)',
          }}>
            <div style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: connectedCount > 0 ? '#00D4D4' : '#555',
              boxShadow: connectedCount > 0 ? '0 0 6px rgba(0,212,212,0.5)' : 'none',
            }} />
            <span style={{ fontSize: '12px', color: connectedCount > 0 ? '#00D4D4' : '#888', fontWeight: 600 }}>
              {connectedCount}/{platforms.length}
            </span>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Mini platform icons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {platforms.map(p => (
              <div 
                key={p.name}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: p.connected ? `${platformAccentColors[p.name]}22` : 'rgba(255,255,255,0.05)',
                  border: p.connected ? `1px solid ${platformAccentColors[p.name]}44` : '1px solid rgba(255,255,255,0.06)',
                  color: p.connected ? platformAccentColors[p.name] : '#555',
                  transition: 'all 0.2s',
                }}
                title={`${p.name} - ${p.connected ? 'Connected' : 'Not connected'}`}
              >
                <PlatformIcon platform={p.name} size="sm" />
              </div>
            ))}
          </div>
          <svg 
            style={{
              width: '16px',
              height: '16px',
              color: '#888',
              transition: 'transform 0.3s ease',
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded View */}
      {expanded && (
        <div style={{ padding: '0 24px 24px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {loading ? (
            <div style={{ padding: '32px 0', textAlign: 'center', color: '#888', fontSize: '14px' }}>Loading platforms...</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px', paddingTop: '20px' }}>
              {platforms.map(platform => {
                const accent = platformAccentColors[platform.name] || '#888';
                const isConnected = platform.connected;
                const isConnecting = connecting === platform.name;
                return (
                  <button
                    key={platform.name}
                    onClick={() => handleConnect(platform.name)}
                    disabled={isConnecting}
                    style={{
                      padding: '20px 12px',
                      borderRadius: '16px',
                      border: isConnected ? `1px solid ${accent}44` : '1px solid rgba(255,255,255,0.08)',
                      background: isConnected
                        ? `linear-gradient(135deg, ${accent}10, ${accent}08)`
                        : 'rgba(255,255,255,0.02)',
                      cursor: isConnecting ? 'wait' : 'pointer',
                      transition: 'all 0.25s ease',
                      textAlign: 'center' as const,
                      position: 'relative' as const,
                      overflow: 'hidden',
                    }}
                    onMouseOver={(e) => {
                      if (!isConnected) {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                        e.currentTarget.style.borderColor = `${accent}33`;
                      } else {
                        e.currentTarget.style.boxShadow = `0 0 20px ${accent}22`;
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!isConnected) {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                      }
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {/* Glow effect for connected */}
                    {isConnected && (
                      <div style={{
                        position: 'absolute',
                        top: '-20px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        background: `radial-gradient(circle, ${accent}20, transparent)`,
                        filter: 'blur(15px)',
                        pointerEvents: 'none',
                      }} />
                    )}
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '12px',
                      background: isConnected 
                        ? `linear-gradient(135deg, ${accent}33, ${accent}18)` 
                        : 'rgba(255,255,255,0.06)',
                      border: isConnected ? `1px solid ${accent}44` : '1px solid rgba(255,255,255,0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isConnected ? accent : '#666',
                      margin: '0 auto 10px',
                      position: 'relative' as const,
                    }}>
                      <PlatformIcon platform={platform.name} size="md" />
                    </div>
                    <div style={{ fontSize: '13px', color: '#fff', fontWeight: 600, textTransform: 'capitalize' as const, marginBottom: '4px' }}>
                      {platform.name === 'twitter' ? 'X' : platform.name}
                    </div>
                    <div style={{
                      fontSize: '11px',
                      fontWeight: 500,
                      color: isConnecting ? '#F59E0B' : isConnected ? '#00D4D4' : '#666',
                    }}>
                      {isConnecting ? 'Connecting...' : isConnected ? 'Connected' : 'Connect'}
                    </div>
                    {/* Connected status dot */}
                    {isConnected && (
                      <div style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#00D4D4',
                        boxShadow: '0 0 8px rgba(0,212,212,0.6)',
                      }} />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Stats from real data
interface QueueStats {
  queued: number;
  posted: number;
  failed: number;
  posting: number;
}

function AutomationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null);
  const [platformsExpanded, setPlatformsExpanded] = useState(false);
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null);

  // Read initial tab from URL or default to 'schedule'
  const urlTab = searchParams.get('tab') as TabType | null;
  const validTabs: TabType[] = ['schedule', 'queue', 'calendar'];
  const initialTab: TabType = urlTab && validTabs.includes(urlTab) ? urlTab : 'schedule';
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  // Update URL when tab changes (without full page reload)
  const handleTabChange = useCallback((newTab: TabType) => {
    setActiveTab(newTab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', newTab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchParams, pathname, router]);

  // Sync tab state with URL changes (e.g., browser back/forward)
  useEffect(() => {
    const urlTabParam = searchParams.get('tab') as TabType | null;
    if (urlTabParam && validTabs.includes(urlTabParam) && urlTabParam !== activeTab) {
      setActiveTab(urlTabParam);
    }
  }, [searchParams, activeTab]);

  // Check for error/success messages in URL
  useEffect(() => {
    const error = searchParams.get('error');
    const message = searchParams.get('message');
    const success = searchParams.get('success');

    if (error && message) {
      setToast({ message: decodeURIComponent(message), type: 'error' });
      // Preserve the tab parameter when clearing error messages
      const params = new URLSearchParams();
      const tab = searchParams.get('tab');
      if (tab) params.set('tab', tab);
      window.history.replaceState({}, '', `/spacebaddie/automation${params.toString() ? `?${params.toString()}` : ''}`);
    } else if (success && message) {
      setToast({ message: decodeURIComponent(message), type: 'success' });
      // Preserve the tab parameter when clearing success messages
      const params = new URLSearchParams();
      const tab = searchParams.get('tab');
      if (tab) params.set('tab', tab);
      window.history.replaceState({}, '', `/spacebaddie/automation${params.toString() ? `?${params.toString()}` : ''}`);
    }
  }, [searchParams]);

  const { tier, checkFeature, loading, suggestedUpgrade } = useFeatureGate();
  const socialAccess = checkFeature('social');
  const workflowAccess = checkFeature('workflows');
  const [connectionsLoading, setConnectionsLoading] = useState(true);
  
  const [automationState, setAutomationState] = useState<AutomationState>({
    socialPlatforms: [
      { name: 'youtube', connected: false, dailyLimit: 0, postsToday: 0 },
      { name: 'tiktok', connected: false, dailyLimit: 0, postsToday: 0 },
      { name: 'instagram', connected: false, dailyLimit: 0, postsToday: 0 },
      { name: 'twitter', connected: false, dailyLimit: 0, postsToday: 0 },
      { name: 'facebook', connected: false, dailyLimit: 0, postsToday: 0 },
      { name: 'linkedin', connected: false, dailyLimit: 0, postsToday: 0 }
    ],
    postingSchedule: {
      frequency: 'daily',
      optimalTimes: [],
      autoOptimize: true
    },
    contentQueue: [],
    performance: {
      totalPosts: 0,
      successfulPosts: 0,
      failedPosts: 0,
      engagementRate: 0,
      reach: 0,
      conversions: 0
    }
  });

  // Fetch actual platform connections from database
  const fetchConnections = useCallback(async () => {
    try {
      setConnectionsLoading(true);
      const res = await fetch('/api/spacebaddie/automation/connect', { credentials: 'include' });
      const data = await res.json();
      
      if (data.ok && data.platforms) {
        const updatedPlatforms: SocialPlatform[] = data.platforms.map((p: any) => ({
          name: p.platform as SocialPlatform['name'],
          connected: p.status === 'connected',
          dailyLimit: p.dailyLimit || 0,
          postsToday: p.postsToday || 0,
        }));
        
        setAutomationState(prev => ({
          ...prev,
          socialPlatforms: updatedPlatforms,
        }));
      }
    } catch (err) {
      console.error('[Automation] Failed to fetch connections:', err);
    } finally {
      setConnectionsLoading(false);
    }
  }, []);

  // Fetch queue stats for header
  const fetchQueueStats = useCallback(async () => {
    try {
      const res = await fetch('/api/spacebaddie/social/schedule?status=all&limit=1', { credentials: 'include' });
      const data = await res.json();
      if (data.ok && data.counts) {
        setQueueStats(data.counts);
      }
    } catch (err) {
      console.error('[Automation] Failed to fetch queue stats:', err);
    }
  }, []);

  useEffect(() => {
    fetchConnections();
    fetchQueueStats();
  }, [fetchConnections, fetchQueueStats]);

  // Handle successful connection from redirect
  useEffect(() => {
    const connected = searchParams.get('connected');
    if (connected) {
      setToast({ message: `Successfully connected to ${connected}!`, type: 'success' });
      // Preserve the tab parameter when clearing connected message
      const params = new URLSearchParams();
      const tab = searchParams.get('tab');
      if (tab) params.set('tab', tab);
      window.history.replaceState({}, '', `/spacebaddie/automation${params.toString() ? `?${params.toString()}` : ''}`);
      fetchConnections();
    }
  }, [searchParams, fetchConnections]);

  const handlePlatformConnect = (platformName: string, connected: boolean) => {
    setAutomationState(prev => ({
      ...prev,
      socialPlatforms: prev.socialPlatforms.map(platform =>
        platform.name === platformName
          ? { ...platform, connected }
          : platform
      )
    }));
    fetchConnections();
  };

  const handleScheduleContent = async (content: any, platforms: string[], scheduleTime: Date) => {
    console.log('Schedule content:', content, platforms, scheduleTime);
    fetchQueueStats(); // Refresh stats after scheduling
  };

  const handleQueueUpdate = (updatedQueue: ContentQueueItem[]) => {
    setAutomationState(prev => ({
      ...prev,
      contentQueue: updatedQueue
    }));
    fetchQueueStats();
  };

  const connectedPlatforms = automationState.socialPlatforms.filter(p => p.connected);

  const tabs: { id: TabType; label: string; icon: string; badge?: number }[] = [
    { id: 'schedule', label: 'Create Post', icon: '✏️' },
    { id: 'queue', label: 'Queue', icon: '📋', badge: queueStats?.queued || 0 },
    { id: 'calendar', label: 'Calendar', icon: '📆' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
            style={{ background: 'linear-gradient(135deg, rgba(255,0,110,0.2), rgba(138,43,226,0.2))', border: '1px solid rgba(255,0,110,0.3)' }}>
            🚀
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ background: 'linear-gradient(135deg, #FF6B9D, #C77DFF, #00D4D4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Automation
            </h1>
            <p className="text-gray-400 text-sm mt-0.5">Schedule and automate your social content</p>
          </div>
        </div>
        
        {/* Quick Stats */}
        {queueStats && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl"
              style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)' }}>
              <span className="text-lg font-bold" style={{ color: '#C77DFF' }}>{queueStats.queued}</span>
              <span className="text-gray-500 text-xs font-medium">Queued</span>
            </div>
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl"
              style={{ background: 'rgba(0,212,212,0.08)', border: '1px solid rgba(0,212,212,0.2)' }}>
              <span className="text-lg font-bold" style={{ color: '#00D4D4' }}>{queueStats.posted}</span>
              <span className="text-gray-500 text-xs font-medium">Posted</span>
            </div>
            {queueStats.failed > 0 && (
              <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl"
                style={{ background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.2)' }}>
                <span className="text-lg font-bold" style={{ color: '#FF6B6B' }}>{queueStats.failed}</span>
                <span className="text-gray-500 text-xs font-medium">Failed</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Platform Status Row (Collapsible) */}
      <PlatformStatusRow
        platforms={automationState.socialPlatforms}
        onConnect={handlePlatformConnect}
        expanded={platformsExpanded}
        onToggle={() => setPlatformsExpanded(!platformsExpanded)}
        loading={connectionsLoading}
      />

      {/* Main Content Area with Tabs */}
      <div className="space-y-6">
        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px',
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  border: isActive ? '1px solid rgba(255,0,110,0.4)' : '1px solid transparent',
                  background: isActive
                    ? 'linear-gradient(135deg, rgba(255,0,110,0.15), rgba(138,43,226,0.15))'
                    : 'transparent',
                  color: isActive ? '#fff' : '#888',
                  fontSize: '14px',
                  fontWeight: isActive ? 600 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: isActive ? '0 4px 20px rgba(255,0,110,0.15)' : 'none',
                }}
              >
                <span style={{ fontSize: '18px', lineHeight: 1 }}>{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: 700,
                    background: isActive ? 'rgba(255,255,255,0.15)' : 'rgba(168,85,247,0.15)',
                    color: isActive ? '#fff' : '#C77DFF',
                  }}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="min-h-[500px]">
          {activeTab === 'schedule' && (
            <ContentScheduler
              platforms={automationState.socialPlatforms}
              schedule={automationState.postingSchedule}
              onSchedule={handleScheduleContent}
              initialMediaUrl={searchParams.get('videoUrl') ?? undefined}
              initialTitle={searchParams.get('title') ?? undefined}
            />
          )}
          
          {activeTab === 'queue' && (
            <PostingQueue
              queue={automationState.contentQueue}
              platforms={automationState.socialPlatforms}
              onUpdate={handleQueueUpdate}
            />
          )}
          
          {activeTab === 'calendar' && (
            <ContentCalendar 
              onPostClick={(post) => {
                console.log('Post clicked:', post);
              }}
              onDateSelect={(date) => {
                console.log('Date selected:', date);
                handleTabChange('schedule');
              }}
            />
          )}
        </div>
      </div>

      {/* Contextual Upgrade Prompt - only show if features are limited */}
      {!loading && suggestedUpgrade && (socialAccess.limit !== 'unlimited' || workflowAccess.limit !== 'unlimited') && (
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-pink-500/10 to-purple-600/10 border border-pink-500/20 p-6">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl flex items-center justify-center">
              <span className="text-2xl">⚡</span>
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-lg font-bold text-white">
                {socialAccess.limit === 'unlimited' ? 'More Workflow Power' : 'Unlock Unlimited Posting'}
              </h3>
              <p className="text-gray-400 text-sm">
                {socialAccess.limit !== 'unlimited' 
                  ? `Upgrade to ${getTierConfig(suggestedUpgrade).name} for unlimited content across all platforms.`
                  : `Upgrade for more automation workflows and advanced features.`
                }
              </p>
            </div>
            <a 
              href="/spacebaddie/pricing"
              className="flex-shrink-0 px-5 py-2.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg font-semibold hover:opacity-90 transition-opacity text-sm"
            >
              Upgrade
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function AutomationLoading() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-400">Loading automation...</p>
      </div>
    </div>
  );
}

export default function SpaceBaddieAutomationPage() {
  return (
    <DashboardShell>
      <div className="p-6 lg:p-8">
        <Suspense fallback={<AutomationLoading />}>
          <AutomationContent />
        </Suspense>
      </div>
    </DashboardShell>
  );
}
