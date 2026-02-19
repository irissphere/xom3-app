// OAuth Disconnect Route - Remove Account Connection
// AKV: Clean, sovereign, zero-drift

import { NextResponse } from "next/server";
import {
  OAuthPlatform,
  PLATFORM_CONFIGS,
  deleteToken,
  getToken,
} from "@/lib/oauth";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/oauth/[platform]/disconnect
 * Removes account connection for tenant
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ platform: string }> }
) {
  try {
    const { platform: platformParam } = await params;
    const platform = platformParam as OAuthPlatform;

    // Validate platform
    if (!PLATFORM_CONFIGS[platform]) {
      return NextResponse.json(
        { ok: false, error: `Unknown platform: ${platform}` },
        { status: 400 }
      );
    }

    // Get tenant ID
    const url = new URL(request.url);
    const tenantId = url.searchParams.get("tenant") ||
      request.headers.get("x-tenant-id") ||
      "default";

    // Check if connection exists
    const existingToken = await getToken(tenantId, platform);
    if (!existingToken) {
      return NextResponse.json(
        { ok: false, error: `No connection found for ${platform}` },
        { status: 404 }
      );
    }

    // Delete token
    await deleteToken(tenantId, platform);

    console.log(`[OAuth] Disconnected ${platform} for tenant ${tenantId}`);

    return NextResponse.json({
      ok: true,
      platform,
      message: `Successfully disconnected ${PLATFORM_CONFIGS[platform].name}`,
    });
  } catch (error: any) {
    console.error("[OAuth] Disconnect error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Disconnect failed" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/oauth/[platform]/disconnect
 * Alternative method for disconnecting (for clients that don't support DELETE)
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ platform: string }> }
) {
  return DELETE(request, { params });
}




































