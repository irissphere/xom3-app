import { NextResponse } from "next/server";
import { isHi5Enabled } from "@/lib/system/tenant";

export async function POST() {
  if (!isHi5Enabled()) return new NextResponse(null, { status: 404 });

  // UI-only by default. Enable later with ALLOW_WORKFLOW_CONTROL and n8n wiring.
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_WORKFLOW_CONTROL !== "true") {
    return NextResponse.json({ ok: false, message: "Workflow control disabled." }, { status: 403 });
  }
  return NextResponse.json({
    ok: false,
    message: "Retry is UI-only right now (enable ALLOW_WORKFLOW_CONTROL + wiring to n8n to activate).",
  });
}
