import { NextResponse } from 'next/server';
import { generateSignal } from '@/lib/trading/signal-engine';
import { processSignalAlerts } from '@/lib/trading/alerts';

// Simple cache to avoid duplicate alerts for the same signal ID
const alertedSignals = new Set<string>();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol') || 'EUR/USD';
  const timeframe = searchParams.get('timeframe') || '5m';

  try {
    const result = await generateSignal(symbol, timeframe);
    
    // Trigger alerts if high win probability and not already alerted
    const winProb = result.signal?.winProbability || result.signal?.confidence || 0;
    if (result.signal && winProb >= 80 && !alertedSignals.has(result.signal.id)) {
      alertedSignals.add(result.signal.id);
      // Prune cache if it gets too large
      if (alertedSignals.size > 1000) {
        const firstItem = alertedSignals.values().next().value;
        if (firstItem) alertedSignals.delete(firstItem);
      }
      
      // Process alerts in background
      processSignalAlerts(result.signal).catch(console.error);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Signal generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate signal', message: error instanceof Error ? error.message : undefined },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { symbol = 'EUR/USD', timeframe = '5m' } = body;
    
    const result = await generateSignal(symbol, timeframe);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Signal generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate signal', message: error instanceof Error ? error.message : undefined },
      { status: 500 }
    );
  }
}
