/**
 * OAuth Callback Handler
 * Handles redirects from Google, GitHub, and other OAuth providers
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') || searchParams.get('redirect') || '/spacebaddie/studio';
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');
  
  // Get origin for redirect
  const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'https://spacebaddie.com';
  
  // Handle OAuth errors
  if (error) {
    console.error('[Auth Callback] OAuth error:', error, errorDescription);
    return NextResponse.redirect(
      `${origin}/spacebaddie/login?error=${encodeURIComponent(errorDescription || error)}`
    );
  }
  
  if (!code) {
    return NextResponse.redirect(
      `${origin}/spacebaddie/login?error=${encodeURIComponent('No authorization code received')}`
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[Auth Callback] Missing Supabase config');
    return NextResponse.redirect(`${origin}/spacebaddie/login?error=Configuration+error`);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      flowType: 'pkce',
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  try {
    // Exchange code for session
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('[Auth Callback] Exchange error:', exchangeError);
      return NextResponse.redirect(
        `${origin}/spacebaddie/login?error=${encodeURIComponent(exchangeError.message)}`
      );
    }

    if (!data.session) {
      return NextResponse.redirect(
        `${origin}/spacebaddie/login?error=${encodeURIComponent('No session created')}`
      );
    }

    console.log('[Auth Callback] Success for user:', data.user?.email);

    // Create user profile if it doesn't exist
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceKey && data.user) {
      const adminClient = createClient(supabaseUrl, serviceKey);
      
      // Check if profile exists
      const { data: existingProfile } = await adminClient
        .from('user_profiles')
        .select('id')
        .eq('id', data.user.id)
        .single();
      
      if (!existingProfile) {
        // Create new profile
        await adminClient.from('user_profiles').insert({
          id: data.user.id,
          display_name: data.user.user_metadata?.full_name || 
                       data.user.user_metadata?.name ||
                       data.user.email?.split('@')[0] || 'User',
          role: 'user',
          onboarding_complete: false,
          onboarding_step: 0,
          onboarding_state: 'new',
        });

        // Create free subscription
        await adminClient.from('subscriptions').insert({
          user_id: data.user.id,
          tier: 'free',
          status: 'active',
        });
        
        console.log('[Auth Callback] Created profile for:', data.user.email);
      }
    }

    // Create response with session cookie
    const response = NextResponse.redirect(`${origin}${next}`);
    
    // Set auth cookies for client-side session persistence
    response.cookies.set('sb-access-token', data.session.access_token, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    
    response.cookies.set('sb-refresh-token', data.session.refresh_token, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
    
  } catch (error) {
    console.error('[Auth Callback] Unexpected error:', error);
    return NextResponse.redirect(
      `${origin}/spacebaddie/login?error=${encodeURIComponent('Authentication failed')}`
    );
  }
}
