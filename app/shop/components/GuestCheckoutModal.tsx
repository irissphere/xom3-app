'use client';

interface GuestCheckoutModalProps {
  open: boolean;
  onClose: () => void;
  onContinueAsGuest: () => void;
  actionLabel?: string;
}

export function GuestCheckoutModal({
  open,
  onClose,
  onContinueAsGuest,
  actionLabel = 'checkout',
}: GuestCheckoutModalProps) {
  if (!open) return null;

  const baseLoginUrl = '/login';
  const redirect = typeof window !== 'undefined' ? window.location.href : 'https://xom3.io/shop';
  const loginUrl = `${baseLoginUrl}?redirect=${encodeURIComponent(redirect)}`;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: 'relative',
          background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
          borderRadius: 16,
          padding: 32,
          maxWidth: 400,
          width: '100%',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: '#fff' }}>
          Log in for 10% off your first order
        </h3>
        <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 24 }}>
          Create an account to save on this purchase — or continue as a guest.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <a
            href={loginUrl}
            style={{
              display: 'block',
              textAlign: 'center',
              padding: '14px 24px',
              background: 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)',
              borderRadius: 10,
              color: '#fff',
              fontWeight: 600,
              textDecoration: 'none',
              fontSize: 15,
            }}
          >
            Log In
          </a>
          <button
            onClick={() => {
              onContinueAsGuest();
              onClose();
            }}
            style={{
              padding: '14px 24px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 10,
              color: '#e2e8f0',
              fontWeight: 600,
              fontSize: 15,
              cursor: 'pointer',
            }}
          >
            Continue as Guest
          </button>
        </div>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: 'none',
            border: 'none',
            color: '#64748b',
            cursor: 'pointer',
            fontSize: 20,
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
