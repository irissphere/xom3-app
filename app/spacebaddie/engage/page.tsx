'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import DashboardShell from '../components/DashboardShell';
import { ActivityFeed } from './ui/ActivityFeed';
import { ConversationList } from './ui/ConversationList';
import { AutoReplyRules } from './ui/AutoReplyRules';
import { EngageAnalytics } from './ui/EngageAnalytics';

type TabType = 'activity' | 'conversations' | 'rules' | 'analytics';

const tabs: { id: TabType; label: string; icon: string; desc: string }[] = [
  { id: 'activity', label: 'Activity', icon: '📡', desc: 'Live feed' },
  { id: 'conversations', label: 'Conversations', icon: '💬', desc: 'Message threads' },
  { id: 'rules', label: 'Auto-Reply', icon: '⚡', desc: 'Automation rules' },
  { id: 'analytics', label: 'Analytics', icon: '📊', desc: 'Engagement stats' },
];

function EngageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const validTabs: TabType[] = ['activity', 'conversations', 'rules', 'analytics'];
  const urlTab = searchParams.get('tab') as TabType | null;
  const initialTab: TabType = urlTab && validTabs.includes(urlTab) ? urlTab : 'activity';
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  const handleTabChange = useCallback((newTab: TabType) => {
    setActiveTab(newTab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', newTab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchParams, pathname, router]);

  useEffect(() => {
    const urlTabParam = searchParams.get('tab') as TabType | null;
    if (urlTabParam && validTabs.includes(urlTabParam) && urlTabParam !== activeTab) {
      setActiveTab(urlTabParam);
    }
  }, [searchParams, activeTab]);

  return (
    <div style={{ position: 'relative', minHeight: '100%' }}>
      {/* Decorative background glows */}
      <div style={{
        position: 'absolute',
        top: '-120px',
        right: '-80px',
        width: '500px',
        height: '500px',
        background: 'radial-gradient(circle, rgba(138,43,226,0.15) 0%, transparent 70%)',
        filter: 'blur(80px)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />
      <div style={{
        position: 'absolute',
        top: '200px',
        left: '-100px',
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(255,0,110,0.1) 0%, transparent 70%)',
        filter: 'blur(80px)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, rgba(255,0,110,0.2) 0%, rgba(138,43,226,0.2) 100%)',
              border: '1px solid rgba(255,0,110,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
            }}>
              💬
            </div>
            <div>
              <h1 style={{
                fontSize: '28px',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #FF6B9D 0%, #C77DFF 50%, #00D4D4 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                margin: 0,
                lineHeight: 1.2,
              }}>
                Engage
              </h1>
              <p style={{ color: '#888', fontSize: '14px', margin: '4px 0 0 0' }}>
                Auto follow-up, manage conversations, and automate your social replies
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '8px',
          marginBottom: '32px',
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
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '14px 12px',
                  borderRadius: '12px',
                  border: isActive ? '1px solid rgba(255,0,110,0.4)' : '1px solid transparent',
                  background: isActive
                    ? 'linear-gradient(135deg, rgba(255,0,110,0.15) 0%, rgba(138,43,226,0.15) 100%)'
                    : 'transparent',
                  color: isActive ? '#fff' : '#888',
                  fontSize: '13px',
                  fontWeight: isActive ? 600 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: isActive ? '0 4px 20px rgba(255,0,110,0.15)' : 'none',
                }}
              >
                <span style={{ fontSize: '22px', lineHeight: 1 }}>{tab.icon}</span>
                <span>{tab.label}</span>
                <span style={{
                  fontSize: '10px',
                  color: isActive ? 'rgba(255,255,255,0.5)' : '#555',
                  fontWeight: 400,
                }}>{tab.desc}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div style={{ minHeight: '500px' }}>
          {activeTab === 'activity' && <ActivityFeed />}
          {activeTab === 'conversations' && <ConversationList />}
          {activeTab === 'rules' && <AutoReplyRules />}
          {activeTab === 'analytics' && <EngageAnalytics />}
        </div>
      </div>
    </div>
  );
}

function EngageLoading() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '400px',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid rgba(255,107,157,0.3)',
          borderTopColor: '#FF6B9D',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 16px',
        }} />
        <p style={{ color: '#888' }}>Loading engagement hub...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}

export default function SpaceBaddieEngagePage() {
  return (
    <DashboardShell>
      <div style={{ padding: '32px', minHeight: '100%' }}>
        <Suspense fallback={<EngageLoading />}>
          <EngageContent />
        </Suspense>
      </div>
    </DashboardShell>
  );
}
