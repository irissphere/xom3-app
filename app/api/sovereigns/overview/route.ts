import { NextResponse } from "next/server";
import { getAllSovereigns } from "@/lib/sovereigns/registry";

export const dynamic = "force-dynamic";

export async function GET() {
  const sovereigns = getAllSovereigns().map((s) => s.getStatus());

  return NextResponse.json({ sovereigns }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } });
}
