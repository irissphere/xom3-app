'use client';

import Link from 'next/link';

export default function BitBaddiePage() {
  return (
    <div style={{ padding: '32px', background: '#0a0a0f', minHeight: '100vh', color: '#fff', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '36px', fontWeight: 900, color: '#10B981', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '-1px' }}>
          BitBaddie
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '15px', marginBottom: '32px' }}>
          Broker-agnostic trading connection hub.
        </p>
        <Link href="/bitbaddie/settings" style={{
          padding: '10px 20px',
          background: 'rgba(16,185,129,0.1)',
          border: '1px solid rgba(16,185,129,0.2)',
          borderRadius: '8px',
          color: '#10B981',
          textDecoration: 'none',
          fontSize: '14px',
          fontWeight: 600,
        }}>
          Settings
        </Link>
      </div>
    </div>
  );
}
