import { TradingSignal } from './types';

// Hardcoded operator phone for trading alerts (Preston)
const TRADING_ALERT_PHONE = process.env.TRADING_ALERT_PHONE || '+14046363388';

/**
 * Send high-confidence trading signal alerts via SMS.
 * Triggers for signals with 80% or higher confidence.
 */
export async function processSignalAlerts(signal: TradingSignal) {
  // Only alert for high confidence signals (80% and above)
  if (signal.confidence < 80) {
    console.log(`[Trading Alerts] Skipping - confidence ${signal.confidence}% is below 80% threshold`);
    return;
  }

  console.log(`[Trading Alerts] Processing ${signal.confidence}% ${signal.direction} signal for ${signal.symbol}`);

  try {
    // Format entry price based on asset type
    const isForex = signal.symbol.includes('/') && !signal.symbol.includes('BTC') && !signal.symbol.includes('ETH');
    const decimals = isForex ? 5 : 2;
    
    const entryPrice = signal.bestEntryPrice?.toFixed(decimals) || 'Market';
    const invalidation = signal.invalidationPrice?.toFixed(decimals) || 'N/A';
    const deadline = signal.entryDeadline ? new Date(signal.entryDeadline).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '5 min';
    
    // Build concise SMS message
    const message = [
      `📊 TRADING ALPHA (${signal.confidence}%)`,
      ``,
      `${signal.direction} ${signal.symbol}`,
      `Entry: ${entryPrice}`,
      `Expiry: ${signal.optimalExpiry || '5 minutes'}`,
      `Window: ${signal.entryWindow || 'Next 3-4 candles'}`,
      ``,
      signal.reasoning?.[0] || 'Multiple confluence factors aligned',
    ].join('\n');

    // Send SMS via Twilio API
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://spacebaddie.com';
    
    console.log(`[Trading Alerts] Sending SMS to ${TRADING_ALERT_PHONE}...`);
    
    const response = await fetch(`${baseUrl}/api/twilio/outbound`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: TRADING_ALERT_PHONE,
        message: message,
      }),
    });

    if (response.ok) {
      console.log(`[Trading Alerts] SMS sent successfully to ${TRADING_ALERT_PHONE}`);
    } else {
      const errorText = await response.text();
      console.error(`[Trading Alerts] SMS failed: ${response.status} - ${errorText}`);
    }

  } catch (error) {
    console.error('[Trading Alerts] Unexpected error:', error);
  }
}
