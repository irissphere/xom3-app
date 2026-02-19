/**
 * Signals Dispatch Script
 * Can be run manually or via cron/scheduler
 * 
 * Usage:
 *   node scripts/dispatch-signals.js
 * 
 * Or set up as a cron job (every 5 minutes):
 *   cd /path/to/xom3-app && node scripts/dispatch-signals.js
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
const TEST_MODE = process.argv.includes('--test') || process.env.SIGNALS_TEST_MODE === 'true';

async function dispatchSignals() {
  try {
    const url = `${BASE_URL}/api/usha/workflows/signals/dispatch${TEST_MODE ? '?test=true' : ''}`;
    const headers = {
      'Content-Type': 'application/json'
    };

    if (TEST_MODE) {
      console.log('🧪 TEST MODE: Will inject synthetic alert');
    }

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
      console.log(`✓ Signals dispatched: ${data.alertsDispatched || 0} alerts`);
      if (data.dispatchResults) {
        data.dispatchResults.forEach((result) => {
          if (result.success) {
            console.log(`  ✓ ${result.channel}: ${result.message}`);
          } else {
            console.log(`  ✗ ${result.channel}: ${result.error}`);
          }
        });
      }
    } else {
      console.log(`- No signals to dispatch: ${data.message || 'No state changes'}`);
      if (data.status === 'error') {
        console.log(`  Reason: ${data.message}`);
        if (data.details) {
          console.log(`  Details: ${data.details}`);
        }
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('✗ Failed to dispatch signals:', error.message);
    process.exit(1);
  }
}

dispatchSignals();
