'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type IntakeStatus = 'idle' | 'submitting' | 'success' | 'error';

function IntakeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    businessName: '',
    goal: 'growth',
    referralCode: '',
  });
  const [status, setStatus] = useState<IntakeStatus>('idle');

  // Extract referral code from URL
  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode) {
      setFormData((s) => ({ ...s, referralCode: refCode.toUpperCase() }));
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    try {
      const res = await fetch('/api/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      setStatus(res.ok ? 'success' : 'error');
    } catch {
      setStatus('error');
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '14px 16px',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    background: 'rgba(0, 0, 0, 0.3)',
    color: '#ffffff',
    fontSize: '16px',
    outline: 'none',
    transition: 'border-color 150ms',
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #070b14, #050810)',
      padding: '80px 32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{ width: '100%', maxWidth: '480px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{
            fontSize: '36px',
            fontWeight: 700,
            color: '#ffffff',
            marginBottom: '12px',
            letterSpacing: '-0.02em',
          }}>
            Start Your Lead Engine
          </h1>
          <p style={{ fontSize: '16px', color: '#94a3b8', lineHeight: '1.6' }}>
            Fill out the form below and we&apos;ll get your automation running within 24 hours.
          </p>
        </div>

        {status === 'success' ? (
          <div style={{
            padding: '40px',
            background: 'linear-gradient(180deg, rgba(34, 197, 94, 0.15), rgba(16, 185, 129, 0.1))',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: '18px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✓</div>
            <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#ffffff', marginBottom: '12px' }}>
              You&apos;re In!
            </h2>
            <p style={{ fontSize: '16px', color: '#94a3b8', marginBottom: '24px', lineHeight: '1.6' }}>
              We received your request. Check your SMS for a confirmation message. 
              Your lead engine is being configured.
            </p>
            <button
              onClick={() => router.push('/')}
              style={{
                padding: '14px 32px',
                borderRadius: '999px',
                background: 'linear-gradient(135deg, #22c55e, #10b981)',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '16px',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Back to Home
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{
            padding: '40px',
            background: 'linear-gradient(180deg, rgba(10, 14, 26, 0.88), rgba(12, 18, 34, 0.72))',
            border: '1px solid rgba(255, 255, 255, 0.10)',
            borderRadius: '18px',
            backdropFilter: 'blur(14px)',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Contact Section */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#64748b',
                  letterSpacing: '0.08em',
                  marginBottom: '12px',
                }}>
                  YOUR INFO
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <input
                    required
                    type="text"
                    placeholder="Full name"
                    value={formData.name}
                    onChange={(e) => setFormData((s) => ({ ...s, name: e.target.value }))}
                    style={inputStyle}
                  />
                  <input
                    required
                    type="email"
                    placeholder="Email address"
                    value={formData.email}
                    onChange={(e) => setFormData((s) => ({ ...s, email: e.target.value }))}
                    style={inputStyle}
                  />
                  <input
                    required
                    type="tel"
                    placeholder="Phone number"
                    value={formData.phone}
                    onChange={(e) => setFormData((s) => ({ ...s, phone: e.target.value }))}
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* Business Section */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#64748b',
                  letterSpacing: '0.08em',
                  marginBottom: '12px',
                }}>
                  YOUR BUSINESS
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <input
                    required
                    type="text"
                    placeholder="Business name"
                    value={formData.businessName}
                    onChange={(e) => setFormData((s) => ({ ...s, businessName: e.target.value }))}
                    style={inputStyle}
                  />
                  <select
                    value={formData.goal}
                    onChange={(e) => setFormData((s) => ({ ...s, goal: e.target.value }))}
                    style={{
                      ...inputStyle,
                      cursor: 'pointer',
                      appearance: 'none',
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 12px center',
                      backgroundSize: '20px',
                    }}
                  >
                    <option value="growth">Generate more leads</option>
                    <option value="automation">Automate follow-ups</option>
                    <option value="crm">Organize my pipeline</option>
                    <option value="scale">Multi-location scale</option>
                  </select>
                </div>
              </div>

              {/* Referral Code Section */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#64748b',
                  letterSpacing: '0.08em',
                  marginBottom: '12px',
                }}>
                  HAVE A REFERRAL CODE? (OPTIONAL)
                </label>
                <input
                  type="text"
                  placeholder="Enter referral code"
                  value={formData.referralCode}
                  onChange={(e) => setFormData((s) => ({ ...s, referralCode: e.target.value.toUpperCase() }))}
                  style={inputStyle}
                  maxLength={8}
                />
                <p style={{
                  fontSize: '12px',
                  color: '#64748b',
                  marginTop: '6px',
                  marginBottom: 0,
                }}>
                  Get 10% credit when friends sign up and spend
                </p>
              </div>

              {status === 'error' && (
                <div style={{
                  padding: '14px',
                  borderRadius: '12px',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#f87171',
                  fontSize: '14px',
                }}>
                  Something went wrong. Please try again or contact support.
                </div>
              )}

              <button
                type="submit"
                disabled={status === 'submitting'}
                style={{
                  width: '100%',
                  padding: '16px',
                  borderRadius: '12px',
                  background: status === 'submitting' 
                    ? 'rgba(10, 132, 255, 0.5)' 
                    : 'linear-gradient(135deg, #0a84ff, #6366f1)',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '16px',
                  border: 'none',
                  cursor: status === 'submitting' ? 'wait' : 'pointer',
                  boxShadow: '0 8px 24px rgba(10, 132, 255, 0.2)',
                  transition: 'all 150ms',
                  marginTop: '8px',
                }}
              >
                {status === 'submitting' ? 'Starting your engine...' : 'Activate Lead Engine'}
              </button>
            </div>
          </form>
        )}

        {/* Footer */}
        <div style={{
          marginTop: '24px',
          textAlign: 'center',
          color: '#64748b',
          fontSize: '14px',
        }}>
          <a href="/pricing" style={{ color: '#0a84ff', textDecoration: 'none' }}>View pricing</a>
          {' · '}
          <a href="/how-it-works" style={{ color: '#0a84ff', textDecoration: 'none' }}>How it works</a>
        </div>
      </div>
    </div>
  );
}

export default function IntakePage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #070b14, #050810)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ffffff',
      }}>
        Loading...
      </div>
    }>
      <IntakeForm />
    </Suspense>
  );
}
