'use client';

import { useState, useEffect, useCallback } from 'react';

interface TierConfig {
  name: string;
  rate: number;
  minSalesCents: number;
  color: string;
  badge: string;
}

interface AffiliateLink {
  id: string;
  code: string;
  url: string;
  product_id: string | null;
  clicks: number;
  conversions: number;
  revenue_cents: number;
  commission_cents: number;
  created_at: string;
}

interface Commission {
  id: string;
  order_id: string;
  order_total_cents: number;
  commission_rate: number;
  commission_cents: number;
  status: string;
  created_at: string;
}

interface DashboardData {
  registered: boolean;
  profile: {
    tier: string;
    status: string;
    total_sales_cents: number;
    total_commission_cents: number;
    payout_method: string;
    stripe_account_id: string | null;
    tierConfig: TierConfig;
  };
  tierProgress: {
    currentTier: string;
    nextTier: string | null;
    progressPercent: number;
    remainingCents: number;
  };
  earnings: {
    pending: number;
    approved: number;
    paid: number;
    total: number;
  };
  stats: {
    totalClicks: number;
    totalConversions: number;
    conversionRate: number;
    totalLinks: number;
  };
  recentCommissions: Commission[];
  links: AffiliateLink[];
}

function cents(val: number) {
  return `$${(val / 100).toFixed(2)}`;
}

export default function AffiliateDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [requestingPayout, setRequestingPayout] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [tab, setTab] = useState<'overview' | 'links' | 'commissions'>('overview');

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch('/api/affiliate/dashboard');
      const json = await res.json();
      if (json.registered === false) {
        setData(null);
      } else {
        setData(json);
      }
    } catch {
      setError('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const handleRegister = async () => {
    setRegistering(true);
    setError('');
    try {
      const res = await fetch('/api/affiliate/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payout_method: 'stripe' }),
      });
      const json = await res.json();
      if (json.ok) {
        setSuccess('Welcome to the affiliate program!');
        if (json.stripeOnboardingUrl) {
          window.open(json.stripeOnboardingUrl, '_blank');
        }
        await fetchDashboard();
      } else {
        setError(json.error || 'Registration failed');
      }
    } catch {
      setError('Registration failed');
    } finally {
      setRegistering(false);
    }
  };

  const handleGenerateLink = async (productId?: string) => {
    setGeneratingLink(true);
    setError('');
    try {
      const res = await fetch('/api/affiliate/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId || null }),
      });
      const json = await res.json();
      if (json.ok) {
        setSuccess('Link created!');
        await fetchDashboard();
      } else {
        setError(json.error || 'Failed to create link');
      }
    } catch {
      setError('Failed to create link');
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleRequestPayout = async () => {
    setRequestingPayout(true);
    setError('');
    try {
      const res = await fetch('/api/affiliate/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const json = await res.json();
      if (json.ok) {
        setSuccess(`Payout of ${cents(json.paid)} processed!`);
        await fetchDashboard();
      } else {
        setError(json.error || 'Payout failed');
      }
    } catch {
      setError('Payout failed');
    } finally {
      setRequestingPayout(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid #333', borderTop: '3px solid #FF006E', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p>Loading affiliate dashboard...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  // Not registered yet — show signup
  if (!data) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#e2e8f0', padding: '60px 24px' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <h1 style={{ fontSize: 36, fontWeight: 800, background: 'linear-gradient(135deg, #FF006E, #8A2BE2)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 16 }}>
            Affiliate Program
          </h1>
          <p style={{ color: '#94a3b8', fontSize: 18, marginBottom: 40 }}>
            Earn commissions by promoting products. Share your unique links and get paid for every sale.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16, marginBottom: 40 }}>
            {[
              { tier: 'Starter', rate: '10%', min: '$0', color: '#94a3b8' },
              { tier: 'Silver', rate: '15%', min: '$1K', color: '#C0C0C0' },
              { tier: 'Gold', rate: '20%', min: '$5K', color: '#FFD700' },
              { tier: 'Diamond', rate: '25%', min: '$25K', color: '#B9F2FF' },
            ].map(t => (
              <div key={t.tier} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 20, border: `1px solid ${t.color}33` }}>
                <div style={{ color: t.color, fontSize: 28, fontWeight: 800 }}>{t.rate}</div>
                <div style={{ color: '#e2e8f0', fontWeight: 600, marginTop: 4 }}>{t.tier}</div>
                <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>{t.min}+ sales</div>
              </div>
            ))}
          </div>

          {error && <p style={{ color: '#ef4444', marginBottom: 16 }}>{error}</p>}
          {success && <p style={{ color: '#22c55e', marginBottom: 16 }}>{success}</p>}

          <button
            onClick={handleRegister}
            disabled={registering}
            style={{
              padding: '16px 40px', fontSize: 18, fontWeight: 700,
              background: 'linear-gradient(135deg, #FF006E, #8A2BE2)',
              border: 'none', borderRadius: 12, color: '#fff', cursor: 'pointer',
              opacity: registering ? 0.6 : 1,
            }}
          >
            {registering ? 'Setting up...' : 'Join Affiliate Program'}
          </button>
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 12 }}>Free to join. Start earning immediately.</p>
        </div>
      </div>
    );
  }

  const { profile, tierProgress, earnings, stats, recentCommissions, links } = data;

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#e2e8f0', padding: '32px 24px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>Affiliate Dashboard</h1>
            <p style={{ color: '#94a3b8', margin: '4px 0 0' }}>Manage your links, track earnings, and request payouts</p>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: `${profile.tierConfig.color}20`, border: `1px solid ${profile.tierConfig.color}40`,
            borderRadius: 8, padding: '8px 16px',
          }}>
            <span style={{ color: profile.tierConfig.color, fontWeight: 700, fontSize: 14 }}>
              {profile.tierConfig.badge}
            </span>
            <span style={{ color: '#94a3b8', fontSize: 13 }}>
              {(profile.tierConfig.rate * 100)}% commission
            </span>
          </div>
        </div>

        {error && <div style={{ background: '#ef444420', border: '1px solid #ef4444', borderRadius: 8, padding: 12, marginBottom: 16, color: '#ef4444' }}>{error}</div>}
        {success && <div style={{ background: '#22c55e20', border: '1px solid #22c55e', borderRadius: 8, padding: 12, marginBottom: 16, color: '#22c55e' }}>{success}</div>}

        {/* Earnings Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Total Earnings', value: cents(earnings.total), color: '#FF006E' },
            { label: 'Pending', value: cents(earnings.pending), color: '#f59e0b' },
            { label: 'Approved', value: cents(earnings.approved), color: '#22c55e' },
            { label: 'Paid Out', value: cents(earnings.paid), color: '#8A2BE2' },
          ].map(c => (
            <div key={c.label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 20, border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ color: '#64748b', fontSize: 13, marginBottom: 4 }}>{c.label}</div>
              <div style={{ color: c.color, fontSize: 24, fontWeight: 800 }}>{c.value}</div>
            </div>
          ))}
        </div>

        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Total Clicks', value: stats.totalClicks.toLocaleString() },
            { label: 'Conversions', value: stats.totalConversions.toLocaleString() },
            { label: 'Conv. Rate', value: `${stats.conversionRate}%` },
            { label: 'Active Links', value: stats.totalLinks.toString() },
          ].map(s => (
            <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 16, border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
              <div style={{ color: '#94a3b8', fontSize: 12 }}>{s.label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Tier Progress */}
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 20, border: '1px solid rgba(255,255,255,0.06)', marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontWeight: 600 }}>Tier Progress</span>
            {tierProgress.nextTier ? (
              <span style={{ color: '#94a3b8', fontSize: 13 }}>
                {cents(tierProgress.remainingCents)} to {tierProgress.nextTier.charAt(0).toUpperCase() + tierProgress.nextTier.slice(1)}
              </span>
            ) : (
              <span style={{ color: '#B9F2FF', fontSize: 13, fontWeight: 600 }}>Max Tier Reached!</span>
            )}
          </div>
          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 8, height: 10, overflow: 'hidden' }}>
            <div style={{
              width: `${tierProgress.progressPercent}%`, height: '100%',
              background: `linear-gradient(90deg, ${profile.tierConfig.color}, #FF006E)`,
              borderRadius: 8, transition: 'width 0.5s ease',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <span style={{ color: '#64748b', fontSize: 12 }}>Lifetime Sales: {cents(profile.total_sales_cents || 0)}</span>
            <span style={{ color: '#64748b', fontSize: 12 }}>{tierProgress.progressPercent}%</span>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <button
            onClick={() => handleGenerateLink()}
            disabled={generatingLink}
            style={{
              padding: '12px 24px', background: 'linear-gradient(135deg, #FF006E, #8A2BE2)',
              border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, cursor: 'pointer',
              opacity: generatingLink ? 0.6 : 1,
            }}
          >
            {generatingLink ? 'Creating...' : 'Generate Store-wide Link'}
          </button>

          {earnings.approved >= 1000 && (
            <button
              onClick={handleRequestPayout}
              disabled={requestingPayout}
              style={{
                padding: '12px 24px', background: 'rgba(34, 197, 94, 0.15)',
                border: '1px solid #22c55e', borderRadius: 8, color: '#22c55e', fontWeight: 600, cursor: 'pointer',
                opacity: requestingPayout ? 0.6 : 1,
              }}
            >
              {requestingPayout ? 'Processing...' : `Request Payout (${cents(earnings.approved)})`}
            </button>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 2 }}>
          {(['overview', 'links', 'commissions'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '10px 20px', background: tab === t ? 'rgba(255,255,255,0.08)' : 'transparent',
                border: 'none', borderBottom: tab === t ? '2px solid #FF006E' : '2px solid transparent',
                color: tab === t ? '#FF006E' : '#94a3b8', fontWeight: 600, cursor: 'pointer',
                textTransform: 'capitalize', fontSize: 14,
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Tab: Overview */}
        {tab === 'overview' && (
          <div>
            <h3 style={{ fontWeight: 700, marginBottom: 12 }}>How It Works</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16, marginBottom: 24 }}>
              {[
                { step: '1', title: 'Generate Links', desc: 'Create unique affiliate links for the whole store or specific products.' },
                { step: '2', title: 'Share & Promote', desc: 'Share links on social media, blogs, videos, or directly with friends.' },
                { step: '3', title: 'Earn Commissions', desc: 'Every sale from your link earns you a commission based on your tier.' },
              ].map(s => (
                <div key={s.step} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 20, border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #FF006E, #8A2BE2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, marginBottom: 12 }}>{s.step}</div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{s.title}</div>
                  <div style={{ color: '#94a3b8', fontSize: 13 }}>{s.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab: Links */}
        {tab === 'links' && (
          <div>
            {links.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
                <p>No links yet. Generate your first link above!</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {links.map(link => (
                  <div key={link.id} style={{
                    background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 16,
                    border: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
                  }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 13, color: '#FF006E', fontWeight: 600 }}>{link.code}</span>
                        <span style={{ fontSize: 11, color: '#64748b' }}>
                          {link.product_id ? 'Product link' : 'Store-wide'}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: '#94a3b8', wordBreak: 'break-all' }}>{link.url}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ color: '#64748b', fontSize: 11 }}>Clicks</div>
                        <div style={{ fontWeight: 600 }}>{link.clicks}</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ color: '#64748b', fontSize: 11 }}>Sales</div>
                        <div style={{ fontWeight: 600 }}>{link.conversions}</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ color: '#64748b', fontSize: 11 }}>Revenue</div>
                        <div style={{ fontWeight: 600 }}>{cents(link.revenue_cents)}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(link.url, link.id)}
                      style={{
                        padding: '8px 16px', background: copied === link.id ? '#22c55e20' : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${copied === link.id ? '#22c55e' : 'rgba(255,255,255,0.1)'}`,
                        borderRadius: 6, color: copied === link.id ? '#22c55e' : '#e2e8f0',
                        cursor: 'pointer', fontWeight: 500, fontSize: 13,
                      }}
                    >
                      {copied === link.id ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Commissions */}
        {tab === 'commissions' && (
          <div>
            {recentCommissions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
                <p>No commissions yet. Share your links to start earning!</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <th style={{ textAlign: 'left', padding: '10px 12px', color: '#64748b', fontWeight: 600 }}>Date</th>
                      <th style={{ textAlign: 'left', padding: '10px 12px', color: '#64748b', fontWeight: 600 }}>Order Total</th>
                      <th style={{ textAlign: 'left', padding: '10px 12px', color: '#64748b', fontWeight: 600 }}>Rate</th>
                      <th style={{ textAlign: 'left', padding: '10px 12px', color: '#64748b', fontWeight: 600 }}>Commission</th>
                      <th style={{ textAlign: 'left', padding: '10px 12px', color: '#64748b', fontWeight: 600 }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentCommissions.map(c => (
                      <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '10px 12px' }}>
                          {new Date(c.created_at).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '10px 12px' }}>{cents(c.order_total_cents)}</td>
                        <td style={{ padding: '10px 12px' }}>{(c.commission_rate * 100).toFixed(0)}%</td>
                        <td style={{ padding: '10px 12px', color: '#22c55e', fontWeight: 600 }}>{cents(c.commission_cents)}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{
                            padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                            background: c.status === 'paid' ? '#22c55e20' : c.status === 'approved' ? '#3b82f620' : c.status === 'pending' ? '#f59e0b20' : '#ef444420',
                            color: c.status === 'paid' ? '#22c55e' : c.status === 'approved' ? '#3b82f6' : c.status === 'pending' ? '#f59e0b' : '#ef4444',
                          }}>
                            {c.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 40, padding: '20px 0', borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
          <a href="/shop" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: 13, marginRight: 24 }}>Shop</a>
          <a href="/commerce" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: 13, marginRight: 24 }}>Commerce Hub</a>
          <a href="/" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: 13 }}>Home</a>
        </div>
      </div>
    </div>
  );
}
