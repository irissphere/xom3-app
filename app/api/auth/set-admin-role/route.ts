import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Set admin role for a user (requires service role key)
 * Call this after user has signed in via magic link
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
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
      return NextResponse.json(
        { success: false, error: 'Service role key not configured. Cannot set admin role automatically.' },
        { status: 500 }
      );
    }

    // Use service role for admin operations
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get user by email
    const { data: usersData, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      return NextResponse.json(
        { success: false, error: userError.message },
        { status: 400 }
      );
    }

    const user = usersData?.users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found. Please sign in first via magic link.' },
        { status: 404 }
      );
    }

    // Create or update profile with admin role
    const { error: profileError } = await supabase
      .from('user_profiles')
      .upsert({
        id: user.id,
        role: 'admin',
        display_name: email.split('@')[0],
        onboarding_complete: true,
        onboarding_step: 999,
        onboarding_state: 'complete',
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id',
      });

    if (profileError) {
      return NextResponse.json(
        { success: false, error: `Failed to update profile: ${profileError.message}` },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Admin role set successfully',
      email,
      userId: user.id,
    });

  } catch (error: any) {
    console.error('Set admin role error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to set admin role' },
      { status: 500 }
    );
  }
}

