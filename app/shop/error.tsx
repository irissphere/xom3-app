'use client';

import Link from 'next/link';

export default function ShopError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #070b14, #0d1117)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      padding: '24px',
      textAlign: 'center',
    }}>
      <span style={{ fontSize: '64px', marginBottom: '24px' }}>{'\u26A0\uFE0F'}</span>
      <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '12px' }}>
        Something went wrong
      </h1>
      <p style={{ color: '#94a3b8', marginBottom: '32px', maxWidth: '400px' }}>
        We couldn&apos;t load this page. Please try again or head back to the shop.
      </p>
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={reset}
          style={{
            padding: '12px 24px',
            background: 'linear-gradient(135deg, #FF006E, #8A2BE2)',
            border: 'none',
            borderRadius: '8px',
            color: '#fff',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Try Again
        </button>
        <Link href="/shop" style={{
          padding: '12px 24px',
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '8px',
          color: '#fff',
          textDecoration: 'none',
          fontWeight: 600,
        }}>
          Back to Shop
        </Link>
      </div>
    </div>
  );
}
