'use client';

import React from 'react';
import { SocialPlatform } from '@/lib/spacebaddie/types';

interface AutomationAnalyticsProps {
  performance: {
    totalPosts: number;
    successfulPosts: number;
    failedPosts: number;
    engagementRate: number;
    reach: number;
    conversions: number;
  };
  platforms: SocialPlatform[];
}

export function AutomationAnalytics({ performance, platforms }: AutomationAnalyticsProps) {
  const successRate = performance.totalPosts > 0
    ? (performance.successfulPosts / performance.totalPosts) * 100
    : 0;

  const connectedPlatforms = platforms.filter(p => p.connected);
  const totalDailyLimit = connectedPlatforms.reduce((sum, p) => sum + p.dailyLimit, 0);
  const totalPostsToday = connectedPlatforms.reduce((sum, p) => sum + p.postsToday, 0);

  return (
    <div style={{
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '16px',
      padding: '24px',
    }}>
      <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#fff', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>📊</span> Automation Analytics
      </h3>

      {/* Key Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '12px',
          padding: '20px',
        }}>
          <div style={{ fontSize: '32px', fontWeight: 700, color: '#00D4D4' }}>
            {successRate.toFixed(1)}%
          </div>
          <div style={{ fontSize: '14px', color: '#888' }}>Success Rate</div>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
            {performance.successfulPosts} of {performance.totalPosts} posts
          </div>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '12px',
          padding: '20px',
        }}>
          <div style={{ fontSize: '32px', fontWeight: 700, color: '#FF6B9D' }}>
            {(performance.engagementRate * 100).toFixed(1)}%
          </div>
          <div style={{ fontSize: '14px', color: '#888' }}>Avg Engagement</div>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
            Across all platforms
          </div>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '12px',
          padding: '20px',
        }}>
          <div style={{ fontSize: '32px', fontWeight: 700, color: '#C77DFF' }}>
            {performance.reach.toLocaleString()}
          </div>
          <div style={{ fontSize: '14px', color: '#888' }}>Total Reach</div>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
            People reached
          </div>
        </div>
      </div>

      {/* Platform Performance */}
      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ fontSize: '16px', fontWeight: 500, color: '#fff', marginBottom: '16px' }}>Platform Performance</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {platforms.map((platform) => {
            const usageRatio = platform.dailyLimit > 0 ? platform.postsToday / platform.dailyLimit : 0;
            const barColor = usageRatio >= 0.9 ? '#ff6b6b' : usageRatio >= 0.7 ? '#ffa500' : '#00D4D4';

            return (
              <div key={platform.name} style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                padding: '16px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: platform.connected ? '#00D4D4' : '#666',
                    }} />
                    <span style={{ color: '#fff', fontWeight: 500, textTransform: 'capitalize' }}>{platform.name}</span>
                  </div>
                  <span style={{ fontSize: '14px', color: '#888' }}>
                    {platform.dailyLimit >= 999 ? 'Unlimited' : `${platform.postsToday} / ${platform.dailyLimit} posts`}
                  </span>
                </div>

                <div style={{
                  width: '100%',
                  height: '6px',
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '3px',
                  overflow: 'hidden',
                }}>
                  <div
                    style={{
                      height: '100%',
                      borderRadius: '3px',
                      background: barColor,
                      width: `${Math.min(usageRatio * 100, 100)}%`,
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>

                {!platform.connected && (
                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                    Connect platform to enable posting
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Daily Usage Summary */}
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px',
        padding: '20px',
      }}>
        <h4 style={{ fontSize: '16px', fontWeight: 500, color: '#fff', marginBottom: '12px' }}>Today&apos;s Usage</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '14px', color: '#888' }}>Posts Used</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#fff' }}>
              {totalPostsToday} / {totalDailyLimit}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '14px', color: '#888' }}>Platforms Active</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#fff' }}>
              {connectedPlatforms.length} / {platforms.length}
            </div>
          </div>
        </div>

        <div style={{
          marginTop: '12px',
          width: '100%',
          height: '6px',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '3px',
          overflow: 'hidden',
        }}>
          <div
            style={{
              height: '100%',
              borderRadius: '3px',
              background: 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)',
              width: totalDailyLimit > 0 ? `${(totalPostsToday / totalDailyLimit) * 100}%` : '0%',
              transition: 'width 0.3s ease',
            }}
          />
        </div>

        {totalPostsToday >= totalDailyLimit * 0.8 && (
          <div style={{
            marginTop: '12px',
            padding: '8px 12px',
            background: 'rgba(255,165,0,0.1)',
            border: '1px solid rgba(255,165,0,0.3)',
            borderRadius: '8px',
            fontSize: '14px',
            color: '#ffa500',
          }}>
            ⚠️ Approaching daily limit. Consider upgrading to Pro for unlimited posts.
          </div>
        )}
      </div>

      {/* AI Insights - Only show when real analytics data is available */}
      {performance.totalPosts > 0 && (
        <div style={{
          marginTop: '24px',
          background: 'linear-gradient(135deg, rgba(255,0,110,0.1) 0%, rgba(138,43,226,0.1) 100%)',
          border: '1px solid rgba(138,43,226,0.3)',
          borderRadius: '12px',
          padding: '20px',
        }}>
          <h4 style={{ fontSize: '16px', fontWeight: 500, color: '#fff', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📊</span>
            Performance Summary
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px', color: '#ccc' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>✅</span>
              <span>Success rate: {performance.totalPosts > 0 ? ((performance.successfulPosts / performance.totalPosts) * 100).toFixed(1) : 0}%</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📱</span>
              <span>Active platforms: {platforms.filter(p => p.connected).length}</span>
            </div>
            {performance.failedPosts > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>⚠️</span>
                <span>{performance.failedPosts} post{performance.failedPosts !== 1 ? 's' : ''} failed - check your connections</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
