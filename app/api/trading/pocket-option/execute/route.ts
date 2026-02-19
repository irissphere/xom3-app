/**
 * Pocket Option Bridge - Trade Execution
 * POST /api/trading/pocket-option/execute
 *
 * Places a CALL or PUT trade on Pocket Option.
 * Requires confirm=true as a safety gate.
 * Logs all executed trades to Supabase trading_results table.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const PO_BRIDGE_URL = process.env.PO_BRIDGE_URL || 'http://localhost:8000';

// Server-side Supabase client for trade logging
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { asset, amount, direction, duration, confirm, signal_id, symbol, confidence, user_id } = body;

    // Validate required fields
    if (!asset || !amount || !direction || !duration) {
      return NextResponse.json(
        { error: 'Missing required fields: asset, amount, direction, duration' },
        { status: 400 }
      );
    }

    // Direction validation
    const dir = direction.toUpperCase();
    if (dir !== 'CALL' && dir !== 'PUT') {
      return NextResponse.json(
        { error: 'Direction must be CALL or PUT' },
        { status: 400 }
      );
    }

    // Amount validation
    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number' },
        { status: 400 }
      );
    }

    // Duration validation (minimum 5 seconds on PO)
    if (typeof duration !== 'number' || duration < 5) {
      return NextResponse.json(
        { error: 'Duration must be at least 5 seconds' },
        { status: 400 }
      );
    }

    const res = await fetch(`${PO_BRIDGE_URL}/trade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        asset,
        amount,
        direction: dir,
        duration,
        confirm: confirm === true,
      }),
      signal: AbortSignal.timeout(15000),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: data.detail || 'Trade execution failed' },
        { status: res.status }
      );
    }

    // ─── Log trade to Supabase ─────────────────────────────────
    if (data.success && data.order_id && supabaseUrl && supabaseServiceKey && user_id) {
      try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        await supabase.from('trading_results').insert({
          user_id,
          signal_id: signal_id || null,
          symbol: symbol || asset,
          direction: dir,
          entry_time: new Date().toISOString(),
          expiry_time: new Date(Date.now() + duration * 1000).toISOString(),
          result: 'pending',
          amount,
          confidence_at_entry: confidence || null,
          po_order_id: data.order_id,
          po_asset: asset,
          po_duration: duration,
          po_demo: data.demo_mode ?? true,
          execution_source: 'po_bridge',
        });
      } catch (logErr) {
        console.error('Failed to log trade to Supabase:', logErr);
        // Don't fail the trade response for logging errors
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Trade request failed' },
      { status: 500 }
    );
  }
}
