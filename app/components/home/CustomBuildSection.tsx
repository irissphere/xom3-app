'use client';

import { useRouter } from 'next/navigation';

export function CustomBuildSection() {
  const router = useRouter();

  return (
    <section style={{
      position: 'relative',
      padding: 'clamp(60px, 10vw, 100px) clamp(16px, 4vw, 32px)',
    }}>
      <div style={{
        maxWidth: '700px',
        margin: '0 auto',
        textAlign: 'center',
      }}>
        <div style={{
          fontSize: '12px',
          fontWeight: 700,
          letterSpacing: '0.15em',
          color: 'rgba(167, 139, 250, 0.9)',
          textTransform: 'uppercase',
          marginBottom: '16px',
        }}>
          Enterprise Solutions
        </div>

        <h2 style={{
          fontSize: 'clamp(28px, 4vw, 38px)',
          fontWeight: 700,
          color: '#ffffff',
          letterSpacing: '-0.02em',
          marginBottom: '18px',
        }}>
          Looking for something custom?
        </h2>

        <p style={{
          fontSize: '17px',
          color: 'rgba(247, 248, 255, 0.65)',
          lineHeight: 1.7,
          marginBottom: '32px',
        }}>
          X.O.M3 supports advanced automations, multi-system integrations, and fully 
          tailored growth engines. If your business needs a unique build, we architect it with you.
        </p>

        <button
          onClick={() => router.push('/proposal')}
          style={{
            padding: '16px 36px',
            borderRadius: '14px',
            background: 'transparent',
            border: '1px solid rgba(167, 139, 250, 0.4)',
            color: '#a78bfa',
            fontWeight: 600,
            fontSize: '15px',
            cursor: 'pointer',
            transition: 'all 180ms ease-out',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = 'rgba(167, 139, 250, 0.1)';
            e.currentTarget.style.borderColor = 'rgba(167, 139, 250, 0.6)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.borderColor = 'rgba(167, 139, 250, 0.4)';
          }}
        >
          Request a Custom Build
        </button>
      </div>
    </section>
  );
}
