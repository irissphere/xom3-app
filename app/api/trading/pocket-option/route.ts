/**
 * Pocket Option Bridge - Connection Status & Balance
 * GET /api/trading/pocket-option
 * POST /api/trading/pocket-option (connect/disconnect)
 */
import { NextResponse } from 'next/server';

const PO_BRIDGE_URL = process.env.PO_BRIDGE_URL || 'http://localhost:8000';

export async function GET() {
  try {
    const res = await fetch(`${PO_BRIDGE_URL}/health`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      return NextResponse.json({
        connected: false,
        error: 'Bridge service unavailable',
        bridge_url: PO_BRIDGE_URL,
      });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({
      connected: false,
      error: error instanceof Error ? error.message : 'Bridge connection failed',
      bridge_url: PO_BRIDGE_URL,
      hint: 'Start the Python bridge: cd exom3-backend/pocket-option-bridge && python main.py',
    });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, ssid, demo } = body;

    if (action === 'disconnect') {
      const res = await fetch(`${PO_BRIDGE_URL}/disconnect`, {
        method: 'POST',
        signal: AbortSignal.timeout(5000),
      });
      return NextResponse.json(await res.json());
    }

    // Default: connect
    const res = await fetch(`${PO_BRIDGE_URL}/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ssid, demo }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Connection failed' }));
      return NextResponse.json(
        { error: err.detail || 'Connection failed' },
        { status: res.status }
      );
    }

    return NextResponse.json(await res.json());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Bridge request failed' },
      { status: 500 }
    );
  }
}
