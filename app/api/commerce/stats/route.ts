import { NextResponse } from "next/server";
import { getStoreStats } from "@/lib/commerce/store-client";

export const dynamic = "force-dynamic";

export async function GET() {
  const stats = await getStoreStats();

  return NextResponse.json({
    ok: true,
    connected: stats !== null,
    provider: "supabase",
    stats: stats || {
      currency: "USD",
      totalSales: "0.00",
      orderCount: 0,
      averageOrderValue: "0.00",
      productCount: 0,
    }
  });
}
