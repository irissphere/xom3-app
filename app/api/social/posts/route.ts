/**
 * Social Posts API
 * 
 * GET  - Fetch posts queue with optional filters
 * POST - Create a new post
 */

import { NextRequest, NextResponse } from "next/server";
import { 
  getQueue, 
  createPost, 
  getStats 
} from "@/lib/social/store";
import { 
  emitPostCreated, 
  emitPostScheduled 
} from "@/lib/social/signals";
import type { SocialPlatform, PostStatus, SocialPost } from "@/lib/social/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const filters: {
      platform?: SocialPlatform;
      status?: PostStatus;
      clientId?: string;
    } = {};

    const platform = searchParams.get("platform");
    const status = searchParams.get("status");
    const clientId = searchParams.get("clientId");

    if (platform) filters.platform = platform as SocialPlatform;
    if (status) filters.status = status as PostStatus;
    if (clientId) filters.clientId = clientId;

    const items = getQueue(filters);
    const stats = getStats();

    return NextResponse.json({
      success: true,
      data: {
        items,
        total: items.length,
        stats
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch posts",
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      platform,
      content,
      scheduledAt,
      clientId,
      clientName,
      mediaUrls,
      campaignId
    } = body;

    // Validate required fields
    if (!platform || !content) {
      return NextResponse.json({
        success: false,
        error: "Platform and content are required",
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    // Create the post
    const newPost = createPost({
      platform,
      content,
      status: scheduledAt ? "scheduled" : "draft",
      scheduledAt,
      clientId,
      clientName,
      mediaUrls,
      campaignId,
      createdBy: "operator"
    });

    // Emit signals
    emitPostCreated(newPost);
    if (newPost.status === "scheduled") {
      emitPostScheduled(newPost);
    }

    return NextResponse.json({
      success: true,
      data: newPost,
      timestamp: new Date().toISOString()
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to create post",
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
