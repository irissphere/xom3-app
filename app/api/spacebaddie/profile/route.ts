/**
 * SpaceBaddie Avatar Profile API
 * GET/POST /api/spacebaddie/profile
 * 
 * Manages avatar profiles (voice/face presets, style defaults, render history)
 * AKV: SpaceBaddie Sovereign - Profile Lane
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export interface AvatarProfile {
  profile_id?: string;
  display_name?: string;
  config: AvatarConfigFull;
}

interface AvatarConfigFull {
  base_model: string;
  voice: {
    provider: string;
    id?: string;
    language: string;
    style: string;
  };
  face_id?: string;
  scene_defaults: {
    type: string;
    aspect_ratio: string;
  };
  lens_defaults: {
    type: string;
    intensity: number;
  };
  effects_defaults: {
    brightness: number;
    contrast: number;
    saturation: number;
    hue: number;
    blur: number;
    vignette: number;
  };
  customizations?: any[];
}

/**
 * GET /api/spacebaddie/profile
 * 
 * Returns the user's avatar profile, or creates a default one if none exists
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

    // Fetch existing profile
    const { data: profile, error: fetchError } = await supabase
      .from("spacebaddie_avatar_profiles")
      .select("*")
      .eq("user_id", user.id)
      .eq("tenant", tenant)
      .maybeSingle();

    if (fetchError) {
      console.error("[SpaceBaddie Profile] Fetch error:", fetchError);
      return NextResponse.json({
        ok: false,
        error: "Failed to fetch profile",
      }, { status: 500 });
    }

    // If no profile exists, return default (don't auto-create on GET)
    if (!profile) {
      return NextResponse.json({
        ok: true,
        profile: null,
        defaults: getDefaultProfile(),
        message: "No profile found. POST to create one.",
      });
    }

    // Also fetch recent renders
    const { data: recentRenders } = await supabase
      .from("spacebaddie_render_history")
      .select("job_id, job_type, status, output_url, thumbnail_url, created_at")
      .eq("user_id", user.id)
      .eq("tenant", tenant)
      .order("created_at", { ascending: false })
      .limit(10);

    return NextResponse.json({
      ok: true,
      profile: formatProfile(profile),
      recentRenders: recentRenders || [],
    });

  } catch (error: any) {
    console.error("[SpaceBaddie Profile] GET error:", error);
    return NextResponse.json({
      ok: false,
      error: error?.message || "Failed to fetch profile",
    }, { status: 500 });
  }
}

/**
 * POST /api/spacebaddie/profile
 * 
 * Creates or updates the user's avatar profile
 * Body: Partial<AvatarProfile>
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

    // Construct config object
    const config: AvatarConfigFull = {
      base_model: body.base_model || body.baseModel || "gaming-avatar-1",
      voice: {
        provider: body.voice_provider || body.voiceProvider || "elevenlabs",
        id: body.voice_id || body.voiceId,
        language: body.voice_language || body.voiceLanguage || "en",
        style: body.voice_style || body.voiceStyle || "gaming",
      },
      face_id: body.face_id || body.faceId,
      scene_defaults: {
        type: body.default_scene_type || body.sceneType || "talking_head",
        aspect_ratio: body.default_aspect_ratio || body.aspectRatio || "9:16",
      },
      lens_defaults: {
        type: body.default_lens_type || body.lensType || "gaming",
        intensity: body.default_lens_intensity ?? body.lensIntensity ?? 0.5,
      },
      effects_defaults: {
        brightness: body.effect_brightness ?? body.effects?.brightness ?? 0,
        contrast: body.effect_contrast ?? body.effects?.contrast ?? 0,
        saturation: body.effect_saturation ?? body.effects?.saturation ?? 0,
        hue: body.effect_hue ?? body.effects?.hue ?? 0,
        blur: body.effect_blur ?? body.effects?.blur ?? 0,
        vignette: body.effect_vignette ?? body.effects?.vignette ?? 0,
      },
      customizations: body.customizations || [],
    };

    // Build profile data
    const profileData = {
      user_id: user.id,
      tenant,
      name: body.display_name || body.displayName || "Default Profile",
      config: config,
      updated_at: new Date().toISOString(),
    };

    // Upsert profile
    const { data: profile, error: upsertError } = await supabase
      .from("spacebaddie_avatar_profiles")
      .upsert(profileData, {
        onConflict: "user_id,tenant,name",
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (upsertError) {
      console.error("[SpaceBaddie Profile] Upsert error:", upsertError);
      return NextResponse.json({
        ok: false,
        error: "Failed to save profile",
        details: upsertError.message,
      }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      profile: formatProfile(profile),
      message: "Profile saved successfully",
    });

  } catch (error: any) {
    console.error("[SpaceBaddie Profile] POST error:", error);
    return NextResponse.json({
      ok: false,
      error: error?.message || "Failed to save profile",
    }, { status: 500 });
  }
}

/**
 * Format database profile to API response format
 */
function formatProfile(dbProfile: any): AvatarProfile {
  const config = dbProfile.config || {};
  return {
    profile_id: dbProfile.profile_id,
    display_name: dbProfile.name,
    config: {
      base_model: config.base_model,
      voice: config.voice || {},
      face_id: config.face_id,
      scene_defaults: config.scene_defaults || {},
      lens_defaults: config.lens_defaults || {},
      effects_defaults: config.effects_defaults || {},
      customizations: config.customizations || [],
    }
  };
}

/**
 * Get default profile values
 */
function getDefaultProfile(): AvatarProfile {
  return {
    config: {
      base_model: "gaming-avatar-1",
      voice: {
        provider: "elevenlabs",
        language: "en",
        style: "gaming",
      },
      scene_defaults: {
        type: "talking_head",
        aspect_ratio: "9:16",
      },
      lens_defaults: {
        type: "gaming",
        intensity: 0.5,
      },
      effects_defaults: {
        brightness: 0,
        contrast: 0,
        saturation: 0,
        hue: 0,
        blur: 0,
        vignette: 0,
      },
      customizations: [],
    }
  };
}
