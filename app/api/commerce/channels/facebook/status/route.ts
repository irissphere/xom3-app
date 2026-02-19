/**
 * GET /api/commerce/channels/facebook/status
 * Returns whether Facebook Marketplace is configured (catalog + token).
 */
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const catalogId = process.env.META_CATALOG_ID || process.env.FACEBOOK_CATALOG_ID;
  const token = process.env.META_ACCESS_TOKEN || process.env.FACEBOOK_CATALOG_ACCESS_TOKEN;
  const connected = !!(catalogId && token);
  return NextResponse.json({ ok: true, connected });
}
