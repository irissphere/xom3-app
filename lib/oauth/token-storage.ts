// OAuth Token Storage - Per-Tenant Token Management
// AKV: Secure, isolated, zero-drift

import {
  OAuthPlatform,
  StoredOAuthToken,
  ConnectionStatus,
  TenantConnections,
  PlatformUserInfo,
} from "./types";
import { PLATFORM_CONFIGS } from "./platform-configs";

/**
 * In-memory token store (for development/testing)
 * In production, use Airtable or encrypted database
 */
const tokenStore = new Map<string, StoredOAuthToken>();

/**
 * Generate storage key
 */
function storageKey(tenantId: string, platform: OAuthPlatform): string {
  return `${tenantId}:${platform}`;
}

/**
 * Simple encryption for token storage
 * In production, use proper encryption (AES-256-GCM with KMS)
 */
function encryptToken(token: string): string {
  // Base64 encode for now - REPLACE WITH REAL ENCRYPTION IN PRODUCTION
  return Buffer.from(token).toString("base64");
}

function decryptToken(encrypted: string): string {
  return Buffer.from(encrypted, "base64").toString("utf-8");
}

/**
 * Store OAuth token for tenant
 */
export async function storeToken(
  tenantId: string,
  platform: OAuthPlatform,
  accessToken: string,
  options: {
    refreshToken?: string;
    expiresIn?: number;
    scope?: string;
    tokenType?: string;
    userInfo?: PlatformUserInfo;
  } = {}
): Promise<StoredOAuthToken> {
  const key = storageKey(tenantId, platform);
  const now = new Date();
  
  const expiresAt = options.expiresIn
    ? new Date(now.getTime() + options.expiresIn * 1000).toISOString()
    : undefined;
  
  const token: StoredOAuthToken = {
    id: `oauth-${tenantId}-${platform}-${Date.now()}`,
    tenantId,
    platform,
    accessToken: encryptToken(accessToken),
    refreshToken: options.refreshToken ? encryptToken(options.refreshToken) : undefined,
    expiresAt,
    scope: options.scope,
    tokenType: options.tokenType || "Bearer",
    platformUserId: options.userInfo?.id,
    platformUsername: options.userInfo?.username,
    platformDisplayName: options.userInfo?.displayName,
    platformProfileUrl: options.userInfo?.profileUrl,
    platformProfileImage: options.userInfo?.profileImage,
    connectedAt: now.toISOString(),
    lastRefreshedAt: now.toISOString(),
    status: "connected",
  };
  
  tokenStore.set(key, token);
  
  // Also persist to Airtable if configured
  try {
    await persistToAirtable(token);
  } catch (err) {
    console.warn(`[OAuth] Failed to persist token to Airtable:`, err);
  }
  
  return token;
}

/**
 * Get stored token for tenant
 */
export async function getToken(
  tenantId: string,
  platform: OAuthPlatform
): Promise<StoredOAuthToken | null> {
  const key = storageKey(tenantId, platform);
  
  // Check in-memory first
  let token = tokenStore.get(key);
  
  // Try loading from Airtable if not in memory
  if (!token) {
    token = await loadFromAirtable(tenantId, platform);
    if (token) {
      tokenStore.set(key, token);
    }
  }
  
  return token || null;
}

/**
 * Get decrypted access token (for API calls)
 */
export async function getAccessToken(
  tenantId: string,
  platform: OAuthPlatform
): Promise<string | null> {
  const token = await getToken(tenantId, platform);
  if (!token) return null;
  
  // Check if expired
  if (token.expiresAt && new Date(token.expiresAt) < new Date()) {
    // Try to refresh
    if (token.refreshToken) {
      const refreshed = await refreshToken(tenantId, platform);
      if (refreshed) {
        return decryptToken(refreshed.accessToken);
      }
    }
    // Token expired and can't refresh
    await updateTokenStatus(tenantId, platform, "expired");
    return null;
  }
  
  return decryptToken(token.accessToken);
}

/**
 * Update token status
 */
export async function updateTokenStatus(
  tenantId: string,
  platform: OAuthPlatform,
  status: ConnectionStatus,
  errorMessage?: string
): Promise<void> {
  const key = storageKey(tenantId, platform);
  const token = tokenStore.get(key);
  
  if (token) {
    token.status = status;
    if (errorMessage) {
      token.errorMessage = errorMessage;
    }
    tokenStore.set(key, token);
    
    // Update in Airtable
    try {
      await persistToAirtable(token);
    } catch (err) {
      console.warn(`[OAuth] Failed to update token status in Airtable:`, err);
    }
  }
}

/**
 * Mark token as used
 */
export async function markTokenUsed(
  tenantId: string,
  platform: OAuthPlatform
): Promise<void> {
  const key = storageKey(tenantId, platform);
  const token = tokenStore.get(key);
  
  if (token) {
    token.lastUsedAt = new Date().toISOString();
    tokenStore.set(key, token);
  }
}

/**
 * Delete token (disconnect account)
 */
export async function deleteToken(
  tenantId: string,
  platform: OAuthPlatform
): Promise<boolean> {
  const key = storageKey(tenantId, platform);
  const existed = tokenStore.has(key);
  tokenStore.delete(key);
  
  // Delete from Airtable
  try {
    await deleteFromAirtable(tenantId, platform);
  } catch (err) {
    console.warn(`[OAuth] Failed to delete token from Airtable:`, err);
  }
  
  return existed;
}

/**
 * Refresh expired token
 */
export async function refreshToken(
  tenantId: string,
  platform: OAuthPlatform
): Promise<StoredOAuthToken | null> {
  const token = await getToken(tenantId, platform);
  if (!token || !token.refreshToken) {
    return null;
  }
  
  const config = PLATFORM_CONFIGS[platform];
  if (!config.supportsRefresh) {
    return null;
  }
  
  try {
    const clientId = process.env[config.clientIdEnv];
    const clientSecret = process.env[config.clientSecretEnv];
    
    if (!clientId || !clientSecret) {
      throw new Error(`Platform ${platform} credentials not configured`);
    }
    
    const decryptedRefresh = decryptToken(token.refreshToken);
    
    // Platform-specific token refresh
    let response: Response;
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: decryptedRefresh,
      client_id: clientId,
      client_secret: clientSecret,
    });
    
    if (platform === "twitter") {
      // Twitter uses Basic auth for token refresh
      const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
      response = await fetch(config.tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": `Basic ${authHeader}`,
        },
        body: body.toString(),
      });
    } else {
      response = await fetch(config.tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });
    }
    
    if (!response.ok) {
      const error = await response.text();
      console.error(`[OAuth] Token refresh failed for ${platform}:`, error);
      await updateTokenStatus(tenantId, platform, "error", "Token refresh failed");
      return null;
    }
    
    const data = await response.json();
    
    // Update stored token
    const key = storageKey(tenantId, platform);
    const now = new Date();
    
    token.accessToken = encryptToken(data.access_token);
    if (data.refresh_token) {
      token.refreshToken = encryptToken(data.refresh_token);
    }
    if (data.expires_in) {
      token.expiresAt = new Date(now.getTime() + data.expires_in * 1000).toISOString();
    }
    token.lastRefreshedAt = now.toISOString();
    token.status = "connected";
    token.errorMessage = undefined;
    
    tokenStore.set(key, token);
    
    // Persist to Airtable
    try {
      await persistToAirtable(token);
    } catch (err) {
      console.warn(`[OAuth] Failed to persist refreshed token to Airtable:`, err);
    }
    
    return token;
  } catch (err: any) {
    console.error(`[OAuth] Token refresh error for ${platform}:`, err);
    await updateTokenStatus(tenantId, platform, "error", err.message);
    return null;
  }
}

/**
 * Get all connections for tenant
 */
export async function getTenantConnections(tenantId: string): Promise<TenantConnections> {
  const platforms = Object.keys(PLATFORM_CONFIGS) as OAuthPlatform[];
  const connections = await Promise.all(
    platforms.map(async (platform) => {
      const token = await getToken(tenantId, platform);
      
      if (!token) {
        return {
          platform,
          status: "disconnected" as ConnectionStatus,
        };
      }
      
      // Check if expired
      let status = token.status;
      if (status === "connected" && token.expiresAt && new Date(token.expiresAt) < new Date()) {
        status = "expired";
      }
      
      return {
        platform,
        status,
        platformUsername: token.platformUsername,
        platformDisplayName: token.platformDisplayName,
        platformProfileImage: token.platformProfileImage,
        connectedAt: token.connectedAt,
        lastUsedAt: token.lastUsedAt,
        expiresAt: token.expiresAt,
        errorMessage: token.errorMessage,
      };
    })
  );
  
  return {
    tenantId,
    connections,
    lastUpdated: new Date().toISOString(),
  };
}

// ============================================================
// Airtable Persistence (Optional - for production)
// ============================================================

const AIRTABLE_TABLE = "ConnectedAccounts";

/**
 * Persist token to Airtable
 */
async function persistToAirtable(token: StoredOAuthToken): Promise<void> {
  const baseId = process.env.AIRTABLE_BASE_ID;
  const apiKey = process.env.AIRTABLE_API_KEY;
  
  if (!baseId || !apiKey) {
    // Airtable not configured, skip
    return;
  }
  
  try {
    // Check if record exists
    const existingRecordId = await findAirtableRecord(token.tenantId, token.platform);
    
    const fields = {
      TenantID: token.tenantId,
      Platform: token.platform,
      AccessToken: token.accessToken, // Already encrypted
      RefreshToken: token.refreshToken || "",
      ExpiresAt: token.expiresAt || "",
      Scope: token.scope || "",
      PlatformUserID: token.platformUserId || "",
      PlatformUsername: token.platformUsername || "",
      PlatformDisplayName: token.platformDisplayName || "",
      PlatformProfileImage: token.platformProfileImage || "",
      ConnectedAt: token.connectedAt,
      LastRefreshedAt: token.lastRefreshedAt || "",
      LastUsedAt: token.lastUsedAt || "",
      Status: token.status,
      ErrorMessage: token.errorMessage || "",
    };
    
    const url = existingRecordId
      ? `https://api.airtable.com/v0/${baseId}/${AIRTABLE_TABLE}/${existingRecordId}`
      : `https://api.airtable.com/v0/${baseId}/${AIRTABLE_TABLE}`;
    
    await fetch(url, {
      method: existingRecordId ? "PATCH" : "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields }),
    });
  } catch (err) {
    console.warn(`[OAuth] Airtable persist error:`, err);
  }
}

/**
 * Load token from Airtable
 */
async function loadFromAirtable(
  tenantId: string,
  platform: OAuthPlatform
): Promise<StoredOAuthToken | null> {
  const baseId = process.env.AIRTABLE_BASE_ID;
  const apiKey = process.env.AIRTABLE_API_KEY;
  
  if (!baseId || !apiKey) {
    return null;
  }
  
  try {
    const formula = encodeURIComponent(`AND({TenantID}="${tenantId}",{Platform}="${platform}")`);
    const url = `https://api.airtable.com/v0/${baseId}/${AIRTABLE_TABLE}?filterByFormula=${formula}&maxRecords=1`;
    
    const response = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
    });
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    if (!data.records || data.records.length === 0) {
      return null;
    }
    
    const record = data.records[0].fields;
    
    return {
      id: data.records[0].id,
      tenantId: record.TenantID,
      platform: record.Platform,
      accessToken: record.AccessToken,
      refreshToken: record.RefreshToken || undefined,
      expiresAt: record.ExpiresAt || undefined,
      scope: record.Scope || undefined,
      platformUserId: record.PlatformUserID || undefined,
      platformUsername: record.PlatformUsername || undefined,
      platformDisplayName: record.PlatformDisplayName || undefined,
      platformProfileImage: record.PlatformProfileImage || undefined,
      connectedAt: record.ConnectedAt,
      lastRefreshedAt: record.LastRefreshedAt || undefined,
      lastUsedAt: record.LastUsedAt || undefined,
      status: record.Status || "connected",
      errorMessage: record.ErrorMessage || undefined,
    };
  } catch (err) {
    console.warn(`[OAuth] Airtable load error:`, err);
    return null;
  }
}

/**
 * Find Airtable record ID
 */
async function findAirtableRecord(
  tenantId: string,
  platform: OAuthPlatform
): Promise<string | null> {
  const baseId = process.env.AIRTABLE_BASE_ID;
  const apiKey = process.env.AIRTABLE_API_KEY;
  
  if (!baseId || !apiKey) {
    return null;
  }
  
  try {
    const formula = encodeURIComponent(`AND({TenantID}="${tenantId}",{Platform}="${platform}")`);
    const url = `https://api.airtable.com/v0/${baseId}/${AIRTABLE_TABLE}?filterByFormula=${formula}&maxRecords=1&fields[]=TenantID`;
    
    const response = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
    });
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    return data.records?.[0]?.id || null;
  } catch (err) {
    return null;
  }
}

/**
 * Delete from Airtable
 */
async function deleteFromAirtable(
  tenantId: string,
  platform: OAuthPlatform
): Promise<void> {
  const baseId = process.env.AIRTABLE_BASE_ID;
  const apiKey = process.env.AIRTABLE_API_KEY;
  
  if (!baseId || !apiKey) {
    return;
  }
  
  try {
    const recordId = await findAirtableRecord(tenantId, platform);
    if (!recordId) return;
    
    await fetch(`https://api.airtable.com/v0/${baseId}/${AIRTABLE_TABLE}/${recordId}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
    });
  } catch (err) {
    console.warn(`[OAuth] Airtable delete error:`, err);
  }
}

// ============================================================
// OAuth State Management (for CSRF protection)
// ============================================================

const stateStore = new Map<string, {
  tenantId: string;
  platform: OAuthPlatform;
  redirectUri: string;
  codeVerifier?: string;
  createdAt: number;
  expiresAt: number;
}>();

/**
 * Generate and store OAuth state
 */
export function createOAuthState(
  tenantId: string,
  platform: OAuthPlatform,
  redirectUri: string,
  codeVerifier?: string
): string {
  // Generate random state
  const state = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64url");
  
  const now = Date.now();
  stateStore.set(state, {
    tenantId,
    platform,
    redirectUri,
    codeVerifier,
    createdAt: now,
    expiresAt: now + 10 * 60 * 1000, // 10 minutes
  });
  
  // Cleanup old states
  for (const [key, value] of Array.from(stateStore.entries())) {
    if (value.expiresAt < now) {
      stateStore.delete(key);
    }
  }
  
  return state;
}

/**
 * Validate and consume OAuth state
 */
export function validateOAuthState(state: string): {
  valid: boolean;
  tenantId?: string;
  platform?: OAuthPlatform;
  redirectUri?: string;
  codeVerifier?: string;
  error?: string;
} {
  const stored = stateStore.get(state);
  
  if (!stored) {
    return { valid: false, error: "Invalid or unknown state" };
  }
  
  if (stored.expiresAt < Date.now()) {
    stateStore.delete(state);
    return { valid: false, error: "State expired" };
  }
  
  // Consume state (one-time use)
  stateStore.delete(state);
  
  return {
    valid: true,
    tenantId: stored.tenantId,
    platform: stored.platform,
    redirectUri: stored.redirectUri,
    codeVerifier: stored.codeVerifier,
  };
}

/**
 * Generate PKCE code verifier and challenge (for Twitter)
 * Uses SHA256 for S256 challenge method
 */
export function generatePKCE(): { verifier: string; challenge: string } {
  // Generate random verifier (43-128 characters, base64url)
  const verifier = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64url");
  
  // SHA256 hash the verifier for the challenge using Node.js crypto
  const cryptoNode = require("crypto");
  const hash = cryptoNode.createHash("sha256").update(verifier).digest();
  const challenge = hash.toString("base64url");
  
  return { verifier, challenge };
}









