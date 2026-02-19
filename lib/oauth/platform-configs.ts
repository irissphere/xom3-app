// Platform OAuth Configurations
// AKV: Each platform's OAuth details, scopes, and endpoints

import { PlatformOAuthConfig, OAuthPlatform } from "./types";

/**
 * YouTube / Google OAuth Configuration
 * Docs: https://developers.google.com/youtube/v3/guides/auth/server-side-web-apps
 */
const youtubeConfig: PlatformOAuthConfig = {
  platform: "youtube",
  name: "YouTube",
  icon: "▶",
  authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenUrl: "https://oauth2.googleapis.com/token",
  scopes: [
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube.force-ssl",
    "https://www.googleapis.com/auth/youtube.readonly",
    "https://www.googleapis.com/auth/userinfo.profile",
  ],
  clientIdEnv: "GOOGLE_CLIENT_ID",
  clientSecretEnv: "GOOGLE_CLIENT_SECRET",
  supportsRefresh: true,
  tokenExpiresIn: 3600, // 1 hour
  color: "#FF0000",
  description: "Upload videos, manage playlists, and track analytics",
};

/**
 * Twitter/X OAuth 2.0 Configuration (with PKCE)
 * Docs: https://developer.twitter.com/en/docs/authentication/oauth-2-0/authorization-code
 */
const twitterConfig: PlatformOAuthConfig = {
  platform: "twitter",
  name: "Twitter / X",
  icon: "𝕏",
  authUrl: "https://twitter.com/i/oauth2/authorize",
  tokenUrl: "https://api.twitter.com/2/oauth2/token",
  scopes: [
    "tweet.read",
    "tweet.write",
    "users.read",
    "offline.access", // Required for refresh tokens
  ],
  clientIdEnv: "TWITTER_CLIENT_ID",
  clientSecretEnv: "TWITTER_CLIENT_SECRET",
  supportsRefresh: true,
  tokenExpiresIn: 7200, // 2 hours
  color: "#000000",
  description: "Post tweets, threads, and engage with followers",
};

/**
 * Instagram (via Meta/Facebook) OAuth Configuration
 * Docs: https://developers.facebook.com/docs/instagram-api/getting-started
 */
const instagramConfig: PlatformOAuthConfig = {
  platform: "instagram",
  name: "Instagram",
  icon: "📸",
  authUrl: "https://www.facebook.com/v18.0/dialog/oauth",
  tokenUrl: "https://graph.facebook.com/v18.0/oauth/access_token",
  scopes: [
    "instagram_basic",
    "instagram_content_publish",
    "instagram_manage_comments",
    "instagram_manage_insights",
    "pages_show_list",
    "pages_read_engagement",
    "business_management",
  ],
  clientIdEnv: "META_APP_ID",
  clientSecretEnv: "META_APP_SECRET",
  supportsRefresh: true,
  tokenExpiresIn: 5184000, // 60 days (long-lived token)
  color: "#E4405F",
  description: "Publish posts, reels, and stories to your business account",
};

/**
 * Facebook OAuth Configuration
 * Docs: https://developers.facebook.com/docs/facebook-login/guides/access-tokens
 */
const facebookConfig: PlatformOAuthConfig = {
  platform: "facebook",
  name: "Facebook",
  icon: "📘",
  authUrl: "https://www.facebook.com/v18.0/dialog/oauth",
  tokenUrl: "https://graph.facebook.com/v18.0/oauth/access_token",
  scopes: [
    "pages_manage_posts",
    "pages_read_engagement",
    "pages_show_list",
    "pages_read_user_content",
    "public_profile",
  ],
  clientIdEnv: "META_APP_ID",
  clientSecretEnv: "META_APP_SECRET",
  supportsRefresh: true,
  tokenExpiresIn: 5184000, // 60 days
  color: "#1877F2",
  description: "Post to pages, manage engagement, and track insights",
};

/**
 * TikTok OAuth Configuration
 * Docs: https://developers.tiktok.com/doc/login-kit-web
 */
const tiktokConfig: PlatformOAuthConfig = {
  platform: "tiktok",
  name: "TikTok",
  icon: "🎵",
  authUrl: "https://www.tiktok.com/v2/auth/authorize/",
  tokenUrl: "https://open.tiktokapis.com/v2/oauth/token/",
  scopes: [
    "user.info.basic",
    "user.info.profile",
    "video.upload",
    "video.publish",
  ],
  clientIdEnv: "TIKTOK_CLIENT_KEY",
  clientSecretEnv: "TIKTOK_CLIENT_SECRET",
  supportsRefresh: true,
  tokenExpiresIn: 86400, // 24 hours
  color: "#000000",
  description: "Upload and publish videos to your TikTok account",
};

/**
 * LinkedIn OAuth Configuration
 * Docs: https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow
 */
const linkedinConfig: PlatformOAuthConfig = {
  platform: "linkedin",
  name: "LinkedIn",
  icon: "💼",
  authUrl: "https://www.linkedin.com/oauth/v2/authorization",
  tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
  scopes: [
    "openid",
    "profile",
    "w_member_social",
  ],
  clientIdEnv: "LINKEDIN_CLIENT_ID",
  clientSecretEnv: "LINKEDIN_CLIENT_SECRET",
  supportsRefresh: true,
  tokenExpiresIn: 5184000, // 60 days
  color: "#0A66C2",
  description: "Share posts and articles to your professional network",
};

/**
 * All platform configurations
 */
export const PLATFORM_CONFIGS: Record<OAuthPlatform, PlatformOAuthConfig> = {
  youtube: youtubeConfig,
  twitter: twitterConfig,
  instagram: instagramConfig,
  facebook: facebookConfig,
  tiktok: tiktokConfig,
  linkedin: linkedinConfig,
};

/**
 * Get platform config
 */
export function getPlatformConfig(platform: OAuthPlatform): PlatformOAuthConfig {
  const config = PLATFORM_CONFIGS[platform];
  if (!config) {
    throw new Error(`Unknown platform: ${platform}`);
  }
  return config;
}

/**
 * Check if platform credentials are configured
 */
export function isPlatformConfigured(platform: OAuthPlatform): boolean {
  const config = PLATFORM_CONFIGS[platform];
  const clientId = process.env[config.clientIdEnv];
  const clientSecret = process.env[config.clientSecretEnv];
  return Boolean(clientId && clientSecret);
}

/**
 * Get all configured platforms
 */
export function getConfiguredPlatforms(): OAuthPlatform[] {
  return (Object.keys(PLATFORM_CONFIGS) as OAuthPlatform[]).filter(isPlatformConfigured);
}

/**
 * Get platform credentials
 */
export function getPlatformCredentials(platform: OAuthPlatform): {
  clientId: string;
  clientSecret: string;
} {
  const config = PLATFORM_CONFIGS[platform];
  const clientId = process.env[config.clientIdEnv];
  const clientSecret = process.env[config.clientSecretEnv];
  
  if (!clientId || !clientSecret) {
    throw new Error(`Platform ${platform} is not configured. Missing ${config.clientIdEnv} or ${config.clientSecretEnv}`);
  }
  
  return { clientId, clientSecret };
}

/**
 * Build OAuth authorization URL
 */
export function buildAuthUrl(
  platform: OAuthPlatform,
  redirectUri: string,
  state: string,
  codeChallenge?: string
): string {
  const config = PLATFORM_CONFIGS[platform];
  const { clientId } = getPlatformCredentials(platform);
  
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: config.scopes.join(" "),
    state,
  });
  
  // Platform-specific parameters
  if (platform === "youtube") {
    params.set("access_type", "offline"); // Get refresh token
    params.set("prompt", "consent"); // Force consent to get refresh token
  }
  
  if (platform === "twitter" && codeChallenge) {
    params.set("code_challenge", codeChallenge);
    params.set("code_challenge_method", "S256");
  }
  
  if (platform === "tiktok") {
    // TikTok uses client_key instead of client_id
    params.delete("client_id");
    params.set("client_key", clientId);
  }
  
  return `${config.authUrl}?${params.toString()}`;
}

/**
 * Ordered list of platforms for UI display
 */
export const PLATFORM_ORDER: OAuthPlatform[] = [
  "youtube",
  "twitter",
  "instagram",
  "facebook",
  "tiktok",
  "linkedin",
];




































