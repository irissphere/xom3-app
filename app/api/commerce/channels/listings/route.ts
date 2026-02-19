/**
 * GET /api/commerce/channels/listings
 * Returns per-product, per-channel listing state from product_channel_listings.
 */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data: rows, error } = await supabase
      .from("product_channel_listings")
      .select("product_id, channel, external_id, listed_at, sync_status");

    if (error) {
      console.error("[Channels Listings]", error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const listings: Record<string, Record<string, { product_id: string; channel: string; external_id: string | null; listed_at: string; sync_status: string }>> = {};
    for (const row of rows || []) {
      const pid = row.product_id;
      if (!listings[pid]) listings[pid] = {};
      listings[pid][row.channel] = {
        product_id: pid,
        channel: row.channel,
        external_id: row.external_id ?? null,
        listed_at: row.listed_at,
        sync_status: row.sync_status,
      };
    }

    return NextResponse.json({ ok: true, listings });
  } catch (e: any) {
    console.error("[Channels Listings]", e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
