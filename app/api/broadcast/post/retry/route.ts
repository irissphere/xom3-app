// Broadcast Engine - Retry Post API
// POST /api/broadcast/post/retry - Retry failed post

import { NextResponse } from "next/server";
import { retryPost } from "@/lib/broadcast/auto-posting-engine";
import { Platform } from "@/lib/broadcast/types";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    const { postId, platform } = body;
    
    if (!postId || !platform) {
      return NextResponse.json(
        { error: "postId and platform are required" },
        { status: 400 }
      );
    }
    
    // In production, use actual platform credentials from env/database
    const credentials: Record<string, string> = {};
    
    // Retry post
    const result = await retryPost(postId, platform as Platform, credentials);
    
    return NextResponse.json({
      success: result.success,
      result: {
        platform: result.platform,
        success: result.success,
        postId: result.postId,
        platformPostId: result.platformPostId,
        url: result.url,
        error: result.error,
        postedAt: result.postedAt
      }
    });
  } catch (error: any) {
    console.error("[Broadcast API] Retry error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
