// Broadcast Engine - Dashboard Posts API
// GET /api/broadcast/dashboard/posts - Get posts for dashboard

import { NextResponse } from "next/server";
import { listPosts } from "@/lib/broadcast/store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const status = searchParams.get("status"); // draft, scheduled, posted, failed
    const platform = searchParams.get("platform");
    
    // Get posts
    const posts = listPosts({
      status: status as any,
      platform: platform || undefined,
      limit
    });
    
    return NextResponse.json({
      success: true,
      posts: posts.map(p => ({
        id: p.id,
        platform: p.platforms,
        content: p.content.substring(0, 100) + "...",
        status: p.status,
        scheduled_at: p.scheduledAt,
        posted_at: p.postedAt,
        engagement: p.engagement,
        metadata: {
          hashtags: p.metadata.hashtags,
          cta: p.metadata.cta
        }
      })),
      count: posts.length
    });
  } catch (error: any) {
    console.error("[Broadcast API] Dashboard posts error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
