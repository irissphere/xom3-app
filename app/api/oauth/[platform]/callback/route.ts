// OAuth Callback Route - Handles OAuth Response
// AKV: Clean, sovereign, zero-drift

import { NextRequest, NextResponse } from "next/server";
import {
  OAuthPlatform,
  PLATFORM_CONFIGS,
  getPlatformCredentials,
  validateOAuthState,
  storeToken,
} from "@/lib/oauth";
import { fetchPlatformUserInfo } from "@/lib/oauth/user-info-fetchers";
import { hasValidSession, getUserFromRequest } from "@/lib/auth/supabase-middleware";

export const dynamic = "force-dynamic";

/**
 * GET /api/oauth/[platform]/callback
 * Handles OAuth callback with authorization code
 * Verifies user is still authenticated before storing tokens
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  try {
    const { platform: platformParam } = await params;
    const platform = platformParam as OAuthPlatform;
    const url = new URL(request.url);

    // Verify user is still authenticated
    const isAuthenticated = await hasValidSession(request);
    if (!isAuthenticated) {
      console.error("[OAuth] User session expired during OAuth flow");
      return redirectToUI(platform, "error", "Session expired. Please log in and try again.");
    }

    // Get authenticated user
    const authenticatedUser = await getUserFromRequest(request);

    // Get callback parameters
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");
    const errorDescription = url.searchParams.get("error_description");

    // Check for OAuth errors
    if (error) {
      console.error(`[OAuth] ${platform} returned error:`, error, errorDescription);
      return redirectToUI(platform, "error", errorDescription || error);
    }

    // Validate required params
    if (!code || !state) {
      return redirectToUI(platform, "error", "Missing authorization code or state");
    }

    // Validate and consume state (CSRF protection)
    const stateValidation = validateOAuthState(state);
    
    let tenantId: string;
    let redirectUri: string;
    let codeVerifier: string | undefined;
    
    if (stateValidation.valid) {
      tenantId = stateValidation.tenantId || "default";
      redirectUri = stateValidation.redirectUri || `${url.origin}/api/oauth/${platform}/callback`;
      codeVerifier = stateValidation.codeVerifier;
    } else {
      // Try to recover state from cookie (dev mode fallback)
      const cookieHeader = request.headers.get("cookie") || "";
      const stateDataMatch = cookieHeader.match(/oauth_state_data=([^;]+)/);
      
      if (stateDataMatch) {
        try {
          const stateData = JSON.parse(decodeURIComponent(stateDataMatch[1]));
          if (stateData.state === state) {
            console.log("[OAuth] Recovered state from cookie");
            tenantId = stateData.tenantId || "default";
            redirectUri = stateData.redirectUri || `${url.origin}/api/oauth/${platform}/callback`;
            codeVerifier = stateData.codeVerifier;
          } else {
            return redirectToUI(platform, "error", "State mismatch");
          }
        } catch (e) {
          console.error("[OAuth] Failed to parse state cookie:", e);
          return redirectToUI(platform, "error", stateValidation.error || "Invalid state");
        }
      } else {
        return redirectToUI(platform, "error", stateValidation.error || "Invalid state");
      }
    }

    // Exchange code for tokens
    const config = PLATFORM_CONFIGS[platform];
    const { clientId, clientSecret } = getPlatformCredentials(platform);

    let tokenResponse: Response;

    if (platform === "twitter") {
      // Twitter uses Basic auth + PKCE
      const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
      const body = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier || "",
      });

      tokenResponse = await fetch(config.tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": `Basic ${authHeader}`,
        },
        body: body.toString(),
      });
    } else if (platform === "tiktok") {
      // TikTok uses client_key instead of client_id
      const body = new URLSearchParams({
        client_key: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      });

      tokenResponse = await fetch(config.tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });
    } else {
      // Standard OAuth2 flow (Google, Meta, LinkedIn)
      const body = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      });

      tokenResponse = await fetch(config.tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });
    }

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error(`[OAuth] Token exchange failed for ${platform}:`, errorText);
      return redirectToUI(platform, "error", "Failed to exchange authorization code");
    }

    const tokenData = await tokenResponse.json();

    // Handle TikTok nested response
    const accessToken = tokenData.access_token || tokenData.data?.access_token;
    const refreshToken = tokenData.refresh_token || tokenData.data?.refresh_token;
    const expiresIn = tokenData.expires_in || tokenData.data?.expires_in;
    const scope = tokenData.scope || tokenData.data?.scope;

    if (!accessToken) {
      console.error(`[OAuth] No access token in response for ${platform}:`, tokenData);
      return redirectToUI(platform, "error", "No access token received");
    }

    // Fetch user info from platform
    let userInfo;
    try {
      userInfo = await fetchPlatformUserInfo(platform, accessToken);
    } catch (err: any) {
      console.warn(`[OAuth] Failed to fetch user info for ${platform}:`, err.message);
      // Continue without user info - not critical
    }

    // Store token with user ID association
    await storeToken(tenantId, platform, accessToken, {
      refreshToken,
      expiresIn,
      scope,
      userInfo,
      userId: authenticatedUser?.id, // Associate with authenticated user
    });

    console.log(`[OAuth] Successfully connected ${platform} for tenant ${tenantId}, user ${authenticatedUser?.id || 'anonymous'}`);

    // Redirect to success page
    return redirectToUI(platform, "success", userInfo?.displayName || userInfo?.username || "Account connected");
  } catch (error: any) {
    console.error("[OAuth] Callback error:", error);
    const { platform: platformParam } = await params;
    return redirectToUI(platformParam as OAuthPlatform, "error", error.message || "Connection failed");
  }
}

/**
 * Redirect to UI with result
 */
function redirectToUI(platform: OAuthPlatform, status: "success" | "error", message: string): Response {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const params = new URLSearchParams({
    platform,
    status,
    message,
  });

  // Redirect to settings/accounts page with result
  const response = NextResponse.redirect(`${baseUrl}/settings/accounts?${params.toString()}`);
  
  // Clear the OAuth state cookie
  response.cookies.set("oauth_state_data", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  
  return response;
}
























