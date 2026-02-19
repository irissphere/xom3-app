// OAuth Authorization Route - Initiates OAuth Flow
// AKV: Clean, sovereign, zero-drift

import { NextRequest, NextResponse } from "next/server";
import {
  OAuthPlatform,
  PLATFORM_CONFIGS,
  buildAuthUrl,
  isPlatformConfigured,
  createOAuthState,
  generatePKCE,
} from "@/lib/oauth";
import { hasValidSession, getUserFromRequest } from "@/lib/auth/supabase-middleware";

export const dynamic = "force-dynamic";

/**
 * GET /api/oauth/[platform]/authorize
 * Initiates OAuth flow by redirecting to platform's authorization page
 * Requires user to be authenticated first
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  try {
    const { platform: platformParam } = await params;
    const platform = platformParam as OAuthPlatform;
    const url = new URL(request.url);

    // Check authentication before proceeding
    const isAuthenticated = await hasValidSession(request);
    if (!isAuthenticated) {
      // Redirect to login with return URL
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || url.origin || "http://localhost:3000";
      const loginUrl = new URL("/login", baseUrl);
      loginUrl.searchParams.set("redirect", request.url);
      return NextResponse.redirect(loginUrl);
    }

    // Get user info for storing with OAuth connection
    const user = await getUserFromRequest(request);

    // Validate platform
    if (!PLATFORM_CONFIGS[platform]) {
      return NextResponse.json(
        { ok: false, error: `Unknown platform: ${platform}` },
        { status: 400 }
      );
    }

    // Check if platform is configured
    if (!isPlatformConfigured(platform)) {
      return NextResponse.json(
        {
          ok: false,
          error: `Platform ${platform} is not configured. Contact administrator to set up OAuth credentials.`,
        },
        { status: 503 }
      );
    }

    // Get tenant ID (from session, header, or query param)
    const tenantId = url.searchParams.get("tenant") ||
      request.headers.get("x-tenant-id") ||
      "default";

    // Build redirect URI
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
      url.origin ||
      "http://localhost:3000";
    const redirectUri = `${baseUrl}/api/oauth/${platform}/callback`;

    // Generate PKCE for Twitter
    let codeVerifier: string | undefined;
    let codeChallenge: string | undefined;
    if (platform === "twitter") {
      const pkce = generatePKCE();
      codeVerifier = pkce.verifier;
      codeChallenge = pkce.challenge;
    }

    // Create and store OAuth state (CSRF protection)
    const state = createOAuthState(tenantId, platform, redirectUri, codeVerifier);

    // Build authorization URL
    const authUrl = buildAuthUrl(platform, redirectUri, state, codeChallenge);

    // Store state data in cookie for development (survives module recompilation)
    const stateData = JSON.stringify({
      tenantId,
      platform,
      redirectUri,
      codeVerifier,
      state,
      userId: user?.id, // Include user ID for callback verification
    });
    
    // Redirect to OAuth provider with state cookie
    const response = NextResponse.redirect(authUrl);
    response.cookies.set("oauth_state_data", stateData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
      path: "/",
    });
    
    return response;
  } catch (error: any) {
    console.error("[OAuth] Authorization error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Authorization failed" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/oauth/[platform]/authorize
 * Returns authorization URL without redirecting (for popup flows)
 * Requires user to be authenticated first
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  try {
    const { platform: platformParam } = await params;
    const platform = platformParam as OAuthPlatform;
    const body = await request.json().catch(() => ({}));

    // Check authentication before proceeding
    const isAuthenticated = await hasValidSession(request);
    if (!isAuthenticated) {
      return NextResponse.json(
        { ok: false, error: "Authentication required", code: "AUTH_REQUIRED" },
        { status: 401 }
      );
    }

    // Validate platform
    if (!PLATFORM_CONFIGS[platform]) {
      return NextResponse.json(
        { ok: false, error: `Unknown platform: ${platform}` },
        { status: 400 }
      );
    }

    // Check if platform is configured
    if (!isPlatformConfigured(platform)) {
      return NextResponse.json(
        {
          ok: false,
          error: `Platform ${platform} is not configured.`,
          configured: false,
        },
        { status: 503 }
      );
    }

    // Get tenant ID
    const tenantId = body.tenantId ||
      request.headers.get("x-tenant-id") ||
      "default";

    // Build redirect URI
    const url = new URL(request.url);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
      url.origin ||
      "http://localhost:3000";
    const redirectUri = body.redirectUri || `${baseUrl}/api/oauth/${platform}/callback`;

    // Generate PKCE for Twitter
    let codeVerifier: string | undefined;
    let codeChallenge: string | undefined;
    if (platform === "twitter") {
      const pkce = generatePKCE();
      codeVerifier = pkce.verifier;
      codeChallenge = pkce.challenge;
    }

    // Create and store OAuth state
    const state = createOAuthState(tenantId, platform, redirectUri, codeVerifier);

    // Build authorization URL
    const authUrl = buildAuthUrl(platform, redirectUri, state, codeChallenge);

    return NextResponse.json({
      ok: true,
      platform,
      authUrl,
      state,
    });
  } catch (error: any) {
    console.error("[OAuth] Authorization URL generation error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to generate auth URL" },
      { status: 500 }
    );
  }
}
























