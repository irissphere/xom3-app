import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Webhook receiver for message dispatch.
 * Not live: accepts payloads for testing but does not deliver or process messages.
 * When live: will validate, route, and deliver to configured channels (DM, channel, etc.).
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    return NextResponse.json({
      ok: true,
      live: false,
      message: "Webhook receiver ready. Live message delivery and processing coming soon.",
      receivedAt: new Date().toISOString(),
      messageId: body?.messageId ?? body?.message_id ?? null,
      platform: body?.platform ?? "unknown",
      channel: body?.channel ?? "dm",
    });
  } catch (error) {
    console.warn("[SPACEBADDIE] Dispatch endpoint error:", error);
    return NextResponse.json(
      { ok: false, error: "dispatch_request_failed" },
      { status: 500 }
    );
  }
}
