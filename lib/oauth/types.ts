// OAuth Types - Tenant Account Connection System
// AKV: Clean, sovereign, zero-drift

/**
 * Supported OAuth platforms
 */
export type OAuthPlatform = 
  | "youtube"
  | "twitter"
  | "instagram"
  | "facebook"
  | "tiktok"
  | "linkedin";

/**
 * OAuth connection status
 */
export type ConnectionStatus = 
  | "connected"
  | "disconnected"
  | "expired"
  | "error"
  | "pending";

/**
 * Platform-specific OAuth configuration
 */
export interface PlatformOAuthConfig {
  platform: OAuthPlatform;
  name: string;
  icon: string;
  authUrl: string;
  tokenUrl: string;
  scopes: string[];
  clientIdEnv: string;
  clientSecretEnv: string;
  supportsRefresh: boolean;
  tokenExpiresIn?: number; // seconds
  color: string;
  description: string;
}

/**
 * Stored OAuth token (per-tenant)
 */
export interface StoredOAuthToken {
  id: string;
  tenantId: string;
  platform: OAuthPlatform;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string; // ISO timestamp
  scope?: string;
  tokenType?: string;
  platformUserId?: string;
  platformUsername?: string;
  platformDisplayName?: string;
  platformProfileUrl?: string;
  platformProfileImage?: string;
  connectedAt: string;
  lastRefreshedAt?: string;
  lastUsedAt?: string;
  status: ConnectionStatus;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

/**
 * OAuth authorization state (stored temporarily during flow)
 */
export interface OAuthState {
  state: string;
  tenantId: string;
  platform: OAuthPlatform;
  redirectUri: string;
  codeVerifier?: string; // For PKCE
  createdAt: number;
  expiresAt: number;
}

/**
 * OAuth token exchange response
 */
export interface TokenExchangeResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
}

/**
 * Platform user info (fetched after token exchange)
 */
export interface PlatformUserInfo {
  id: string;
  username?: string;
  displayName?: string;
  profileUrl?: string;
  profileImage?: string;
  email?: string;
  verified?: boolean;
  metadata?: Record<string, any>;
}

/**
 * Connection result (returned to UI)
 */
export interface ConnectionResult {
  success: boolean;
  platform: OAuthPlatform;
  status: ConnectionStatus;
  message: string;
  connection?: {
    platformUserId: string;
    platformUsername?: string;
    platformDisplayName?: string;
    platformProfileImage?: string;
    connectedAt: string;
  };
  error?: string;
}

/**
 * Tenant connections overview
 */
export interface TenantConnections {
  tenantId: string;
  connections: Array<{
    platform: OAuthPlatform;
    status: ConnectionStatus;
    platformUsername?: string;
    platformDisplayName?: string;
    platformProfileImage?: string;
    connectedAt?: string;
    lastUsedAt?: string;
    expiresAt?: string;
    errorMessage?: string;
  }>;
  lastUpdated: string;
}




































