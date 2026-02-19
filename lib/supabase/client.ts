import { createBrowserClient } from '@supabase/ssr';

// Require environment variables - fail fast at runtime, not build time
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Don't throw during build - env vars may not be available during static generation
// Runtime checks will happen when the client is actually used
if (!supabaseUrl || !supabaseAnonKey) {
  if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
    // Only throw at runtime in browser (production)
    console.error(
      '[SUPABASE] Credentials missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.'
    );
  } else {
    console.warn(
      '[SUPABASE] Credentials missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local'
    );
  }
}

// Browser client (for client components)
// Uses @supabase/ssr which stores sessions in cookies (required for middleware to read sessions)
export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const supabase = createBrowserClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

// Re-export createBrowserClient for components that need their own instance
export { createBrowserClient };

// Type for user profile
export interface UserProfile {
  id: string;
  role: 'user' | 'operator' | 'admin';
  display_name: string | null;
  created_at: string;
  updated_at: string;
  onboarding_complete: boolean;
  onboarding_step: number;
  onboarding_state: string;
}

// Get current user with profile
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }

  // Get profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return {
    ...user,
    profile: profile as UserProfile | null,
  };
}

// Sign up with email
export async function signUp(email: string, password: string, displayName?: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
      },
    },
  });

  if (error) throw error;
  return data;
}

// Sign in with email
export async function signIn(email: string, password: string) {
  console.log('[AUTH] Attempting sign in for:', email);
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('[AUTH] Sign in error:', error);
    throw error;
  }

  console.log('[AUTH] Sign in response:', {
    hasSession: !!data?.session,
    hasUser: !!data?.user,
    userEmail: data?.user?.email,
    emailConfirmed: !!data?.user?.email_confirmed_at,
  });

  // Supabase should always return a session on successful login
  // If no session, there might be an account issue
  if (!data?.session) {
    const errorMsg = data?.user && !data.user.email_confirmed_at
      ? 'Please check your email and confirm your account before signing in.'
      : 'Login succeeded but no session created. This may be a configuration issue.';
    console.error('[AUTH] No session in response:', errorMsg);
    throw new Error(errorMsg);
  }

  console.log('[AUTH] Sign in successful, session created for:', data.user?.email);
  return data;
}

// Sign out
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// Password reset
export async function resetPassword(email: string) {
  // Use environment variable or current origin for redirect URL
  const redirectUrl = process.env.NEXT_PUBLIC_APP_URL || 
    (typeof window !== 'undefined' ? window.location.origin : 'https://xom3.io') + 
    '/auth/reset-password';

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirectUrl,
  });
  if (error) throw error;
}

// Magic link sign in
export async function signInWithMagicLink(email: string, redirectTo?: string) {
  // Use environment variable or current origin for redirect URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
    (typeof window !== 'undefined' ? window.location.origin : 'https://xom3.io');
  const redirectUrl = `${baseUrl}/auth/callback${redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`;

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectUrl,
    },
  });
  if (error) throw error;
}
