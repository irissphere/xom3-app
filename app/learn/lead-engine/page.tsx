'use client';

import Link from 'next/link';

export default function LeadEnginePage() {
  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, rgba(5, 8, 16, 0.95), rgba(7, 11, 20, 0.98))',
      color: '#ffffff',
      padding: '120px 32px 80px',
    }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        {/* Back link */}
        <Link 
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            color: '#5ac8fa',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: 500,
            marginBottom: '40px',
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
        >
          ← Back to Home
        </Link>

        {/* Header */}
        <div style={{ marginBottom: '60px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            marginBottom: '24px',
          }}>
            <div style={{
              width: '72px',
              height: '72px',
              borderRadius: '18px',
              background: 'linear-gradient(135deg, #0a84ff, #5ac8fa)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '36px',
              boxShadow: '0 8px 32px rgba(10, 132, 255, 0.3)',
            }}>
              ⚡
            </div>
            <div>
              <h1 style={{
                fontSize: 'clamp(32px, 5vw, 48px)',
                fontWeight: 700,
                color: '#ffffff',
                margin: 0,
                letterSpacing: '-0.02em',
              }}>
                Lead Engine
              </h1>
              <p style={{
                fontSize: '18px',
                color: 'rgba(247, 248, 255, 0.6)',
                margin: '8px 0 0',
              }}>
                Qualified leads delivered daily
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '40px',
          marginBottom: '60px',
        }}>
          {/* Left Column - Description */}
          <div>
            <h2 style={{
              fontSize: '28px',
              fontWeight: 700,
              color: '#ffffff',
              marginBottom: '24px',
            }}>
              Your Pipeline, Always Full
            </h2>
            <p style={{
              fontSize: '16px',
              lineHeight: 1.7,
              color: 'rgba(247, 248, 255, 0.8)',
              marginBottom: '32px',
            }}>
              The Lead Engine is your automated prospecting system that finds, qualifies, and delivers 
              ready-to-close leads directly into your CRM. No more manual searching, no more cold outreach— 
              just qualified opportunities landing in your pipeline every single day.
            </p>

            <div style={{
              background: 'rgba(10, 14, 26, 0.65)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '20px',
              padding: '32px',
              marginBottom: '32px',
            }}>
              <h3 style={{
                fontSize: '20px',
                fontWeight: 600,
                color: '#5ac8fa',
                marginBottom: '20px',
              }}>
                Key Features
              </h3>
              <ul style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}>
                {[
                  'AI-powered prospecting finds your ideal customers',
                  'Leads scored and qualified before they hit your CRM',
                  'Daily delivery — no manual searching required',
                  'Industry-specific targeting for higher conversion',
                ].map((feature, i) => (
                  <li key={i} style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    fontSize: '15px',
                    color: 'rgba(247, 248, 255, 0.8)',
                    lineHeight: 1.6,
                  }}>
                    <span style={{
                      color: '#5ac8fa',
                      fontSize: '18px',
                      marginTop: '2px',
                    }}>✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right Column - Screenshot */}
          <div style={{
            background: 'rgba(10, 14, 26, 0.65)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '20px',
            padding: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '400px',
          }}>
            <div style={{
              width: '100%',
              height: '100%',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(247, 248, 255, 0.4)',
              fontSize: '14px',
            }}>
              Screenshot placeholder<br />
              Lead Engine Dashboard
            </div>
          </div>
        </div>

        {/* CTA */}
        <div style={{
          textAlign: 'center',
          padding: '48px 32px',
          background: 'rgba(10, 132, 255, 0.1)',
          border: '1px solid rgba(10, 132, 255, 0.2)',
          borderRadius: '20px',
        }}>
          <h3 style={{
            fontSize: '24px',
            fontWeight: 600,
            color: '#ffffff',
            marginBottom: '16px',
          }}>
            Ready to fill your pipeline?
          </h3>
          <p style={{
            fontSize: '16px',
            color: 'rgba(247, 248, 255, 0.7)',
            marginBottom: '32px',
          }}>
            Activate your Lead Engine and start receiving qualified leads today.
          </p>
          <Link
            href="/intake"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '14px 32px',
              background: 'linear-gradient(135deg, #0a84ff, #5ac8fa)',
              color: '#ffffff',
              textDecoration: 'none',
              borderRadius: '12px',
              fontWeight: 600,
              fontSize: '16px',
              transition: 'all 0.2s',
              boxShadow: '0 4px 20px rgba(10, 132, 255, 0.3)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 32px rgba(10, 132, 255, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(10, 132, 255, 0.3)';
            }}
          >
            Activate Lead Engine →
          </Link>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 900px) {
          main > div > div:nth-child(3) {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </main>
  );
}

