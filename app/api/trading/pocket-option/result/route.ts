/**
 * Pocket Option Bridge - Trade Result
 * GET /api/trading/pocket-option/result?order_id=xxx
 *
 * Checks the outcome of a placed trade (win/loss/pending).
 */
import { NextResponse } from 'next/server';

const PO_BRIDGE_URL = process.env.PO_BRIDGE_URL || 'http://localhost:8000';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get('order_id');

  if (!orderId) {
    return NextResponse.json(
      { error: 'Missing required parameter: order_id' },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(
      `${PO_BRIDGE_URL}/trade/${encodeURIComponent(orderId)}/result`,
      {
        cache: 'no-store',
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Result check failed' }));
      return NextResponse.json(
        { error: err.detail || 'Failed to check trade result' },
        { status: res.status }
      );
    }

    return NextResponse.json(await res.json());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Result check failed' },
      { status: 500 }
    );
  }
}
