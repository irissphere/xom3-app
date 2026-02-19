import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

/**
 * Create a Supabase client for API route handlers
 * Uses @supabase/ssr to properly read session from cookies
 */
async function createSupabaseRouteClient() {
  const cookieStore = await cookies();
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Ignore - can't set cookies in route handlers sometimes
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch {
            // Ignore
          }
        },
      },
    }
  );
}

/**
 * Verify a user's access token directly (fallback when cookies don't work)
 */
async function verifyAccessToken(accessToken: string): Promise<{ userId: string } | null> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !user) {
      return null;
    }
    
    return { userId: user.id };
  } catch {
    return null;
  }
}

// OAuth configuration for each platform
const OAUTH_CONFIGS: Record<string, {
  authUrl: string;
  clientId: string;
  scopes: string[];
  redirectPath: string; // Changed from redirectUri to redirectPath
}> = {
  youtube: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    clientId: process.env.GOOGLE_CLIENT_ID || process.env.YOUTUBE_CLIENT_ID || '',
    scopes: ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube.readonly'],
    redirectPath: '/api/social/callback/youtube',
  },
  tiktok: {
    authUrl: 'https://www.tiktok.com/auth/authorize/',
    clientId: process.env.TIKTOK_CLIENT_KEY || '',
    scopes: ['user.info.basic', 'video.upload', 'video.list'],
    redirectPath: '/api/social/callback/tiktok',
  },
  instagram: {
    // Instagram Login API (newer approach - uses instagram.com OAuth directly)
    authUrl: 'https://www.instagram.com/oauth/authorize',
    clientId: (process.env.INSTAGRAM_APP_ID || '').trim(),
    scopes: ['instagram_business_basic', 'instagram_business_content_publish'],
    redirectPath: '/api/social/callback/instagram',
  },
  twitter: {
    authUrl: 'https://twitter.com/i/oauth2/authorize',
    clientId: process.env.TWITTER_CLIENT_ID || '',
    scopes: ['tweet.read', 'tweet.write', 'users.read'],
    redirectPath: '/api/social/callback/twitter',
  },
  facebook: {
    authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
    clientId: process.env.FACEBOOK_APP_ID || process.env.META_APP_ID || '',
    scopes: ['pages_manage_posts', 'pages_read_engagement', 'pages_show_list'],
    redirectPath: '/api/social/callback/facebook',
  },
  linkedin: {
    authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    clientId: process.env.LINKEDIN_CLIENT_ID || '',
    scopes: ['openid', 'profile', 'w_member_social'],
    redirectPath: '/api/social/callback/linkedin',
  },
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform } = await params;
  const searchParams = request.nextUrl.searchParams;
  
  // Try multiple auth methods
  let userId: string | null = null;
  
  // Method 1: Check cookies via Supabase SSR
  const supabase = await createSupabaseRouteClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session?.user?.id) {
    userId = session.user.id;
  }
  
  // Method 2: Check access_token query param (passed from client)
  if (!userId) {
    const accessToken = searchParams.get('access_token');
    if (accessToken) {
      const verified = await verifyAccessToken(accessToken);
      if (verified) {
        userId = verified.userId;
      }
    }
  }
  
  // Method 3: Check userId query param with access_token verification
  if (!userId) {
    const paramUserId = searchParams.get('user_id');
    const accessToken = searchParams.get('access_token');
    if (paramUserId && accessToken) {
      const verified = await verifyAccessToken(accessToken);
      if (verified && verified.userId === paramUserId) {
        userId = paramUserId;
      }
    }
  }
  
  if (!userId) {
    // No valid authentication found, redirect to login
    const loginUrl = new URL('/spacebaddie/login', request.url);
    loginUrl.searchParams.set('redirect', `/api/social/connect/${platform}`);
    loginUrl.searchParams.set('message', `Please sign in to connect your ${platform} account`);
    return NextResponse.redirect(loginUrl);
  }
  
  const config = OAUTH_CONFIGS[platform.toLowerCase()];
  
  if (!config) {
    return NextResponse.json(
      { error: `Platform "${platform}" is not supported` },
      { status: 400 }
    );
  }
  
  if (!config.clientId) {
    const returnUrl = new URL('/spacebaddie/automation', request.url);
    returnUrl.searchParams.set('error', `${platform}_not_configured`);
    const messages: Record<string, string> = {
      instagram: 'Add INSTAGRAM_APP_ID and INSTAGRAM_APP_SECRET to your Vercel project environment variables. Find these in Meta Developer Console > Use cases > Instagram API.',
      facebook: 'Add FACEBOOK_APP_ID and FACEBOOK_APP_SECRET (or META_APP_ID/META_APP_SECRET) to your Vercel project environment variables. Use the project that deploys spacebaddie.com.',
      youtube: 'Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET (or YOUTUBE_CLIENT_ID/YOUTUBE_CLIENT_SECRET) to your Vercel project environment variables.',
      tiktok: 'Add TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET to your Vercel project environment variables.',
      twitter: 'Add TWITTER_CLIENT_ID and TWITTER_CLIENT_SECRET to your Vercel project environment variables.',
      linkedin: 'Add LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET to your Vercel project environment variables.',
    };
    returnUrl.searchParams.set('message', messages[platform] || `${platform} OAuth credentials not configured. Add required env vars to your deployment.`);
    return NextResponse.redirect(returnUrl);
  }

  // Determine the base URL
  let baseUrl = process.env.NEXT_PUBLIC_APP_URL;
  
  // Force production URL if missing or localhost in production
  if (process.env.NODE_ENV === 'production' && (!baseUrl || baseUrl.includes('localhost') || baseUrl.includes('vercel.app'))) {
    baseUrl = 'https://spacebaddie.com';
  } else if (!baseUrl) {
    // Fallback to request origin (useful for local dev)
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    baseUrl = `${protocol}://${host}`;
  }
  
  // Construct absolute redirect URI
  const redirectUri = `${baseUrl}${config.redirectPath}`;
  
  // Generate state for CSRF protection (include user ID for callback)
  const stateData = {
    csrf: crypto.randomUUID(),
    userId: userId,
  };
  const state = Buffer.from(JSON.stringify(stateData)).toString('base64url');
  
  // Store state in cookie for verification on callback
  const response = NextResponse.redirect(buildOAuthUrl(platform, config, state, redirectUri));
  response.cookies.set(`oauth_state_${platform}`, stateData.csrf, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10, // 10 minutes
    path: '/',
  });
  
  // Also store user ID for callback to associate connection with user
  response.cookies.set('oauth_user_id', userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10, // 10 minutes
    path: '/',
  });
  
  return response;
}

function buildOAuthUrl(
  platform: string,
  config: typeof OAUTH_CONFIGS[string],
  state: string,
  redirectUri: string
): string {
  const params = new URLSearchParams();
  
  switch (platform.toLowerCase()) {
    case 'youtube':
      params.set('client_id', config.clientId);
      params.set('redirect_uri', redirectUri);
      params.set('response_type', 'code');
      params.set('scope', config.scopes.join(' '));
      params.set('access_type', 'offline');
      params.set('state', state);
      params.set('prompt', 'consent');
      break;
      
    case 'tiktok':
      params.set('client_key', config.clientId);
      params.set('redirect_uri', redirectUri);
      params.set('response_type', 'code');
      params.set('scope', config.scopes.join(','));
      params.set('state', state);
      break;
      
    case 'instagram':
      // Instagram Login API uses enable_fb_login and force_authentication
      params.set('client_id', config.clientId);
      params.set('redirect_uri', redirectUri);
      params.set('response_type', 'code');
      params.set('scope', config.scopes.join(','));
      params.set('state', state);
      break;
      
    case 'facebook':
      params.set('client_id', config.clientId);
      params.set('redirect_uri', redirectUri);
      params.set('response_type', 'code');
      params.set('scope', config.scopes.join(','));
      params.set('state', state);
      break;
      
    case 'twitter':
      params.set('client_id', config.clientId);
      params.set('redirect_uri', redirectUri);
      params.set('response_type', 'code');
      params.set('scope', config.scopes.join(' '));
      params.set('state', state);
      params.set('code_challenge', 'challenge'); // Simplified - should use PKCE
      params.set('code_challenge_method', 'plain');
      break;
      
    case 'linkedin':
      params.set('client_id', config.clientId);
      params.set('redirect_uri', redirectUri);
      params.set('response_type', 'code');
      params.set('scope', config.scopes.join(' '));
      params.set('state', state);
      break;
      
    default:
      params.set('client_id', config.clientId);
      params.set('redirect_uri', redirectUri);
      params.set('response_type', 'code');
      params.set('scope', config.scopes.join(' '));
      params.set('state', state);
  }
  
  return `${config.authUrl}?${params.toString()}`;
}
