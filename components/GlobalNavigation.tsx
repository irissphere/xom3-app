/**
 * Global Navigation Component
 * Unified navigation for the entire XOM3 cockpit
 * AKV: Single source, zero drift
 */

"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { colors, typography, radius } from '@/lib/design-system/tokens';

interface NavItem {
  label: string;
  href: string;
  icon?: string;
}

const navItems: NavItem[] = [
  { label: 'Home', href: '/', icon: '🏠' },
  { label: 'Dashboard', href: '/dashboard', icon: '📊' },
  { label: 'Operator Console', href: '/operator/dashboard', icon: '🎛️' },
  { label: 'XOM3', href: '/xom3', icon: '⚡' },
  { label: 'Benefits CRM', href: '/benefits', icon: '🏥' },
  { label: 'Intake CRM', href: '/intakecrm', icon: '📥' },
  { label: 'Broadcast', href: '/broadcast', icon: '📡' },
  { label: 'SpaceBaddie', href: '/spacebaddie', icon: '🎪' },
  { label: 'Social', href: '/social', icon: '🌐' },
  { label: 'UOI', href: '/uoi', icon: '🧠' },
  { label: 'Sovereigns', href: '/sovereigns', icon: '👑' },
  { label: 'HSE', href: '/hse', icon: '💓' },
  { label: 'Rituals', href: '/rituals', icon: '🔄' },
  { label: 'Orchestration', href: '/orchestration', icon: '🎭' },
  { label: 'Revenue Loop', href: '/revenue-loop', icon: '💰' },
];

export default function GlobalNavigation() {
  const pathname = usePathname();

  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      background: 'rgba(5, 8, 16, 0.90)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: `1px solid ${colors.border0}`,
      padding: '0 24px',
    }}>
      <div style={{
        maxWidth: 1600,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        gap: 20,
        overflowX: 'auto',
        height: 56,
      }}>
        {/* Logo */}
        <Link href="/" style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          textDecoration: 'none',
          flexShrink: 0,
        }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: radius.md,
            background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(168, 85, 247, 0.1))',
            border: `1px solid ${colors.primary}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: colors.primary,
            fontSize: 18,
          }}>
            ⚡
          </div>
          <div style={{
            fontFamily: typography.fontFamily.mono,
            fontSize: typography.fontSize.lg,
            fontWeight: typography.fontWeight.bold,
            color: colors.text0,
            letterSpacing: '-0.02em',
          }}>
            XOM3
          </div>
        </Link>

        {/* Nav Items */}
        <div style={{
          display: 'flex',
          gap: 4,
          flex: 1,
          overflowX: 'auto',
          paddingBottom: 2,
        }}>
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  borderRadius: radius.md,
                  textDecoration: 'none',
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.medium,
                  color: isActive ? colors.primary : colors.text2,
                  background: isActive ? 'rgba(6, 182, 212, 0.12)' : 'transparent',
                  border: isActive ? `1px solid rgba(6, 182, 212, 0.3)` : '1px solid transparent',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  whiteSpace: 'nowrap',
                  boxShadow: isActive ? '0 0 20px rgba(6, 182, 212, 0.2)' : 'none',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                    e.currentTarget.style.color = colors.text1;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = colors.text2;
                  }
                }}
              >
                {item.icon && <span style={{ fontSize: 14 }}>{item.icon}</span>}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        nav div::-webkit-scrollbar {
          height: 4px;
        }
        nav div::-webkit-scrollbar-track {
          background: transparent;
        }
        nav div::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }
        nav div::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </nav>
  );
}































