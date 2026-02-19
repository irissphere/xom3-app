'use client';

import React from 'react';
import { PanelFrame } from '@/components/xom3/PanelFrame';
import { useFeatureGate } from '@/lib/hooks/useFeatureGate';
import { getTierConfig } from '@/lib/tiers/features';
import { useAvatarProfile, useSpaceBaddieMetrics, useSocialConnections, useDeviceTracking } from '@/lib/spacebaddie/useSpaceBaddieData';

export default function SpaceBaddieProfilePage() {
  const { tier, loading: tierLoading } = useFeatureGate();
  const { profile, recentRenders, loading: profileLoading, saveProfile } = useAvatarProfile();
  const { metrics, loading: metricsLoading } = useSpaceBaddieMetrics();
  const { platforms, loading: platformsLoading } = useSocialConnections();
  const { status: deviceStatus } = useDeviceTracking();
  
  const tierConfig = getTierConfig(tier);
  const connectedPlatforms = platforms.filter(p => p.status === 'connected');
  const loading = tierLoading || profileLoading || metricsLoading || platformsLoading;

  return (
    <div className="min-h-screen bg-bg-0 relative overflow-hidden text-text-0 font-sans p-4 md:p-8">
      {/* Cosmic Background */}
      <div className="orbital-bg-layer pointer-events-none fixed inset-0 z-0">
        <div className="orbital-grid animate-grid-rotate opacity-10"></div>
        <div className="orbital-orb orbital-orb-primary w-[600px] h-[600px] top-[-100px] right-[-100px] animate-orb-drift opacity-20"></div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto space-y-6">
        {/* Profile Header */}
        <div className="bg-surface-0 border border-border-1 rounded-2xl p-8 text-center overflow-hidden group shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-pink-600/10 via-purple-600/10 to-blue-600/10 opacity-50"></div>
          
          <div className="relative z-10">
            <div className="inline-flex items-center justify-center w-24 h-24 mb-6 bg-surface-2 rounded-full border-2 border-pink-500/50 shadow-[0_0_30px_rgba(236,72,153,0.3)]">
              <span className="text-5xl">👤</span>
            </div>

            <h1 className="text-3xl md:text-4xl font-black mb-2">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-pink-200 via-purple-200 to-blue-200">
                Sacred Profile
              </span>
            </h1>

            <div className="inline-flex items-center gap-2 px-4 py-2 bg-surface-1 border border-border-1 rounded-xl mt-4">
              <div className={`w-2 h-2 rounded-full ${tier === 'free' ? 'bg-gray-400' : 'bg-green-400'} animate-pulse`}></div>
              <span className="font-mono text-sm text-text-1">{tierConfig.name} REALM</span>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-surface-0 border border-pink-500/30 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-pink-300">{metrics.postsMade}</div>
            <div className="text-sm text-pink-200/70">Posts Made</div>
          </div>
          <div className="bg-surface-0 border border-purple-500/30 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-purple-300">{metrics.totalRenders}</div>
            <div className="text-sm text-purple-200/70">Videos Created</div>
          </div>
          <div className="bg-surface-0 border border-blue-500/30 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-blue-300">{connectedPlatforms.length}</div>
            <div className="text-sm text-blue-200/70">Platforms</div>
          </div>
          <div className="bg-surface-0 border border-green-500/30 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-green-300">{metrics.reach.toLocaleString()}</div>
            <div className="text-sm text-green-200/70">Total Reach</div>
          </div>
        </div>

        {/* Subscription Status */}
        <PanelFrame title="Subscription Status">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-surface-1 rounded-lg">
              <div>
                <div className="font-semibold text-white">{tierConfig.name}</div>
                <div className="text-sm text-text-2">{tierConfig.priceLabel}</div>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                tier === 'free' 
                  ? 'bg-gray-600 text-gray-200' 
                  : 'bg-green-600/20 text-green-300 border border-green-500/50'
              }`}>
                {tier === 'free' ? 'Free Tier' : 'Active'}
              </div>
            </div>

            {/* Free tier limits display */}
            {tier === 'free' && deviceStatus && (
              <div className="p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
                <div className="text-yellow-300 font-medium mb-2">Free Tier Limits</div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-yellow-200/70">Generations: </span>
                    <span className="text-yellow-200">{deviceStatus.freeGenerationsUsed}/{deviceStatus.freeGenerationsUsed + deviceStatus.freeGenerationsRemaining}</span>
                  </div>
                  <div>
                    <span className="text-yellow-200/70">Posts: </span>
                    <span className="text-yellow-200">{deviceStatus.freePostsUsed}/{deviceStatus.freePostsUsed + deviceStatus.freePostsRemaining}</span>
                  </div>
                </div>
                {deviceStatus.isLocked && (
                  <div className="mt-3 text-yellow-300 text-sm">
                    Limits reached - upgrade to continue creating!
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <a
                href="/pricing"
                className="flex-1 py-3 px-6 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-lg hover:from-pink-700 hover:to-purple-700 transition-all font-semibold text-center"
              >
                {tier === 'free' ? 'Upgrade Plan' : 'Manage Subscription'}
              </a>
              <a
                href="/spacebaddie/dashboard"
                className="py-3 px-6 bg-surface-2 text-text-1 rounded-lg hover:bg-surface-1 transition-colors font-medium text-center"
              >
                Dashboard
              </a>
            </div>
          </div>
        </PanelFrame>

        {/* Avatar Profile */}
        <PanelFrame title="Avatar Defaults">
          {loading ? (
            <div className="text-center py-8 text-text-2 animate-pulse">Loading profile...</div>
          ) : profile ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-surface-1 rounded-lg">
                  <div className="text-xs text-text-2 uppercase tracking-wider mb-1">Base Model</div>
                  <div className="text-white font-medium">{profile.base_model}</div>
                </div>
                <div className="p-3 bg-surface-1 rounded-lg">
                  <div className="text-xs text-text-2 uppercase tracking-wider mb-1">Voice Style</div>
                  <div className="text-white font-medium">{profile.voice_style}</div>
                </div>
                <div className="p-3 bg-surface-1 rounded-lg">
                  <div className="text-xs text-text-2 uppercase tracking-wider mb-1">Scene Type</div>
                  <div className="text-white font-medium">{profile.default_scene_type}</div>
                </div>
                <div className="p-3 bg-surface-1 rounded-lg">
                  <div className="text-xs text-text-2 uppercase tracking-wider mb-1">Lens Type</div>
                  <div className="text-white font-medium">{profile.default_lens_type}</div>
                </div>
              </div>

              <a
                href="/spacebaddie/studio"
                className="block w-full py-3 text-center bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Edit in Studio
              </a>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-text-2 mb-4">No avatar profile yet</div>
              <a
                href="/spacebaddie/studio"
                className="inline-block px-6 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors font-medium"
              >
                Create Avatar
              </a>
            </div>
          )}
        </PanelFrame>

        {/* Connected Platforms */}
        <PanelFrame title="Connected Platforms">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {platforms.map((platform) => (
              <div 
                key={platform.platform}
                className={`p-3 rounded-lg border ${
                  platform.status === 'connected'
                    ? 'bg-green-900/20 border-green-500/30'
                    : 'bg-surface-1 border-border-1'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">
                    {platform.platform === 'youtube' && '📺'}
                    {platform.platform === 'tiktok' && '🎵'}
                    {platform.platform === 'instagram' && '📸'}
                    {platform.platform === 'twitter' && '🐦'}
                    {platform.platform === 'facebook' && '👥'}
                    {platform.platform === 'linkedin' && '💼'}
                  </span>
                  <span className="capitalize text-white font-medium">{platform.platform}</span>
                </div>
                <div className={`text-xs mt-1 ${
                  platform.status === 'connected' ? 'text-green-300' : 'text-text-2'
                }`}>
                  {platform.status === 'connected' ? `@${platform.username || 'connected'}` : 'Not connected'}
                </div>
              </div>
            ))}
          </div>

          <a
            href="/spacebaddie/automation"
            className="block w-full mt-4 py-3 text-center bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
          >
            Manage Connections
          </a>
        </PanelFrame>

        {/* Recent Renders */}
        {recentRenders.length > 0 && (
          <PanelFrame title="Recent Renders">
            <div className="space-y-2">
              {recentRenders.slice(0, 5).map((render) => (
                <div 
                  key={render.job_id}
                  className="flex items-center justify-between p-3 bg-surface-1 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {render.thumbnail_url ? (
                      <img 
                        src={render.thumbnail_url} 
                        alt="Render thumbnail"
                        className="w-12 h-12 rounded object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-surface-2 rounded flex items-center justify-center">
                        <span>🎬</span>
                      </div>
                    )}
                    <div>
                      <div className="text-white font-medium">{render.job_type}</div>
                      <div className="text-xs text-text-2">
                        {new Date(render.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs ${
                    render.status === 'completed' 
                      ? 'bg-green-600/20 text-green-300'
                      : render.status === 'failed'
                        ? 'bg-red-600/20 text-red-300'
                        : 'bg-yellow-600/20 text-yellow-300'
                  }`}>
                    {render.status}
                  </div>
                </div>
              ))}
            </div>
          </PanelFrame>
        )}

        {/* Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <a href="/spacebaddie/studio" className="p-4 bg-surface-0 border border-pink-500/30 rounded-xl text-center hover:bg-pink-500/10 transition-colors">
            <span className="text-2xl">🎭</span>
            <div className="text-white font-medium mt-2">Studio</div>
          </a>
          <a href="/spacebaddie/automation" className="p-4 bg-surface-0 border border-purple-500/30 rounded-xl text-center hover:bg-purple-500/10 transition-colors">
            <span className="text-2xl">🚀</span>
            <div className="text-white font-medium mt-2">Automation</div>
          </a>
          <a href="/commerce" className="p-4 bg-surface-0 border border-blue-500/30 rounded-xl text-center hover:bg-blue-500/10 transition-colors">
            <span className="text-2xl">🛍️</span>
            <div className="text-white font-medium mt-2">Store</div>
          </a>
          <a href="/spacebaddie" className="p-4 bg-surface-0 border border-green-500/30 rounded-xl text-center hover:bg-green-500/10 transition-colors">
            <span className="text-2xl">🏠</span>
            <div className="text-white font-medium mt-2">Home</div>
          </a>
        </div>
      </div>
    </div>
  );
}
