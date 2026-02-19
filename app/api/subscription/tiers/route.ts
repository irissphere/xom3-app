import { NextResponse } from "next/server";
import { getPricingTiers } from "@/lib/tiers/features";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const tiers = getPricingTiers();
    
    return NextResponse.json({
      success: true,
      data: {
        items: tiers,
        total: tiers.length
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch subscription tiers",
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}













