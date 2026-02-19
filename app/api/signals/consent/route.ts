import { NextRequest, NextResponse } from 'next/server';
import { ConsentSignal } from '../../../../lib/xom3/types';

export async function POST(request: NextRequest) {
  try {
    const signal: ConsentSignal = await request.json();

    // Validate signal structure
    if (!signal.source || !signal.type || !signal.payload) {
      return NextResponse.json(
        { success: false, error: 'Invalid signal structure' },
        { status: 400 }
      );
    }

    // Log signal for processing
    console.log('Consent signal received:', {
      type: signal.type,
      profileId: signal.payload.profileId,
      domain: signal.payload.domain,
      timestamp: signal.payload.timestamp
    });

    // In a real implementation, this would:
    // 1. Store the signal in your signal processing system
    // 2. Trigger downstream workflows in n8n
    // 3. Update relevant dashboards
    // 4. Send notifications if needed

    // For now, just acknowledge receipt
    return NextResponse.json({
      success: true,
      message: 'Consent signal processed',
      signalId: `consent-${Date.now()}`
    });
  } catch (error) {
    console.error('Consent signal processing error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process consent signal' },
      { status: 500 }
    );
  }
}
