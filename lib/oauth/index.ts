// OAuth Module - Main Export
// AKV: Clean, sovereign, zero-drift

export * from "./types";
export * from "./platform-configs";
export * from "./token-storage";
export * from "./user-info-fetchers";

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(
  platform: import("./types").OAuthPlatform,
  code: string,
  redirectUri: string,
  codeVerifier?: string
): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
}> {
  const config = await import("./platform-configs").then(m => m.PLATFORM_CONFIGS[platform]);
  const { clientId, clientSecret } = await import("./platform-configs").then(m => m.getPlatformCredentials(platform));

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });

  // Platform-specific adjustments
  if (platform === "twitter" && codeVerifier) {
    body.set("code_verifier", codeVerifier);
  }

  if (platform === "tiktok") {
    // TikTok uses client_key instead of client_id
    body.delete("client_id");
    body.set("client_key", clientId);
  }

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  return response.json();
}

/**
 * Complete OAuth flow - exchange code and store token
 */
export async function completeOAuthFlow(
  tenantId: string,
  platform: import("./types").OAuthPlatform,
  code: string,
  redirectUri: string,
  codeVerifier?: string
): Promise<import("./types").StoredOAuthToken> {
  try {
    // Exchange code for tokens
    const tokenData = await exchangeCodeForToken(platform, code, redirectUri, codeVerifier);

    // Fetch user info from platform
    const { fetchPlatformUserInfo } = await import("./user-info-fetchers");
    const userInfo = await fetchPlatformUserInfo(platform, tokenData.access_token);

    // Store the token
    const storedToken = await import("./token-storage").then(m =>
      m.storeToken(tenantId, platform, tokenData.access_token, {
        refreshToken: tokenData.refresh_token,
        expiresIn: tokenData.expires_in,
        scope: tokenData.scope,
        tokenType: tokenData.token_type,
        userInfo,
      })
    );

    return storedToken;
  } catch (error: any) {
    console.error(`[OAuth] Flow completion failed for ${platform}:`, error);
    throw error;
  }
}

/**
 * Handle OAuth callback - validate state and complete flow
 */
export async function handleOAuthCallback(
  state: string,
  code: string,
  redirectUri: string
): Promise<{
  success: boolean;
  tenantId?: string;
  platform?: import("./types").OAuthPlatform;
  token?: import("./types").StoredOAuthToken;
  error?: string;
}> {
  try {
    // Validate state parameter
    const stateValidation = await import("./token-storage").then(m => m.validateOAuthState(state));

    if (!stateValidation.valid) {
      return {
        success: false,
        error: stateValidation.error || "Invalid state parameter",
      };
    }

    const { tenantId, platform, redirectUri: storedRedirectUri, codeVerifier } = stateValidation;

    // Verify redirect URI matches
    if (redirectUri !== storedRedirectUri) {
      return {
        success: false,
        error: "Redirect URI mismatch",
      };
    }

    // Complete the OAuth flow
    const token = await completeOAuthFlow(tenantId!, platform!, code, redirectUri, codeVerifier);

    return {
      success: true,
      tenantId,
      platform,
      token,
    };
  } catch (error: any) {
    console.error(`[OAuth] Callback handling failed:`, error);
    return {
      success: false,
      error: error.message || "OAuth callback failed",
    };
  }
}





















