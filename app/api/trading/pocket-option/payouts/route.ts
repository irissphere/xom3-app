/**
 * Pocket Option Bridge - Payout Percentages
 * GET /api/trading/pocket-option/payouts
 *
 * Returns current payout % for each asset on Pocket Option.
 * Higher payouts mean more profit on winning trades.
 * The signal engine uses this to filter out low-payout assets.
 */
import { NextResponse } from 'next/server';

const PO_BRIDGE_URL = process.env.PO_BRIDGE_URL || 'http://localhost:8000';

export async function GET() {
  try {
    const res = await fetch(`${PO_BRIDGE_URL}/payouts`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Payouts fetch failed' }));
      return NextResponse.json(
        { error: err.detail || 'Failed to fetch payouts' },
        { status: res.status }
      );
    }

    return NextResponse.json(await res.json());
  } catch (error) {
    // Return default payouts when bridge is offline
    return NextResponse.json({
      payouts: {
        'EURUSD_otc': 85,
        'GBPUSD_otc': 85,
        'USDJPY_otc': 82,
        'AUDUSD_otc': 80,
        'EURUSD': 80,
        'GBPUSD': 80,
        'BTCUSD': 75,
        'ETHUSD': 75,
      },
      min_recommended: 70,
      source: 'defaults',
      note: 'Using default payouts — PO bridge offline',
    });
  }
}
