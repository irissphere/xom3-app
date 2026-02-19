/**
 * SpaceBaddie Notification Preferences API
 * GET/POST /api/spacebaddie/notifications/preferences
 * 
 * Manages user notification preferences including SMS opt-in
 * AKV: SpaceBaddie Sovereign - Notification Lane
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export interface NotificationPreferences {
  id?: string;
  smsEnabled: boolean;
  phoneNumber?: string;
  smsVerified: boolean;
  emailEnabled: boolean;
  emailAddress?: string;
  videoGenerationComplete: boolean;
  postPublished: boolean;
  weeklySummary: boolean;
  tipsUpdates: boolean;
  marketing: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  quietHoursTimezone?: string;
}

// Phone number validation (E.164 format)
function validatePhoneNumber(phone: string): { valid: boolean; normalized?: string; error?: string } {
  // Remove all non-digit characters except leading +
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // Check if it starts with + and has 10-15 digits
  const e164Regex = /^\+[1-9]\d{9,14}$/;
  
  if (e164Regex.test(cleaned)) {
    return { valid: true, normalized: cleaned };
  }
  
  // Try to normalize US numbers (add +1 if 10 digits)
  if (/^\d{10}$/.test(cleaned)) {
    return { valid: true, normalized: `+1${cleaned}` };
  }
  
  // Try to normalize numbers starting with 1
  if (/^1\d{10}$/.test(cleaned)) {
    return { valid: true, normalized: `+${cleaned}` };
  }
  
  return { 
    valid: false, 
    error: 'Invalid phone number. Please use format +1XXXXXXXXXX or enter a 10-digit US number.' 
  };
}

/**
 * GET /api/spacebaddie/notifications/preferences
 * 
 * Returns user's notification preferences
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({
        ok: false,
        error: "Authentication required",
        code: "AUTH_REQUIRED",
      }, { status: 401 });
    }

    const tenant = req.headers.get("x-tenant-id") || "spacebaddie";

    // Fetch preferences
    const { data: prefs, error: fetchError } = await supabase
      .from("user_notification_preferences")
      .select("*")
      .eq("user_id", user.id)
      .eq("tenant", tenant)
      .maybeSingle();

    if (fetchError) {
      console.error("[Notification Preferences] Fetch error:", fetchError);
      return NextResponse.json({
        ok: false,
        error: "Failed to fetch preferences",
      }, { status: 500 });
    }

    // Return preferences or defaults
    const preferences: NotificationPreferences = prefs ? {
      id: prefs.id,
      smsEnabled: prefs.sms_enabled ?? false,
      phoneNumber: prefs.phone_number,
      smsVerified: prefs.sms_verified ?? false,
      emailEnabled: prefs.email_enabled ?? true,
      emailAddress: prefs.email_address || user.email,
      videoGenerationComplete: prefs.video_generation_complete ?? true,
      postPublished: prefs.post_published ?? true,
      weeklySummary: prefs.weekly_summary ?? false,
      tipsUpdates: prefs.tips_updates ?? false,
      marketing: prefs.marketing ?? false,
      quietHoursEnabled: prefs.quiet_hours_enabled ?? false,
      quietHoursStart: prefs.quiet_hours_start,
      quietHoursEnd: prefs.quiet_hours_end,
      quietHoursTimezone: prefs.quiet_hours_timezone ?? 'America/New_York',
    } : {
      // Defaults for new users
      smsEnabled: false,
      smsVerified: false,
      emailEnabled: true,
      emailAddress: user.email,
      videoGenerationComplete: true,
      postPublished: true,
      weeklySummary: false,
      tipsUpdates: false,
      marketing: false,
      quietHoursEnabled: false,
      quietHoursTimezone: 'America/New_York',
    };

    return NextResponse.json({
      ok: true,
      preferences,
    });

  } catch (error: any) {
    console.error("[Notification Preferences] Error:", error);
    return NextResponse.json({
      ok: false,
      error: error?.message || "Internal server error",
    }, { status: 500 });
  }
}

/**
 * POST /api/spacebaddie/notifications/preferences
 * 
 * Updates user's notification preferences
 * Body: Partial<NotificationPreferences>
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({
        ok: false,
        error: "Authentication required",
        code: "AUTH_REQUIRED",
      }, { status: 401 });
    }

    const body = await req.json();
    const tenant = req.headers.get("x-tenant-id") || "spacebaddie";

    // Validate phone number if provided
    if (body.phoneNumber) {
      const phoneValidation = validatePhoneNumber(body.phoneNumber);
      if (!phoneValidation.valid) {
        return NextResponse.json({
          ok: false,
          error: phoneValidation.error,
          field: "phoneNumber",
        }, { status: 400 });
      }
      body.phoneNumber = phoneValidation.normalized;
    }

    // Build update object (map camelCase to snake_case)
    const updates: Record<string, any> = {
      user_id: user.id,
      tenant,
      updated_at: new Date().toISOString(),
    };

    if (body.smsEnabled !== undefined) updates.sms_enabled = body.smsEnabled;
    if (body.phoneNumber !== undefined) {
      updates.phone_number = body.phoneNumber;
      // Reset verification when phone number changes
      updates.sms_verified = false;
    }
    if (body.emailEnabled !== undefined) updates.email_enabled = body.emailEnabled;
    if (body.emailAddress !== undefined) updates.email_address = body.emailAddress;
    if (body.videoGenerationComplete !== undefined) updates.video_generation_complete = body.videoGenerationComplete;
    if (body.postPublished !== undefined) updates.post_published = body.postPublished;
    if (body.weeklySummary !== undefined) updates.weekly_summary = body.weeklySummary;
    if (body.tipsUpdates !== undefined) updates.tips_updates = body.tipsUpdates;
    if (body.marketing !== undefined) updates.marketing = body.marketing;
    if (body.quietHoursEnabled !== undefined) updates.quiet_hours_enabled = body.quietHoursEnabled;
    if (body.quietHoursStart !== undefined) updates.quiet_hours_start = body.quietHoursStart;
    if (body.quietHoursEnd !== undefined) updates.quiet_hours_end = body.quietHoursEnd;
    if (body.quietHoursTimezone !== undefined) updates.quiet_hours_timezone = body.quietHoursTimezone;

    // Check if record exists
    const { data: existing } = await supabase
      .from("user_notification_preferences")
      .select("id")
      .eq("user_id", user.id)
      .eq("tenant", tenant)
      .maybeSingle();

    let result;
    if (existing) {
      // Update existing
      const { data, error } = await supabase
        .from("user_notification_preferences")
        .update(updates)
        .eq("user_id", user.id)
        .eq("tenant", tenant)
        .select()
        .single();
      
      if (error) {
        console.error("[Notification Preferences] Update error:", error);
        return NextResponse.json({
          ok: false,
          error: "Failed to update preferences",
        }, { status: 500 });
      }
      result = data;
    } else {
      // Insert new
      const { data, error } = await supabase
        .from("user_notification_preferences")
        .insert(updates)
        .select()
        .single();
      
      if (error) {
        console.error("[Notification Preferences] Insert error:", error);
        return NextResponse.json({
          ok: false,
          error: "Failed to save preferences",
        }, { status: 500 });
      }
      result = data;
    }

    // Return updated preferences
    const preferences: NotificationPreferences = {
      id: result.id,
      smsEnabled: result.sms_enabled ?? false,
      phoneNumber: result.phone_number,
      smsVerified: result.sms_verified ?? false,
      emailEnabled: result.email_enabled ?? true,
      emailAddress: result.email_address,
      videoGenerationComplete: result.video_generation_complete ?? true,
      postPublished: result.post_published ?? true,
      weeklySummary: result.weekly_summary ?? false,
      tipsUpdates: result.tips_updates ?? false,
      marketing: result.marketing ?? false,
      quietHoursEnabled: result.quiet_hours_enabled ?? false,
      quietHoursStart: result.quiet_hours_start,
      quietHoursEnd: result.quiet_hours_end,
      quietHoursTimezone: result.quiet_hours_timezone,
    };

    return NextResponse.json({
      ok: true,
      preferences,
      message: "Preferences saved",
    });

  } catch (error: any) {
    console.error("[Notification Preferences] Error:", error);
    return NextResponse.json({
      ok: false,
      error: error?.message || "Internal server error",
    }, { status: 500 });
  }
}
