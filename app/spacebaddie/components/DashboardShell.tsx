'use client';

import { useState, useEffect, ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

interface DashboardShellProps {
  children: ReactNode;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  tier: 'free' | 'pro' | 'enterprise';
  balance: number | null;
  hasTradingAccess: boolean;
}

// Preston's email for trading access
const TRADING_ALLOWED_EMAILS = ['preston.chenault@xom3.io'];

const NAV_ITEMS = [
  { href: '/spacebaddie/dashboard', label: 'Dashboard', icon: '🏠' },
  { href: '/spacebaddie/studio', label: 'Studio', icon: '🎬' },
  { href: '/spacebaddie/projects', label: 'Projects', icon: '📁' },
  { href: '/spacebaddie/automation', label: 'Automation', icon: '🚀' },
  { href: '/spacebaddie/engage', label: 'Engage', icon: '💬' },
  { href: 'https://xom3.io/shop', label: 'Store', icon: '🛒', external: true },
  { href: '/spacebaddie/insights', label: 'Insights', icon: '📊' },
];

const TRADING_NAV = { href: '/spacebaddie/trading', label: 'Trading', icon: '💰' };

const BOTTOM_ITEMS = [
  { href: '/spacebaddie/settings', label: 'Settings', icon: '⚙️' },
];

export default function DashboardShell({ children }: DashboardShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    tier: 'free',
    balance: null,
    hasTradingAccess: false,
  });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Check if user has trading access
          const hasTradingAccess = user.email ? TRADING_ALLOWED_EMAILS.includes(user.email.toLowerCase()) : false;
          
          // All logged-in users get Pro during promotional period (until Aug 6, 2026)
          setAuthState({
            user,
            loading: false,
            tier: 'pro',
            balance: null,
            hasTradingAccess,
          });
          
          // Fetch user's credit balance
          fetchBalance();
        } else {
          setAuthState({ user: null, loading: false, tier: 'free', balance: null, hasTradingAccess: false });
        }
      } catch {
        setAuthState(prev => ({ ...prev, loading: false }));
      }
    };
    checkAuth();
  }, []);

  const fetchBalance = async () => {
    try {
      const response = await fetch('/api/credits/balance');
      if (response.ok) {
        const data = await response.json();
        setAuthState(prev => ({ ...prev, balance: data.balance ?? data.credits ?? 0 }));
      }
    } catch (error) {
      console.error('Failed to fetch balance:', error);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/spacebaddie';
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a0f' }}>
      {/* Sidebar */}
      <aside style={{
        width: sidebarOpen ? '240px' : '64px',
        background: 'rgba(0,0,0,0.5)',
        borderRight: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s ease',
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <Link href="/spacebaddie" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>🎬</span>
            {sidebarOpen && (
              <span style={{
                fontSize: '18px',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #FF6B9D 0%, #C77DFF 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                SpaceBaddie
              </span>
            )}
          </Link>
        </div>

        {/* Nav Items */}
        <nav style={{ flex: 1, padding: '16px 8px' }}>
          {/* Build nav items dynamically - add Trading if user has access */}
          {[...NAV_ITEMS, ...(authState.hasTradingAccess ? [TRADING_NAV] : [])].map(item => {
            const isExternal = 'external' in item && item.external;
            const isActive = !isExternal && (pathname === item.href || pathname?.startsWith(item.href + '/'));
            const linkStyle = {
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              marginBottom: '4px',
              borderRadius: '8px',
              textDecoration: 'none',
              color: isActive ? '#fff' : '#888',
              background: isActive ? 'linear-gradient(135deg, rgba(255,0,110,0.2) 0%, rgba(138,43,226,0.2) 100%)' : 'transparent',
              transition: 'all 0.2s ease',
            };
            if (isExternal) {
              return (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={linkStyle}
                >
                  <span style={{ fontSize: '20px' }}>{item.icon}</span>
                  {sidebarOpen && <span style={{ fontSize: '14px', fontWeight: 500 }}>{item.label}</span>}
                </a>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                style={linkStyle}
              >
                <span style={{ fontSize: '20px' }}>{item.icon}</span>
                {sidebarOpen && <span style={{ fontSize: '14px', fontWeight: 500 }}>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Items */}
        <div style={{ padding: '16px 8px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          {BOTTOM_ITEMS.map(item => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                borderRadius: '8px',
                textDecoration: 'none',
                color: '#888',
              }}
            >
              <span style={{ fontSize: '20px' }}>{item.icon}</span>
              {sidebarOpen && <span style={{ fontSize: '14px' }}>{item.label}</span>}
            </Link>
          ))}

          {/* Pro Badge (shown for all logged-in users during promotional period) */}
          {authState.user && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                marginTop: '8px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, rgba(138,43,226,0.2) 0%, rgba(0,200,200,0.2) 100%)',
                border: '1px solid rgba(138,43,226,0.3)',
                color: '#fff',
              }}
            >
              <span style={{ fontSize: '20px' }}>✨</span>
              {sidebarOpen && <span style={{ fontSize: '14px', fontWeight: 600, color: '#a78bfa' }}>Pro Active</span>}
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <header style={{
          height: '64px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          background: 'rgba(0,0,0,0.3)',
        }}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#888',
              cursor: 'pointer',
              fontSize: '20px',
            }}
          >
            ☰
          </button>

          {/* Balance & User Menu */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Credit Balance Display */}
            {authState.user && authState.balance !== null && (
              <Link
                href="/spacebaddie/pricing"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  background: 'linear-gradient(135deg, rgba(0,212,212,0.15) 0%, rgba(138,43,226,0.15) 100%)',
                  border: '1px solid rgba(0,212,212,0.3)',
                  borderRadius: '24px',
                  textDecoration: 'none',
                  color: '#fff',
                  transition: 'all 0.2s ease',
                }}
              >
                <span style={{ fontSize: '16px' }}>💎</span>
                <span style={{ fontWeight: 600, color: '#00D4D4' }}>
                  {authState.balance.toLocaleString()}
                </span>
                <span style={{ fontSize: '12px', color: '#888' }}>credits</span>
              </Link>
            )}

            {/* User Menu */}
            <div style={{ position: 'relative' }}>
            {authState.loading ? (
              <span style={{ color: '#888' }}>...</span>
            ) : authState.user ? (
              <>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'rgba(255,255,255,0.1)',
                    border: 'none',
                    borderRadius: '24px',
                    padding: '8px 16px',
                    color: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}>
                    {authState.user.email?.charAt(0).toUpperCase()}
                  </span>
                  {authState.tier !== 'free' && (
                    <span style={{
                      background: 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                    }}>
                      {authState.tier}
                    </span>
                  )}
                </button>

                {showUserMenu && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '8px',
                    background: 'rgba(30, 20, 40, 0.95)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    padding: '8px',
                    minWidth: '180px',
                    zIndex: 100,
                  }}>
                    <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '4px' }}>
                      <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>Signed in as</p>
                      <p style={{ fontSize: '14px', margin: '4px 0 0 0', color: '#fff' }}>{authState.user.email}</p>
                    </div>
                    <button
                      onClick={handleSignOut}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        color: '#ff6b6b',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        textAlign: 'left',
                        cursor: 'pointer',
                      }}
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </>
            ) : (
              <Link
                href="/spacebaddie/login"
                style={{
                  padding: '8px 16px',
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#fff',
                  textDecoration: 'none',
                }}
              >
                Sign In
              </Link>
            )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main style={{ flex: 1, overflow: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
