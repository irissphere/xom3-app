// Broadcast Engine - Process Scheduled Posts API
// POST /api/broadcast/post/process-scheduled - Process all scheduled posts (cron job)

import { NextResponse } from "next/server";
import { processScheduledPosts } from "@/lib/broadcast/auto-posting-engine";
import { Platform } from "@/lib/broadcast/types";

export async function POST(req: Request) {
  try {
    // In production, use actual platform credentials from env/database
    const credentials: Record<Platform, Record<string, string>> = {} as any;
    
    // Process scheduled posts
    const result = await processScheduledPosts(credentials);
    
    return NextResponse.json({
      success: true,
      processed: result.processed,
      posted: result.posted,
      failed: result.failed
    });
  } catch (error: any) {
    console.error("[Broadcast API] Process scheduled error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
