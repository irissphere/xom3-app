import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Retell AI Webhook
 * Receives call lifecycle events from Retell (call_started, call_ended, call_analyzed)
 * Configure in Retell Dashboard: Settings -> Webhooks -> https://your-domain/api/retell/webhook
 *
 * Events can be persisted to Supabase for transcript/recording display in LeadDetailPanel.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const eventType = body.event;
    const callId = body.call_id ?? body.call?.call_id;

    // Log for now; add Supabase persistence when retell_calls table exists
    console.log("[Retell] Webhook:", eventType, "call_id:", callId);

    if (eventType === "call_ended" || eventType === "call_analyzed") {
      // Future: persist to Supabase retell_calls for transcript display
      // const transcript = body.transcript_url ?? body.call?.transcript_url;
      // const recording = body.recording_url ?? body.call?.recording_url;
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[Retell] Webhook error:", e);
    return NextResponse.json({ ok: false, error: "webhook_failed" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, message: "Retell webhook endpoint" });
}
