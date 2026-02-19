/**
 * Pocket Option Bridge - Candle Data
 * GET /api/trading/pocket-option/candles?asset=EURUSD_otc&timeframe=60&count=100
 *
 * Fetches OHLC candles directly from Pocket Option.
 * No rate limits — data comes from the PO WebSocket connection.
 */
import { NextResponse } from 'next/server';

const PO_BRIDGE_URL = process.env.PO_BRIDGE_URL || 'http://localhost:8000';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const asset = searchParams.get('asset') || 'EURUSD_otc';
  const timeframe = searchParams.get('timeframe') || '60';
  const count = searchParams.get('count') || '100';

  try {
    const res = await fetch(
      `${PO_BRIDGE_URL}/candles/${encodeURIComponent(asset)}/${timeframe}?count=${count}`,
      {
        cache: 'no-store',
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Candle fetch failed' }));
      return NextResponse.json(
        { error: err.detail || 'Failed to fetch candles from Pocket Option' },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Bridge candle request failed',
        fallback: true,
      },
      { status: 502 }
    );
  }
}
