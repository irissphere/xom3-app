'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn, signInWithMagicLink, resetPassword, supabaseConfigured } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [passwordResetSent, setPasswordResetSent] = useState(false);
  const [mode, setMode] = useState<'password' | 'magic'>('password');

  const getDefaultRedirect = () => {
    if (typeof window === 'undefined') return '/dashboard';
    const host = window.location.hostname;
    if (host === 'spacebaddie.com' || host.endsWith('.spacebaddie.com')) {
      return '/spacebaddie/studio';
    }
    return '/dashboard';
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('[LOGIN PAGE] Form submitted');
    console.log('[LOGIN PAGE] Email:', email);
    console.log('[LOGIN PAGE] Password length:', password.length);
    console.log('[LOGIN PAGE] Mode:', mode);
    
    if (!supabaseConfigured) {
      setError('Auth is not configured for this domain. Please check Supabase env vars and redirect settings.');
      return;
    }
    if (!email || !password) {
      console.error('[LOGIN PAGE] Missing email or password');
      setError('Please enter both email and password');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      console.log('[LOGIN PAGE] Calling signIn function...');
      // signIn function returns data with session (throws if error or no session)
      const data = await signIn(email, password);
      
      console.log('[LOGIN PAGE] Sign in successful, session:', data?.session ? 'exists' : 'missing');
      console.log('[LOGIN PAGE] User:', data?.user?.email);
      
      // Wait for session cookie to be set by Supabase client
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check for redirect parameter
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get('redirect') || getDefaultRedirect();
      
      console.log('[LOGIN PAGE] Redirecting to:', redirect);
      
      // Use window.location for full page reload - ensures cookies are sent
      window.location.href = redirect;
    } catch (err: any) {
      console.error('[LOGIN PAGE] Login error:', err);
      console.error('[LOGIN PAGE] Error message:', err.message);
      console.error('[LOGIN PAGE] Error code:', err.code);
      console.error('[LOGIN PAGE] Full error:', JSON.stringify(err, null, 2));
      setError(err.message || 'Invalid credentials. Please check your email and password.');
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!supabaseConfigured) {
        setError('Auth is not configured for this domain. Please check Supabase env vars and redirect settings.');
        return;
      }
      const redirect = getDefaultRedirect();
      await signInWithMagicLink(email, redirect);
      setMagicLinkSent(true);
    } catch (err: any) {
      console.error('Magic link error:', err);
      setError(err.message || 'Failed to send magic link');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address first');
      return;
    }
    setLoading(true);
    setError('');

    try {
      await resetPassword(email);
      setPasswordResetSent(true);
    } catch (err: any) {
      console.error('Password reset error:', err);
      setError(err.message || 'Failed to send password reset email');
    } finally {
      setLoading(false);
    }
  };

  if (passwordResetSent) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #070b14, #050810)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}>
        <div style={{
          maxWidth: '420px',
          textAlign: 'center',
          padding: '40px',
          borderRadius: '20px',
          background: 'linear-gradient(180deg, rgba(10, 14, 26, 0.88), rgba(12, 18, 34, 0.72))',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>🔐</div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#ffffff', marginBottom: '12px' }}>
            Check Your Email
          </h2>
          <p style={{ color: '#94a3b8', marginBottom: '24px', lineHeight: 1.6 }}>
            We sent a password reset link to <strong style={{ color: '#5ac8fa' }}>{email}</strong>. 
            Click the link to set a new password.
          </p>
          <button
            onClick={() => setPasswordResetSent(false)}
            style={{
              padding: '12px 24px',
              borderRadius: '10px',
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#94a3b8',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            ← Back to Login
          </button>
        </div>
      </div>
    );
  }

  if (magicLinkSent) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #070b14, #050810)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}>
        <div style={{
          maxWidth: '420px',
          textAlign: 'center',
          padding: '40px',
          borderRadius: '20px',
          background: 'linear-gradient(180deg, rgba(10, 14, 26, 0.88), rgba(12, 18, 34, 0.72))',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>✉️</div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#ffffff', marginBottom: '12px' }}>
            Check Your Email
          </h2>
          <p style={{ color: '#94a3b8', marginBottom: '24px', lineHeight: 1.6 }}>
            We sent a magic link to <strong style={{ color: '#5ac8fa' }}>{email}</strong>. 
            Click the link to sign in.
          </p>
          <button
            onClick={() => setMagicLinkSent(false)}
            style={{
              padding: '12px 24px',
              borderRadius: '10px',
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#94a3b8',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            ← Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #070b14, #050810)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      {/* Top Nav */}
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        padding: '16px 24px',
        background: 'linear-gradient(180deg, rgba(5, 8, 16, 0.95), rgba(5, 8, 16, 0.8))',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
      }}>
        <Link 
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '10px',
            background: 'rgba(10, 132, 255, 0.1)',
            border: '1px solid rgba(10, 132, 255, 0.2)',
            color: '#5ac8fa',
            fontSize: '14px',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          ← Home
        </Link>
      </nav>

      <div style={{
        width: '100%',
        maxWidth: '420px',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(10, 132, 255, 0.2), rgba(99, 102, 241, 0.15))',
            border: '1px solid rgba(10, 132, 255, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            fontSize: '28px',
          }}>
            🔐
          </div>
          <h1 style={{
            fontSize: '28px',
            fontWeight: 800,
            color: '#ffffff',
            marginBottom: '8px',
            letterSpacing: '-0.02em',
          }}>
            Sign in
          </h1>
          <p style={{ fontSize: '15px', color: '#64748b' }}>
            Access your dashboard
          </p>
        </div>

        {/* Login Form */}
        <div style={{
          padding: '32px',
          borderRadius: '20px',
          background: 'linear-gradient(180deg, rgba(10, 14, 26, 0.88), rgba(12, 18, 34, 0.72))',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(14px)',
        }}>
          {error && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '10px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#ef4444',
              fontSize: '14px',
              marginBottom: '20px',
            }}>
              {error}
            </div>
          )}

          {/* Mode Toggle */}
          <div style={{
            display: 'flex',
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '10px',
            padding: '4px',
            marginBottom: '24px',
          }}>
            <button
              onClick={() => setMode('password')}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '8px',
                border: 'none',
                background: mode === 'password' ? 'rgba(10, 132, 255, 0.2)' : 'transparent',
                color: mode === 'password' ? '#5ac8fa' : '#64748b',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Password
            </button>
            <button
              onClick={() => setMode('magic')}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '8px',
                border: 'none',
                background: mode === 'magic' ? 'rgba(10, 132, 255, 0.2)' : 'transparent',
                color: mode === 'magic' ? '#5ac8fa' : '#64748b',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Magic Link
            </button>
          </div>

          <form 
            onSubmit={(e) => {
              console.log('[LOGIN PAGE] Form onSubmit triggered, mode:', mode);
              if (mode === 'password') {
                handleLogin(e);
              } else {
                handleMagicLink(e);
              }
            }}
            onError={(e) => {
              console.error('[LOGIN PAGE] Form error:', e);
            }}
          >
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '13px', 
                fontWeight: 600, 
                color: '#94a3b8', 
                marginBottom: '8px' 
              }}>
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#ffffff',
                  fontSize: '15px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                placeholder="operator@company.com"
              />
            </div>

            {mode === 'password' && (
              <div style={{ marginBottom: '24px' }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: '13px', 
                  fontWeight: 600, 
                  color: '#94a3b8', 
                  marginBottom: '8px' 
                }}>
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#ffffff',
                    fontSize: '15px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  placeholder="••••••••"
                />
                <div style={{ marginTop: '12px', textAlign: 'right' }}>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#5ac8fa',
                      fontSize: '13px',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      padding: 0,
                    }}
                  >
                    Forgot password?
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '16px 24px',
                borderRadius: '12px',
                background: loading 
                  ? 'rgba(99, 102, 241, 0.5)' 
                  : 'linear-gradient(135deg, #0a84ff, #6366f1)',
                border: 'none',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '15px',
                cursor: loading ? 'wait' : 'pointer',
                transition: 'all 150ms ease',
                boxShadow: '0 8px 24px rgba(10, 132, 255, 0.25)',
              }}
            >
              {loading ? 'Please wait...' : mode === 'password' ? 'Sign In' : 'Send Magic Link'}
            </button>
          </form>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            marginTop: '18px',
          }}>
            <span style={{ fontSize: '13px', color: '#64748b' }}>
              Need a plan?
            </span>
            <Link
              href="/pricing"
              style={{
                padding: '8px 14px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#94a3b8',
                fontSize: '13px',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              View pricing
            </Link>
          </div>
        </div>

        {/* Footer Links */}
        <div style={{
          marginTop: '24px',
          textAlign: 'center',
          display: 'flex',
          justifyContent: 'center',
          gap: '24px',
          fontSize: '13px',
        }}>
          <Link 
            href="/pricing" 
            style={{ color: '#64748b', textDecoration: 'none' }}
          >
            View Pricing
          </Link>
          <Link 
            href="/intake" 
            style={{ color: '#64748b', textDecoration: 'none' }}
          >
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}
