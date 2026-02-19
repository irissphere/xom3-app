'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { getTierConfig } from '@/lib/tiers/features';
import { SubscriptionTier } from '@/lib/tiers/types';

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <path 
        d="M13.5 4.5L6.5 11.5L3 8" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');

  const tierParam = searchParams.get('tier') as SubscriptionTier | null;
  const tier = tierParam && ['starter', 'growth', 'pro', 'enterprise'].includes(tierParam) 
    ? getTierConfig(tierParam) 
    : null;

  if (!tier) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(180deg, #070b14, #050810)',
        padding: '24px',
      }}>
        <div style={{
          textAlign: 'center',
          maxWidth: '400px',
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'rgba(234, 179, 8, 0.15)',
            border: '1px solid rgba(234, 179, 8, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            fontSize: '28px',
          }}>
            ⚠️
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#ffffff', marginBottom: '12px' }}>
            Invalid Plan Selected
          </h1>
          <p style={{ fontSize: '15px', color: '#94a3b8', marginBottom: '24px' }}>
            Please select a valid plan from our pricing page.
          </p>
          <Link
            href="/pricing"
            style={{
              display: 'inline-block',
              padding: '14px 28px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #0a84ff, #6366f1)',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '15px',
              textDecoration: 'none',
            }}
          >
            View Pricing
          </Link>
        </div>
      </div>
    );
  }

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Call Stripe checkout API
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier: tier.id,
          email,
          name,
        }),
      });

      const data = await res.json();

      if (data.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else if (data.success) {
        // For demo/test mode, go to success page
        router.push('/subscription/success?tier=' + tier.id);
      } else {
        throw new Error(data.error || 'Checkout failed');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Checkout failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #070b14, #050810)',
      padding: '80px 24px 120px',
      color: '#e2e8f0',
    }}>
      {/* Top Nav */}
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
        gap: '16px',
      }}>
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
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 6L8 2L14 6V13C14 13.5523 13.5523 14 13 14H3C2.44772 14 2 13.5523 2 13V6Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M6 14V8H10V14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Home
        </Link>
        <Link 
          href="/pricing"
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
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 11L5 7L9 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to Pricing
        </Link>
      </nav>

      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h1 style={{
            fontSize: 'clamp(28px, 4vw, 40px)',
            fontWeight: 800,
            color: '#ffffff',
            marginBottom: '12px',
            letterSpacing: '-0.03em',
          }}>
            Complete Your Subscription
          </h1>
          <p style={{ fontSize: '16px', color: '#94a3b8' }}>
            You&apos;re subscribing to the <strong style={{ color: '#22d3ee' }}>{tier.name}</strong> plan
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '32px',
        }}>
          {/* Left: Order Summary */}
          <div style={{
            padding: '32px',
            borderRadius: '20px',
            background: 'linear-gradient(180deg, rgba(10, 14, 26, 0.88), rgba(12, 18, 34, 0.72))',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(14px)',
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff', marginBottom: '24px' }}>
              Order Summary
            </h2>

            <div style={{
              padding: '20px',
              borderRadius: '14px',
              background: 'rgba(10, 132, 255, 0.08)',
              border: '1px solid rgba(10, 132, 255, 0.2)',
              marginBottom: '24px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '16px', fontWeight: 600, color: '#ffffff' }}>{tier.name} Plan</span>
                <span style={{ fontSize: '24px', fontWeight: 700, color: '#22d3ee' }}>
                  {tier.priceLabel}
                </span>
              </div>
              <p style={{ fontSize: '13px', color: '#64748b' }}>{tier.description}</p>
            </div>

            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#94a3b8', marginBottom: '16px', letterSpacing: '0.05em' }}>
              INCLUDED FEATURES
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {tier.features.slice(0, 6).map((feature, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#cbd5e1' }}>
                  <span style={{ color: '#22d3ee' }}><CheckIcon /></span>
                  {feature}
                </li>
              ))}
            </ul>

            <div style={{
              marginTop: '24px',
              paddingTop: '20px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#94a3b8' }}>Subtotal</span>
                <span style={{ color: '#ffffff' }}>{tier.priceLabel}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                <span style={{ color: '#94a3b8' }}>Trial Period</span>
                <span style={{ color: '#22c55e' }}>30 days free</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <span style={{ fontWeight: 600, color: '#ffffff' }}>Due Today</span>
                <span style={{ fontWeight: 700, fontSize: '18px', color: '#22d3ee' }}>$0.00</span>
              </div>
              <p style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>
                You won&apos;t be charged until your trial ends. Cancel anytime.
              </p>
            </div>
          </div>

          {/* Right: Checkout Form */}
          <div style={{
            padding: '32px',
            borderRadius: '20px',
            background: 'linear-gradient(180deg, rgba(10, 14, 26, 0.88), rgba(12, 18, 34, 0.72))',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(14px)',
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff', marginBottom: '24px' }}>
              Your Information
            </h2>

            <form onSubmit={handleCheckout}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#94a3b8', marginBottom: '8px' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#ffffff',
                    fontSize: '15px',
                    outline: 'none',
                  }}
                  placeholder="John Smith"
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#94a3b8', marginBottom: '8px' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#ffffff',
                    fontSize: '15px',
                    outline: 'none',
                  }}
                  placeholder="john@company.com"
                />
              </div>

              <div style={{
                padding: '16px',
                borderRadius: '10px',
                background: 'rgba(34, 197, 94, 0.08)',
                border: '1px solid rgba(34, 197, 94, 0.2)',
                marginBottom: '24px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '18px' }}>🎉</span>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#22c55e' }}>
                      30-Day Free Trial
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      No credit card required. Full access to all features.
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '16px 24px',
                  borderRadius: '12px',
                  background: loading 
                    ? 'rgba(99, 102, 241, 0.5)' 
                    : 'linear-gradient(135deg, #0a84ff, #6366f1)',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '16px',
                  cursor: loading ? 'wait' : 'pointer',
                  transition: 'all 150ms ease',
                  boxShadow: '0 8px 24px rgba(10, 132, 255, 0.25)',
                }}
              >
                {loading ? 'Processing...' : 'Start Free Trial'}
              </button>

              <p style={{ 
                fontSize: '12px', 
                color: '#64748b', 
                textAlign: 'center', 
                marginTop: '16px',
                lineHeight: 1.5,
              }}>
                By clicking &quot;Start Free Trial&quot;, you agree to our Terms of Service and Privacy Policy.
                You can cancel anytime during the trial period.
              </p>
            </form>
          </div>
        </div>

        {/* Trust Signals */}
        <div style={{
          marginTop: '48px',
          display: 'flex',
          justifyContent: 'center',
          gap: '32px',
          flexWrap: 'wrap',
          fontSize: '14px',
          color: '#64748b',
        }}>
          <span>🔒 Secure checkout</span>
          <span>✓ Cancel anytime</span>
          <span>✓ No credit card required</span>
          <span>✓ 24/7 support</span>
        </div>
      </div>

      <style jsx>{`
        input:focus {
          border-color: rgba(10, 132, 255, 0.5);
          box-shadow: 0 0 0 3px rgba(10, 132, 255, 0.1);
        }
        @media (max-width: 768px) {
          div[style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(180deg, #070b14, #050810)',
        color: '#ffffff',
      }}>
        Loading checkout...
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
