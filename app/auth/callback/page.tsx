'use client';

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get URL hash fragments (Supabase magic links use hash-based auth)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const hashError = hashParams.get('error');
        const hashErrorDescription = hashParams.get('error_description');
        const queryError = searchParams.get('error');
        const queryErrorDescription = searchParams.get('error_description');

        // Handle errors from URL
        if (hashError || queryError) {
          throw new Error(hashErrorDescription || queryErrorDescription || hashError || queryError || 'Authentication failed');
        }

        // If we have tokens in hash, set the session
        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionError) {
            console.error('Session set error:', sessionError);
            throw sessionError;
          }
        } else {
          // Try PKCE code exchange (for OAuth flows)
          const code = searchParams.get('code');
          if (code) {
            const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            if (exchangeError) {
              console.error('Code exchange error:', exchangeError);
              throw exchangeError;
            }
          } else {
            // Check if we already have a session (magic link might have set it)
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
              console.warn('No tokens, code, or existing session found in callback');
              // Still continue to check user - Supabase might have set session via cookies
            }
          }
        }

        // Wait a moment for session to be set
        await new Promise(resolve => setTimeout(resolve, 200));

        // Check if user is now authenticated
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          throw userError;
        }
        
        if (user) {
          // Check if profile exists, create if not
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          // Admin emails - automatically get admin role
          const adminEmails = [
            'preston.chenault@xom3.io',
            'preston@xom3.io',
            'admin@xom3.io',
            'prestonjchenault@outlook.com',
            'preston.chenault@pulseverabenefits.com',
          ];
          const isAdmin = adminEmails.includes(user.email?.toLowerCase() || '');

          if (!profile) {
            // Create profile - auto-set admin for admin emails
            await supabase.from('user_profiles').insert({
              id: user.id,
              role: isAdmin ? 'admin' : 'user',
              display_name: user.user_metadata?.display_name || user.email?.split('@')[0],
              onboarding_complete: isAdmin,
              onboarding_step: isAdmin ? 999 : 0,
              onboarding_state: isAdmin ? 'complete' : 'new',
            });
          } else if (isAdmin && profile.role !== 'admin') {
            // Update existing profile to admin for admin emails
            await supabase.from('user_profiles').update({
              role: 'admin',
              onboarding_complete: true,
              onboarding_step: 999,
              onboarding_state: 'complete',
            }).eq('id', user.id);
          }

          // Redirect to requested location (or fallback)
          const redirect = searchParams.get('redirect');
          const host = typeof window !== 'undefined' ? window.location.hostname : '';
          const defaultRedirect = host === 'spacebaddie.com' || host.endsWith('.spacebaddie.com')
            ? '/spacebaddie/studio'
            : '/operator/dashboard';
          router.push(redirect || defaultRedirect);
        } else {
          setError('Authentication failed. Please try again.');
        }
      } catch (err: any) {
        console.error('Auth callback error:', err);
        setError(err.message || 'Authentication failed');
      }
    };

    handleCallback();
  }, [router, searchParams]);

  if (error) {
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
          maxWidth: '400px',
          textAlign: 'center',
          padding: '40px',
          borderRadius: '20px',
          background: 'linear-gradient(180deg, rgba(10, 14, 26, 0.88), rgba(12, 18, 34, 0.72))',
          border: '1px solid rgba(239, 68, 68, 0.3)',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚠️</div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#ef4444', marginBottom: '12px' }}>
            Authentication Failed
          </h2>
          <p style={{ color: '#94a3b8', marginBottom: '24px' }}>
            {error}
          </p>
          <button
            onClick={() => router.push('/login')}
            style={{
              padding: '14px 28px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #0a84ff, #6366f1)',
              border: 'none',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '15px',
              cursor: 'pointer',
            }}
          >
            Back to Login
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
      <div style={{
        textAlign: 'center',
        color: '#94a3b8',
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '3px solid rgba(10, 132, 255, 0.3)',
          borderTopColor: '#0a84ff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 20px',
        }} />
        <p style={{ fontSize: '16px' }}>Signing you in...</p>
        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}

function LoadingFallback() {
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
        textAlign: 'center',
        color: '#94a3b8',
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '3px solid rgba(10, 132, 255, 0.3)',
          borderTopColor: '#0a84ff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 20px',
        }} />
        <p style={{ fontSize: '16px' }}>Loading...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AuthCallbackContent />
    </Suspense>
  );
}
