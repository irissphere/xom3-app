/**
 * Benefits Status API
 * 
 * GET - Fetch benefits lane dashboard data
 */

import { NextResponse } from "next/server";
import { getDashboardData } from "@/lib/benefits/store";

export async function GET() {
  try {
    const data = getDashboardData();

    return NextResponse.json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch status",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
