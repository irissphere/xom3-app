'use client';

import React from 'react';
import { SocialPlatform } from '@/lib/spacebaddie/types';
import { useFeatureGate } from '@/lib/hooks/useFeatureGate';
import { getTierConfig } from '@/lib/tiers/features';
import { supabase } from '@/lib/supabase/client';

interface SocialPlatformsProps {
  platforms: SocialPlatform[];
  onConnect: (platformName: string, connected: boolean) => void;
}

// Platform configurations with brand colors
const platformConfig: Record<string, {
  name: string;
  gradient: string;
  iconBg: string;
  hoverGlow: string;
  description: string;
  features: string[];
}> = {
  youtube: {
    name: 'YouTube',
    gradient: 'from-red-600 to-red-700',
    iconBg: 'bg-red-600',
    hoverGlow: 'hover:shadow-red-500/30',
    description: 'Video content platform',
    features: ['Video uploads', 'Shorts', 'Community']
  },
  tiktok: {
    name: 'TikTok',
    gradient: 'from-pink-500 via-purple-500 to-cyan-400',
    iconBg: 'bg-gradient-to-br from-pink-500 to-cyan-400',
    hoverGlow: 'hover:shadow-pink-500/30',
    description: 'Short-form video',
    features: ['Short videos', 'Trends']
  },
  instagram: {
    name: 'Instagram',
    gradient: 'from-purple-600 via-pink-500 to-orange-400',
    iconBg: 'bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400',
    hoverGlow: 'hover:shadow-purple-500/30',
    description: 'Photo & video',
    features: ['Reels', 'Stories', 'Posts']
  },
  twitter: {
    name: 'X (Twitter)',
    gradient: 'from-gray-800 to-gray-900',
    iconBg: 'bg-black',
    hoverGlow: 'hover:shadow-gray-500/30',
    description: 'Real-time updates',
    features: ['Posts', 'Threads']
  },
  facebook: {
    name: 'Facebook',
    gradient: 'from-blue-600 to-blue-700',
    iconBg: 'bg-blue-600',
    hoverGlow: 'hover:shadow-blue-500/30',
    description: 'Social network',
    features: ['Page posts', 'Groups']
  },
  linkedin: {
    name: 'LinkedIn',
    gradient: 'from-blue-700 to-blue-800',
    iconBg: 'bg-blue-700',
    hoverGlow: 'hover:shadow-blue-600/30',
    description: 'Professional',
    features: ['Articles', 'Updates']
  }
};

// SVG Icons for each platform
const PlatformIcon = ({ platform }: { platform: string }) => {
  switch (platform) {
    case 'youtube':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
      );
    case 'tiktok':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
        </svg>
      );
    case 'instagram':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
        </svg>
      );
    case 'twitter':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      );
    case 'facebook':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      );
    case 'linkedin':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>
      );
    default:
      return null;
  }
};

export function SocialPlatforms({ platforms, onConnect }: SocialPlatformsProps) {
  const { tier, checkFeature, loading, suggestedUpgrade } = useFeatureGate();
  const socialAccess = checkFeature('social');
  const tierConfig = getTierConfig(tier);
  const [connecting, setConnecting] = React.useState<string | null>(null);
  const [showComingSoon, setShowComingSoon] = React.useState<string | null>(null);

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
    if (oauthUrl) {
      if (typeof window !== 'undefined') {
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
    } else {
      setConnecting(null);
      setShowComingSoon(platformName);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-2xl">🔗</span>
            Connect Platforms
          </h2>
          <p className="text-gray-400 text-sm mt-1">Link your social accounts to automate content</p>
        </div>
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gray-800/50 rounded-full border border-gray-700">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-gray-400 font-medium">{platforms.filter(p => p.connected).length}/{platforms.length} Active</span>
        </div>
      </div>

      {/* Platform Cards - More compact grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {platforms.map((platform) => {
          const config = platformConfig[platform.name];
          if (!config) return null;
          
          return (
            <div
              key={platform.name}
              className={`relative group rounded-xl overflow-hidden transition-all duration-300 ${config.hoverGlow} hover:shadow-lg hover:-translate-y-0.5 border border-white/5`}
              style={{
                background: 'linear-gradient(180deg, rgba(30,30,40,1) 0%, rgba(20,20,30,1) 100%)',
              }}
            >
              {/* Gradient border effect */}
              <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>
              
              {/* Content */}
              <div className="relative p-4 flex flex-col h-full">
                {/* Platform Header */}
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-lg ${config.iconBg} flex items-center justify-center text-white shadow-lg flex-shrink-0`}>
                    <PlatformIcon platform={platform.name} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-white truncate">{config.name}</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${platform.connected ? 'bg-green-500 shadow-lg shadow-green-500/50' : 'bg-gray-600'}`}></div>
                      <span className="text-[10px] text-gray-500 uppercase tracking-wide">
                        {platform.connected ? 'Active' : 'Offline'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Features - simplified */}
                <div className="flex-1 mb-4">
                  <div className="flex flex-wrap gap-1.5">
                    {config.features.slice(0, 2).map((feature, idx) => (
                      <span 
                        key={idx}
                        className="px-1.5 py-0.5 text-[10px] bg-gray-800 text-gray-400 rounded border border-gray-700/50 truncate max-w-full"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Connect Button - Smaller */}
                <button
                  onClick={() => handleConnect(platform.name)}
                  disabled={connecting === platform.name}
                  className={`w-full py-2 px-3 rounded-lg font-semibold text-xs transition-all duration-200 ${
                    platform.connected
                      ? 'bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20'
                      : connecting === platform.name
                      ? 'bg-gray-700 text-gray-400 cursor-wait'
                      : `bg-gradient-to-r ${config.gradient} text-white hover:opacity-90`
                  }`}
                >
                  {platform.connected ? (
                    <span className="flex items-center justify-center gap-1.5">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Connected
                    </span>
                  ) : connecting === platform.name ? (
                    <span className="flex items-center justify-center gap-1.5">
                      <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Waiting...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-1.5">
                      Connect
                    </span>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tier Notice - Compact */}
      {!loading && (
        <>
          {socialAccess.limit !== 'unlimited' && suggestedUpgrade && (
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-500/20 p-4">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                  <span className="text-lg">⚡</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-white truncate">
                    Unlock Unlimited Posting
                  </h3>
                  <p className="text-gray-400 text-xs truncate">
                    Upgrade to {getTierConfig(suggestedUpgrade).name} for unlimited automation
                  </p>
                </div>
                <a
                  href="/spacebaddie/pricing"
                  className="flex-shrink-0 px-3 py-1.5 bg-white/10 text-white text-xs font-semibold rounded-lg hover:bg-white/20 transition-colors"
                >
                  Upgrade
                </a>
              </div>
            </div>
          )}
        </>
      )}

      {/* Coming Soon Modal */}
      {showComingSoon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="text-center">
              <div className={`w-14 h-14 mx-auto mb-4 rounded-xl ${platformConfig[showComingSoon]?.iconBg} flex items-center justify-center shadow-lg`}>
                <div className="text-white">
                  <PlatformIcon platform={showComingSoon} />
                </div>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                {platformConfig[showComingSoon]?.name}
              </h3>
              <p className="text-gray-400 text-sm mb-6">
                Integration coming soon! We're finishing up the OAuth verification.
              </p>
              <button
                onClick={() => setShowComingSoon(null)}
                className="w-full py-2.5 bg-gray-800 text-white rounded-xl font-medium hover:bg-gray-700 transition-colors text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}