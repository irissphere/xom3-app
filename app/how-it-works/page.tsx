'use client';

import { useRouter } from 'next/navigation';

export default function HowItWorksPage() {
  const router = useRouter();

  return (
    <main className="xom3-home">
      <div className="xom3-container" style={{ paddingTop: 64, paddingBottom: 56, maxWidth: 900 }}>
        <h1 style={{
          fontSize: '38px',
          fontWeight: 860,
          color: '#ffffff',
          marginBottom: '24px',
          letterSpacing: '-0.02em',
        }}>
          How XOM3 works
        </h1>
        <p style={{
          fontSize: '18px',
          color: '#94a3b8',
          marginBottom: '60px',
          lineHeight: '1.7',
        }}>
          XOM3 connects your lead sources, keeps your follow-ups consistent, and gives you a simple dashboard to stay on top of everything.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
          {/* The Engine */}
          <section style={{
            padding: '32px',
            background: 'linear-gradient(180deg, rgba(10, 14, 26, 0.88), rgba(12, 18, 34, 0.72))',
            border: '1px solid rgba(255, 255, 255, 0.10)',
            borderRadius: '18px',
            backdropFilter: 'blur(14px)',
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #0a84ff, #6366f1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              marginBottom: '20px',
            }}>
              ⚡
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#ffffff', marginBottom: '12px' }}>
              Lead capture + follow-up
            </h2>
            <p style={{ fontSize: '16px', color: '#94a3b8', lineHeight: '1.7', margin: 0 }}>
              XOM3 pulls leads from your connected sources and keeps every lead from falling through the cracks.
              You can customize the follow-up sequences (email + SMS) and keep the messaging consistent.
            </p>
          </section>

          {/* The Dashboard */}
          <section style={{
            padding: '32px',
            background: 'linear-gradient(180deg, rgba(10, 14, 26, 0.88), rgba(12, 18, 34, 0.72))',
            border: '1px solid rgba(255, 255, 255, 0.10)',
            borderRadius: '18px',
            backdropFilter: 'blur(14px)',
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #22d3ee, #0a84ff)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              marginBottom: '20px',
            }}>
              📊
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#ffffff', marginBottom: '12px' }}>
              The dashboard
            </h2>
            <p style={{ fontSize: '16px', color: '#94a3b8', lineHeight: '1.7', margin: 0 }}>
              You see every lead, their status, and what follow-ups are due — with a fast detail panel for notes and tasks.
            </p>
          </section>

          {/* The Automation */}
          <section style={{
            padding: '32px',
            background: 'linear-gradient(180deg, rgba(10, 14, 26, 0.88), rgba(12, 18, 34, 0.72))',
            border: '1px solid rgba(255, 255, 255, 0.10)',
            borderRadius: '18px',
            backdropFilter: 'blur(14px)',
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #a78bfa, #6366f1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              marginBottom: '20px',
            }}>
              🔄
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#ffffff', marginBottom: '12px' }}>
              Automation
            </h2>
            <p style={{ fontSize: '16px', color: '#94a3b8', lineHeight: '1.7', margin: 0 }}>
              Follow-ups can run automatically so you spend less time on busywork and more time closing.
            </p>
          </section>

          {/* The Result */}
          <section style={{
            padding: '32px',
            background: 'linear-gradient(180deg, rgba(10, 132, 255, 0.15), rgba(99, 102, 241, 0.1))',
            border: '1px solid rgba(10, 132, 255, 0.3)',
            borderRadius: '18px',
            backdropFilter: 'blur(14px)',
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #22c55e, #10b981)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              marginBottom: '20px',
            }}>
              💰
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#ffffff', marginBottom: '12px' }}>
              The Result
            </h2>
            <p style={{ fontSize: '16px', color: '#94a3b8', lineHeight: '1.7', margin: 0 }}>
              More leads, more consistent follow-up, and a clean experience your team can actually use.
            </p>
          </section>
        </div>

        {/* CTA */}
        <div style={{
          marginTop: '60px',
          textAlign: 'center',
        }}>
          <button
            onClick={() => router.push('/intake')}
            style={{
              padding: '16px 48px',
              borderRadius: '999px',
              background: 'linear-gradient(135deg, #0a84ff, #6366f1)',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '16px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(10, 132, 255, 0.2)',
              transition: 'all 150ms',
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            Get started
          </button>
          <p style={{ marginTop: '16px', color: '#64748b', fontSize: '14px' }}>
            Or <a href="/pricing" style={{ color: '#0a84ff', textDecoration: 'none' }}>view pricing</a>
          </p>
        </div>
      </div>
    </main>
  );
}
