/**
 * GET /api/commerce/channels/amazon/status
 * Returns whether Amazon SP-API is configured.
 */
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const clientId = process.env.AMAZON_SP_API_CLIENT_ID || process.env.AMAZON_LWA_CLIENT_ID;
  const clientSecret = process.env.AMAZON_SP_API_CLIENT_SECRET || process.env.AMAZON_LWA_CLIENT_SECRET;
  const refreshToken = process.env.AMAZON_SP_API_REFRESH_TOKEN;
  const connected = !!(clientId && clientSecret && refreshToken);
  return NextResponse.json({ ok: true, connected });
}
