'use client';

import Link from 'next/link';

export function FooterSection() {
  return (
    <footer style={{
      padding: '64px 32px 48px',
      background: 'rgba(5, 8, 16, 0.98)',
      borderTop: '1px solid rgba(255, 255, 255, 0.06)',
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
      }}>
        {/* Main Footer Content */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '48px',
          marginBottom: '48px',
        }}>
          {/* Brand */}
          <div>
            <div style={{
              fontSize: '24px',
              fontWeight: 800,
              color: '#ffffff',
              fontFamily: 'var(--font-mono)',
              marginBottom: '12px',
            }}>
              X.O.M3
            </div>
            <div style={{
              fontSize: '14px',
              color: 'rgba(247, 248, 255, 0.5)',
              lineHeight: 1.6,
            }}>
              The Xtension of Me.<br />
              Your business, automated.
            </div>
          </div>

          {/* Product */}
          <div>
            <div style={{
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '0.1em',
              color: 'rgba(247, 248, 255, 0.4)',
              textTransform: 'uppercase',
              marginBottom: '16px',
            }}>
              Product
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Link href="/how-it-works" style={{ fontSize: '14px', color: 'rgba(247, 248, 255, 0.7)', textDecoration: 'none' }}>
                How It Works
              </Link>
              <Link href="/pricing" style={{ fontSize: '14px', color: 'rgba(247, 248, 255, 0.7)', textDecoration: 'none' }}>
                Pricing
              </Link>
              <Link href="/proposal" style={{ fontSize: '14px', color: 'rgba(247, 248, 255, 0.7)', textDecoration: 'none' }}>
                Custom Build
              </Link>
            </div>
          </div>

          {/* Get Started */}
          <div>
            <div style={{
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '0.1em',
              color: 'rgba(247, 248, 255, 0.4)',
              textTransform: 'uppercase',
              marginBottom: '16px',
            }}>
              Get Started
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Link href="/pricing" style={{ fontSize: '14px', color: 'rgba(247, 248, 255, 0.7)', textDecoration: 'none' }}>
                Start Free Trial
              </Link>
              <Link href="/login" style={{ fontSize: '14px', color: 'rgba(247, 248, 255, 0.7)', textDecoration: 'none' }}>
                Login
              </Link>
              <Link href="/dev" style={{ fontSize: '14px', color: 'rgba(247, 248, 255, 0.7)', textDecoration: 'none' }}>
                🚀 Development Hub
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div style={{
          paddingTop: '24px',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}>
          <div style={{
            fontSize: '13px',
            color: 'rgba(247, 248, 255, 0.35)',
          }}>
            © {new Date().getFullYear()} X.O.M3. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
