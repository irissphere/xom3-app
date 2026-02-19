'use client';

import React, { useState } from 'react';
import Link from 'next/link';

const creditPackages = [
  {
    credits: 50,
    price: 4.99,
    label: 'Starter',
    bonus: 0,
    videos: '~10 videos',
    popular: false,
  },
  {
    credits: 150,
    price: 12.99,
    label: 'Creator',
    bonus: 15,
    videos: '~33 videos',
    popular: true,
  },
  {
    credits: 500,
    price: 39.99,
    label: 'Pro',
    bonus: 75,
    videos: '~115 videos',
    popular: false,
  },
  {
    credits: 2000,
    price: 149.99,
    label: 'Studio',
    bonus: 400,
    videos: '~480 videos',
    popular: false,
  },
];

const subscriptionPlans = [
  {
    name: 'Free',
    price: 0,
    label: '$0/mo',
    features: ['5 videos/month', '720p resolution', 'Basic analytics', 'Email support'],
    cta: 'Current Plan',
    tier: 'free',
    popular: false,
  },
  {
    name: 'Pro',
    price: 29,
    label: '$29/mo',
    features: ['Unlimited videos', '4K resolution', 'Auto-posting to 6 platforms', 'AI content insights', 'Priority rendering'],
    cta: 'Upgrade to Pro',
    tier: 'pro',
    popular: true,
  },
  {
    name: 'Enterprise',
    price: 99,
    label: '$99/mo',
    features: ['Everything in Pro', 'API access', 'White-label branding', 'Unlimited platforms', 'Priority support', 'Custom integrations'],
    cta: 'Go Enterprise',
    tier: 'enterprise',
    popular: false,
  },
];

export default function PricingPage() {
  const [buyingCredits, setBuyingCredits] = useState<string | null>(null);
  const [subscribing, setSubscribing] = useState<string | null>(null);

  const handleBuyCredits = async (pkg: typeof creditPackages[number]) => {
    setBuyingCredits(pkg.label);
    try {
      const res = await fetch('/api/stripe/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount_cents: Math.round(pkg.price * 100),
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (data.error) {
        alert(data.error);
      }
    } catch (err) {
      console.error('Credit purchase error:', err);
      alert('Unable to start checkout. Please try again.');
    } finally {
      setBuyingCredits(null);
    }
  };

  const handleSubscribe = async (plan: typeof subscriptionPlans[number]) => {
    if (plan.tier === 'free') return;
    setSubscribing(plan.tier);
    try {
      const res = await fetch('/api/spacebaddie/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: plan.tier }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (data.error) {
        alert(data.error);
      }
    } catch (err) {
      console.error('Subscription error:', err);
      alert('Unable to start checkout. Please try again.');
    } finally {
      setSubscribing(null);
    }
  };

  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0f 0%, #1a0a1f 50%, #0a0a0f 100%)',
      color: '#fff',
      padding: '80px 24px',
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <Link href="/spacebaddie/dashboard" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '9999px',
            fontSize: '14px',
            color: '#888',
            textDecoration: 'none',
            marginBottom: '32px',
          }}>
            ← Back to Dashboard
          </Link>
          <h1 style={{
            fontSize: '48px',
            fontWeight: 800,
            marginBottom: '16px',
            background: 'linear-gradient(135deg, #fff 0%, #888 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            Pay As You Go
          </h1>
          <p style={{ color: '#888', fontSize: '20px', maxWidth: '600px', margin: '0 auto' }}>
            Only pay for the videos you create. No subscriptions, no hidden fees.
          </p>
        </div>

        {/* Pricing Info */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '48px',
          maxWidth: '800px',
          margin: '0 auto 48px',
        }}>
          <div style={{
            padding: '24px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px',
            textAlign: 'center',
          }}>
            <p style={{ fontSize: '14px', color: '#888', marginBottom: '8px' }}>Basic Video (15s)</p>
            <p style={{ fontSize: '32px', fontWeight: 700, color: '#FF6B9D' }}>5 credits</p>
            <p style={{ fontSize: '14px', color: '#666' }}>~$0.50 per video</p>
          </div>
          <div style={{
            padding: '24px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px',
            textAlign: 'center',
          }}>
            <p style={{ fontSize: '14px', color: '#888', marginBottom: '8px' }}>30s Video</p>
            <p style={{ fontSize: '32px', fontWeight: 700, color: '#C77DFF' }}>8 credits</p>
            <p style={{ fontSize: '14px', color: '#666' }}>~$0.80 per video</p>
          </div>
          <div style={{
            padding: '24px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px',
            textAlign: 'center',
          }}>
            <p style={{ fontSize: '14px', color: '#888', marginBottom: '8px' }}>60s Video</p>
            <p style={{ fontSize: '32px', fontWeight: 700, color: '#00D4D4' }}>14 credits</p>
            <p style={{ fontSize: '14px', color: '#666' }}>~$1.40 per video</p>
          </div>
        </div>

        {/* Credit Packages */}
        <h2 style={{ fontSize: '32px', fontWeight: 700, textAlign: 'center', marginBottom: '32px' }}>
          Credit Packages
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '24px',
          marginBottom: '64px',
        }}>
          {creditPackages.map((pkg) => (
            <div
              key={pkg.label}
              style={{
                position: 'relative',
                padding: '32px',
                background: pkg.popular
                  ? 'linear-gradient(135deg, rgba(255,0,110,0.1) 0%, rgba(138,43,226,0.1) 100%)'
                  : 'rgba(255,255,255,0.05)',
                border: pkg.popular
                  ? '2px solid rgba(255,0,110,0.5)'
                  : '1px solid rgba(255,255,255,0.1)',
                borderRadius: '24px',
                textAlign: 'center',
                transform: pkg.popular ? 'scale(1.05)' : 'none',
              }}
            >
              {pkg.popular && (
                <div style={{
                  position: 'absolute',
                  top: '-12px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  padding: '4px 16px',
                  background: 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)',
                  borderRadius: '9999px',
                  fontSize: '12px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                }}>
                  Best Value
                </div>
              )}

              <h3 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>{pkg.label}</h3>
              <div style={{ marginBottom: '16px' }}>
                <span style={{ fontSize: '48px', fontWeight: 800 }}>${pkg.price}</span>
              </div>
              
              <div style={{
                padding: '16px',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '12px',
                marginBottom: '16px',
              }}>
                <p style={{ fontSize: '32px', fontWeight: 700, color: '#FF6B9D' }}>
                  {pkg.credits + pkg.bonus}
                </p>
                <p style={{ fontSize: '14px', color: '#888' }}>credits</p>
                {pkg.bonus > 0 && (
                  <p style={{ fontSize: '12px', color: '#22c55e', marginTop: '4px' }}>
                    +{pkg.bonus} bonus credits!
                  </p>
                )}
              </div>

              <p style={{ color: '#888', marginBottom: '24px' }}>{pkg.videos}</p>

              <button
                onClick={() => handleBuyCredits(pkg)}
                disabled={buyingCredits === pkg.label}
                style={{
                  width: '100%',
                  padding: '16px',
                  background: buyingCredits === pkg.label
                    ? 'rgba(255,255,255,0.1)'
                    : pkg.popular
                      ? 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)'
                      : 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: '12px',
                  fontWeight: 700,
                  color: '#fff',
                  cursor: buyingCredits === pkg.label ? 'not-allowed' : 'pointer',
                  opacity: buyingCredits && buyingCredits !== pkg.label ? 0.5 : 1,
                  transition: 'all 0.2s',
                }}
              >
                {buyingCredits === pkg.label ? 'Redirecting to checkout...' : 'Buy Credits'}
              </button>
            </div>
          ))}
        </div>

        {/* Subscription Plans */}
        <div style={{ marginBottom: '64px' }}>
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <div style={{
              display: 'inline-block',
              padding: '6px 16px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '9999px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#888',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: '16px',
            }}>
              OR SUBSCRIBE FOR MORE
            </div>
          </div>
          <h2 style={{ fontSize: '32px', fontWeight: 700, textAlign: 'center', marginBottom: '12px' }}>
            Monthly Plans
          </h2>
          <p style={{ textAlign: 'center', color: '#888', marginBottom: '32px', maxWidth: '500px', margin: '0 auto 32px' }}>
            Get unlimited access and premium features with a monthly subscription.
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '24px',
          }}>
            {subscriptionPlans.map((plan) => (
              <div
                key={plan.tier}
                style={{
                  position: 'relative',
                  padding: '32px',
                  background: plan.popular
                    ? 'linear-gradient(135deg, rgba(255,0,110,0.1) 0%, rgba(138,43,226,0.1) 100%)'
                    : 'rgba(255,255,255,0.05)',
                  border: plan.popular
                    ? '2px solid rgba(255,0,110,0.5)'
                    : '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '24px',
                  textAlign: 'center',
                  transform: plan.popular ? 'scale(1.05)' : 'none',
                }}
              >
                {plan.popular && (
                  <div style={{
                    position: 'absolute',
                    top: '-12px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    padding: '4px 16px',
                    background: 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)',
                    borderRadius: '9999px',
                    fontSize: '12px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                  }}>
                    Most Popular
                  </div>
                )}

                <h3 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>{plan.name}</h3>
                <div style={{ marginBottom: '24px' }}>
                  <span style={{ fontSize: '48px', fontWeight: 800 }}>
                    {plan.price === 0 ? 'Free' : `$${plan.price}`}
                  </span>
                  {plan.price > 0 && (
                    <span style={{ fontSize: '16px', color: '#888' }}>/mo</span>
                  )}
                </div>

                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  marginBottom: '24px',
                  textAlign: 'left',
                  padding: '0 8px',
                }}>
                  {plan.features.map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#ccc' }}>
                      <span style={{ color: '#22c55e', flexShrink: 0 }}>✓</span> {f}
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handleSubscribe(plan)}
                  disabled={plan.tier === 'free' || subscribing === plan.tier}
                  style={{
                    width: '100%',
                    padding: '16px',
                    background: plan.tier === 'free'
                      ? 'rgba(255,255,255,0.05)'
                      : subscribing === plan.tier
                        ? 'rgba(255,255,255,0.1)'
                        : plan.popular
                          ? 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)'
                          : 'rgba(255,255,255,0.1)',
                    border: plan.tier === 'free' ? '1px solid rgba(255,255,255,0.1)' : 'none',
                    borderRadius: '12px',
                    fontWeight: 700,
                    color: plan.tier === 'free' ? '#666' : '#fff',
                    cursor: plan.tier === 'free' ? 'default' : subscribing === plan.tier ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {subscribing === plan.tier ? 'Redirecting...' : plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Free Videos Info */}
        <div style={{
          padding: '32px',
          background: 'linear-gradient(135deg, rgba(34,197,94,0.1) 0%, rgba(34,197,94,0.05) 100%)',
          border: '1px solid rgba(34,197,94,0.3)',
          borderRadius: '24px',
          textAlign: 'center',
          marginBottom: '64px',
        }}>
          <h3 style={{ fontSize: '24px', fontWeight: 700, color: '#22c55e', marginBottom: '8px' }}>
            New Users Get 3 Free Videos
          </h3>
          <p style={{ color: '#888', maxWidth: '500px', margin: '0 auto' }}>
            Sign up and try SpaceBaddie completely free. No credit card required.
          </p>
        </div>

        {/* FAQ */}
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 700, textAlign: 'center', marginBottom: '32px' }}>
            Questions?
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{
              padding: '24px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '16px',
            }}>
              <h4 style={{ fontWeight: 600, marginBottom: '8px' }}>Do credits expire?</h4>
              <p style={{ color: '#888' }}>No, your credits never expire. Use them whenever you want.</p>
            </div>
            <div style={{
              padding: '24px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '16px',
            }}>
              <h4 style={{ fontWeight: 600, marginBottom: '8px' }}>What affects video cost?</h4>
              <p style={{ color: '#888' }}>Video duration is the main factor. Longer videos cost more credits. A 15-second video costs 5 credits, while a 60-second video costs 14 credits.</p>
            </div>
            <div style={{
              padding: '24px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '16px',
            }}>
              <h4 style={{ fontWeight: 600, marginBottom: '8px' }}>Can I get a refund?</h4>
              <p style={{ color: '#888' }}>If a video fails to generate properly, we'll automatically refund your credits. For other issues, contact support.</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
