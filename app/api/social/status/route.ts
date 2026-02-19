/**
 * Social Status API
 * 
 * GET - Fetch social lane statistics
 */

import { NextResponse } from "next/server";
import { getStats } from "@/lib/social/store";

export async function GET() {
  try {
    const stats = getStats();

    return NextResponse.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch status",
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
