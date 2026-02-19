import { NextResponse } from "next/server";
import { handleSpacebaddieSocialSignal } from "@/lib/spacebaddie/spacebaddie-social-crm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const tenant = String(body?.tenant || "spacebaddie").trim();
    const platform = String(body?.platform || "").trim();
    const eventType = String(body?.event_type || body?.eventType || "").trim().toLowerCase();
    const handle = String(body?.handle || "").trim();
    const allowed = new Set(["follow", "comment", "mention", "dm"]);

    if (!platform || !eventType || !handle) {
      return NextResponse.json(
        { ok: false, error: "missing_required_fields" },
        { status: 400 }
      );
    }
    if (!allowed.has(eventType)) {
      return NextResponse.json(
        { ok: false, error: "unsupported_event_type" },
        { status: 400 }
      );
    }

    const result = await handleSpacebaddieSocialSignal({
      tenant,
      platform,
      eventType: eventType as any,
      handle,
      displayName: body?.display_name || body?.displayName || null,
      profileUrl: body?.profile_url || body?.profileUrl || null,
      avatarUrl: body?.avatar_url || body?.avatarUrl || null,
      content: body?.content || null,
      metadata: body?.metadata || {},
    });

    return NextResponse.json({ ok: result.ok, tenant, platform, eventType });
  } catch (error) {
    console.warn("[SPACEBADDIE] Social signal error:", error);
    return NextResponse.json({ ok: false, error: "signal_failed" }, { status: 500 });
  }
}
