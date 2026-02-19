import { NextResponse } from "next/server";
import { getPosts } from "@/lib/social/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const failed = getPosts()
    .filter((p) => p.status === "failed")
    .map((p) => ({
      id: p.id,
      platform: p.platform,
      status: p.status,
      errorMessage: p.errorMessage || null,
      retryCount: p.retryCount || 0,
      scheduledAt: p.scheduledAt || null,
      createdAt: p.createdAt,
    }));

  return NextResponse.json(
    { ok: true, total: failed.length, items: failed, timestamp: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } }
  );
}
