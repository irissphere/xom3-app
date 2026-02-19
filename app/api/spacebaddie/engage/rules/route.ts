import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_TEMPLATES: Record<string, string> = {
  follow: "Thanks for the follow {{handle}}! Want the latest drop or a quick collab?",
  comment: "Appreciate the comment {{handle}}! Want me to DM the full details?",
  mention: "Saw the mention {{handle}}! Want the quick rundown or the full kit?",
  dm: "Got your message {{handle}}. How can I help?",
};

/**
 * GET /api/spacebaddie/engage/rules
 * Fetch auto-reply rules for the current user
 */
export async function GET(req: NextRequest) {
  try {
    const supabaseAuth = await createClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseAdminClient();

    const { data: rules, error } = await supabase
      .from("spacebaddie_engage_rules")
      .select("*")
      .eq("user_id", user.id)
      .order("event_type", { ascending: true });

    if (error) {
      console.warn("[ENGAGE] Rules fetch error:", error.message);
      return NextResponse.json({ ok: false, error: "fetch_failed" }, { status: 500 });
    }

    // If user has no rules yet, return defaults (not saved)
    if (!rules || rules.length === 0) {
      const defaults = Object.entries(DEFAULT_TEMPLATES).map(([eventType, template]) => ({
        id: null,
        user_id: user.id,
        event_type: eventType,
        platform: "all",
        enabled: false,
        template,
        delay_seconds: 0,
        created_at: null,
        updated_at: null,
      }));
      return NextResponse.json({ ok: true, rules: defaults, is_default: true });
    }

    return NextResponse.json({ ok: true, rules, is_default: false });
  } catch (error) {
    console.warn("[ENGAGE] Rules error:", error);
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}

/**
 * PUT /api/spacebaddie/engage/rules
 * Create or update auto-reply rules for the current user
 * Body: { rules: Array<{ event_type, platform, enabled, template, delay_seconds }> }
 */
export async function PUT(req: NextRequest) {
  try {
    const supabaseAuth = await createClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { rules } = body;

    if (!Array.isArray(rules) || rules.length === 0) {
      return NextResponse.json({ ok: false, error: "invalid_rules" }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    const now = new Date().toISOString();
    const errors: string[] = [];

    for (const rule of rules) {
      const { event_type, platform, enabled, template, delay_seconds } = rule;

      if (!event_type || !template) {
        errors.push(`Missing event_type or template for rule`);
        continue;
      }

      const payload = {
        user_id: user.id,
        event_type,
        platform: platform || "all",
        enabled: enabled ?? true,
        template,
        delay_seconds: delay_seconds ?? 0,
        updated_at: now,
        created_at: now,
      };

      const { error } = await supabase
        .from("spacebaddie_engage_rules")
        .upsert(payload, { onConflict: "user_id,event_type,platform" });

      if (error) {
        console.warn("[ENGAGE] Rule upsert error:", error.message);
        errors.push(`Failed to save rule for ${event_type}/${platform}: ${error.message}`);
      }
    }

    if (errors.length > 0) {
      return NextResponse.json({ ok: false, errors }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.warn("[ENGAGE] Rules update error:", error);
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
