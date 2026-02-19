import { NextResponse } from "next/server";
import { getUserImpactData } from "@/lib/commerce/impact";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const tenantId = req.headers.get("x-tenant-id") || "default";
    const data = await getUserImpactData(tenantId);
    
    return NextResponse.json({
      success: true,
      data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch impact data"
    }, { status: 500 });
  }
}













