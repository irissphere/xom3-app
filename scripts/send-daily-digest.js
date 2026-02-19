/**
 * Daily Digest Dispatch Script
 * Sends daily automation briefing to Slack
 * 
 * Usage:
 *   node scripts/send-daily-digest.js
 * 
 * Or set up as a daily cron job:
 *   0 7 * * * cd /path/to/xom3-app && node scripts/send-daily-digest.js
 */

// Load environment variables from .env.local if dotenv is available
try {
  require('dotenv').config({ path: '.env.local' });
} catch (e) {
  // dotenv not installed, rely on system environment variables
}

// Use node-fetch if available, otherwise use built-in fetch (Node 18+)
let fetch;
try {
  fetch = require('node-fetch');
} catch {
  // Node 18+ has built-in fetch
  fetch = globalThis.fetch;
}

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const DISPATCH_TOKEN = process.env.SIGNALS_DISPATCH_TOKEN || '';

async function sendDailyDigest() {
  try {
    // Check for --test flag
    const testMode = process.argv.includes('--test');
    
    if (testMode) {
      console.log('🧪 TEST MODE: Will generate synthetic digest');
    }

    const url = `${BASE_URL}/api/usha/workflows/signals/digest${testMode ? '?test=true' : ''}`;
    const headers = {
      'Content-Type': 'application/json'
    };

    if (DISPATCH_TOKEN) {
      headers['Authorization'] = `Bearer ${DISPATCH_TOKEN}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`✗ API Error (${response.status}):`, data.message || 'Unknown error');
      if (data.details) {
        console.error(`  Details: ${data.details}`);
      }
      process.exit(1);
      return;
    }

    if (data.dispatched) {
      console.log(`✓ Daily digest sent to Slack`);
      if (testMode) {
        console.log(`  🧪 Test mode: Synthetic digest sent`);
      }
      if (data.dispatchResult) {
        if (data.dispatchResult.success) {
          console.log(`  ✓ ${data.dispatchResult.channel}: ${data.dispatchResult.message}`);
        } else {
          console.log(`  ✗ ${data.dispatchResult.channel}: ${data.dispatchResult.error}`);
        }
      }
    } else {
      console.log(`- No digest sent: ${data.message || 'No data available'}`);
      if (data.details) {
        console.log(`  ${data.details}`);
      }
      if (data.help && !testMode) {
        console.log(`  💡 ${data.help}`);
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('✗ Failed to send daily digest:', error.message);
    process.exit(1);
  }
}

sendDailyDigest();
