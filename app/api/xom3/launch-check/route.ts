// Launch Check API
// GET: Run all pre-launch verification checks

import { NextResponse } from "next/server";
import { runLaunchCheck } from "@/lib/system/launch-check";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await runLaunchCheck();

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Launch check failed" },
      { status: 500 }
    );
  }
}
