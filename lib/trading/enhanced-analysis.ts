/**
 * Enhanced Trading Analysis Module
 * Includes: Multi-Timeframe Analysis, Pattern Recognition, Economic Calendar
 */

import type {
  PriceCandle,
  TimeFrame,
  MultiTimeframeAnalysis,
  MultiTimeframeSignal,
  ChartPattern,
  ChartPatternType,
  EconomicCalendarEvent,
  EconomicCalendarState,
  TradingStreak,
  SymbolPerformance,
  SessionPerformance,
  MarketSession,
} from './types';

// ============================================
// MULTI-TIMEFRAME ANALYSIS
// ============================================

const TIMEFRAME_HIERARCHY: TimeFrame[] = ['1m', '5m', '15m', '30m', '1h', '4h', '1d'];

function getHigherTimeframes(currentTf: string): TimeFrame[] {
  const idx = TIMEFRAME_HIERARCHY.indexOf(currentTf as TimeFrame);
  if (idx === -1) return ['15m', '1h'];
  return TIMEFRAME_HIERARCHY.slice(idx + 1, idx + 4) as TimeFrame[];
}

function calculateEMATrend(closes: number[]): 'bullish' | 'bearish' | 'neutral' {
  if (closes.length < 21) return 'neutral';
  
  const k9 = 2 / 10;
  const k21 = 2 / 22;
  let ema9 = closes[0];
  let ema21 = closes[0];
  
  for (let i = 1; i < closes.length; i++) {
    ema9 = closes[i] * k9 + ema9 * (1 - k9);
    ema21 = closes[i] * k21 + ema21 * (1 - k21);
  }
  
  const diff = ((ema9 - ema21) / ema21) * 100;
  if (diff > 0.1) return 'bullish';
  if (diff < -0.1) return 'bearish';
  return 'neutral';
}

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

export function analyzeTimeframe(candles: PriceCandle[]): MultiTimeframeSignal {
  const closes = candles.map(c => c.close);
  const trend = calculateEMATrend(closes);
  const rsi = calculateRSI(closes);
  
  let direction: 'CALL' | 'PUT' | 'NEUTRAL' = 'NEUTRAL';
  let confidence = 50;
  
  if (trend === 'bullish' && rsi < 70) {
    direction = 'CALL';
    confidence = 60 + (70 - rsi) / 2;
  } else if (trend === 'bearish' && rsi > 30) {
    direction = 'PUT';
    confidence = 60 + (rsi - 30) / 2;
  } else if (trend === 'bullish' && rsi >= 70) {
    direction = 'NEUTRAL';
    confidence = 40;
  } else if (trend === 'bearish' && rsi <= 30) {
    direction = 'NEUTRAL';
    confidence = 40;
  }
  
  return {
    timeframe: '5m', // Will be set by caller
    direction,
    confidence: Math.min(95, Math.round(confidence)),
    trend,
  };
}

export function generateMultiTimeframeAnalysis(
  signals: MultiTimeframeSignal[],
  currentTimeframe: string
): MultiTimeframeAnalysis {
  if (signals.length === 0) {
    return {
      signals: [],
      overallBias: 'NEUTRAL',
      agreement: 0,
      strongestTimeframe: currentTimeframe as TimeFrame,
      recommendation: 'Insufficient data for multi-timeframe analysis',
    };
  }
  
  // Count directions
  let callCount = 0;
  let putCount = 0;
  let neutralCount = 0;
  let highestConfidence = 0;
  let strongestTf: TimeFrame = signals[0]?.timeframe || '5m';
  
  signals.forEach(sig => {
    if (sig.direction === 'CALL') callCount++;
    else if (sig.direction === 'PUT') putCount++;
    else neutralCount++;
    
    if (sig.confidence > highestConfidence) {
      highestConfidence = sig.confidence;
      strongestTf = sig.timeframe;
    }
  });
  
  const total = signals.length;
  const maxCount = Math.max(callCount, putCount, neutralCount);
  const agreement = Math.round((maxCount / total) * 100);
  
  let overallBias: 'CALL' | 'PUT' | 'NEUTRAL' = 'NEUTRAL';
  if (callCount > putCount && callCount > neutralCount) overallBias = 'CALL';
  else if (putCount > callCount && putCount > neutralCount) overallBias = 'PUT';
  
  let recommendation = '';
  if (agreement >= 80) {
    recommendation = `Strong ${overallBias} bias across timeframes. High probability setup.`;
  } else if (agreement >= 60) {
    recommendation = `Moderate ${overallBias} bias. Consider waiting for better alignment.`;
  } else {
    recommendation = 'Mixed signals across timeframes. Wait for clearer setup.';
  }
  
  return {
    signals,
    overallBias,
    agreement,
    strongestTimeframe: strongestTf,
    recommendation,
  };
}

// ============================================
// CHART PATTERN RECOGNITION
// ============================================

export function detectPatterns(candles: PriceCandle[]): ChartPattern[] {
  const patterns: ChartPattern[] = [];
  
  if (candles.length < 10) return patterns;
  
  // Get recent candles for pattern detection
  const recent = candles.slice(-20);
  const closes = recent.map(c => c.close);
  const highs = recent.map(c => c.high);
  const lows = recent.map(c => c.low);
  const opens = recent.map(c => c.open);
  
  // Detect Candlestick Patterns (last few candles)
  const lastCandle = recent[recent.length - 1];
  const prevCandle = recent[recent.length - 2];
  const prevPrevCandle = recent[recent.length - 3];
  
  // Hammer (bullish)
  if (isHammer(lastCandle)) {
    patterns.push({
      type: 'hammer',
      direction: 'bullish',
      reliability: 65,
      description: 'Hammer pattern detected - potential bullish reversal',
      timestamp: lastCandle.timestamp,
    });
  }
  
  // Shooting Star (bearish)
  if (isShootingStar(lastCandle)) {
    patterns.push({
      type: 'shooting_star',
      direction: 'bearish',
      reliability: 65,
      description: 'Shooting star pattern - potential bearish reversal',
      timestamp: lastCandle.timestamp,
    });
  }
  
  // Bullish Engulfing
  if (isBullishEngulfing(prevCandle, lastCandle)) {
    patterns.push({
      type: 'bullish_engulfing',
      direction: 'bullish',
      reliability: 75,
      description: 'Bullish engulfing pattern - strong bullish signal',
      timestamp: lastCandle.timestamp,
    });
  }
  
  // Bearish Engulfing
  if (isBearishEngulfing(prevCandle, lastCandle)) {
    patterns.push({
      type: 'bearish_engulfing',
      direction: 'bearish',
      reliability: 75,
      description: 'Bearish engulfing pattern - strong bearish signal',
      timestamp: lastCandle.timestamp,
    });
  }
  
  // Morning Star (bullish)
  if (isMorningStar(prevPrevCandle, prevCandle, lastCandle)) {
    patterns.push({
      type: 'morning_star',
      direction: 'bullish',
      reliability: 80,
      description: 'Morning star pattern - strong bullish reversal signal',
      timestamp: lastCandle.timestamp,
    });
  }
  
  // Evening Star (bearish)
  if (isEveningStar(prevPrevCandle, prevCandle, lastCandle)) {
    patterns.push({
      type: 'evening_star',
      direction: 'bearish',
      reliability: 80,
      description: 'Evening star pattern - strong bearish reversal signal',
      timestamp: lastCandle.timestamp,
    });
  }
  
  // Doji
  if (isDoji(lastCandle)) {
    patterns.push({
      type: 'doji',
      direction: 'neutral',
      reliability: 55,
      description: 'Doji pattern - indecision, watch for breakout direction',
      timestamp: lastCandle.timestamp,
    });
  }
  
  // Support Bounce / Resistance Rejection
  const recentLow = Math.min(...lows.slice(-10));
  const recentHigh = Math.max(...highs.slice(-10));
  const currentPrice = lastCandle.close;
  
  if (Math.abs(currentPrice - recentLow) / recentLow < 0.002 && lastCandle.close > lastCandle.open) {
    patterns.push({
      type: 'support_bounce',
      direction: 'bullish',
      reliability: 70,
      description: `Price bouncing off support at ${recentLow.toFixed(5)}`,
      targetPrice: recentHigh,
      stopLoss: recentLow * 0.998,
      timestamp: lastCandle.timestamp,
    });
  }
  
  if (Math.abs(currentPrice - recentHigh) / recentHigh < 0.002 && lastCandle.close < lastCandle.open) {
    patterns.push({
      type: 'resistance_rejection',
      direction: 'bearish',
      reliability: 70,
      description: `Price rejected at resistance ${recentHigh.toFixed(5)}`,
      targetPrice: recentLow,
      stopLoss: recentHigh * 1.002,
      timestamp: lastCandle.timestamp,
    });
  }
  
  // Double Top Detection
  const doubleTop = detectDoubleTop(highs, lows, closes);
  if (doubleTop) {
    patterns.push({
      type: 'double_top',
      direction: 'bearish',
      reliability: 75,
      description: 'Double top pattern forming - bearish reversal signal',
      timestamp: lastCandle.timestamp,
    });
  }
  
  // Double Bottom Detection
  const doubleBottom = detectDoubleBottom(highs, lows, closes);
  if (doubleBottom) {
    patterns.push({
      type: 'double_bottom',
      direction: 'bullish',
      reliability: 75,
      description: 'Double bottom pattern forming - bullish reversal signal',
      timestamp: lastCandle.timestamp,
    });
  }
  
  return patterns.sort((a, b) => b.reliability - a.reliability);
}

// Pattern Helper Functions
function isHammer(candle: PriceCandle): boolean {
  const body = Math.abs(candle.close - candle.open);
  const lowerWick = Math.min(candle.open, candle.close) - candle.low;
  const upperWick = candle.high - Math.max(candle.open, candle.close);
  
  return lowerWick > body * 2 && upperWick < body * 0.5;
}

function isShootingStar(candle: PriceCandle): boolean {
  const body = Math.abs(candle.close - candle.open);
  const lowerWick = Math.min(candle.open, candle.close) - candle.low;
  const upperWick = candle.high - Math.max(candle.open, candle.close);
  
  return upperWick > body * 2 && lowerWick < body * 0.5;
}

function isBullishEngulfing(prev: PriceCandle, curr: PriceCandle): boolean {
  const prevBearish = prev.close < prev.open;
  const currBullish = curr.close > curr.open;
  const engulfs = curr.open < prev.close && curr.close > prev.open;
  
  return prevBearish && currBullish && engulfs;
}

function isBearishEngulfing(prev: PriceCandle, curr: PriceCandle): boolean {
  const prevBullish = prev.close > prev.open;
  const currBearish = curr.close < curr.open;
  const engulfs = curr.open > prev.close && curr.close < prev.open;
  
  return prevBullish && currBearish && engulfs;
}

function isMorningStar(first: PriceCandle, second: PriceCandle, third: PriceCandle): boolean {
  const firstBearish = first.close < first.open;
  const secondSmallBody = Math.abs(second.close - second.open) < Math.abs(first.close - first.open) * 0.3;
  const secondGapDown = second.high < first.close;
  const thirdBullish = third.close > third.open;
  const thirdCloseAbove = third.close > (first.open + first.close) / 2;
  
  return firstBearish && secondSmallBody && thirdBullish && thirdCloseAbove;
}

function isEveningStar(first: PriceCandle, second: PriceCandle, third: PriceCandle): boolean {
  const firstBullish = first.close > first.open;
  const secondSmallBody = Math.abs(second.close - second.open) < Math.abs(first.close - first.open) * 0.3;
  const thirdBearish = third.close < third.open;
  const thirdCloseBelow = third.close < (first.open + first.close) / 2;
  
  return firstBullish && secondSmallBody && thirdBearish && thirdCloseBelow;
}

function isDoji(candle: PriceCandle): boolean {
  const body = Math.abs(candle.close - candle.open);
  const range = candle.high - candle.low;
  
  return body < range * 0.1;
}

function detectDoubleTop(highs: number[], lows: number[], closes: number[]): boolean {
  if (highs.length < 10) return false;
  
  const recentHighs = highs.slice(-15);
  const maxHigh = Math.max(...recentHighs);
  
  // Find peaks near the max
  const peaks = recentHighs.filter(h => Math.abs(h - maxHigh) / maxHigh < 0.002);
  
  return peaks.length >= 2 && closes[closes.length - 1] < maxHigh * 0.995;
}

function detectDoubleBottom(highs: number[], lows: number[], closes: number[]): boolean {
  if (lows.length < 10) return false;
  
  const recentLows = lows.slice(-15);
  const minLow = Math.min(...recentLows);
  
  // Find troughs near the min
  const troughs = recentLows.filter(l => Math.abs(l - minLow) / minLow < 0.002);
  
  return troughs.length >= 2 && closes[closes.length - 1] > minLow * 1.005;
}

// ============================================
// ECONOMIC CALENDAR
// ============================================

// Mock economic events - In production, fetch from forex factory API or similar
function getMockEconomicEvents(): EconomicCalendarEvent[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Generate some mock events for today and tomorrow
  const events: EconomicCalendarEvent[] = [
    {
      id: '1',
      name: 'FOMC Meeting Minutes',
      currency: 'USD',
      impact: 'high',
      time: new Date(today.getTime() + 18 * 60 * 60 * 1000), // 6 PM
      affectedPairs: ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD'],
      tradingAdvice: 'Avoid trading 30 min before and after release',
    },
    {
      id: '2',
      name: 'ECB President Lagarde Speaks',
      currency: 'EUR',
      impact: 'high',
      time: new Date(today.getTime() + 14 * 60 * 60 * 1000), // 2 PM
      affectedPairs: ['EUR/USD', 'EUR/GBP', 'EUR/JPY'],
      tradingAdvice: 'Expect EUR volatility during speech',
    },
    {
      id: '3',
      name: 'US Retail Sales',
      currency: 'USD',
      impact: 'medium',
      time: new Date(today.getTime() + 13.5 * 60 * 60 * 1000), // 1:30 PM
      forecast: '0.3%',
      previous: '0.2%',
      affectedPairs: ['EUR/USD', 'GBP/USD', 'USD/JPY'],
      tradingAdvice: 'Watch for USD momentum after release',
    },
    {
      id: '4',
      name: 'UK Employment Report',
      currency: 'GBP',
      impact: 'high',
      time: new Date(today.getTime() + 9 * 60 * 60 * 1000), // 9 AM
      affectedPairs: ['GBP/USD', 'EUR/GBP'],
      tradingAdvice: 'GBP pairs may be volatile',
    },
    {
      id: '5',
      name: 'Japan GDP',
      currency: 'JPY',
      impact: 'medium',
      time: new Date(today.getTime() + 23.5 * 60 * 60 * 1000), // 11:30 PM (next day in Japan)
      affectedPairs: ['USD/JPY', 'EUR/JPY'],
      tradingAdvice: 'Asian session JPY volatility expected',
    },
  ];
  
  return events;
}

export function getEconomicCalendarState(currentSymbol: string): EconomicCalendarState {
  const events = getMockEconomicEvents();
  const now = new Date();
  const thirtyMinutes = 30 * 60 * 1000;
  
  // Filter to upcoming events (within next 24 hours)
  const upcomingEvents = events.filter(e => {
    const eventTime = new Date(e.time).getTime();
    return eventTime > now.getTime() && eventTime < now.getTime() + 24 * 60 * 60 * 1000;
  });
  
  // Find high impact events coming up
  const upcomingHighImpact = upcomingEvents.filter(e => e.impact === 'high');
  
  // Check if we should pause trading
  let shouldPauseTrading = false;
  let pauseReason: string | undefined;
  let nextSafeWindow: Date | undefined;
  
  for (const event of upcomingHighImpact) {
    const eventTime = new Date(event.time).getTime();
    const timeDiff = eventTime - now.getTime();
    
    // If high impact event is within 30 minutes
    if (timeDiff > 0 && timeDiff < thirtyMinutes) {
      // Check if this event affects the current symbol
      const affectsSymbol = event.affectedPairs.some(pair => 
        currentSymbol.includes(event.currency) || pair === currentSymbol
      );
      
      if (affectsSymbol) {
        shouldPauseTrading = true;
        pauseReason = `${event.name} in ${Math.round(timeDiff / 60000)} minutes - avoid ${event.currency} pairs`;
        nextSafeWindow = new Date(eventTime + thirtyMinutes);
        break;
      }
    }
    
    // If high impact event was within last 30 minutes
    if (timeDiff < 0 && timeDiff > -thirtyMinutes) {
      const affectsSymbol = event.affectedPairs.some(pair => 
        currentSymbol.includes(event.currency) || pair === currentSymbol
      );
      
      if (affectsSymbol) {
        shouldPauseTrading = true;
        pauseReason = `${event.name} just released - wait for volatility to settle`;
        nextSafeWindow = new Date(eventTime + thirtyMinutes);
        break;
      }
    }
  }
  
  return {
    events: upcomingEvents,
    upcomingHighImpact,
    shouldPauseTrading,
    pauseReason,
    nextSafeWindow,
  };
}

// ============================================
// STREAK TRACKING
// ============================================

export function calculateStreak(results: ('win' | 'loss' | 'draw')[]): TradingStreak {
  if (results.length === 0) {
    return {
      currentStreak: 0,
      streakType: 'none',
      longestWinStreak: 0,
      longestLossStreak: 0,
      lastFiveResults: [],
      hotStreak: false,
      coldStreak: false,
    };
  }
  
  // Calculate current streak
  let currentStreak = 1;
  const lastResult = results[results.length - 1];
  
  for (let i = results.length - 2; i >= 0; i--) {
    if (results[i] === lastResult) {
      currentStreak++;
    } else {
      break;
    }
  }
  
  // Calculate longest streaks
  let longestWinStreak = 0;
  let longestLossStreak = 0;
  let tempStreak = 1;
  
  for (let i = 1; i < results.length; i++) {
    if (results[i] === results[i - 1]) {
      tempStreak++;
    } else {
      if (results[i - 1] === 'win') {
        longestWinStreak = Math.max(longestWinStreak, tempStreak);
      } else if (results[i - 1] === 'loss') {
        longestLossStreak = Math.max(longestLossStreak, tempStreak);
      }
      tempStreak = 1;
    }
  }
  
  // Check final streak
  if (results[results.length - 1] === 'win') {
    longestWinStreak = Math.max(longestWinStreak, tempStreak);
  } else if (results[results.length - 1] === 'loss') {
    longestLossStreak = Math.max(longestLossStreak, tempStreak);
  }
  
  const lastFive = results.slice(-5);
  const streakType = lastResult === 'draw' ? 'none' : lastResult;
  
  return {
    currentStreak: lastResult === 'draw' ? 0 : currentStreak,
    streakType,
    longestWinStreak,
    longestLossStreak,
    lastFiveResults: lastFive,
    hotStreak: streakType === 'win' && currentStreak >= 3,
    coldStreak: streakType === 'loss' && currentStreak >= 3,
  };
}

// ============================================
// PERFORMANCE CALCULATIONS
// ============================================

export function calculateSymbolPerformance(
  trades: { symbol: string; result: 'win' | 'loss' | 'draw'; amount?: number; payout?: number; session?: string; timeframe?: string; timestamp: number }[]
): Map<string, SymbolPerformance> {
  const symbolMap = new Map<string, SymbolPerformance>();
  
  // Group trades by symbol
  const grouped = new Map<string, typeof trades>();
  trades.forEach(trade => {
    if (!grouped.has(trade.symbol)) {
      grouped.set(trade.symbol, []);
    }
    grouped.get(trade.symbol)!.push(trade);
  });
  
  // Calculate stats for each symbol
  grouped.forEach((symbolTrades, symbol) => {
    const completed = symbolTrades.filter(t => t.result !== 'draw');
    const wins = completed.filter(t => t.result === 'win');
    const losses = completed.filter(t => t.result === 'loss');
    
    let totalProfit = 0;
    let totalLoss = 0;
    
    wins.forEach(t => {
      totalProfit += (t.amount || 10) * ((t.payout || 85) / 100);
    });
    
    losses.forEach(t => {
      totalLoss += t.amount || 10;
    });
    
    const avgProfit = wins.length > 0 ? totalProfit / wins.length : 0;
    const avgLoss = losses.length > 0 ? totalLoss / losses.length : 0;
    
    // Find best session and timeframe
    const sessionCount = new Map<string, number>();
    const tfCount = new Map<string, number>();
    
    wins.forEach(t => {
      if (t.session) {
        sessionCount.set(t.session, (sessionCount.get(t.session) || 0) + 1);
      }
      if (t.timeframe) {
        tfCount.set(t.timeframe, (tfCount.get(t.timeframe) || 0) + 1);
      }
    });
    
    let bestSession: MarketSession = 'london_ny_overlap';
    let maxSessionWins = 0;
    sessionCount.forEach((count, session) => {
      if (count > maxSessionWins) {
        maxSessionWins = count;
        bestSession = session as MarketSession;
      }
    });
    
    let bestTimeframe: TimeFrame = '5m';
    let maxTfWins = 0;
    tfCount.forEach((count, tf) => {
      if (count > maxTfWins) {
        maxTfWins = count;
        bestTimeframe = tf as TimeFrame;
      }
    });
    
    symbolMap.set(symbol, {
      symbol,
      totalTrades: completed.length,
      wins: wins.length,
      losses: losses.length,
      winRate: completed.length > 0 ? (wins.length / completed.length) * 100 : 0,
      avgProfit,
      avgLoss,
      profitFactor: totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? 999 : 0,
      bestSession,
      bestTimeframe,
      lastTraded: symbolTrades.length > 0 ? symbolTrades[symbolTrades.length - 1].timestamp : 0,
    });
  });
  
  return symbolMap;
}

export function calculateSessionPerformance(
  trades: { session: string; result: 'win' | 'loss' | 'draw'; amount?: number; payout?: number }[]
): Map<string, SessionPerformance> {
  const sessionMap = new Map<string, SessionPerformance>();
  
  const sessions: MarketSession[] = ['asian', 'london', 'new_york', 'london_ny_overlap', 'off_hours'];
  
  sessions.forEach(session => {
    const sessionTrades = trades.filter(t => t.session === session && t.result !== 'draw');
    const wins = sessionTrades.filter(t => t.result === 'win');
    const losses = sessionTrades.filter(t => t.result === 'loss');
    
    let totalProfitPercent = 0;
    wins.forEach(t => {
      totalProfitPercent += (t.payout || 85);
    });
    losses.forEach(t => {
      totalProfitPercent -= 100;
    });
    
    const winRate = sessionTrades.length > 0 ? (wins.length / sessionTrades.length) * 100 : 0;
    const avgProfitPercent = sessionTrades.length > 0 ? totalProfitPercent / sessionTrades.length : 0;
    
    let recommendation = '';
    if (winRate >= 60) {
      recommendation = `Strong performance in ${session.replace('_', ' ')} session. Continue trading!`;
    } else if (winRate >= 50) {
      recommendation = `Moderate results. Consider being more selective.`;
    } else if (sessionTrades.length > 5) {
      recommendation = `Below average performance. Consider avoiding this session.`;
    } else {
      recommendation = `Insufficient data for this session.`;
    }
    
    sessionMap.set(session, {
      session,
      totalTrades: sessionTrades.length,
      wins: wins.length,
      losses: losses.length,
      winRate,
      avgProfitPercent,
      recommendation,
    });
  });
  
  return sessionMap;
}

// Get current market session
export function getCurrentSession(): MarketSession {
  const hour = new Date().getUTCHours();
  
  if (hour >= 13 && hour < 17) return 'london_ny_overlap';
  if (hour >= 7 && hour < 16) return 'london';
  if (hour >= 13 && hour < 22) return 'new_york';
  if (hour >= 0 && hour < 9) return 'asian';
  return 'off_hours';
}
