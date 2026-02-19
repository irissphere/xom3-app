import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { notifyTradingSignal } from '@/lib/notifications/spacebaddie-notifier';

/**
 * Trading Alert API
 * 
 * POST /api/trading/alert
 * Body: { symbol, direction, probability, advice }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbol, direction, probability, advice } = body;

    if (!symbol || !direction || probability === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Only process high-probability signals
    if (probability < 80) {
      return NextResponse.json({ success: true, message: 'Probability below threshold, no alert sent' });
    }

    const supabase = createClient();

    // Find all users who have trading alerts enabled
    const { data: users, error } = await supabase
      .from('user_notification_preferences')
      .select('user_id')
      .eq('trading_alerts_enabled', true)
      .eq('tenant', 'spacebaddie');

    if (error) {
      console.error('[Trading Alert] Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch user preferences' }, { status: 500 });
    }

    if (!users || users.length === 0) {
      return NextResponse.json({ success: true, message: 'No users subscribed to trading alerts' });
    }

    // Send alerts to all subscribed users
    const results = await Promise.all(
      users.map(u => notifyTradingSignal(u.user_id, symbol, direction, probability, advice))
    );

    const successful = results.filter(r => r.success).length;

    return NextResponse.json({
      success: true,
      sentCount: successful,
      totalCount: users.length,
    });
  } catch (error) {
    console.error('[Trading Alert] Internal error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
