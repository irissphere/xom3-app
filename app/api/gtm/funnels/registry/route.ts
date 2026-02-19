import { NextResponse } from "next/server";
import { gtmFunnels } from "@/lib/gtm/funnels";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: true, funnels: gtmFunnels }, { headers: { "Cache-Control": "no-store" } });
}
