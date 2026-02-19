/**
 * XOM3 Technical Indicator Library
 * All indicators for binary options signal generation
 */

import type {
  PriceCandle,
  RSIResult,
  MACDResult,
  BollingerBandsResult,
  EMAResult,
  StochasticResult,
  ATRResult,
  SupportResistanceResult,
  IndicatorSnapshot,
} from './types';

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function getClosePrices(candles: PriceCandle[]): number[] {
  return candles.map(c => c.close);
}

function getHighPrices(candles: PriceCandle[]): number[] {
  return candles.map(c => c.high);
}

function getLowPrices(candles: PriceCandle[]): number[] {
  return candles.map(c => c.low);
}

function sma(values: number[], period: number): number {
  if (values.length < period) return values[values.length - 1] || 0;
  const slice = values.slice(-period);
  return slice.reduce((sum, v) => sum + v, 0) / period;
}

function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const emaValues: number[] = [];
  
  // First EMA is SMA
  let prevEma = sma(values.slice(0, period), period);
  emaValues.push(prevEma);
  
  for (let i = period; i < values.length; i++) {
    const currentEma = values[i] * k + prevEma * (1 - k);
    emaValues.push(currentEma);
    prevEma = currentEma;
  }
  
  return emaValues;
}

// ============================================================
// RSI - Relative Strength Index
// ============================================================

export function calculateRSI(candles: PriceCandle[], period: number = 14): RSIResult {
  const closes = getClosePrices(candles);
  
  if (closes.length < period + 1) {
    return { value: 50, signal: 'neutral', divergence: null };
  }
  
  // Calculate gains and losses
  const changes: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    changes.push(closes[i] - closes[i - 1]);
  }
  
  let avgGain = 0;
  let avgLoss = 0;
  
  // First average (SMA)
  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) avgGain += changes[i];
    else avgLoss += Math.abs(changes[i]);
  }
  avgGain /= period;
  avgLoss /= period;
  
  // Subsequent averages (Smoothed)
  for (let i = period; i < changes.length; i++) {
    const gain = changes[i] > 0 ? changes[i] : 0;
    const loss = changes[i] < 0 ? Math.abs(changes[i]) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }
  
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));
  
  // Determine signal
  let signal: 'oversold' | 'neutral' | 'overbought' = 'neutral';
  if (rsi <= 30) signal = 'oversold';
  else if (rsi >= 70) signal = 'overbought';
  
  // Check for divergence (simplified - price making new high/low but RSI not)
  let divergence: 'bullish' | 'bearish' | null = null;
  if (closes.length >= 20) {
    const recentPriceHigh = Math.max(...closes.slice(-10));
    const prevPriceHigh = Math.max(...closes.slice(-20, -10));
    
    // Bullish divergence: price lower low, RSI higher low
    const recentPriceLow = Math.min(...closes.slice(-10));
    const prevPriceLow = Math.min(...closes.slice(-20, -10));
    
    if (recentPriceLow < prevPriceLow && rsi > 30 && rsi < 40) {
      divergence = 'bullish';
    } else if (recentPriceHigh > prevPriceHigh && rsi < 70 && rsi > 60) {
      divergence = 'bearish';
    }
  }
  
  return { value: Math.round(rsi * 100) / 100, signal, divergence };
}

// ============================================================
// MACD - Moving Average Convergence Divergence
// ============================================================

export function calculateMACD(
  candles: PriceCandle[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): MACDResult {
  const closes = getClosePrices(candles);
  
  if (closes.length < slowPeriod + signalPeriod) {
    return { macd: 0, signal: 0, histogram: 0, crossover: 'none' };
  }
  
  const fastEMA = ema(closes, fastPeriod);
  const slowEMA = ema(closes, slowPeriod);
  
  // MACD line
  const macdLine: number[] = [];
  const offset = slowPeriod - fastPeriod;
  for (let i = 0; i < slowEMA.length; i++) {
    macdLine.push(fastEMA[i + offset] - slowEMA[i]);
  }
  
  // Signal line
  const signalLine = ema(macdLine, signalPeriod);
  
  const currentMACD = macdLine[macdLine.length - 1];
  const currentSignal = signalLine[signalLine.length - 1];
  const histogram = currentMACD - currentSignal;
  
  // Check for crossover
  let crossover: 'bullish' | 'bearish' | 'none' = 'none';
  if (macdLine.length >= 2 && signalLine.length >= 2) {
    const prevMACD = macdLine[macdLine.length - 2];
    const prevSignal = signalLine[signalLine.length - 2];
    
    if (prevMACD < prevSignal && currentMACD > currentSignal) {
      crossover = 'bullish';
    } else if (prevMACD > prevSignal && currentMACD < currentSignal) {
      crossover = 'bearish';
    }
  }
  
  return {
    macd: Math.round(currentMACD * 10000) / 10000,
    signal: Math.round(currentSignal * 10000) / 10000,
    histogram: Math.round(histogram * 10000) / 10000,
    crossover,
  };
}

// ============================================================
// BOLLINGER BANDS
// ============================================================

export function calculateBollingerBands(
  candles: PriceCandle[],
  period: number = 20,
  stdDev: number = 2
): BollingerBandsResult {
  const closes = getClosePrices(candles);
  
  if (closes.length < period) {
    const lastPrice = closes[closes.length - 1] || 0;
    return {
      upper: lastPrice,
      middle: lastPrice,
      lower: lastPrice,
      width: 0,
      position: 'middle',
    };
  }
  
  // Middle band (SMA)
  const recentCloses = closes.slice(-period);
  const middle = recentCloses.reduce((sum, v) => sum + v, 0) / period;
  
  // Standard deviation
  const squaredDiffs = recentCloses.map(v => Math.pow(v - middle, 2));
  const variance = squaredDiffs.reduce((sum, v) => sum + v, 0) / period;
  const sd = Math.sqrt(variance);
  
  const upper = middle + (sd * stdDev);
  const lower = middle - (sd * stdDev);
  const width = (upper - lower) / middle * 100; // Percentage width
  
  // Determine position
  const currentPrice = closes[closes.length - 1];
  let position: 'above_upper' | 'at_upper' | 'middle' | 'at_lower' | 'below_lower';
  
  const upperThreshold = upper - (sd * 0.3);
  const lowerThreshold = lower + (sd * 0.3);
  
  if (currentPrice > upper) position = 'above_upper';
  else if (currentPrice >= upperThreshold) position = 'at_upper';
  else if (currentPrice <= lower) position = 'below_lower';
  else if (currentPrice <= lowerThreshold) position = 'at_lower';
  else position = 'middle';
  
  return {
    upper: Math.round(upper * 100000) / 100000,
    middle: Math.round(middle * 100000) / 100000,
    lower: Math.round(lower * 100000) / 100000,
    width: Math.round(width * 100) / 100,
    position,
  };
}

// ============================================================
// EMA CROSSOVER (Fast/Slow)
// ============================================================

export function calculateEMACrossover(
  candles: PriceCandle[],
  fastPeriod: number = 9,
  slowPeriod: number = 21
): EMAResult {
  const closes = getClosePrices(candles);
  
  if (closes.length < slowPeriod) {
    return { fast: 0, slow: 0, trend: 'neutral', crossover: 'none' };
  }
  
  const fastEMA = ema(closes, fastPeriod);
  const slowEMA = ema(closes, slowPeriod);
  
  const offset = slowPeriod - fastPeriod;
  const currentFast = fastEMA[fastEMA.length - 1];
  const currentSlow = slowEMA[slowEMA.length - 1];
  
  // Trend
  let trend: 'bullish' | 'bearish' | 'neutral';
  const diff = (currentFast - currentSlow) / currentSlow * 100;
  if (diff > 0.1) trend = 'bullish';
  else if (diff < -0.1) trend = 'bearish';
  else trend = 'neutral';
  
  // Crossover detection
  let crossover: 'golden_cross' | 'death_cross' | 'none' = 'none';
  if (fastEMA.length >= 2 && slowEMA.length >= 2) {
    const prevFast = fastEMA[fastEMA.length - 2];
    const prevSlow = slowEMA[slowEMA.length - 2];
    
    if (prevFast < prevSlow && currentFast > currentSlow) {
      crossover = 'golden_cross';
    } else if (prevFast > prevSlow && currentFast < currentSlow) {
      crossover = 'death_cross';
    }
  }
  
  return {
    fast: Math.round(currentFast * 100000) / 100000,
    slow: Math.round(currentSlow * 100000) / 100000,
    trend,
    crossover,
  };
}

// ============================================================
// STOCHASTIC OSCILLATOR
// ============================================================

export function calculateStochastic(
  candles: PriceCandle[],
  kPeriod: number = 14,
  dPeriod: number = 3
): StochasticResult {
  if (candles.length < kPeriod) {
    return { k: 50, d: 50, signal: 'neutral', crossover: 'none' };
  }
  
  // Calculate %K values
  const kValues: number[] = [];
  for (let i = kPeriod - 1; i < candles.length; i++) {
    const periodCandles = candles.slice(i - kPeriod + 1, i + 1);
    const highs = getHighPrices(periodCandles);
    const lows = getLowPrices(periodCandles);
    const closes = getClosePrices(periodCandles);
    
    const highestHigh = Math.max(...highs);
    const lowestLow = Math.min(...lows);
    const currentClose = closes[closes.length - 1];
    
    const k = highestHigh === lowestLow 
      ? 50 
      : ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
    kValues.push(k);
  }
  
  // Calculate %D (SMA of %K)
  const dValues: number[] = [];
  for (let i = dPeriod - 1; i < kValues.length; i++) {
    const periodK = kValues.slice(i - dPeriod + 1, i + 1);
    dValues.push(periodK.reduce((sum, v) => sum + v, 0) / dPeriod);
  }
  
  const currentK = kValues[kValues.length - 1];
  const currentD = dValues[dValues.length - 1];
  
  // Signal
  let signal: 'oversold' | 'neutral' | 'overbought' = 'neutral';
  if (currentK <= 20 && currentD <= 20) signal = 'oversold';
  else if (currentK >= 80 && currentD >= 80) signal = 'overbought';
  
  // Crossover
  let crossover: 'bullish' | 'bearish' | 'none' = 'none';
  if (kValues.length >= 2 && dValues.length >= 2) {
    const prevK = kValues[kValues.length - 2];
    const prevD = dValues[dValues.length - 2];
    
    if (prevK < prevD && currentK > currentD && currentK < 30) {
      crossover = 'bullish';
    } else if (prevK > prevD && currentK < currentD && currentK > 70) {
      crossover = 'bearish';
    }
  }
  
  return {
    k: Math.round(currentK * 100) / 100,
    d: Math.round(currentD * 100) / 100,
    signal,
    crossover,
  };
}

// ============================================================
// ATR - Average True Range (Volatility)
// ============================================================

export function calculateATR(candles: PriceCandle[], period: number = 14): ATRResult {
  if (candles.length < period + 1) {
    return { value: 0, volatility: 'medium', percentOfPrice: 0 };
  }
  
  // Calculate True Range for each candle
  const trValues: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i - 1].close;
    
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    trValues.push(tr);
  }
  
  // Calculate ATR (SMA of TR, then smoothed)
  let atr = trValues.slice(0, period).reduce((sum, v) => sum + v, 0) / period;
  
  for (let i = period; i < trValues.length; i++) {
    atr = (atr * (period - 1) + trValues[i]) / period;
  }
  
  const currentPrice = candles[candles.length - 1].close;
  const percentOfPrice = (atr / currentPrice) * 100;
  
  // Determine volatility level
  let volatility: 'low' | 'medium' | 'high';
  if (percentOfPrice < 0.5) volatility = 'low';
  else if (percentOfPrice < 1.5) volatility = 'medium';
  else volatility = 'high';
  
  return {
    value: Math.round(atr * 100000) / 100000,
    volatility,
    percentOfPrice: Math.round(percentOfPrice * 100) / 100,
  };
}

// ============================================================
// SUPPORT & RESISTANCE
// ============================================================

export function calculateSupportResistance(
  candles: PriceCandle[],
  lookback: number = 50
): SupportResistanceResult {
  const relevantCandles = candles.slice(-lookback);
  const currentPrice = candles[candles.length - 1].close;
  
  // Find swing highs and lows
  const swingHighs: number[] = [];
  const swingLows: number[] = [];
  
  for (let i = 2; i < relevantCandles.length - 2; i++) {
    const candle = relevantCandles[i];
    const prev1 = relevantCandles[i - 1];
    const prev2 = relevantCandles[i - 2];
    const next1 = relevantCandles[i + 1];
    const next2 = relevantCandles[i + 2];
    
    // Swing high
    if (candle.high > prev1.high && candle.high > prev2.high &&
        candle.high > next1.high && candle.high > next2.high) {
      swingHighs.push(candle.high);
    }
    
    // Swing low
    if (candle.low < prev1.low && candle.low < prev2.low &&
        candle.low < next1.low && candle.low < next2.low) {
      swingLows.push(candle.low);
    }
  }
  
  // Cluster nearby levels
  const clusterThreshold = currentPrice * 0.002; // 0.2%
  
  const clusterLevels = (levels: number[]): number[] => {
    if (levels.length === 0) return [];
    
    const sorted = [...levels].sort((a, b) => a - b);
    const clusters: number[][] = [[sorted[0]]];
    
    for (let i = 1; i < sorted.length; i++) {
      const lastCluster = clusters[clusters.length - 1];
      const lastValue = lastCluster[lastCluster.length - 1];
      
      if (sorted[i] - lastValue < clusterThreshold) {
        lastCluster.push(sorted[i]);
      } else {
        clusters.push([sorted[i]]);
      }
    }
    
    // Average each cluster
    return clusters.map(c => c.reduce((sum, v) => sum + v, 0) / c.length);
  };
  
  const resistances = clusterLevels(swingHighs).filter(r => r > currentPrice);
  const supports = clusterLevels(swingLows).filter(s => s < currentPrice);
  
  // Find nearest
  const nearestSupport = supports.length > 0 
    ? Math.max(...supports) 
    : currentPrice * 0.99;
  const nearestResistance = resistances.length > 0 
    ? Math.min(...resistances) 
    : currentPrice * 1.01;
  
  // Determine position
  const distanceToSupport = currentPrice - nearestSupport;
  const distanceToResistance = nearestResistance - currentPrice;
  const totalRange = nearestResistance - nearestSupport;
  
  let pricePosition: 'near_support' | 'near_resistance' | 'middle';
  if (totalRange > 0) {
    const positionRatio = distanceToSupport / totalRange;
    if (positionRatio < 0.25) pricePosition = 'near_support';
    else if (positionRatio > 0.75) pricePosition = 'near_resistance';
    else pricePosition = 'middle';
  } else {
    pricePosition = 'middle';
  }
  
  return {
    supports: supports.slice(-3).map(s => Math.round(s * 100000) / 100000),
    resistances: resistances.slice(0, 3).map(r => Math.round(r * 100000) / 100000),
    nearestSupport: Math.round(nearestSupport * 100000) / 100000,
    nearestResistance: Math.round(nearestResistance * 100000) / 100000,
    pricePosition,
  };
}

// ============================================================
// CALCULATE ALL INDICATORS
// ============================================================

export function calculateAllIndicators(candles: PriceCandle[]): IndicatorSnapshot {
  return {
    rsi: calculateRSI(candles),
    macd: calculateMACD(candles),
    bollinger: calculateBollingerBands(candles),
    ema: calculateEMACrossover(candles),
    stochastic: calculateStochastic(candles),
    atr: calculateATR(candles),
    supportResistance: calculateSupportResistance(candles),
  };
}

// ============================================================
// INDICATOR SIGNAL INTERPRETATION
// ============================================================

export interface IndicatorSignal {
  name: string;
  direction: 'CALL' | 'PUT' | 'NEUTRAL';
  strength: number; // 0-100
  reason: string;
}

export function interpretRSI(rsi: RSIResult): IndicatorSignal {
  if (rsi.signal === 'oversold') {
    const strength = Math.min(100, (30 - rsi.value) * 5 + 60);
    return {
      name: 'RSI',
      direction: 'CALL',
      strength: rsi.divergence === 'bullish' ? Math.min(100, strength + 20) : strength,
      reason: `RSI oversold at ${rsi.value.toFixed(1)}${rsi.divergence === 'bullish' ? ' with bullish divergence' : ''}`,
    };
  }
  
  if (rsi.signal === 'overbought') {
    const strength = Math.min(100, (rsi.value - 70) * 5 + 60);
    return {
      name: 'RSI',
      direction: 'PUT',
      strength: rsi.divergence === 'bearish' ? Math.min(100, strength + 20) : strength,
      reason: `RSI overbought at ${rsi.value.toFixed(1)}${rsi.divergence === 'bearish' ? ' with bearish divergence' : ''}`,
    };
  }
  
  return { name: 'RSI', direction: 'NEUTRAL', strength: 0, reason: 'RSI neutral' };
}

export function interpretMACD(macd: MACDResult): IndicatorSignal {
  if (macd.crossover === 'bullish') {
    return {
      name: 'MACD',
      direction: 'CALL',
      strength: 80,
      reason: 'MACD bullish crossover',
    };
  }
  
  if (macd.crossover === 'bearish') {
    return {
      name: 'MACD',
      direction: 'PUT',
      strength: 80,
      reason: 'MACD bearish crossover',
    };
  }
  
  // Histogram direction
  if (macd.histogram > 0 && macd.macd > macd.signal) {
    return {
      name: 'MACD',
      direction: 'CALL',
      strength: 50,
      reason: 'MACD bullish momentum',
    };
  }
  
  if (macd.histogram < 0 && macd.macd < macd.signal) {
    return {
      name: 'MACD',
      direction: 'PUT',
      strength: 50,
      reason: 'MACD bearish momentum',
    };
  }
  
  return { name: 'MACD', direction: 'NEUTRAL', strength: 0, reason: 'MACD neutral' };
}

export function interpretBollinger(bb: BollingerBandsResult): IndicatorSignal {
  if (bb.position === 'below_lower' || bb.position === 'at_lower') {
    return {
      name: 'Bollinger',
      direction: 'CALL',
      strength: bb.position === 'below_lower' ? 85 : 65,
      reason: `Price at lower Bollinger Band (${bb.position})`,
    };
  }
  
  if (bb.position === 'above_upper' || bb.position === 'at_upper') {
    return {
      name: 'Bollinger',
      direction: 'PUT',
      strength: bb.position === 'above_upper' ? 85 : 65,
      reason: `Price at upper Bollinger Band (${bb.position})`,
    };
  }
  
  return { name: 'Bollinger', direction: 'NEUTRAL', strength: 0, reason: 'Price in middle of Bollinger Bands' };
}

export function interpretEMA(ema: EMAResult): IndicatorSignal {
  if (ema.crossover === 'golden_cross') {
    return {
      name: 'EMA',
      direction: 'CALL',
      strength: 85,
      reason: 'Golden cross (fast EMA crossed above slow)',
    };
  }
  
  if (ema.crossover === 'death_cross') {
    return {
      name: 'EMA',
      direction: 'PUT',
      strength: 85,
      reason: 'Death cross (fast EMA crossed below slow)',
    };
  }
  
  if (ema.trend === 'bullish') {
    return {
      name: 'EMA',
      direction: 'CALL',
      strength: 55,
      reason: 'Bullish EMA trend',
    };
  }
  
  if (ema.trend === 'bearish') {
    return {
      name: 'EMA',
      direction: 'PUT',
      strength: 55,
      reason: 'Bearish EMA trend',
    };
  }
  
  return { name: 'EMA', direction: 'NEUTRAL', strength: 0, reason: 'EMA neutral' };
}

export function interpretStochastic(stoch: StochasticResult): IndicatorSignal {
  if (stoch.crossover === 'bullish' && stoch.signal === 'oversold') {
    return {
      name: 'Stochastic',
      direction: 'CALL',
      strength: 85,
      reason: 'Stochastic bullish crossover in oversold zone',
    };
  }
  
  if (stoch.crossover === 'bearish' && stoch.signal === 'overbought') {
    return {
      name: 'Stochastic',
      direction: 'PUT',
      strength: 85,
      reason: 'Stochastic bearish crossover in overbought zone',
    };
  }
  
  if (stoch.signal === 'oversold') {
    return {
      name: 'Stochastic',
      direction: 'CALL',
      strength: 60,
      reason: `Stochastic oversold (K: ${stoch.k.toFixed(1)}, D: ${stoch.d.toFixed(1)})`,
    };
  }
  
  if (stoch.signal === 'overbought') {
    return {
      name: 'Stochastic',
      direction: 'PUT',
      strength: 60,
      reason: `Stochastic overbought (K: ${stoch.k.toFixed(1)}, D: ${stoch.d.toFixed(1)})`,
    };
  }
  
  return { name: 'Stochastic', direction: 'NEUTRAL', strength: 0, reason: 'Stochastic neutral' };
}

export function interpretSupportResistance(sr: SupportResistanceResult): IndicatorSignal {
  if (sr.pricePosition === 'near_support') {
    return {
      name: 'Support/Resistance',
      direction: 'CALL',
      strength: 70,
      reason: `Price near support level (${sr.nearestSupport})`,
    };
  }
  
  if (sr.pricePosition === 'near_resistance') {
    return {
      name: 'Support/Resistance',
      direction: 'PUT',
      strength: 70,
      reason: `Price near resistance level (${sr.nearestResistance})`,
    };
  }
  
  return { name: 'Support/Resistance', direction: 'NEUTRAL', strength: 0, reason: 'Price in middle range' };
}

export function interpretAllIndicators(snapshot: IndicatorSnapshot): IndicatorSignal[] {
  return [
    interpretRSI(snapshot.rsi),
    interpretMACD(snapshot.macd),
    interpretBollinger(snapshot.bollinger),
    interpretEMA(snapshot.ema),
    interpretStochastic(snapshot.stochastic),
    interpretSupportResistance(snapshot.supportResistance),
  ].filter(signal => signal.direction !== 'NEUTRAL');
}
