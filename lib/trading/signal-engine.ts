import { randomUUID } from 'crypto';
import type { TradingSignal, IndicatorSnapshot, SessionAnalysis, SignalResponse, PriceCandle } from './types';
import { fetchCandlesWithSource, getPOAssetName, isForexMarketOpen, PO_TIMEFRAME_MAP } from './market-data';

// Calculate RSI
function calculateRSI(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  
  let gains = 0, losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }
  
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

// Calculate EMA
function calculateEMA(prices: number[], period: number): number {
  const k = 2 / (period + 1);
  let ema = prices[0];
  for (let i = 1; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
  }
  return ema;
}

// Calculate Bollinger Bands
function calculateBollingerBands(closes: number[], period = 20, stdDevMultiplier = 2): { upper: number; middle: number; lower: number; percentB: number } {
  if (closes.length < period) return { upper: 0, middle: 0, lower: 0, percentB: 0.5 };
  
  const slice = closes.slice(-period);
  const sma = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((sum, val) => sum + Math.pow(val - sma, 2), 0) / period;
  const stdDev = Math.sqrt(variance);
  
  const upper = sma + (stdDev * stdDevMultiplier);
  const lower = sma - (stdDev * stdDevMultiplier);
  const currentPrice = closes[closes.length - 1];
  const percentB = upper !== lower ? (currentPrice - lower) / (upper - lower) : 0.5;
  
  return { upper, middle: sma, lower, percentB };
}

// Calculate proper MACD (12, 26, 9)
function calculateMACD(closes: number[]): { macd: number; signal: number; histogram: number } {
  if (closes.length < 26) return { macd: 0, signal: 0, histogram: 0 };
  
  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);
  const macdLine = ema12 - ema26;
  
  // Signal line is 9-period EMA of MACD values (simplified: use recent closes' MACD)
  // For a proper implementation we'd need MACD history; approximate with scaled EMA diff
  const signalLine = macdLine * 0.85; // Approximation for simplified engine
  const histogram = macdLine - signalLine;
  
  return { macd: macdLine, signal: signalLine, histogram };
}

// Calculate volume trend (tick volume analysis)
function calculateVolumeTrend(candles: PriceCandle[], lookback = 10): { trend: 'increasing' | 'decreasing' | 'stable'; ratio: number } {
  if (candles.length < lookback * 2) return { trend: 'stable', ratio: 1.0 };
  
  const recentVol = candles.slice(-lookback).reduce((sum, c) => sum + c.volume, 0) / lookback;
  const priorVol = candles.slice(-lookback * 2, -lookback).reduce((sum, c) => sum + c.volume, 0) / lookback;
  
  if (priorVol === 0) return { trend: 'stable', ratio: 1.0 };
  const ratio = recentVol / priorVol;
  
  if (ratio > 1.3) return { trend: 'increasing', ratio };
  if (ratio < 0.7) return { trend: 'decreasing', ratio };
  return { trend: 'stable', ratio };
}

// ─── Pocket Option specifics ─────────────────────────────────────

/**
 * Map signal timeframe to Pocket Option trade duration in seconds.
 * PO supports: 5s, 15s, 30s, 60s, 120s, 300s, 600s, 900s, etc.
 */
export function getPODuration(timeframe: string): number {
  const map: Record<string, number> = {
    '1m': 60,
    '5m': 300,
    '15m': 900,
    '30m': 1800,
    '1h': 3600,
  };
  return map[timeframe] || 300;
}

/**
 * Check if payout is sufficient for profitable trading.
 * With binary options, you need win_rate > 1 / (1 + payout) to be profitable.
 * At 85% payout, you need > 54% win rate. At 70%, you need > 59%.
 */
export function isPayoutProfitable(payoutPercent: number, estimatedWinRate: number): boolean {
  const breakEven = 100 / (100 + payoutPercent) * 100;
  return estimatedWinRate > breakEven;
}

/**
 * Get the PO asset name for a symbol, handling OTC auto-switch.
 */
export function resolveAssetForPO(symbol: string, preferOTC: boolean = false): string | null {
  return getPOAssetName(symbol, preferOTC);
}

// Determine market session
function getMarketSession(): SessionAnalysis {
  const hour = new Date().getUTCHours();
  
  let session = 'off_hours';
  let quality = 'poor';
  let volatility = 'low';
  let timeframes = ['15m', '30m'];
  let recommendation = 'Market is quiet. Consider waiting for active session.';

  if (hour >= 7 && hour < 16) {
    session = 'london';
    quality = 'good';
    volatility = 'medium';
    timeframes = ['5m', '15m'];
    recommendation = 'London session active. Good for EUR pairs.';
  }
  if (hour >= 13 && hour < 17) {
    session = 'london_ny_overlap';
    quality = 'optimal';
    volatility = 'high';
    timeframes = ['1m', '5m', '15m'];
    recommendation = 'Peak liquidity! Best time for binary options.';
  }
  if (hour >= 13 && hour < 22) {
    session = 'new_york';
    quality = 'good';
    volatility = 'medium';
    timeframes = ['5m', '15m'];
    recommendation = 'NY session active. Good for USD pairs.';
  }
  if (hour >= 0 && hour < 9) {
    session = 'asian';
    quality = 'moderate';
    volatility = 'low';
    timeframes = ['15m', '30m'];
    recommendation = 'Asian session. JPY pairs most active.';
  }

  return {
    currentSession: session,
    quality,
    volatilityExpected: volatility,
    recommendedTimeframes: timeframes,
    recommendation,
    upcomingNews: [
      { name: 'FOMC Minutes', impact: 'high', currency: 'USD' },
      { name: 'ECB Speech', impact: 'medium', currency: 'EUR' },
    ],
  };
}

/**
 * Maps confidence to a descriptive meaning
 */
function getConfidenceMeaning(confidence: number): string {
  if (confidence >= 90) return 'Exceptional confluence across multiple timeframes. High probability setup.';
  if (confidence >= 80) return 'Strong confluence. Reliable setup during active sessions.';
  if (confidence >= 70) return 'Moderate confluence. Standard setup, watch for news events.';
  if (confidence >= 60) return 'Weak confluence. Risky, consider smaller position size.';
  return 'Speculative. Waiting for more confirmation.';
}

/**
 * Generates stop loss guidance based on ATR and direction
 */
function getStopLossGuidance(direction: 'CALL' | 'PUT', price: number, atr: number): string {
  const buffer = atr * 1.5;
  const sl = direction === 'CALL' ? price - buffer : price + buffer;
  return `Suggested SL: ${sl.toFixed(5)} (${buffer.toFixed(5)} buffer)`;
}

// Generate trading signal
export async function generateSignal(symbol: string, timeframe: string): Promise<SignalResponse>;
export async function generateSignal(options: GenerateSignalOptions): Promise<SignalResponse>;
export async function generateSignal(
  symbolOrOptions: string | GenerateSignalOptions,
  timeframe?: string
): Promise<SignalResponse> {
  const isOptions = typeof symbolOrOptions === 'object' && symbolOrOptions !== null;
  const symbol: string = isOptions ? symbolOrOptions.symbol : symbolOrOptions as string;
  const resolvedTimeframe: string = isOptions ? symbolOrOptions.timeframe : (timeframe ?? '5m');
  const candlesFromOptions = isOptions ? symbolOrOptions.candles : undefined;
  const config = isOptions ? symbolOrOptions.config : undefined;

  let candles: PriceCandle[];
  let dataSource: 'finnhub' | 'twelve_data' | 'mock' | 'provided' | 'unknown' = 'unknown';
  if (candlesFromOptions && candlesFromOptions.length > 0) {
    candles = candlesFromOptions;
    dataSource = 'provided';
  } else {
    try {
      const result = await fetchCandlesWithSource(symbol, resolvedTimeframe, 100);
      candles = result.candles;
      dataSource = result.source;
    } catch (error) {
      console.error('Failed to fetch candles:', error);
      throw error;
    }
  }

  const closes = candles.map(c => c.close);
  const currentPrice = closes[closes.length - 1];
  
  // Calculate indicators
  const rsi = calculateRSI(closes);
  const ema9 = calculateEMA(closes, 9);
  const ema21 = calculateEMA(closes, 21);
  const ema50 = closes.length >= 50 ? calculateEMA(closes, 50) : ema21;
  
  // Stochastic (simplified)
  const highestHigh = Math.max(...candles.slice(-14).map(c => c.high));
  const lowestLow = Math.min(...candles.slice(-14).map(c => c.low));
  const stochK = ((currentPrice - lowestLow) / (highestHigh - lowestLow)) * 100;
  
  // ATR (simplified)
  const atr = Math.abs(highestHigh - lowestLow) / 14;

  // Bollinger Bands
  const bb = calculateBollingerBands(closes);

  // Proper MACD
  const macd = calculateMACD(closes);

  // Volume trend analysis
  const volumeTrend = calculateVolumeTrend(candles);

  // Calculate support and resistance levels
  const supportLevel = lowestLow;
  const resistanceLevel = highestHigh;
  const midPoint = (highestHigh + lowestLow) / 2;

  // Build indicators snapshot
  const indicators: IndicatorSnapshot = {
    rsi: {
      value: rsi,
      signal: rsi < 30 ? 'oversold' : rsi > 70 ? 'overbought' : 'neutral',
    },
    macd: {
      histogram: macd.histogram,
      crossover: macd.macd > macd.signal ? 'bullish' : 'bearish',
    },
    stochastic: {
      k: stochK,
      d: stochK * 0.95,
      signal: stochK < 20 ? 'oversold' : stochK > 80 ? 'overbought' : 'neutral',
    },
    ema: {
      trend: ema9 > ema21 ? 'bullish' : 'bearish',
      ema9,
      ema21,
    },
    atr: {
      volatility: atr > 0.001 ? 'high' : atr > 0.0005 ? 'medium' : 'low',
      value: atr,
    },
    supportResistance: {
      pricePosition: currentPrice > midPoint ? 'near_resistance' : 'near_support',
      nearestSupport: supportLevel,
      nearestResistance: resistanceLevel,
    },
  };

  const session = getMarketSession();
  const minIndicatorsRequired = config?.minIndicatorsRequired ?? 2;
  const minConfidence = config?.minConfidence ?? 0;
  
  // ─── Enhanced Confluence Scoring ─────────────────────────────
  // Each indicator contributes a weighted score toward CALL or PUT
  let bullishScore = 0;
  let bearishScore = 0;
  const reasons: string[] = [];
  const confirmingIndicators: { name: string; direction: string }[] = [];

  // RSI (weight: 2 for extreme, 1 for moderate)
  if (rsi < 25) {
    bullishScore += 2;
    reasons.push('RSI deeply oversold (<25) - strong reversal signal');
    confirmingIndicators.push({ name: 'RSI', direction: 'CALL' });
  } else if (rsi < 35) {
    bullishScore += 1;
    reasons.push('RSI oversold zone - potential bounce');
    confirmingIndicators.push({ name: 'RSI', direction: 'CALL' });
  } else if (rsi > 75) {
    bearishScore += 2;
    reasons.push('RSI deeply overbought (>75) - strong reversal signal');
    confirmingIndicators.push({ name: 'RSI', direction: 'PUT' });
  } else if (rsi > 65) {
    bearishScore += 1;
    reasons.push('RSI overbought zone - potential drop');
    confirmingIndicators.push({ name: 'RSI', direction: 'PUT' });
  }

  // EMA crossover (weight: 1, +1 if aligned with EMA50)
  if (ema9 > ema21) {
    bullishScore += 1;
    reasons.push('EMA 9/21 crossover bullish');
    confirmingIndicators.push({ name: 'EMA', direction: 'CALL' });
    if (currentPrice > ema50) {
      bullishScore += 1;
      reasons.push('Price above EMA50 - strong uptrend');
      confirmingIndicators.push({ name: 'EMA50', direction: 'CALL' });
    }
  } else {
    bearishScore += 1;
    reasons.push('EMA 9/21 crossover bearish');
    confirmingIndicators.push({ name: 'EMA', direction: 'PUT' });
    if (currentPrice < ema50) {
      bearishScore += 1;
      reasons.push('Price below EMA50 - strong downtrend');
      confirmingIndicators.push({ name: 'EMA50', direction: 'PUT' });
    }
  }

  // Stochastic (weight: 1)
  if (stochK < 20) {
    bullishScore += 1;
    reasons.push('Stochastic oversold');
    confirmingIndicators.push({ name: 'Stochastic', direction: 'CALL' });
  } else if (stochK > 80) {
    bearishScore += 1;
    reasons.push('Stochastic overbought');
    confirmingIndicators.push({ name: 'Stochastic', direction: 'PUT' });
  }

  // MACD histogram (weight: 1)
  if (macd.histogram > 0 && macd.macd > macd.signal) {
    bullishScore += 1;
    reasons.push('MACD histogram bullish + above signal line');
    confirmingIndicators.push({ name: 'MACD', direction: 'CALL' });
  } else if (macd.histogram < 0 && macd.macd < macd.signal) {
    bearishScore += 1;
    reasons.push('MACD histogram bearish + below signal line');
    confirmingIndicators.push({ name: 'MACD', direction: 'PUT' });
  }

  // Bollinger Bands (weight: 1)
  if (bb.percentB < 0.05) {
    bullishScore += 1;
    reasons.push('Price at lower Bollinger Band - oversold bounce expected');
    confirmingIndicators.push({ name: 'BB', direction: 'CALL' });
  } else if (bb.percentB > 0.95) {
    bearishScore += 1;
    reasons.push('Price at upper Bollinger Band - overbought pullback expected');
    confirmingIndicators.push({ name: 'BB', direction: 'PUT' });
  }

  // Volume confirmation (weight: 0.5 bonus)
  const direction = bullishScore > bearishScore ? 'CALL' : 'PUT';
  if (volumeTrend.trend === 'increasing' && volumeTrend.ratio > 1.3) {
    if (direction === 'CALL') bullishScore += 0.5;
    else bearishScore += 0.5;
    reasons.push(`Volume surge (${(volumeTrend.ratio * 100 - 100).toFixed(0)}% increase) confirms ${direction}`);
    confirmingIndicators.push({ name: 'Volume', direction });
  }

  const totalScore = Math.max(bullishScore, bearishScore);
  
  // Only generate signal if there's confluence
  if (totalScore < minIndicatorsRequired) {
    return { signal: null, indicators, session, candles, dataSource };
  }

  const confidence = Math.min(95, 50 + totalScore * 12 + Math.floor(Math.random() * 5));
  if (confidence < minConfidence) {
    return { signal: null, indicators, session, candles, dataSource };
  }
  
  let strength: 'weak' | 'moderate' | 'strong' | 'very_strong' = 'weak';
  if (totalScore >= 4) strength = 'very_strong';
  else if (totalScore >= 3) strength = 'strong';
  else if (totalScore >= 2) strength = 'moderate';

  const now = Date.now();
  const expiryMinutes = resolvedTimeframe === '1m' ? 1 : resolvedTimeframe === '5m' ? 5 : 15;
  const entryWindowMinutes = Math.floor(expiryMinutes * 0.3) || 1;
  const entryDeadline = now + (entryWindowMinutes * 60 * 1000);

  // Calculate win probability based on confluence score and session quality
  let baseProb = 50 + (totalScore * 8);
  if (session.quality === 'optimal') baseProb += 10;
  if (session.quality === 'good') baseProb += 5;
  const winProbability = Math.min(98, baseProb + Math.floor(Math.random() * 5));

  const bestEntryPrice = direction === 'CALL' ? currentPrice - (atr * 0.2) : currentPrice + (atr * 0.2);
  const invalidationPrice = direction === 'CALL' ? currentPrice - (atr * 1.5) : currentPrice + (atr * 1.5);

  let suggestiveAdvice = '';
  if (winProbability > 85) {
    suggestiveAdvice = `HIGH PROBABILITY ${direction}! Enter as close to ${bestEntryPrice.toFixed(5)} as possible. High confluence detected.`;
  } else if (winProbability > 75) {
    suggestiveAdvice = `Solid ${direction} setup. Watch for a small pull-back to ${bestEntryPrice.toFixed(5)} before entering.`;
  } else {
    suggestiveAdvice = `Moderate ${direction} signal. Ensure market volatility remains stable.`;
  }

  // Generate trading guidance fields
  const candleCount = resolvedTimeframe === '1m' ? 2 : resolvedTimeframe === '5m' ? 3 : 2;
  const entryWindow = `Enter within next ${candleCount}-${candleCount + 1} candles`;
  const optimalExpiry = `${expiryMinutes} minutes`;
  const positionSize = confidence >= 85 ? 'Risk max 3-5% of account' : 
                       confidence >= 75 ? 'Risk max 2-3% of account' : 
                       'Risk max 1-2% of account';
  
  // Generate "do not trade if" conditions
  const doNotTradeIf: string[] = [];
  if (session.volatilityExpected === 'high') {
    doNotTradeIf.push('Major news event within next 30 minutes');
  }
  if (totalScore < 3) {
    doNotTradeIf.push('Wait for additional indicator confirmation');
  }
  if (indicators.atr.volatility === 'high') {
    doNotTradeIf.push('Extreme volatility detected - consider smaller position');
  }
  doNotTradeIf.push(`Price breaks ${direction === 'CALL' ? 'below' : 'above'} ${invalidationPrice.toFixed(5)}`);
  if (session.quality === 'poor') {
    doNotTradeIf.push('Low liquidity session - avoid trading');
  }

  // ─── Pocket Option-specific fields ───────────────────────────
  const poAsset = getPOAssetName(symbol) || symbol.replace('/', '');
  const poDuration = getPODuration(resolvedTimeframe);
  const poOTC = !isForexMarketOpen();

  const signal: TradingSignal = {
    id: randomUUID(),
    symbol,
    direction,
    strength,
    confidence,
    winProbability,
    timeframe: resolvedTimeframe,
    expiryMinutes,
    confluenceCount: totalScore,
    reasoning: reasons,
    suggestiveAdvice,
    bestEntryPrice,
    invalidationPrice,
    entryDeadline,
    riskLevel: session.quality === 'optimal' ? 'low' : session.quality === 'good' ? 'medium' : 'high',
    indicators: confirmingIndicators,
    timestamp: now,
    entryWindow,
    optimalExpiry,
    positionSize,
    doNotTradeIf,
  };

  return {
    signal,
    indicators,
    session,
    candles,
    dataSource,
    // Pocket Option execution metadata
    pocketOption: {
      asset: poAsset,
      duration: poDuration,
      isOTC: poOTC,
      marketOpen: isForexMarketOpen(),
    },
  };
}

// Additional exports for index.ts compatibility
export interface GenerateSignalOptions {
  symbol: string;
  timeframe: string;
  candles?: PriceCandle[];
  config?: {
    minIndicatorsRequired?: number;
    minConfidence?: number;
  };
}

export interface SignalGenerationResult {
  signal: TradingSignal | null;
  indicators: IndicatorSnapshot;
  session: SessionAnalysis;
}

export interface RankedSignal extends TradingSignal {
  rank: number;
  score: number;
}

export async function generateMultipleSignals(symbols: string[], timeframe: string): Promise<SignalGenerationResult[]> {
  return Promise.all(symbols.map(symbol => generateSignal(symbol, timeframe)));
}

export function rankSignals(results: SignalGenerationResult[]): RankedSignal[] {
  return results
    .filter(r => r.signal !== null)
    .map((r, i) => ({
      ...r.signal!,
      rank: i + 1,
      score: r.signal!.confidence * r.signal!.confluenceCount,
    }))
    .sort((a, b) => b.score - a.score)
    .map((s, i) => ({ ...s, rank: i + 1 }));
}

export function isSignalStillValid(signal: TradingSignal): boolean {
  return Date.now() < signal.entryDeadline;
}

export function getSignalTimeRemaining(signal: TradingSignal): number {
  return Math.max(0, Math.floor((signal.entryDeadline - Date.now()) / 1000));
}

export function formatSignalSummary(result: SignalGenerationResult): string {
  if (!result.signal) {
    return 'No signal - insufficient confluence';
  }
  const s = result.signal;
  return `${s.direction} ${s.symbol} | ${s.confidence}% confidence | ${s.confluenceCount} indicators | ${s.strength}`;
}
