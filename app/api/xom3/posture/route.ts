// Posture Oracle API
// GET: Get current posture state
// POST: Set posture (internal → public-beta → open)

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  getPostureState,
  setPosture,
  sealLaunch,
  SystemPosture,
} from "@/lib/system/posture-oracle";

export const dynamic = "force-dynamic";

// Log posture event to Supabase
async function logPostureEvent(
  type: string,
  detail: Record<string, any>
): Promise<void> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) return;

    const supabase = createClient(supabaseUrl, supabaseKey);

    await supabase.from("xom3_events").insert({
      type,
      surface: "master-console",
      detail,
      tenant_key: "xom3",
    });
  } catch (err) {
    console.error("Failed to log posture event:", err);
  }
}

export async function GET() {
  try {
    const state = getPostureState();

    return NextResponse.json({
      success: true,
      state,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to get posture state" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, posture, operator = "auren" } = body;

    switch (action) {
      case "set_posture": {
        if (!posture || !["internal", "public-beta", "open"].includes(posture)) {
          return NextResponse.json(
            { success: false, error: "Invalid posture. Must be: internal, public-beta, or open" },
            { status: 400 }
          );
        }

        const result = setPosture(posture as SystemPosture, operator);

        if (!result.success) {
          return NextResponse.json(
            { success: false, error: result.error },
            { status: 400 }
          );
        }

        // Log the posture change event
        await logPostureEvent("posture_change", {
          from: result.state?.previousPosture,
          to: posture,
          operator,
          timestamp: result.state?.updatedAt,
        });

        return NextResponse.json({
          success: true,
          state: result.state,
          message: `Posture changed to ${posture}`,
        });
      }

      case "seal_launch": {
        const result = sealLaunch(operator);

        if (!result.success) {
          return NextResponse.json(
            { success: false, error: result.error },
            { status: 400 }
          );
        }

        // Log the launch event
        await logPostureEvent("launch_event", {
          operator,
          sealedAt: result.state?.launchSealedAt,
          posture: result.state?.current,
        });

        return NextResponse.json({
          success: true,
          state: result.state,
          message: "Launch sealed. This is bound. Ledger updated. The cockpit remembers.",
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: "Invalid action. Must be: set_posture or seal_launch" },
          { status: 400 }
        );
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update posture" },
      { status: 500 }
    );
  }
}
