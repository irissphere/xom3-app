'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface TopNavProps {
  showBackButton?: boolean;
  backHref?: string;
  backLabel?: string;
}

export function TopNav({ showBackButton = true, backHref, backLabel }: TopNavProps) {
  const pathname = usePathname();
  const isHome = pathname === '/';

  // Don't show on homepage
  if (isHome) return null;

  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      padding: '16px 24px',
      background: 'linear-gradient(180deg, rgba(5, 8, 16, 0.95), rgba(5, 8, 16, 0.8))',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Home Button */}
        <Link 
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '10px',
            background: 'rgba(10, 132, 255, 0.1)',
            border: '1px solid rgba(10, 132, 255, 0.2)',
            color: '#5ac8fa',
            fontSize: '14px',
            fontWeight: 600,
            textDecoration: 'none',
            transition: 'all 150ms ease',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = 'rgba(10, 132, 255, 0.2)';
            e.currentTarget.style.borderColor = 'rgba(10, 132, 255, 0.4)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'rgba(10, 132, 255, 0.1)';
            e.currentTarget.style.borderColor = 'rgba(10, 132, 255, 0.2)';
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path 
              d="M2 6L8 2L14 6V13C14 13.5523 13.5523 14 13 14H3C2.44772 14 2 13.5523 2 13V6Z" 
              stroke="currentColor" 
              strokeWidth="1.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
            <path 
              d="M6 14V8H10V14" 
              stroke="currentColor" 
              strokeWidth="1.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
          Home
        </Link>

        {/* Optional Back Button */}
        {showBackButton && backHref && (
          <Link 
            href={backHref}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#94a3b8',
              fontSize: '13px',
              fontWeight: 500,
              textDecoration: 'none',
              transition: 'all 150ms ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.color = '#e2e8f0';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
              e.currentTarget.style.color = '#94a3b8';
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path 
                d="M9 11L5 7L9 3" 
                stroke="currentColor" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
            {backLabel || 'Back'}
          </Link>
        )}
      </div>

      {/* Right side - Quick links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Link 
          href="/pricing"
          style={{
            padding: '8px 14px',
            borderRadius: '8px',
            color: pathname === '/pricing' ? '#5ac8fa' : '#64748b',
            fontSize: '13px',
            fontWeight: 500,
            textDecoration: 'none',
            transition: 'color 150ms ease',
          }}
          onMouseOver={(e) => e.currentTarget.style.color = '#94a3b8'}
          onMouseOut={(e) => e.currentTarget.style.color = pathname === '/pricing' ? '#5ac8fa' : '#64748b'}
        >
          Pricing
        </Link>
        <Link 
          href="/"
          style={{
            padding: '8px 16px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, rgba(10, 132, 255, 0.9), rgba(99, 102, 241, 0.85))',
            color: '#ffffff',
            fontSize: '13px',
            fontWeight: 600,
            textDecoration: 'none',
            transition: 'all 150ms ease',
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          Open Dashboard
        </Link>
      </div>
    </nav>
  );
}

export default TopNav;
