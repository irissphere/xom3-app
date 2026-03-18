import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const getSupabase = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

// Token exchange endpoints
const TOKEN_ENDPOINTS: Record<string, string> = {
  youtube: 'https://oauth2.googleapis.com/token',
  tiktok: 'https://open.tiktokapis.com/v2/oauth/token/',
  instagram: 'https://api.instagram.com/oauth/access_token',
  twitter: 'https://api.twitter.com/2/oauth2/token',
  facebook: 'https://graph.facebook.com/v18.0/oauth/access_token',
  linkedin: 'https://www.linkedin.com/oauth/v2/accessToken',
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform } = await params;
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');
  
  const cookieStore = await cookies();
  const storedState = cookieStore.get(`oauth_state_${platform}`)?.value;
  
  // Handle OAuth errors
  if (error) {
    const returnUrl = new URL('/spacebaddie/automation', request.url);
    returnUrl.searchParams.set('error', error);
    returnUrl.searchParams.set('message', errorDescription || `Failed to connect ${platform}`);
    return NextResponse.redirect(returnUrl);
  }
  
  // Parse state to get CSRF token and user ID
  let stateData: { csrf?: string; userId?: string } = {};
  try {
    if (state) {
      stateData = JSON.parse(Buffer.from(state, 'base64url').toString());
    }
  } catch {
    // State might be in old format (just the CSRF token)
    stateData = { csrf: state || undefined };
  }
  
  // Verify CSRF state
  if (!stateData.csrf || stateData.csrf !== storedState) {
    const returnUrl = new URL('/spacebaddie/automation', request.url);
    returnUrl.searchParams.set('error', 'invalid_state');
    returnUrl.searchParams.set('message', 'Invalid OAuth state. Please try connecting again.');
    return NextResponse.redirect(returnUrl);
  }
  
  if (!code) {
    const returnUrl = new URL('/spacebaddie/automation', request.url);
    returnUrl.searchParams.set('error', 'no_code');
    returnUrl.searchParams.set('message', 'No authorization code received');
    return NextResponse.redirect(returnUrl);
  }
  
  // Get user ID from state or cookie
  const userId = stateData.userId || cookieStore.get('oauth_user_id')?.value;
  if (!userId) {
    const returnUrl = new URL('/spacebaddie/automation', request.url);
    returnUrl.searchParams.set('error', 'no_user');
    returnUrl.searchParams.set('message', 'User session expired. Please try connecting again.');
    return NextResponse.redirect(returnUrl);
  }
  
  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(platform, code, request.url);
    const now = new Date().toISOString();
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;

    // Store the connection in database (spacebaddie_social_connections)
    // Using the correct schema columns directly
    const connectionRow = {
      user_id: userId,
      tenant: 'spacebaddie',
      platform: platform.toLowerCase(),
      status: 'connected',
      access_token_hash: tokens.access_token,
      refresh_token_hash: tokens.refresh_token || null,
      token_expires_at: expiresAt,
      connected_at: now,
      updated_at: now,
      platform_user_id: tokens.account_id || null,
      platform_username: tokens.account_name || null,
      platform_display_name: tokens.account_name || null,
      daily_limit: 10,
      posts_today: 0,
      last_reset_date: now.split('T')[0],
      metadata: {
        account_name: tokens.account_name,
        account_id: tokens.account_id,
        connected_via: 'oauth_callback',
      },
    };

    console.log(`[OAuth Callback] Saving ${platform} connection for user ${userId}`);
    const { error: upsertError } = await getSupabase()
      .from('spacebaddie_social_connections')
      .upsert(connectionRow, { onConflict: 'user_id,tenant,platform' });

    if (upsertError) {
      console.error(`[OAuth Callback] ${platform} upsert error:`, upsertError);
      throw new Error(`Database error: ${upsertError.message}`);
    }
    
    console.log(`[OAuth Callback] Successfully saved ${platform} connection`);
    
    // Clear the state and user cookies
    const response = NextResponse.redirect(new URL('/spacebaddie/automation?connected=' + platform, request.url));
    response.cookies.delete(`oauth_state_${platform}`);
    response.cookies.delete('oauth_user_id');
    
    return response;
    
  } catch (err) {
    console.error(`[OAuth Callback] ${platform} error:`, err);
    const returnUrl = new URL('/spacebaddie/automation', request.url);
    returnUrl.searchParams.set('error', 'token_exchange_failed');
    returnUrl.searchParams.set('message', `Failed to connect ${platform}. Please try again.`);
    return NextResponse.redirect(returnUrl);
  }
}

// Trim env vars to prevent CRLF/whitespace from breaking OAuth
function safeEnv(key: string): string {
  return (process.env[key] || '').trim();
}

async function exchangeCodeForTokens(
  platform: string,
  code: string,
  currentUrl: string
): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  account_name?: string;
  account_id?: string;
}> {
  const baseUrl = safeEnv('NEXT_PUBLIC_APP_URL') || 'https://spacebaddie.com';
  const redirectUri = `${baseUrl.replace(/\/$/, '')}/api/social/callback/${platform}`;
  
  switch (platform.toLowerCase()) {
    case 'youtube': {
      const clientId = safeEnv('GOOGLE_CLIENT_ID') || safeEnv('YOUTUBE_CLIENT_ID');
      const clientSecret = safeEnv('GOOGLE_CLIENT_SECRET') || safeEnv('YOUTUBE_CLIENT_SECRET');
      if (!clientId || !clientSecret) {
        throw new Error('Google OAuth credentials not configured');
      }
      const response = await fetch(TOKEN_ENDPOINTS.youtube, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        const errMsg = data.error_description || data.error || `HTTP ${response.status}`;
        console.error(`[OAuth Callback] YouTube token exchange failed:`, { error: data.error, description: data.error_description, status: response.status });
        throw new Error(errMsg);
      }
      return data;
    }
    
    case 'tiktok': {
      const ttClientKey = safeEnv('TIKTOK_CLIENT_KEY');
      const ttClientSecret = safeEnv('TIKTOK_CLIENT_SECRET');
      if (!ttClientKey || !ttClientSecret) throw new Error('TikTok OAuth credentials not configured');
      const response = await fetch(TOKEN_ENDPOINTS.tiktok, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_key: ttClientKey,
          client_secret: ttClientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }),
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        const errMsg = data.error_description || data.error || data.description || `HTTP ${response.status}`;
        console.error(`[OAuth Callback] TikTok token exchange failed:`, data);
        throw new Error(errMsg);
      }
      // TikTok v2 API returns tokens directly (not nested under data)
      const tokenData = data.data || data;
      return {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_in: tokenData.expires_in,
        account_id: tokenData.open_id,
      };
    }
    
    case 'instagram': {
      // Instagram Login API - exchange code for short-lived token
      const igClientId = safeEnv('INSTAGRAM_APP_ID');
      const igClientSecret = safeEnv('INSTAGRAM_APP_SECRET');
      if (!igClientId || !igClientSecret) throw new Error('Instagram OAuth credentials not configured. Add INSTAGRAM_APP_ID and INSTAGRAM_APP_SECRET env vars.');
      
      // Step 1: Exchange code for short-lived access token
      const shortTokenRes = await fetch('https://api.instagram.com/oauth/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: igClientId,
          client_secret: igClientSecret,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
          code,
        }),
      });
      const shortTokenData = await shortTokenRes.json();
      if (shortTokenData.error_message || shortTokenData.error) {
        const errMsg = shortTokenData.error_message || shortTokenData.error?.message || 'Instagram token exchange failed';
        console.error('[OAuth Callback] Instagram short token exchange failed:', shortTokenData);
        throw new Error(errMsg);
      }
      
      const shortToken = shortTokenData.access_token;
      const igUserId = shortTokenData.user_id;
      
      // Step 2: Exchange short-lived token for long-lived token (60 days)
      let longToken = shortToken;
      let expiresIn = 3600; // Default 1 hour for short-lived
      try {
        const longTokenRes = await fetch(
          `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${igClientSecret}&access_token=${shortToken}`
        );
        const longTokenData = await longTokenRes.json();
        if (longTokenData.access_token) {
          longToken = longTokenData.access_token;
          expiresIn = longTokenData.expires_in || 5184000; // 60 days
          console.log('[OAuth Callback] Instagram long-lived token obtained, expires in', expiresIn, 'seconds');
        }
      } catch (e) {
        console.warn('[OAuth Callback] Could not exchange for long-lived Instagram token:', e);
      }
      
      // Step 3: Get user profile info
      let accountName = 'Instagram';
      try {
        const profileRes = await fetch(
          `https://graph.instagram.com/v21.0/me?fields=user_id,username&access_token=${longToken}`
        );
        const profileData = await profileRes.json();
        if (profileData.username) {
          accountName = profileData.username;
        }
      } catch (e) {
        console.warn('[OAuth Callback] Could not fetch Instagram profile:', e);
      }
      
      return {
        access_token: longToken,
        expires_in: expiresIn,
        account_id: String(igUserId),
        account_name: accountName,
      };
    }
    
    case 'facebook': {
      const fbClientId = safeEnv('FACEBOOK_APP_ID') || safeEnv('META_APP_ID');
      const fbClientSecret = safeEnv('FACEBOOK_APP_SECRET') || safeEnv('META_APP_SECRET');
      if (!fbClientId || !fbClientSecret) throw new Error('Meta/Facebook OAuth credentials not configured');
      const params = new URLSearchParams({
        client_id: fbClientId,
        client_secret: fbClientSecret,
        code,
        redirect_uri: redirectUri,
      });
      const response = await fetch(`${TOKEN_ENDPOINTS.facebook}?${params}`);
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);

      let accessToken = data.access_token;
      let expiresIn = data.expires_in;

      // Exchange short-lived for long-lived token (~60 days)
      try {
        const exchangeRes = await fetch(
          `https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${fbClientId}&client_secret=${fbClientSecret}&fb_exchange_token=${accessToken}`
        );
        const exchangeData = await exchangeRes.json();
        if (exchangeData.access_token) {
          accessToken = exchangeData.access_token;
          expiresIn = exchangeData.expires_in ?? 5184000; // 60 days default
          console.log('[OAuth Callback] Facebook long-lived token obtained, expires in', expiresIn, 'seconds');
        }
      } catch (e) {
        console.warn('[OAuth Callback] Could not exchange for long-lived Facebook token:', e);
      }

      // Fetch display name for "Connected as …"
      let accountName: string | undefined;
      let accountId: string | undefined;
      try {
        const meRes = await fetch(
          `https://graph.facebook.com/v18.0/me?fields=id,name&access_token=${accessToken}`
        );
        const meData = await meRes.json();
        if (!meData.error && meData.name) {
          accountName = meData.name;
          accountId = meData.id;
        }
      } catch (e) {
        console.warn('[OAuth Callback] Could not fetch Facebook profile:', e);
      }

      return {
        access_token: accessToken,
        expires_in: expiresIn,
        account_id: accountId,
        account_name: accountName,
      };
    }
    
    case 'twitter': {
      const twClientId = safeEnv('TWITTER_CLIENT_ID');
      const twClientSecret = safeEnv('TWITTER_CLIENT_SECRET');
      if (!twClientId || !twClientSecret) throw new Error('Twitter/X OAuth credentials not configured');
      const response = await fetch(TOKEN_ENDPOINTS.twitter, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${twClientId}:${twClientSecret}`).toString('base64')}`,
        },
        body: new URLSearchParams({
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
          code_verifier: 'challenge', // Matches PKCE plain challenge
        }),
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        const errMsg = data.error_description || data.error || `HTTP ${response.status}`;
        console.error(`[OAuth Callback] Twitter token exchange failed:`, data);
        throw new Error(errMsg);
      }
      return data;
    }
    
    case 'linkedin': {
      const liClientId = safeEnv('LINKEDIN_CLIENT_ID');
      const liClientSecret = safeEnv('LINKEDIN_CLIENT_SECRET');
      if (!liClientId || !liClientSecret) throw new Error('LinkedIn OAuth credentials not configured');
      const response = await fetch(TOKEN_ENDPOINTS.linkedin, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          client_id: liClientId,
          client_secret: liClientSecret,
        }),
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        const errMsg = data.error_description || data.error || `HTTP ${response.status}`;
        console.error(`[OAuth Callback] LinkedIn token exchange failed:`, data);
        throw new Error(errMsg);
      }

      // Fetch display name for "Connected as …"
      let accountName: string | undefined;
      let accountId: string | undefined;
      try {
        const userInfoRes = await fetch('https://api.linkedin.com/v2/userinfo', {
          headers: { Authorization: `Bearer ${data.access_token}` },
        });
        const userInfo = await userInfoRes.json();
        if (userInfo.sub) {
          accountId = userInfo.sub;
          accountName = userInfo.name ?? ([userInfo.given_name, userInfo.family_name].filter(Boolean).join(' ') || undefined);
        }
      } catch (e) {
        console.warn('[OAuth Callback] Could not fetch LinkedIn profile:', e);
      }

      return {
        access_token: data.access_token,
        expires_in: data.expires_in,
        refresh_token: data.refresh_token,
        account_id: accountId,
        account_name: accountName,
      };
    }
    
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}
