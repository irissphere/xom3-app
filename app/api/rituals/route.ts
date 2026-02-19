import { NextResponse } from "next/server";
import { getRituals } from "@/lib/rituals/engine";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { ok: true, rituals: getRituals() },
    { headers: { "Cache-Control": "no-store" } }
  );
}
