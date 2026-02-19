import { NextResponse } from "next/server";
import { getReflexEdges } from "@/lib/sovereigns/reflex-table";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { ok: true, edges: getReflexEdges() },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}





























