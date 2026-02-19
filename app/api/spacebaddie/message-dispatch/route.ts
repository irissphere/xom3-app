import { NextResponse } from "next/server";
import { dispatchSpacebaddieQueuedMessages } from "@/lib/spacebaddie/spacebaddie-lane4-message-dispatch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(req: Request) {
  const secret = String(process.env.SPACEBADDIE_MESSAGE_DISPATCH_SECRET || "").trim();
  if (!secret) return true;
  const provided = req.headers.get("x-spacebaddie-dispatch-secret") || "";
  return provided === secret;
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const limit = Number(body?.limit);
    const result = await dispatchSpacebaddieQueuedMessages({
      limit: Number.isFinite(limit) ? limit : undefined,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.warn("[SPACEBADDIE] Message dispatch error:", error);
    return NextResponse.json({ ok: false, error: "dispatch_failed" }, { status: 500 });
  }
}
