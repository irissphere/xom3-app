// Broadcast Engine - Content Output Engine API
// POST /api/broadcast/post - Create and post content
// AKV: Broadcast Sovereign - Posting Lane

import { NextResponse } from "next/server";
import { createPost } from "@/lib/broadcast/store";
import { crossPost, schedulePost } from "@/lib/broadcast/auto-posting-engine";
import { PostRequest, Platform } from "@/lib/broadcast/types";
import { emitSignal } from "@/lib/uoi/signals";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Extract tenantId from body or default
    const tenantId = body.tenantId || body.metadata?.tenantId || "default";
    
    const request: PostRequest = {
      content: body.content,
      mediaUrl: body.mediaUrl,
      platforms: body.platforms || [],
      scheduledAt: body.scheduledAt,
      metadata: {
        ...body.metadata,
        tenantId, // Ensure tenant ID is always in metadata
      }
    };
    
    // Validate
    if (!request.content) {
      return NextResponse.json(
        { error: "content is required" },
        { status: 400 }
      );
    }
    
    if (!request.platforms || request.platforms.length === 0) {
      return NextResponse.json(
        { error: "at least one platform is required" },
        { status: 400 }
      );
    }
    
    // Create post with tenant context
    const post = createPost(request);
    
    // If scheduled, schedule and return immediately
    if (request.scheduledAt) {
      const scheduled = schedulePost(post, request.scheduledAt);
      return NextResponse.json({
        success: true,
        post: {
          id: scheduled.id,
          status: scheduled.status,
          scheduledAt: scheduled.scheduledAt,
          platforms: scheduled.platforms
        }
      });
    }
    
    // Post immediately to all platforms
    // Credentials are fetched from OAuth token storage per platform
    const credentials: Record<Platform, Record<string, string>> = {} as any;
    
    const result = await crossPost(post, request.platforms, credentials);
    
    // Emit signal
    emitSignal({
      source: "broadcast_engine",
      type: "post_published",
      payload: {
        postId: post.id,
        platforms: request.platforms,
        results: result.results,
        totalSuccess: result.totalSuccess,
        totalFailed: result.totalFailed
      },
      priority: "medium"
    });
    
    return NextResponse.json({
      success: true,
      post: {
        id: post.id,
        status: result.totalSuccess > 0 ? "posted" : "failed",
        platforms: request.platforms,
        results: result.results,
        totalSuccess: result.totalSuccess,
        totalFailed: result.totalFailed,
        postedAt: result.postedAt
      }
    });
  } catch (error: any) {
    console.error("[Broadcast API] Post error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const platform = searchParams.get("platform");
    const limit = searchParams.get("limit");
    
    const { listPosts } = await import("@/lib/broadcast/store");
    
    const posts = listPosts({
      status: status as any,
      platform: platform || undefined,
      limit: limit ? parseInt(limit) : undefined
    });
    
    return NextResponse.json({
      success: true,
      posts,
      count: posts.length
    });
  } catch (error: any) {
    console.error("[Broadcast API] Get posts error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
