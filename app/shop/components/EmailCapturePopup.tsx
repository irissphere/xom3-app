'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

const POPUP_DISMISSED_KEY = 'sb_popup_dismissed';
const POPUP_SUBSCRIBED_KEY = 'sb_popup_subscribed';
const POPUP_DELAY_MS = 8000; // Show after 8 seconds
const DISMISSED_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // Don't re-show for 30 days after dismiss

export default function EmailCapturePopup() {
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let timer: ReturnType<typeof setTimeout> | null = null;

    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 5) setShow(true);
    };

    const maybeShow = () => {
      if (localStorage.getItem(POPUP_SUBSCRIBED_KEY)) return;
      const dismissed = localStorage.getItem(POPUP_DISMISSED_KEY);
      if (dismissed) {
        const dismissedAt = parseInt(dismissed, 10);
        if (Date.now() - dismissedAt < DISMISSED_DURATION_MS) return;
      }
      timer = setTimeout(() => setShow(true), POPUP_DELAY_MS);
      document.addEventListener('mouseleave', handleMouseLeave);
    };

    const applyAuthState = (hasUser: boolean) => {
      if (!hasUser) maybeShow();
    };

    // Initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      applyAuthState(!!session?.user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      applyAuthState(!!session?.user);
    });

    return () => {
      subscription?.unsubscribe();
      if (timer) clearTimeout(timer);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem(POPUP_DISMISSED_KEY, Date.now().toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus('loading');
    setErrorMsg('');

    try {
      const res = await fetch('/api/shop/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name: name || undefined,
          source: 'shop_popup',
          tags: ['popup_subscriber'],
          metadata: {
            page: typeof window !== 'undefined' ? window.location.pathname : '/shop',
            timestamp: new Date().toISOString(),
          },
        }),
      });

      const data = await res.json();

      if (data.ok) {
        setStatus('success');
        localStorage.setItem(POPUP_SUBSCRIBED_KEY, 'true');
        setTimeout(() => setShow(false), 3000);
      } else {
        setStatus('error');
        setErrorMsg(data.error || 'Something went wrong');
      }
    } catch {
      setStatus('error');
      setErrorMsg('Network error. Please try again.');
    }
  };

  if (!show) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleDismiss}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
          zIndex: 9998,
          animation: 'fadeIn 0.3s ease',
        }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 9999,
        width: '90%',
        maxWidth: '460px',
        background: 'linear-gradient(135deg, #0d1117 0%, #1a1a2e 100%)',
        border: '1px solid rgba(255,0,110,0.2)',
        borderRadius: '24px',
        padding: '40px 32px',
        animation: 'popIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        boxShadow: '0 24px 80px rgba(255,0,110,0.15), 0 0 0 1px rgba(255,255,255,0.05)',
      }}>
        {/* Close button */}
        <button
          onClick={handleDismiss}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            color: '#64748b',
            fontSize: '16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {'\u2715'}
        </button>

        {status === 'success' ? (
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '56px', display: 'block', marginBottom: '16px' }}>{'\u{1F389}'}</span>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>
              You're In!
            </h2>
            <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.6 }}>
              Check your inbox for exclusive deals, new product drops, and insider tips.
            </p>
          </div>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <span style={{ fontSize: '48px', display: 'block', marginBottom: '12px' }}>{'\u{1F525}'}</span>
              <h2 style={{
                fontSize: '24px',
                fontWeight: 800,
                color: '#fff',
                marginBottom: '8px',
                letterSpacing: '-0.5px',
              }}>
                Don't Miss Out
              </h2>
              <p style={{
                fontSize: '14px',
                color: '#94a3b8',
                lineHeight: 1.6,
                margin: 0,
              }}>
                Get exclusive deals, new product drops, and creator tips straight to your inbox. Join 1,000+ insiders.
              </p>
            </div>

            {/* Perks */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              marginBottom: '24px',
            }}>
              {[
                { icon: '\u{1F381}', text: 'Early access to new products' },
                { icon: '\u{1F4B0}', text: 'Exclusive subscriber-only discounts' },
                { icon: '\u{1F680}', text: 'Weekly creator tips & trends' },
              ].map((perk, i) => (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 12px',
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: '#cbd5e1',
                }}>
                  <span>{perk.icon}</span>
                  {perk.text}
                </div>
              ))}
            </div>

            <form onSubmit={handleSubmit}>
              <input
                type="text"
                placeholder="Your name (optional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '14px',
                  marginBottom: '10px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <input
                type="email"
                placeholder="Your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '14px',
                  marginBottom: '12px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />

              {errorMsg && (
                <p style={{ fontSize: '12px', color: '#ef4444', marginBottom: '8px', textAlign: 'center' }}>
                  {errorMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={status === 'loading'}
                style={{
                  width: '100%',
                  padding: '16px',
                  background: status === 'loading'
                    ? 'rgba(139,92,246,0.3)'
                    : 'linear-gradient(135deg, #FF006E, #8A2BE2)',
                  border: 'none',
                  borderRadius: '14px',
                  color: '#fff',
                  fontSize: '16px',
                  fontWeight: 700,
                  cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                  boxShadow: status === 'loading' ? 'none' : '0 4px 20px rgba(255,0,110,0.3)',
                  transition: 'all 0.2s',
                }}
              >
                {status === 'loading' ? 'Joining...' : 'Join The Insiders'}
              </button>
            </form>

            <p style={{
              fontSize: '11px',
              color: '#475569',
              textAlign: 'center',
              marginTop: '12px',
            }}>
              No spam ever. Unsubscribe anytime.
            </p>
          </>
        )}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes popIn { from { opacity: 0; transform: translate(-50%, -50%) scale(0.9); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }
      `}</style>
    </>
  );
}
