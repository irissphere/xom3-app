/**
 * Social Publish API
 * POST /api/social/publish
 * 
 * Publishes content to social platforms
 * AKV: Social Sovereign - Publish Lane
 * 
 * Server-side tier enforcement: requires 'social' feature access
 */

import { NextResponse } from "next/server";
import { getPostById, updatePost } from "@/lib/social/store";
import { publishToplatform, publishToMultiplePlatforms } from "@/lib/social/publishers";
import { emitPostPublished, emitPostFailed } from "@/lib/social/signals";
import { createClient } from "@/lib/supabase/server";
import { loadSubscriptionRecord, getEffectiveTier } from "@/lib/subscription/subscription-store";
import { hasFeature, getFeatureLimit, getMinimumTierForFeature, getTierConfig } from "@/lib/tiers/features";
import { resolveRole } from "@/lib/auth/resolveRole";
import type { SocialPlatform } from "@/lib/social/types";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Get authenticated user from Supabase session
 */
async function getUserId(): Promise<string | null> {
  try {
    const supabase = createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    return user.id;
  } catch {
    return null;
  }
}

/**
 * POST /api/social/publish
 * 
 * Body options:
 * 1. { postId: string } - Publish an existing post from queue
 * 2. { platform: string, content: string } - Publish directly without queue
 * 3. { platforms: string[], content: string } - Multi-platform publish
 * 
 * Requires authentication and 'social' feature access based on subscription tier
 */
export async function POST(req: Request) {
  try {
    // --- Tier/Feature Enforcement ---
    const userId = await getUserId();
    
    // Check for admin bypass via headers
    const headers = new Headers(req.headers);
    const role = resolveRole(headers);
    const isAdmin = role === "admin" || headers.get("x-operator-key") === process.env.OPERATOR_KEY;
    
    // Non-admins must be authenticated
    if (!isAdmin && !userId) {
      return NextResponse.json({
        ok: false,
        error: "Authentication required",
        code: "AUTH_REQUIRED",
      }, { status: 401 });
    }

    // Check subscription tier and feature access (admins bypass)
    let effectiveTier: ReturnType<typeof getEffectiveTier> = "free";
    if (userId && !isAdmin) {
      const record = await loadSubscriptionRecord({ userId });
      effectiveTier = getEffectiveTier(record);
      
      // Check if user has access to social feature
      if (!hasFeature(effectiveTier, "social")) {
        const minimumTier = getMinimumTierForFeature("social");
        const tierConfig = getTierConfig(minimumTier);
        return NextResponse.json({
          ok: false,
          error: "Social posting requires an upgraded subscription",
          code: "FEATURE_LOCKED",
          upgradeRequired: minimumTier,
          suggestedPlan: {
            tier: minimumTier,
            name: tierConfig.name,
            price: tierConfig.priceLabel,
          },
          upgradeUrl: "/spacebaddie/pricing",
        }, { status: 403 });
      }
      
      // Check posting limits
      const limit = getFeatureLimit(effectiveTier, "social");
      if (typeof limit === "number" && limit === 0) {
        return NextResponse.json({
          ok: false,
          error: "Social posting limit reached for your plan",
          code: "LIMIT_REACHED",
          upgradeRequired: getMinimumTierForFeature("social"),
          upgradeUrl: "/spacebaddie/pricing",
        }, { status: 403 });
      }
      
      // For free tier, also check device-based limits
      if (effectiveTier === "free") {
        const deviceFingerprint = headers.get("x-device-fingerprint");
        
        if (deviceFingerprint) {
          const supabase = createClient();
          const fingerprintHash = crypto.createHash("sha256").update(deviceFingerprint).digest("hex");
          
          const { data: device } = await supabase
            .from("spacebaddie_usage_devices")
            .select("free_posts_used, max_free_posts, free_tier_locked")
            .eq("fingerprint_hash", fingerprintHash)
            .eq("tenant", "spacebaddie")
            .single();
          
          if (device) {
            if (device.free_tier_locked || device.free_posts_used >= device.max_free_posts) {
              return NextResponse.json({
                ok: false,
                error: "Free tier posting limit reached",
                code: "FREE_LIMIT_REACHED",
                upgradeRequired: getMinimumTierForFeature("social"),
                upgradeUrl: "/spacebaddie/pricing",
              }, { status: 403 });
            }
            
            // Increment usage
            await supabase
              .from("spacebaddie_usage_devices")
              .update({
                free_posts_used: device.free_posts_used + 1,
                updated_at: new Date().toISOString(),
              })
              .eq("fingerprint_hash", fingerprintHash)
              .eq("tenant", "spacebaddie");
          }
        }
      }
    }
    // --- End Tier Enforcement ---

    const body = await req.json();
    const tenantId = req.headers.get("x-tenant-id") || "default";

    // Option 1: Publish existing post from queue
    if (body.postId) {
      return await publishQueuedPost(body.postId, tenantId);
    }

    // Option 2: Direct publish to single platform
    if (body.platform && body.content) {
      const result = await publishToplatform(
        body.platform as SocialPlatform,
        body.content,
        { tenantId }
      );

      return NextResponse.json({
        ok: result.success,
        result,
      }, { 
        status: result.success ? 200 : 400,
        headers: { "Cache-Control": "no-store" },
      });
    }

    // Option 3: Multi-platform publish
    if (body.platforms && body.content) {
      const results = await publishToMultiplePlatforms(
        body.platforms as SocialPlatform[],
        body.content,
        { tenantId }
      );

      const allSuccess = results.every(r => r.success);
      const anySuccess = results.some(r => r.success);

      return NextResponse.json({
        ok: anySuccess,
        results,
        summary: {
          total: results.length,
          succeeded: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length,
        },
      }, { 
        status: allSuccess ? 200 : (anySuccess ? 207 : 400),
        headers: { "Cache-Control": "no-store" },
      });
    }

    return NextResponse.json({
      ok: false,
      error: "Invalid request. Provide postId, or platform+content, or platforms+content.",
    }, { status: 400 });

  } catch (error: any) {
    console.error("[Publish] Error:", error);
    return NextResponse.json({
      ok: false,
      error: error.message || "Publish failed",
    }, { status: 500 });
  }
}

/**
 * Publish a queued post
 */
async function publishQueuedPost(postId: string, tenantId: string) {
  const post = getPostById(postId);
  
  if (!post) {
    return NextResponse.json({
      ok: false,
      error: "Post not found",
    }, { status: 404 });
  }

  // Don't re-publish already published posts
  if (post.status === "published") {
    return NextResponse.json({
      ok: false,
      error: "Post already published",
      post,
    }, { status: 400 });
  }

  // Publish to platform
  const result = await publishToplatform(
    post.platform,
    post.content,
    { tenantId }
  );

  if (result.success) {
    // Update post status
    const updated = updatePost(postId, {
      status: "published",
      publishedAt: new Date().toISOString(),
      platformPostId: result.postId,
      platformLink: result.postUrl,
      errorMessage: undefined,
    });

    if (updated) {
      emitPostPublished(updated);
    }

    return NextResponse.json({
      ok: true,
      post: updated,
      result,
    }, { headers: { "Cache-Control": "no-store" } });
  } else {
    // Mark as failed
    const updated = updatePost(postId, {
      status: "failed",
      errorMessage: result.error,
      retryCount: (post.retryCount || 0) + 1,
    });

    if (updated) {
      emitPostFailed(updated, result.error || "Unknown error");
    }

    return NextResponse.json({
      ok: false,
      post: updated,
      error: result.error,
    }, { 
      status: 400,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
