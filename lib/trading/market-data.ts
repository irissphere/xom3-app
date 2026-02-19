/**
 * XOM3 Market Data Feed
 * Fetches real OHLC candle data from external APIs.
 * Priority: Pocket Option (forex/OTC) > Binance (crypto) > Finnhub > Twelve Data
 */

import type { PriceCandle } from './types';

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || '';
const TWELVE_DATA_API_KEY = process.env.TWELVE_DATA_API_KEY;
const PO_BRIDGE_URL = process.env.PO_BRIDGE_URL || 'http://localhost:8000';

export interface MarketDataResult {
  candles: PriceCandle[];
  source: 'pocket_option' | 'finnhub' | 'twelve_data' | 'binance';
}

/**
 * Pocket Option symbol mapping
 * Maps dashboard symbols to PO asset names
 */
export const PO_SYMBOL_MAP: Record<string, { standard: string; otc: string }> = {
  'EUR/USD': { standard: 'EURUSD', otc: 'EURUSD_otc' },
  'GBP/USD': { standard: 'GBPUSD', otc: 'GBPUSD_otc' },
  'USD/JPY': { standard: 'USDJPY', otc: 'USDJPY_otc' },
  'AUD/USD': { standard: 'AUDUSD', otc: 'AUDUSD_otc' },
  'USD/CHF': { standard: 'USDCHF', otc: 'USDCHF_otc' },
  'EUR/GBP': { standard: 'EURGBP', otc: 'EURGBP_otc' },
  'EUR/JPY': { standard: 'EURJPY', otc: 'EURJPY_otc' },
  'GBP/JPY': { standard: 'GBPJPY', otc: 'GBPJPY_otc' },
  'NZD/USD': { standard: 'NZDUSD', otc: 'NZDUSD_otc' },
  'USD/CAD': { standard: 'USDCAD', otc: 'USDCAD_otc' },
  'BTC/USD': { standard: 'BTCUSD', otc: 'BTCUSD_otc' },
  'ETH/USD': { standard: 'ETHUSD', otc: 'ETHUSD_otc' },
};

/**
 * Timeframe string to PO seconds mapping
 */
export const PO_TIMEFRAME_MAP: Record<string, number> = {
  '1m': 60,
  '5m': 300,
  '15m': 900,
  '30m': 1800,
  '1h': 3600,
  '4h': 14400,
  '1d': 86400,
};

/**
 * Check if standard forex markets are open.
 * OTC markets are available 24/7 on Pocket Option.
 */
export function isForexMarketOpen(): boolean {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun, 6=Sat
  const hour = now.getUTCHours();
  // Forex is closed Sat & most of Sun (reopens ~22:00 UTC Sunday)
  if (day === 6) return false;
  if (day === 0 && hour < 22) return false;
  return true;
}

/**
 * Get the PO asset name for a given dashboard symbol.
 * Automatically selects OTC when standard markets are closed.
 */
export function getPOAssetName(symbol: string, preferOTC: boolean = false): string | null {
  const mapping = PO_SYMBOL_MAP[symbol];
  if (!mapping) return null;
  if (preferOTC || !isForexMarketOpen()) {
    return mapping.otc;
  }
  return mapping.standard;
}

/**
 * Mapping timeframe strings to Finnhub resolution formats
 */
const FINNHUB_RESOLUTION_MAP: Record<string, string> = {
  '1m': '1',
  '5m': '5',
  '15m': '15',
  '30m': '30',
  '1h': '60',
  '4h': '240',
  '1d': 'D',
};

/**
 * Fetch real OHLC data for a given symbol and timeframe
 */
export async function fetchCandles(
  symbol: string,
  timeframe: string,
  limit: number = 100
): Promise<PriceCandle[]> {
  const result = await fetchCandlesWithSource(symbol, timeframe, limit);
  return result.candles;
}

export async function fetchCandlesWithSource(
  symbol: string,
  timeframe: string,
  limit: number = 100
): Promise<MarketDataResult> {
  const finnhubKey = process.env.FINNHUB_API_KEY || '';
  // Fallback to hardcoded key if env var fails (temporary fix for Vercel sync)
  const twelveKey = process.env.TWELVE_DATA_API_KEY || 'd199ac3d5fa143a4880e2808c1402b00';

  // ─── PRIORITY 1: Pocket Option (forex/OTC) ───────────────────
  // No rate limits — data comes from PO WebSocket connection
  const poAsset = getPOAssetName(symbol);
  if (poAsset) {
    try {
      const poCandles = await fetchFromPocketOption(poAsset, timeframe, limit);
      if (poCandles.length > 0) {
        return { candles: poCandles, source: 'pocket_option' };
      }
    } catch (e) {
      console.warn('[PO] Pocket Option fetch failed, trying fallbacks:', e);
    }
  }

  // ─── PRIORITY 2: Binance (crypto) — Free & Unlimited ────────
  if (symbol.includes('BTC') || symbol.includes('ETH') || symbol.includes('SOL') || symbol.includes('XRP') || symbol.includes('DOGE')) {
    try {
      return { candles: await fetchFromBinance(symbol, timeframe, limit), source: 'binance' };
    } catch (e) {
      console.error('Binance fetch failed:', e);
    }
  }

  // ─── PRIORITY 3: Finnhub (stocks/forex) ─────────────────────
  if (finnhubKey) {
    try {
      return { candles: await fetchFromFinnhub(symbol, timeframe, limit, finnhubKey), source: 'finnhub' };
    } catch (e) {
      console.error('Finnhub fetch failed, trying fallback:', e);
    }
  }

  // ─── PRIORITY 4: Twelve Data (fallback) ─────────────────────
  if (twelveKey) {
    try {
      return { candles: await fetchFromTwelveData(symbol, timeframe, limit, twelveKey), source: 'twelve_data' };
    } catch (e) {
      console.error('Twelve Data fetch failed:', e);
    }
  }

  // No mock data - trading requires real market data
  throw new Error(`Market data unavailable for ${symbol}. API limit may be reached - try again in a few minutes or use a different symbol.`);
}

/**
 * Pocket Option Implementation — via the Python bridge microservice
 * No rate limits, real-time WebSocket data
 */
async function fetchFromPocketOption(
  asset: string,
  timeframe: string,
  limit: number,
): Promise<PriceCandle[]> {
  const tfSeconds = PO_TIMEFRAME_MAP[timeframe] || 300;
  const url = `${PO_BRIDGE_URL}/candles/${encodeURIComponent(asset)}/${tfSeconds}?count=${limit}`;

  const response = await fetch(url, {
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new Error(`PO bridge error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.candles || !Array.isArray(data.candles)) {
    throw new Error('Invalid PO candle response');
  }

  return data.candles.map((c: any) => ({
    timestamp: c.timestamp,
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
    volume: c.volume || 0,
  }));
}

/**
 * Finnhub Implementation
 */
async function fetchFromFinnhub(
  symbol: string,
  timeframe: string,
  limit: number,
  apiKey: string
): Promise<PriceCandle[]> {
  const resolution = FINNHUB_RESOLUTION_MAP[timeframe] || '5';
  
  let finnhubSymbol = symbol.replace('/', '');
  if (finnhubSymbol === 'EURUSD' || finnhubSymbol === 'GBPUSD' || finnhubSymbol === 'USDJPY' || finnhubSymbol === 'AUDUSD') {
    finnhubSymbol = `OANDA:${symbol.replace('/', '_')}`;
  } else if (finnhubSymbol === 'BTCUSD' || finnhubSymbol === 'ETHUSD') {
    finnhubSymbol = `BINANCE:${finnhubSymbol}T`;
  }

  const to = Math.floor(Date.now() / 1000);
  const resolutionSeconds = parseInt(resolution) * 60 || 86400;
  const from = to - (limit * resolutionSeconds * 2);

  const url = `https://finnhub.io/api/v1/forex/candle?symbol=${finnhubSymbol}&resolution=${resolution}&from=${from}&to=${to}&token=${apiKey}`;
  
  const isForex = finnhubSymbol.includes('OANDA:');
  const finalUrl = isForex ? url : url.replace('/forex/', finnhubSymbol.includes('BINANCE:') ? '/crypto/' : '/stock/');

  const response = await fetch(finalUrl);
  const data = await response.json();

  if (data.s === 'no_data' || !data.c) {
    throw new Error(`No data returned from Finnhub for ${finnhubSymbol}`);
  }

  return data.c.map((close: number, i: number) => ({
    timestamp: data.t[i] * 1000,
    open: data.o[i],
    high: data.h[i],
    low: data.l[i],
    close: data.c[i],
    volume: data.v[i] || 0,
  })).slice(-limit);
}

/**
 * Binance Implementation (Free & Unlimited for Crypto)
 */
async function fetchFromBinance(
  symbol: string,
  timeframe: string,
  limit: number
): Promise<PriceCandle[]> {
  const intervalMap: Record<string, string> = {
    '1m': '1m', '5m': '5m', '15m': '15m', '30m': '30m', '1h': '1h', '4h': '4h', '1d': '1d'
  };
  const interval = intervalMap[timeframe] || '5m';
  
  // Normalize symbol (BTC/USD -> BTCUSDT)
  const pair = symbol.replace('/', '').toUpperCase();
  const binanceSymbol = pair.endsWith('USD') ? pair + 'T' : pair;

  const url = `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Binance API error: ${response.statusText}`);
  }

  const data = await response.json();
  
  if (!Array.isArray(data)) {
    throw new Error('Invalid Binance response');
  }

  return data.map((k: any[]) => ({
    timestamp: k[0],
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
    volume: parseFloat(k[5]),
  }));
}

/**
 * Twelve Data Implementation
 */
async function fetchFromTwelveData(
  symbol: string,
  timeframe: string,
  outputSize: number,
  apiKey: string
): Promise<PriceCandle[]> {
  const interval = timeframe === '1h' ? '1h' : `${timeframe.replace('m', '')}min`;
  const candidates = symbol.includes('/') ? [symbol, symbol.replace('/', '')] : [symbol];
  let lastError: Error | null = null;

  for (const candidate of candidates) {
    const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(candidate)}&interval=${interval}&outputsize=${outputSize}&apikey=${apiKey}`;
    console.log(`[TwelveData] Fetching: ${url.replace(apiKey, 'REDACTED')}`);

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'error') {
        if (data.message?.includes('limit')) {
          console.warn('[TwelveData] Rate limit hit');
          lastError = new Error('Daily API limit reached (800 calls).'); 
        } else {
          console.error(`[TwelveData] API Error: ${data.message}`);
          lastError = new Error(data.message);
        }
        continue;
      }
      if (!data.values) {
        lastError = new Error('No data');
        continue;
      }

      return data.values.map((v: any) => ({
        timestamp: new Date(v.datetime).getTime(),
        open: parseFloat(v.open),
        high: parseFloat(v.high),
        low: parseFloat(v.low),
        close: parseFloat(v.close),
        volume: parseInt(v.volume || '0'),
      })).reverse();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Twelve Data fetch failed');
    }
  }

  throw lastError ?? new Error('No data');
}

// No mock data - trading requires real market data only

/**
 * Fetch candles specifically from Pocket Option bridge.
 * Exported for direct use by dashboard when PO connection is active.
 */
export async function fetchPOCandles(
  asset: string,
  timeframeSeconds: number,
  count: number = 100,
): Promise<PriceCandle[]> {
  return fetchFromPocketOption(asset, `${Math.floor(timeframeSeconds / 60)}m`, count);
}
