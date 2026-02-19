import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Admin endpoint to send magic link to user
 * After user signs in via magic link, call /api/auth/set-admin-role to set admin role
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lmfwxitjewiophshjcrd.supabase.co';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtZnd4aXRqZXdpb3Boc2hqY3JkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyMDc5NDgsImV4cCI6MjA4MTc4Mzk0OH0.B43EyC1a7Xm_YYeZkPo9x9pDxF2VNj2zrAnKdc_ss3M';

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { success: false, error: 'Supabase not configured' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Send magic link
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `https://xom3.io/auth/callback`,
      },
    });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Magic link sent successfully',
      email,
    });

  } catch (error: any) {
    console.error('Admin invite error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to send invitation' },
      { status: 500 }
    );
  }
}

