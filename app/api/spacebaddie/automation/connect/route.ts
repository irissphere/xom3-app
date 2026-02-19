/**
 * SpaceBaddie Social Platform Connect API
 * GET/POST /api/spacebaddie/automation/connect
 * 
 * Manages social platform connection status
 * AKV: SpaceBaddie Sovereign - Connect Lane
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { loadSubscriptionRecord, getEffectiveTier } from "@/lib/subscription/subscription-store";
import { getFeatureLimit } from "@/lib/tiers/features";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SUPPORTED_PLATFORMS = ["youtube", "tiktok", "instagram", "twitter", "facebook", "linkedin"];

interface PlatformConnection {
  platform: string;
  status: "connected" | "disconnected" | "expired" | "error";
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  dailyLimit: number;
  postsToday: number;
  lastPostAt?: string;
  connectedAt?: string;
  errorMessage?: string;
}

/**
 * GET /api/spacebaddie/automation/connect
 * 
 * Returns all social platform connection statuses for the user
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({
        ok: false,
        error: "Authentication required",
        code: "AUTH_REQUIRED",
      }, { status: 401 });
    }

    const tenant = req.headers.get("x-tenant-id") || "spacebaddie";

    // Use admin client to bypass RLS (avoids cookie/session issues in server context)
    const adminSupabase = getSupabaseAdminClient();
    const { data: connections, error: fetchError } = await adminSupabase
      .from("spacebaddie_social_connections")
      .select("*")
      .eq("user_id", user.id)
      .eq("tenant", tenant);

    if (fetchError) {
      console.error("[SpaceBaddie Connect] Fetch error:", fetchError);
      return NextResponse.json({
        ok: false,
        error: "Failed to fetch connections",
      }, { status: 500 });
    }

    // Get user's tier for dailyLimit (Pro/Enterprise = unlimited)
    const record = await loadSubscriptionRecord({ userId: user.id });
    const tier = getEffectiveTier(record);
    const socialLimit = getFeatureLimit(tier, "social");
    const tierDailyLimit = socialLimit === "unlimited" || socialLimit === true
      ? 999
      : typeof socialLimit === "number"
        ? Math.min(socialLimit, 999)
        : 3;

    // Build response with all supported platforms
    const connectionMap = new Map(
      (connections || []).map(c => [c.platform, c])
    );

    const platforms: PlatformConnection[] = SUPPORTED_PLATFORMS.map(platform => {
      const conn = connectionMap.get(platform);
      
      if (conn) {
        // Support both schemas: status column (logged_in), connected boolean (core), or metadata
        // Treat as connected if we have access OR refresh token (YouTube/Google refresh_token persists)
        const hasToken = conn.access_token || conn.access_token_hash || conn.refresh_token_hash || conn.metadata?.access_token;
        // When we have tokens, treat as connected (avoids "disconnected" flicker from stale status)
        const status = conn.status === "disconnected" ? "disconnected" : (hasToken || conn.status === "connected" || conn.connected) ? "connected" : (conn.status ?? "disconnected");
        const dbDailyLimit = conn.daily_limit ?? 3;
        // Use tier-based limit for Pro/Enterprise, otherwise DB value
        const dailyLimit = tierDailyLimit >= 999 ? tierDailyLimit : Math.max(dbDailyLimit, tierDailyLimit);
        return {
          platform,
          status,
          username: conn.platform_username ?? conn.metadata?.account_name,
          displayName: conn.platform_display_name ?? conn.metadata?.account_name,
          avatarUrl: conn.platform_avatar_url,
          dailyLimit,
          postsToday: conn.posts_today ?? 0,
          lastPostAt: conn.last_post_at,
          connectedAt: conn.connected_at ?? conn.metadata?.connected_at,
          errorMessage: conn.error_message,
        };
      }

      // Default for unconnected platforms - use tier limit
      return {
        platform,
        status: "disconnected",
        dailyLimit: tierDailyLimit,
        postsToday: 0,
      };
    });

    const connectedCount = platforms.filter(p => p.status === "connected").length;

    return NextResponse.json({
      ok: true,
      platforms,
      summary: {
        total: SUPPORTED_PLATFORMS.length,
        connected: connectedCount,
        disconnected: SUPPORTED_PLATFORMS.length - connectedCount,
      },
    });

  } catch (error: any) {
    console.error("[SpaceBaddie Connect] GET error:", error);
    return NextResponse.json({
      ok: false,
      error: error?.message || "Failed to fetch connections",
    }, { status: 500 });
  }
}

/**
 * POST /api/spacebaddie/automation/connect
 * 
 * Update platform connection status
 * Body: { 
 *   platform: string, 
 *   action: 'connect' | 'disconnect' | 'refresh' | 'update_usage',
 *   ...platformData
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({
        ok: false,
        error: "Authentication required",
        code: "AUTH_REQUIRED",
      }, { status: 401 });
    }

    const body = await req.json();
    const { platform, action } = body;
    const tenant = req.headers.get("x-tenant-id") || "spacebaddie";

    if (!platform || !SUPPORTED_PLATFORMS.includes(platform)) {
      return NextResponse.json({
        ok: false,
        error: `Invalid platform. Supported: ${SUPPORTED_PLATFORMS.join(", ")}`,
      }, { status: 400 });
    }

    if (!action || !["connect", "disconnect", "refresh", "update_usage"].includes(action)) {
      return NextResponse.json({
        ok: false,
        error: "Invalid action. Use: connect, disconnect, refresh, or update_usage",
      }, { status: 400 });
    }

    const now = new Date().toISOString();

    // Handle different actions
    switch (action) {
      case "connect": {
        // In production, this would initiate OAuth flow
        // For now, we simulate a connection with provided data
        const connectionData = {
          user_id: user.id,
          tenant,
          platform,
          status: "connected",
          platform_user_id: body.platformUserId,
          platform_username: body.username,
          platform_display_name: body.displayName,
          platform_avatar_url: body.avatarUrl,
          connected_at: now,
          disconnected_at: null,
          error_message: null,
          daily_limit: body.dailyLimit || 3,
          posts_today: 0,
          last_reset_date: new Date().toISOString().split("T")[0],
          updated_at: now,
        };

        const { data: connection, error: upsertError } = await supabase
          .from("spacebaddie_social_connections")
          .upsert(connectionData, {
            onConflict: "user_id,tenant,platform",
            ignoreDuplicates: false,
          })
          .select()
          .single();

        if (upsertError) {
          console.error("[SpaceBaddie Connect] Upsert error:", upsertError);
          return NextResponse.json({
            ok: false,
            error: "Failed to connect platform",
          }, { status: 500 });
        }

        return NextResponse.json({
          ok: true,
          connection: formatConnection(connection),
          message: `Connected to ${platform}`,
        });
      }

      case "disconnect": {
        const { error: updateError } = await supabase
          .from("spacebaddie_social_connections")
          .update({
            status: "disconnected",
            disconnected_at: now,
            access_token_hash: null,
            refresh_token_hash: null,
            updated_at: now,
          })
          .eq("user_id", user.id)
          .eq("tenant", tenant)
          .eq("platform", platform);

        if (updateError) {
          return NextResponse.json({
            ok: false,
            error: "Failed to disconnect platform",
          }, { status: 500 });
        }

        return NextResponse.json({
          ok: true,
          message: `Disconnected from ${platform}`,
        });
      }

      case "refresh": {
        // In production, this would refresh OAuth tokens
        const { data: connection } = await supabase
          .from("spacebaddie_social_connections")
          .select("*")
          .eq("user_id", user.id)
          .eq("tenant", tenant)
          .eq("platform", platform)
          .single();

        if (!connection) {
          return NextResponse.json({
            ok: false,
            error: "Platform not connected",
          }, { status: 404 });
        }

        // Simulate token refresh
        const { error: updateError } = await supabase
          .from("spacebaddie_social_connections")
          .update({
            status: "connected",
            error_message: null,
            updated_at: now,
          })
          .eq("user_id", user.id)
          .eq("tenant", tenant)
          .eq("platform", platform);

        if (updateError) {
          return NextResponse.json({
            ok: false,
            error: "Failed to refresh connection",
          }, { status: 500 });
        }

        return NextResponse.json({
          ok: true,
          message: `Refreshed ${platform} connection`,
        });
      }

      case "update_usage": {
        // Update posts_today count after a post
        const { data: connection } = await supabase
          .from("spacebaddie_social_connections")
          .select("posts_today, daily_limit, last_reset_date")
          .eq("user_id", user.id)
          .eq("tenant", tenant)
          .eq("platform", platform)
          .single();

        if (!connection) {
          return NextResponse.json({
            ok: false,
            error: "Platform not connected",
          }, { status: 404 });
        }

        // Check if we need to reset daily count
        const today = new Date().toISOString().split("T")[0];
        const needsReset = connection.last_reset_date !== today;

        const newPostsToday = needsReset ? 1 : (connection.posts_today || 0) + 1;

        const { error: updateError } = await supabase
          .from("spacebaddie_social_connections")
          .update({
            posts_today: newPostsToday,
            last_post_at: now,
            last_reset_date: today,
            updated_at: now,
          })
          .eq("user_id", user.id)
          .eq("tenant", tenant)
          .eq("platform", platform);

        if (updateError) {
          return NextResponse.json({
            ok: false,
            error: "Failed to update usage",
          }, { status: 500 });
        }

        const remaining = connection.daily_limit - newPostsToday;

        return NextResponse.json({
          ok: true,
          postsToday: newPostsToday,
          postsRemaining: Math.max(0, remaining),
          message: remaining > 0 
            ? `${remaining} posts remaining today` 
            : "Daily limit reached",
        });
      }
    }

  } catch (error: any) {
    console.error("[SpaceBaddie Connect] POST error:", error);
    return NextResponse.json({
      ok: false,
      error: error?.message || "Connection update failed",
    }, { status: 500 });
  }
}

/**
 * Format database connection to API response
 */
function formatConnection(dbConn: any): PlatformConnection {
  return {
    platform: dbConn.platform,
    status: dbConn.status,
    username: dbConn.platform_username,
    displayName: dbConn.platform_display_name,
    avatarUrl: dbConn.platform_avatar_url,
    dailyLimit: dbConn.daily_limit,
    postsToday: dbConn.posts_today,
    lastPostAt: dbConn.last_post_at,
    connectedAt: dbConn.connected_at,
    errorMessage: dbConn.error_message,
  };
}
