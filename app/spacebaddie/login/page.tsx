'use client';

import React, { useState, Suspense, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase, supabaseConfigured, signIn, signUp } from '@/lib/supabase/client';

function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const plan = searchParams.get('plan') || 'free';
  const trial = searchParams.get('trial') === 'true';
  const errorParam = searchParams.get('error');
  
  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'github' | null>(null);
  const [error, setError] = useState<string | null>(errorParam);
  const [formData, setFormData] = useState({ email: '', password: '', name: '' });

  // Clear error when switching modes
  useEffect(() => {
    setError(null);
  }, [mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'signup') {
        await signUp(formData.email, formData.password, formData.name);
        // After signup, redirect to onboarding or studio
        if (plan === 'pro' && trial) {
          // Start checkout for trial
          const res = await fetch('/api/spacebaddie/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: formData.email, plan: 'pro', trial: true }),
          });
          const data = await res.json();
          if (data.url) {
            window.location.href = data.url;
            return;
          }
        }
        router.push('/spacebaddie/onboarding');
      } else {
        await signIn(formData.email, formData.password);
        router.push('/spacebaddie/studio');
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'github') => {
    if (!supabaseConfigured) {
      setError('Authentication is not configured. Please try again later.');
      return;
    }

    setOauthLoading(provider);
    setError(null);

    try {
      // Build the callback URL
      const origin = window.location.origin;
      const redirectPath = plan === 'pro' && trial 
        ? '/spacebaddie/studio?upgrade=pro'
        : '/spacebaddie/studio';
      const redirectTo = `${origin}/api/auth/callback?next=${encodeURIComponent(redirectPath)}`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          queryParams: provider === 'google' ? {
            access_type: 'offline',
            prompt: 'consent',
          } : undefined,
        },
      });

      if (error) {
        console.error('OAuth error:', error);
        setError(error.message);
        setOauthLoading(null);
      }
      // If no error, the user will be redirected to the OAuth provider
    } catch (err) {
      console.error('OAuth error:', err);
      setError('Failed to start authentication');
      setOauthLoading(null);
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '420px' }}>
      {/* Mobile logo */}
      <div style={{ display: 'block', textAlign: 'center', marginBottom: '32px' }} className="lg:hidden">
        <Link href="/spacebaddie" style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
          <span style={{
            fontSize: '24px',
            fontWeight: 700,
            background: 'linear-gradient(135deg, #C77DFF 0%, #FF6B9D 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            SPACEBADDIE
          </span>
        </Link>
      </div>

      <div style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(138,43,226,0.3)',
        borderRadius: '20px',
        padding: '32px',
        backdropFilter: 'blur(20px)',
      }}>
        {/* Trial banner */}
        {plan === 'pro' && trial && (
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              background: 'rgba(138,43,226,0.2)',
              border: '1px solid rgba(138,43,226,0.3)',
              borderRadius: '20px',
              fontSize: '14px',
              color: '#C77DFF',
            }}>
              ✨ 7-Day Pro Trial - No Card Required
            </span>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div style={{
            marginBottom: '24px',
            padding: '16px',
            background: 'rgba(255,80,80,0.1)',
            border: '1px solid rgba(255,80,80,0.3)',
            borderRadius: '12px',
            color: '#FF5050',
            fontSize: '14px',
          }}>
            {error}
          </div>
        )}

        {/* Mode toggle */}
        <div style={{
          display: 'flex',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '12px',
          padding: '4px',
          marginBottom: '32px',
        }}>
          <button
            onClick={() => setMode('signup')}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s',
              background: mode === 'signup' ? 'linear-gradient(135deg, #8A2BE2 0%, #FF006E 100%)' : 'transparent',
              color: mode === 'signup' ? '#fff' : '#888',
            }}
          >Sign Up</button>
          <button
            onClick={() => setMode('login')}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s',
              background: mode === 'login' ? 'linear-gradient(135deg, #8A2BE2 0%, #FF006E 100%)' : 'transparent',
              color: mode === 'login' ? '#fff' : '#888',
            }}
          >Log In</button>
        </div>

        {/* OAuth buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
          {/* Google Button */}
          <button
            onClick={() => handleOAuth('google')}
            disabled={oauthLoading !== null}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              padding: '14px 24px',
              background: '#fff',
              borderRadius: '12px',
              border: 'none',
              cursor: oauthLoading ? 'not-allowed' : 'pointer',
              opacity: oauthLoading !== null ? 0.6 : 1,
              transition: 'all 0.2s',
            }}
          >
            {oauthLoading === 'google' ? (
              <div style={{
                width: '20px',
                height: '20px',
                border: '2px solid #888',
                borderTopColor: '#333',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }} />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            <span style={{ color: '#333', fontWeight: 600, fontSize: '15px' }}>
              {oauthLoading === 'google' ? 'Connecting...' : 'Continue with Google'}
            </span>
          </button>
          
          {/* GitHub Button */}
          <button
            onClick={() => handleOAuth('github')}
            disabled={oauthLoading !== null}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              padding: '14px 24px',
              background: '#24292F',
              borderRadius: '12px',
              border: 'none',
              cursor: oauthLoading ? 'not-allowed' : 'pointer',
              opacity: oauthLoading !== null ? 0.6 : 1,
              transition: 'all 0.2s',
            }}
          >
            {oauthLoading === 'github' ? (
              <div style={{
                width: '20px',
                height: '20px',
                border: '2px solid rgba(255,255,255,0.3)',
                borderTopColor: '#fff',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }} />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white" style={{ flexShrink: 0 }}>
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
            )}
            <span style={{ color: '#fff', fontWeight: 600, fontSize: '15px' }}>
              {oauthLoading === 'github' ? 'Connecting...' : 'Continue with GitHub'}
            </span>
          </button>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '24px',
        }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
          <span style={{ color: '#666', fontSize: '13px' }}>or use email</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {mode === 'signup' && (
            <input
              type="text" placeholder="Full Name" required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={{
                width: '100%',
                padding: '14px 16px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '15px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          )}
          <input
            type="email" placeholder="Email" required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            style={{
              width: '100%',
              padding: '14px 16px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '15px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <input
            type="password" placeholder="Password" required minLength={6}
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            style={{
              width: '100%',
              padding: '14px 16px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '15px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <button
            type="submit" disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)',
              borderRadius: '12px',
              border: 'none',
              color: '#fff',
              fontSize: '15px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              transition: 'opacity 0.2s',
            }}
          >
            {loading ? 'Please wait...' : mode === 'signup' ? 'Create Account' : 'Log In'}
          </button>
        </form>

        {mode === 'login' && (
          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <button 
              type="button"
              onClick={async () => {
                if (!formData.email) {
                  setError('Enter your email first');
                  return;
                }
                try {
                  const { resetPassword } = await import('@/lib/supabase/client');
                  await resetPassword(formData.email);
                  setError(null);
                  alert('Password reset email sent!');
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Failed to send reset email');
                }
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#C77DFF',
                fontSize: '14px',
                cursor: 'pointer',
                padding: '8px',
              }}
            >
              Forgot password?
            </button>
          </div>
        )}
      </div>

      <div style={{ textAlign: 'center', marginTop: '24px' }}>
        <Link href="/spacebaddie" style={{
          color: '#888',
          textDecoration: 'none',
          fontSize: '14px',
          display: 'block',
          marginBottom: '8px',
        }}>
          ← Back to SpaceBaddie
        </Link>
        <p style={{ color: '#555', fontSize: '12px' }}>
          By signing up, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        input::placeholder {
          color: #666;
        }
      `}</style>
    </div>
  );
}

export default function SpaceBaddieLogin() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#030308',
      color: '#fff',
      display: 'flex',
    }}>
      {/* Background effects */}
      <div style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at center, #0f0520 0%, #030308 70%)',
        }} />
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '600px',
          height: '600px',
          background: 'rgba(138,43,226,0.2)',
          borderRadius: '50%',
          filter: 'blur(150px)',
        }} />
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '500px',
          height: '500px',
          background: 'rgba(0,200,200,0.15)',
          borderRadius: '50%',
          filter: 'blur(120px)',
        }} />
      </div>

      {/* Left side - branding (desktop only) */}
      <div className="hidden lg:flex" style={{
        flex: 1,
        position: 'relative',
        zIndex: 10,
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px',
      }}>
        <div style={{ maxWidth: '420px' }}>
          <Link href="/spacebaddie" style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px', textDecoration: 'none' }}>
            <h1 style={{
              fontSize: '36px',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #C77DFF 0%, #FF6B9D 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              margin: 0,
            }}>
              SPACEBADDIE
            </h1>
          </Link>
          <h2 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '16px', color: '#fff' }}>
            Create stunning AI videos in minutes
          </h2>
          <p style={{ color: '#888', fontSize: '17px', marginBottom: '32px', lineHeight: 1.6 }}>
            Upload a photo, add your script, and watch the magic happen. 
            Professional talking avatar videos for content creators.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { icon: '🎬', text: 'AI Avatar Generation' },
              { icon: '🚀', text: 'Auto-post to 6 platforms' },
              { icon: '📈', text: 'Smart analytics & CRM' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#aaa' }}>
                <span style={{ fontSize: '20px' }}>{item.icon}</span>
                <span style={{ fontSize: '15px' }}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - form */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px',
        position: 'relative',
        zIndex: 10,
      }}>
        <Suspense fallback={
          <div style={{
            width: '100%',
            maxWidth: '420px',
            height: '400px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '20px',
          }} />
        }>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
