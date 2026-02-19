/**
 * CJ Dropshipping Tracking Sync
 * POST /api/commerce/orders/sync-tracking
 *
 * Polls CJ Dropshipping for tracking numbers on orders with status 'fulfilling'.
 * Can be called manually from admin or via a cron job.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCJTracking } from '@/lib/commerce/suppliers/cj-dropship';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();

    // Find orders with status 'fulfilling' and a CJ order number in notes
    const { data: fulfillingOrders, error } = await supabase
      .from('orders')
      .select('id, notes, tracking_number')
      .eq('status', 'fulfilling')
      .like('notes', 'CJ Order:%');

    if (error) {
      console.error('[Tracking Sync] Query error:', error);
      return NextResponse.json({ error: 'Failed to query orders' }, { status: 500 });
    }

    if (!fulfillingOrders || fulfillingOrders.length === 0) {
      return NextResponse.json({ ok: true, message: 'No orders to sync', updated: 0 });
    }

    let updated = 0;
    const results: { orderId: string; status: string; tracking?: string }[] = [];

    for (const order of fulfillingOrders) {
      // Skip if we already have tracking
      if (order.tracking_number) {
        results.push({ orderId: order.id, status: 'already_tracked' });
        continue;
      }

      // Extract CJ order number from notes
      const match = order.notes?.match(/CJ Order:\s*(\S+)/);
      if (!match) {
        results.push({ orderId: order.id, status: 'no_cj_number' });
        continue;
      }

      const cjOrderNumber = match[1];

      try {
        const tracking = await getCJTracking(cjOrderNumber);

        if (tracking && tracking.trackingNumber) {
          await supabase.from('orders').update({
            tracking_number: tracking.trackingNumber,
            tracking_url: tracking.trackingUrl,
            status: tracking.status === 'DELIVERED' ? 'delivered' : 'shipped',
          }).eq('id', order.id);

          updated++;
          results.push({
            orderId: order.id,
            status: 'updated',
            tracking: tracking.trackingNumber,
          });
        } else {
          results.push({ orderId: order.id, status: 'no_tracking_yet' });
        }
      } catch (trackErr) {
        console.error(`[Tracking Sync] Error for order ${order.id}:`, trackErr);
        results.push({ orderId: order.id, status: 'error' });
      }
    }

    console.log(`[Tracking Sync] Synced ${updated}/${fulfillingOrders.length} orders`);

    return NextResponse.json({
      ok: true,
      total: fulfillingOrders.length,
      updated,
      results,
    });
  } catch (err) {
    console.error('[Tracking Sync] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Sync failed' },
      { status: 500 },
    );
  }
}
