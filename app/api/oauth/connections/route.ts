// OAuth Connections API - List All Account Connections
// AKV: Clean, sovereign, zero-drift

import { NextResponse } from "next/server";
import {
  OAuthPlatform,
  PLATFORM_CONFIGS,
  PLATFORM_ORDER,
  getTenantConnections,
  isPlatformConfigured,
} from "@/lib/oauth";

export const dynamic = "force-dynamic";

/**
 * GET /api/oauth/connections
 * Returns all platform connection statuses for tenant
 */
export async function GET(request: Request) {
  try {
    // Get tenant ID
    const url = new URL(request.url);
    const tenantId = url.searchParams.get("tenant") ||
      request.headers.get("x-tenant-id") ||
      "default";

    // Get tenant connections
    const connections = await getTenantConnections(tenantId);

    // Enhance with platform configuration info
    const platforms = PLATFORM_ORDER.map((platform) => {
      const config = PLATFORM_CONFIGS[platform];
      const connection = connections.connections.find((c) => c.platform === platform);
      const configured = isPlatformConfigured(platform);

      return {
        platform,
        name: config.name,
        icon: config.icon,
        color: config.color,
        description: config.description,
        configured, // Whether OAuth credentials are set up
        status: connection?.status || "disconnected",
        platformUsername: connection?.platformUsername,
        platformDisplayName: connection?.platformDisplayName,
        platformProfileImage: connection?.platformProfileImage,
        connectedAt: connection?.connectedAt,
        lastUsedAt: connection?.lastUsedAt,
        expiresAt: connection?.expiresAt,
        errorMessage: connection?.errorMessage,
      };
    });

    // Summary stats
    const connected = platforms.filter((p) => p.status === "connected").length;
    const configured = platforms.filter((p) => p.configured).length;
    const expired = platforms.filter((p) => p.status === "expired").length;
    const errors = platforms.filter((p) => p.status === "error").length;

    return NextResponse.json({
      ok: true,
      tenantId,
      platforms,
      summary: {
        total: platforms.length,
        configured,
        connected,
        disconnected: platforms.length - connected,
        expired,
        errors,
      },
      lastUpdated: connections.lastUpdated,
    });
  } catch (error: any) {
    console.error("[OAuth] Connections fetch error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to fetch connections" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/oauth/connections/refresh
 * Refresh all expired tokens
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    
    // Get tenant ID
    const tenantId = body.tenantId ||
      request.headers.get("x-tenant-id") ||
      "default";

    // Import refresh function
    const { refreshToken, getTenantConnections } = await import("@/lib/oauth");

    // Get current connections
    const connections = await getTenantConnections(tenantId);
    
    // Find expired connections
    const expiredConnections = connections.connections.filter(
      (c) => c.status === "expired" || 
        (c.expiresAt && new Date(c.expiresAt) < new Date())
    );

    // Refresh each
    const results: Array<{ platform: OAuthPlatform; success: boolean; error?: string }> = [];
    
    for (const conn of expiredConnections) {
      try {
        const refreshed = await refreshToken(tenantId, conn.platform);
        results.push({
          platform: conn.platform,
          success: Boolean(refreshed),
          error: refreshed ? undefined : "Failed to refresh token",
        });
      } catch (err: any) {
        results.push({
          platform: conn.platform,
          success: false,
          error: err.message,
        });
      }
    }

    const successful = results.filter((r) => r.success).length;

    return NextResponse.json({
      ok: true,
      message: `Refreshed ${successful} of ${expiredConnections.length} expired connections`,
      results,
    });
  } catch (error: any) {
    console.error("[OAuth] Refresh error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to refresh tokens" },
      { status: 500 }
    );
  }
}




































