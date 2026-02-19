import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

/**
 * Check if request has a valid Supabase session
 */
export async function hasValidSession(request: NextRequest): Promise<boolean> {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            // Cannot set cookies in middleware read
          },
          remove(name: string, options: CookieOptions) {
            // Cannot remove cookies in middleware read
          },
        },
      }
    );

    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('[AUTH MIDDLEWARE] Session error:', error.message);
      return false;
    }

    return !!session;
  } catch (err) {
    console.error('[AUTH MIDDLEWARE] Error checking session:', err);
    return false;
  }
}

/**
 * Require authentication - redirect to login if not authenticated
 */
export async function requireAuth(
  request: NextRequest, 
  pathname: string
): Promise<NextResponse | null> {
  const hasSession = await hasValidSession(request);
  
  if (!hasSession) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl, 302);
  }
  
  return null;
}

/**
 * Get user from request cookies
 */
export async function getUserFromRequest(request: NextRequest) {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set() {},
          remove() {},
        },
      }
    );

    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return null;
    }

    return user;
  } catch (err) {
    console.error('[AUTH MIDDLEWARE] Error getting user:', err);
    return null;
  }
}
