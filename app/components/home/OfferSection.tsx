'use client';

import { useRouter } from 'next/navigation';

export function OfferSection() {
  const router = useRouter();

  const included = [
    'Daily qualified leads',
    'Automated social posting',
    'SMS follow-up sequences',
    'Full CRM access',
    'Pipeline tracking',
    'Appointment scheduling',
    'Email automation',
    'Analytics dashboard',
  ];

  return (
    <section style={{
      position: 'relative',
      padding: 'clamp(60px, 10vw, 120px) clamp(16px, 4vw, 32px)',
      background: 'linear-gradient(180deg, rgba(5, 8, 16, 0.95), rgba(7, 11, 20, 0.98))',
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div
          className="xom3-glass"
          style={{
            position: 'relative',
            padding: 'clamp(24px, 5vw, 56px)',
            borderRadius: '24px',
            border: '1px solid rgba(10, 132, 255, 0.25)',
            boxShadow: '0 0 80px rgba(10, 132, 255, 0.08)',
            overflow: 'hidden',
          }}
        >
          {/* Gradient accent */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: 'linear-gradient(90deg, #0a84ff, #5ac8fa, #818cf8)',
          }} />

          {/* Header */}
          <div style={{
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '0.15em',
            color: '#0a84ff',
            textTransform: 'uppercase',
            marginBottom: '12px',
          }}>
            Start Free — No Credit Card Required
          </div>

          <h2 style={{
            fontSize: 'clamp(28px, 4vw, 38px)',
            fontWeight: 700,
            color: '#ffffff',
            marginBottom: '8px',
          }}>
            Get Started with $10 Free
          </h2>

          <p style={{
            fontSize: '16px',
            color: '#94a3b8',
            marginBottom: '24px',
            lineHeight: 1.6,
          }}>
            Try SMS, social posting, and AI — on us.
          </p>

          <div style={{ marginBottom: '32px' }}>
            <span style={{
              fontSize: '48px',
              fontWeight: 700,
              color: '#22c55e',
            }}>
              $10 Free
            </span>
            <span style={{ fontSize: '32px', fontWeight: 600, color: '#5ac8fa', marginLeft: '8px' }}>+ 30 Days</span>
          </div>

          {/* Features Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '12px 24px',
            marginBottom: '36px',
          }}>
            {[
              '~330 SMS messages',
              '~1,000 social posts',
              '~125 AI generations',
              'Full CRM access',
            ].map((item, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '15px',
                  color: 'rgba(247, 248, 255, 0.85)',
                }}
              >
                <span style={{ color: '#5ac8fa', fontSize: '14px' }}>✓</span>
                {item}
              </div>
            ))}
          </div>

          {/* CTA */}
          <button
            onClick={() => router.push('/pricing')}
            style={{
              width: '100%',
              padding: '18px 32px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #0a84ff, #6366f1)',
              border: 'none',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '16px',
              cursor: 'pointer',
              boxShadow: '0 8px 32px rgba(10, 132, 255, 0.25)',
              transition: 'all 180ms ease-out',
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            Start Free Trial
          </button>

          {/* Trial Disclaimer */}
          <div style={{
            marginTop: '24px',
            padding: '16px',
            borderRadius: '12px',
            background: 'rgba(34, 197, 94, 0.08)',
            border: '1px solid rgba(34, 197, 94, 0.2)',
          }}>
            <p style={{
              fontSize: '13px',
              color: 'rgba(247, 248, 255, 0.7)',
              lineHeight: 1.7,
              margin: 0,
            }}>
              <strong style={{ color: '#22c55e' }}>Subscribe & Get 30% Bonus Credits</strong>
              <br />
              Plus: Earn 10% when friends sign up
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
