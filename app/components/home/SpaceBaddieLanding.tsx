'use client';

import { useState } from 'react';
import Link from 'next/link';

export function SpaceBaddieLanding() {
  const [hoveredTier, setHoveredTier] = useState<string | null>(null);

  const gradientTextStyle = {
    background: 'linear-gradient(120deg, #ec4899 0%, #a855f7 45%, #22d3ee 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    color: 'transparent'
  } as const;

  return (
    <main style={{ minHeight: '100vh', background: '#0a0a0f', color: '#ffffff' }}>
      <section
        style={{
          position: 'relative',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          padding: '80px 16px'
        }}
      >
        <div style={{ position: 'absolute', inset: 0 }}>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(135deg, #1a0a2e, #0a0a1a 45%, #0a1a1a)'
            }}
          />
          <div style={{ position: 'absolute', inset: 0, opacity: 0.35 }}>
            <div
              style={{
                position: 'absolute',
                top: '20%',
                left: '20%',
                width: 320,
                height: 320,
                borderRadius: '50%',
                background: 'rgba(147, 51, 234, 0.25)',
                filter: 'blur(120px)'
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: '18%',
                right: '18%',
                width: 360,
                height: 360,
                borderRadius: '50%',
                background: 'rgba(236, 72, 153, 0.22)',
                filter: 'blur(140px)'
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: '45%',
                right: '28%',
                width: 240,
                height: 240,
                borderRadius: '50%',
                background: 'rgba(34, 211, 238, 0.2)',
                filter: 'blur(110px)'
              }}
            />
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 900, textAlign: 'center' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              borderRadius: 999,
              padding: '8px 16px',
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.04)',
              fontSize: 13,
              marginBottom: 24
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: 999, background: '#22c55e', display: 'inline-block' }} />
            <span style={{ color: 'rgba(255,255,255,0.7)' }}>Video Creation Platform</span>
          </div>

          <h1 style={{ fontSize: 'clamp(36px, 6vw, 72px)', fontWeight: 700, lineHeight: 1.1, marginBottom: 20 }}>
            <span style={gradientTextStyle}>SpaceBaddie</span>
            <br />
            <span style={{ color: '#ffffff' }}>Studio</span>
          </h1>

          <p
            style={{
              fontSize: 'clamp(16px, 2.4vw, 22px)',
              color: 'rgba(255,255,255,0.7)',
              maxWidth: 620,
              margin: '0 auto 32px'
            }}
          >
            Create stunning videos with AI-powered avatars, automated posting, and intelligent content optimization.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center' }}>
            <Link
              href="/spacebaddie/studio"
              style={{
                padding: '14px 28px',
                borderRadius: 14,
                background: 'linear-gradient(135deg, #ec4899, #a855f7)',
                color: '#ffffff',
                fontWeight: 600,
                textDecoration: 'none',
                boxShadow: '0 12px 32px rgba(168,85,247,0.35)'
              }}
            >
              Launch Studio
            </Link>
            <Link
              href="#pricing"
              style={{
                padding: '14px 28px',
                borderRadius: 14,
                border: '1px solid rgba(255,255,255,0.18)',
                background: 'rgba(255,255,255,0.04)',
                color: 'rgba(255,255,255,0.85)',
                fontWeight: 600,
                textDecoration: 'none'
              }}
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      <section style={{ padding: '90px 16px', background: '#0f0f1a' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 'clamp(26px, 4vw, 40px)', marginBottom: 48 }}>
            <span style={gradientTextStyle}>Powerful Features</span>
          </h2>

          <div
            style={{
              display: 'grid',
              gap: 24,
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))'
            }}
          >
            {[
              {
                icon: '🎬',
                title: 'AI Video Creation',
                description: 'Generate professional videos with AI avatars, effects, and automated editing.'
              },
              {
                icon: '📱',
                title: 'Social Automation',
                description: 'Schedule and auto-post to TikTok, YouTube, Instagram, and more.'
              },
              {
                icon: '📊',
                title: 'Analytics Dashboard',
                description: 'Track performance, engagement, and optimize your content strategy.'
              },
              {
                icon: '🎨',
                title: 'Custom Avatars',
                description: 'Create unique AI avatars that represent your brand.'
              },
              {
                icon: '🔄',
                title: 'CRM Integration',
                description: 'Manage leads and convert viewers into customers.'
              },
              {
                icon: '⚡',
                title: 'Real-time Rendering',
                description: 'Fast video processing on our dedicated infrastructure.'
              }
            ].map((feature, index) => (
              <div
                key={index}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 18,
                  padding: 24
                }}
              >
                <div style={{ fontSize: 28, marginBottom: 12 }}>{feature.icon}</div>
                <h3 style={{ fontSize: 18, marginBottom: 8 }}>{feature.title}</h3>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" style={{ padding: '90px 16px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 'clamp(26px, 4vw, 40px)', marginBottom: 12 }}>
            <span style={gradientTextStyle}>Choose Your Plan</span>
          </h2>
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)', marginBottom: 48 }}>
            Start free and scale as you grow. All plans include core features.
          </p>

          <div
            style={{
              display: 'grid',
              gap: 24,
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))'
            }}
          >
            {[
              {
                name: 'Free',
                price: '$0',
                period: '/month',
                features: ['5 videos/month', 'Basic avatar', '720p export', 'Community support'],
                cta: 'Get Started',
                popular: false
              },
              {
                name: 'Pro',
                price: '$29',
                period: '/month',
                features: ['Unlimited videos', 'Custom avatars', '1080p export', 'Social automation', 'Priority support', 'CRM access'],
                cta: 'Subscribe Now',
                popular: true
              },
              {
                name: 'Enterprise',
                price: '$99',
                period: '/month',
                features: ['Everything in Pro', '4K export', 'API access', 'White-label option', 'Dedicated support', 'Custom integrations'],
                cta: 'Contact Sales',
                popular: false
              }
            ].map((tier, index) => {
              const isHovered = hoveredTier === tier.name;
              const isPopular = tier.popular;
              return (
                <div
                  key={index}
                  onMouseEnter={() => setHoveredTier(tier.name)}
                  onMouseLeave={() => setHoveredTier(null)}
                  style={{
                    position: 'relative',
                    background: 'rgba(255,255,255,0.04)',
                    borderRadius: 18,
                    padding: 28,
                    border: `1px solid ${isPopular ? '#a855f7' : isHovered ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)'}`,
                    transform: isPopular ? 'scale(1.03)' : 'scale(1)',
                    transition: 'all 150ms ease'
                  }}
                >
                  {isPopular && (
                    <div
                      style={{
                        position: 'absolute',
                        top: -14,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        padding: '6px 14px',
                        borderRadius: 999,
                        background: 'linear-gradient(135deg, #ec4899, #a855f7)',
                        fontSize: 12,
                        fontWeight: 600
                      }}
                    >
                      Most Popular
                    </div>
                  )}

                  <h3 style={{ fontSize: 20, marginBottom: 12 }}>{tier.name}</h3>
                  <div style={{ marginBottom: 20 }}>
                    <span style={{ fontSize: 32, fontWeight: 700 }}>{tier.price}</span>
                    <span style={{ color: 'rgba(255,255,255,0.55)', marginLeft: 6 }}>{tier.period}</span>
                  </div>

                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', color: 'rgba(255,255,255,0.7)' }}>
                    {tier.features.map((feature, fIndex) => (
                      <li key={fIndex} style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: '#22c55e' }}>✓</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={tier.name === 'Free' ? '/spacebaddie/login' : `/spacebaddie/login?plan=${tier.name.toLowerCase()}`}
                    style={{
                      display: 'block',
                      textAlign: 'center',
                      padding: '12px 16px',
                      borderRadius: 12,
                      fontWeight: 600,
                      textDecoration: 'none',
                      background: isPopular ? 'linear-gradient(135deg, #ec4899, #a855f7)' : 'rgba(255,255,255,0.1)',
                      color: '#ffffff'
                    }}
                  >
                    {tier.cta}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <footer style={{ padding: '48px 16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>
            <span style={gradientTextStyle}>SpaceBaddie</span>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 20 }}>
            Powered by XOM3 Technology
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, flexWrap: 'wrap' }}>
            <Link href="/privacy" style={{ color: 'rgba(255,255,255,0.65)', textDecoration: 'none' }}>Privacy</Link>
            <Link href="/terms" style={{ color: 'rgba(255,255,255,0.65)', textDecoration: 'none' }}>Terms</Link>
            <Link href="mailto:support@spacebaddie.com" style={{ color: 'rgba(255,255,255,0.65)', textDecoration: 'none' }}>
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
