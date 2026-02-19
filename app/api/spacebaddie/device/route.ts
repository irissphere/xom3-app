/**
 * SpaceBaddie Device Registry API
 * POST /api/spacebaddie/device
 * 
 * Registers user devices for security and free tier enforcement.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    // Note: Device registration might happen before auth for anonymous tracking, 
    // but usually we want to link it to a user.
    // If no user, we just track the fingerprint.

    const body = await req.json();
    const tenant = req.headers.get("x-tenant-id") || "spacebaddie";
    const { fingerprint, metadata } = body;

    if (!fingerprint) {
      return NextResponse.json({
        ok: false,
        error: "Device fingerprint is required",
      }, { status: 400 });
    }

    // Check if device exists
    const { data: existingDevice } = await supabase
      .from("spacebaddie_usage_devices")
      .select("*")
      .eq("device_fingerprint", fingerprint)
      .eq("tenant", tenant)
      .single();

    let device;

    if (existingDevice) {
      // Update last seen and link user if logged in
      const updates: any = {
        last_seen_at: new Date().toISOString(),
        metadata: { ...existingDevice.metadata, ...metadata }
      };

      if (user && !existingDevice.user_id) {
        updates.user_id = user.id;
      }

      const { data: updated, error } = await supabase
        .from("spacebaddie_usage_devices")
        .update(updates)
        .eq("device_id", existingDevice.device_id)
        .select()
        .single();
        
      device = updated;
    } else {
      // Create new device record
      const { data: newDevice, error } = await supabase
        .from("spacebaddie_usage_devices")
        .insert({
          device_fingerprint: fingerprint,
          tenant,
          user_id: user?.id || null,
          metadata: metadata || {}
        })
        .select()
        .single();
        
      device = newDevice;
    }

    return NextResponse.json({
      ok: true,
      device
    });

  } catch (error: any) {
    console.error("[SpaceBaddie Device] POST error:", error);
    return NextResponse.json({
      ok: false,
      error: "Failed to register device",
    }, { status: 500 });
  }
}
