// Broadcast Engine - Schedule Post API
// POST /api/broadcast/post/schedule - Schedule post for future posting

import { NextResponse } from "next/server";
import { getPost } from "@/lib/broadcast/store";
import { schedulePost } from "@/lib/broadcast/auto-posting-engine";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    const { postId, scheduledAt } = body;
    
    if (!postId || !scheduledAt) {
      return NextResponse.json(
        { error: "postId and scheduledAt are required" },
        { status: 400 }
      );
    }
    
    // Validate scheduledAt is in the future
    const scheduledDate = new Date(scheduledAt);
    if (isNaN(scheduledDate.getTime())) {
      return NextResponse.json(
        { error: "scheduledAt must be a valid ISO 8601 date" },
        { status: 400 }
      );
    }
    
    if (scheduledDate <= new Date()) {
      return NextResponse.json(
        { error: "scheduledAt must be in the future" },
        { status: 400 }
      );
    }
    
    // Get post
    const post = getPost(postId);
    if (!post) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }
    
    // Schedule post
    const scheduled = schedulePost(post, scheduledAt);
    
    return NextResponse.json({
      success: true,
      post: {
        id: scheduled.id,
        status: scheduled.status,
        scheduledAt: scheduled.scheduledAt,
        platforms: scheduled.platforms
      }
    });
  } catch (error: any) {
    console.error("[Broadcast API] Schedule error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
