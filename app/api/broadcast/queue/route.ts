import { NextRequest, NextResponse } from "next/server";
import { enqueueBroadcast, getBroadcastQueue } from "@/lib/broadcast/broadcast-sovereign";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const limitParam = req.nextUrl.searchParams.get("limit");
  const limit = limitParam ? Math.max(1, Math.min(200, Number(limitParam) || 80)) : 80;

  return NextResponse.json(
    {
      ok: true,
      timestamp: new Date().toISOString(),
      queue: getBroadcastQueue(limit),
    },
    { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const title = String(body?.title || "").trim();
    const message = String(body?.body || "").trim();
    const channel = body?.channel === "slack" ? "slack" : "internal";
    const priority = body?.priority === "high" || body?.priority === "low" ? body.priority : "medium";

    if (!title || !message) {
      return NextResponse.json(
        { ok: false, timestamp: new Date().toISOString(), error: "title_and_body_required" },
        { status: 400 }
      );
    }

    const queued = enqueueBroadcast({
      channel,
      priority,
      title,
      body: message,
      metadata: body?.metadata,
    });

    return NextResponse.json(
      { ok: true, timestamp: new Date().toISOString(), queued },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, timestamp: new Date().toISOString(), error: error?.message || "enqueue_failed" },
      { status: 500 }
    );
  }
}
