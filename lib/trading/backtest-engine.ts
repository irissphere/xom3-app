/**
 * XOM3 Backtesting Engine
 * Test trading strategies against historical data
 */

import type {
  PriceCandle,
  TradingSignal,
  BacktestConfig,
  BacktestResult,
  BacktestTrade,
  ConfluenceConfig,
  TimeFrame,
  TradingSession,
} from './types';
import { generateSignal } from './signal-engine';
import { getCurrentSession, MARKET_SESSIONS } from './session-analyzer';

// ============================================================
// BACKTEST EXECUTION
// ============================================================

export async function runBacktest(
  config: BacktestConfig,
  historicalCandles: PriceCandle[]
): Promise<BacktestResult> {
  const trades: BacktestTrade[] = [];
  let balance = config.initialBalance;
  let maxBalance = balance;
  let maxDrawdown = 0;
  let maxDrawdownPercent = 0;
  
  // Tracking
  let currentWinStreak = 0;
  let currentLossStreak = 0;
  let longestWinStreak = 0;
  let longestLossStreak = 0;
  const winStreaks: number[] = [];
  const lossStreaks: number[] = [];
  
  // Per-session tracking
  const sessionResults: Record<TradingSession, { trades: number; wins: number; profit: number }> = {
    sydney: { trades: 0, wins: 0, profit: 0 },
    tokyo: { trades: 0, wins: 0, profit: 0 },
    london: { trades: 0, wins: 0, profit: 0 },
    newyork: { trades: 0, wins: 0, profit: 0 },
    overlap_london_ny: { trades: 0, wins: 0, profit: 0 },
  };
  
  // Per-indicator tracking
  const indicatorResults: Record<string, { total: number; correct: number }> = {};
  
  // Minimum candles needed for indicators
  const minCandles = 50;
  
  // Iterate through candles
  for (let i = minCandles; i < historicalCandles.length - getExpiryCandles(config.timeframe); i++) {
    // Get candle window for signal generation
    const candleWindow = historicalCandles.slice(0, i + 1);
    const currentCandle = candleWindow[candleWindow.length - 1];
    
    // Skip if outside date range
    if (currentCandle.timestamp < config.startDate || currentCandle.timestamp > config.endDate) {
      continue;
    }
    
    // Generate signal
    const signalResult = await generateSignal({
      symbol: config.symbol,
      timeframe: config.timeframe,
      candles: candleWindow,
      config: config.confluenceConfig,
    });
    
    // Skip if no signal
    if (!signalResult.signal) continue;
    
    const signal = signalResult.signal;
    
    // Calculate bet size
    const betAmount = balance * (config.betSize / 100);
    if (betAmount <= 0) continue;
    
    // Get expiry candle
    const expiryCandles = getExpiryCandles(config.timeframe);
    const expiryIndex = i + expiryCandles;
    
    if (expiryIndex >= historicalCandles.length) continue;
    
    const entryPrice = currentCandle.close;
    const expiryCandle = historicalCandles[expiryIndex];
    const exitPrice = expiryCandle.close;
    
    // Determine result
    let result: 'win' | 'loss';
    if (signal.direction === 'CALL') {
      result = exitPrice > entryPrice ? 'win' : 'loss';
    } else {
      result = exitPrice < entryPrice ? 'win' : 'loss';
    }
    
    // Calculate P&L
    let pnl: number;
    if (result === 'win') {
      pnl = betAmount * (config.payoutPercent / 100);
      currentWinStreak++;
      currentLossStreak = 0;
      
      if (currentWinStreak > longestWinStreak) {
        longestWinStreak = currentWinStreak;
      }
    } else {
      pnl = -betAmount;
      currentLossStreak++;
      
      if (currentWinStreak > 0) {
        winStreaks.push(currentWinStreak);
      }
      currentWinStreak = 0;
      
      if (currentLossStreak > longestLossStreak) {
        longestLossStreak = currentLossStreak;
      }
    }
    
    balance += pnl;
    
    // Track max drawdown
    if (balance > maxBalance) {
      maxBalance = balance;
    } else {
      const drawdown = maxBalance - balance;
      const drawdownPercent = (drawdown / maxBalance) * 100;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
        maxDrawdownPercent = drawdownPercent;
      }
    }
    
    // Track session results
    const session = getSessionFromTimestamp(currentCandle.timestamp);
    sessionResults[session].trades++;
    sessionResults[session].profit += pnl;
    if (result === 'win') {
      sessionResults[session].wins++;
    }
    
    // Track indicator accuracy
    for (const indicator of signal.indicators) {
      if (!indicatorResults[indicator.name]) {
        indicatorResults[indicator.name] = { total: 0, correct: 0 };
      }
      indicatorResults[indicator.name].total++;
      if ((result === 'win' && indicator.direction === signal.direction) ||
          (result === 'loss' && indicator.direction !== signal.direction)) {
        indicatorResults[indicator.name].correct++;
      }
    }
    
    // Record trade
    trades.push({
      timestamp: currentCandle.timestamp,
      direction: signal.direction,
      entryPrice,
      exitPrice,
      result,
      pnl,
      balanceAfter: balance,
      signal,
    });
    
    // Skip ahead to avoid overlapping trades
    i += expiryCandles;
  }
  
  // Finalize streaks
  if (currentWinStreak > 0) winStreaks.push(currentWinStreak);
  if (currentLossStreak > 0) lossStreaks.push(currentLossStreak);
  
  // Calculate final statistics
  const totalTrades = trades.length;
  const winningTrades = trades.filter(t => t.result === 'win').length;
  const losingTrades = trades.filter(t => t.result === 'loss').length;
  
  const avgConsecutiveWins = winStreaks.length > 0 
    ? winStreaks.reduce((a, b) => a + b, 0) / winStreaks.length 
    : 0;
  const avgConsecutiveLosses = lossStreaks.length > 0 
    ? lossStreaks.reduce((a, b) => a + b, 0) / lossStreaks.length 
    : 0;
  
  // Calculate indicator accuracy
  const indicatorAccuracy: Record<string, number> = {};
  for (const [name, results] of Object.entries(indicatorResults)) {
    indicatorAccuracy[name] = results.total > 0 
      ? Math.round((results.correct / results.total) * 100) 
      : 0;
  }
  
  // Format session results
  const resultsBySession: Record<TradingSession, { trades: number; winRate: number; profit: number }> = {} as any;
  for (const [session, results] of Object.entries(sessionResults)) {
    resultsBySession[session as TradingSession] = {
      trades: results.trades,
      winRate: results.trades > 0 ? Math.round((results.wins / results.trades) * 100) : 0,
      profit: Math.round(results.profit * 100) / 100,
    };
  }
  
  // Generate recommendation
  const recommendation = generateBacktestRecommendation({
    winRate: totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0,
    maxDrawdownPercent,
    totalTrades,
    longestLossStreak,
    indicatorAccuracy,
    resultsBySession,
  });
  
  // Generate warnings
  const warnings = generateWarnings({
    winRate: totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0,
    maxDrawdownPercent,
    totalTrades,
    longestLossStreak,
    avgConsecutiveLosses,
  });
  
  return {
    config,
    totalTrades,
    winningTrades,
    losingTrades,
    winRate: totalTrades > 0 ? Math.round((winningTrades / totalTrades) * 100) : 0,
    
    startingBalance: config.initialBalance,
    endingBalance: Math.round(balance * 100) / 100,
    netProfit: Math.round((balance - config.initialBalance) * 100) / 100,
    netProfitPercent: Math.round(((balance - config.initialBalance) / config.initialBalance) * 10000) / 100,
    maxDrawdown: Math.round(maxDrawdown * 100) / 100,
    maxDrawdownPercent: Math.round(maxDrawdownPercent * 100) / 100,
    
    longestWinStreak,
    longestLossStreak,
    avgConsecutiveWins: Math.round(avgConsecutiveWins * 10) / 10,
    avgConsecutiveLosses: Math.round(avgConsecutiveLosses * 10) / 10,
    
    resultsBySession,
    indicatorAccuracy,
    trades,
    
    recommendation,
    warnings,
  };
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function getExpiryCandles(timeframe: TimeFrame): number {
  // Number of candles for typical binary option expiry
  switch (timeframe) {
    case '1m': return 1;
    case '5m': return 1;
    case '15m': return 1;
    case '30m': return 1;
    case '1h': return 1;
    case '4h': return 1;
    case '1d': return 1;
    default: return 1;
  }
}

function getSessionFromTimestamp(timestamp: number): TradingSession {
  const date = new Date(timestamp);
  const hourUTC = date.getUTCHours();
  
  if (hourUTC >= 13 && hourUTC < 17) return 'overlap_london_ny';
  if (hourUTC >= 8 && hourUTC < 17) return 'london';
  if (hourUTC >= 13 && hourUTC < 22) return 'newyork';
  if (hourUTC >= 0 && hourUTC < 9) return 'tokyo';
  return 'sydney';
}

interface RecommendationInput {
  winRate: number;
  maxDrawdownPercent: number;
  totalTrades: number;
  longestLossStreak: number;
  indicatorAccuracy: Record<string, number>;
  resultsBySession: Record<TradingSession, { trades: number; winRate: number; profit: number }>;
}

function generateBacktestRecommendation(input: RecommendationInput): string {
  const { winRate, maxDrawdownPercent, totalTrades, indicatorAccuracy, resultsBySession } = input;
  
  const recommendations: string[] = [];
  
  // Overall assessment
  if (winRate >= 60 && maxDrawdownPercent < 20) {
    recommendations.push('Strategy shows promise. Consider paper trading before live use.');
  } else if (winRate >= 55) {
    recommendations.push('Marginal edge. Needs refinement before live trading.');
  } else {
    recommendations.push('Strategy needs significant improvement. Win rate below profitable threshold.');
  }
  
  // Sample size
  if (totalTrades < 50) {
    recommendations.push('Insufficient sample size. Need at least 50 trades for reliable results.');
  }
  
  // Best indicators
  const sortedIndicators = Object.entries(indicatorAccuracy)
    .sort((a, b) => b[1] - a[1]);
  
  if (sortedIndicators.length > 0) {
    const best = sortedIndicators[0];
    const worst = sortedIndicators[sortedIndicators.length - 1];
    
    if (best[1] > 60) {
      recommendations.push(`Best performing indicator: ${best[0]} (${best[1]}% accuracy). Consider increasing its weight.`);
    }
    
    if (worst[1] < 45) {
      recommendations.push(`Weakest indicator: ${worst[0]} (${worst[1]}% accuracy). Consider removing or reducing weight.`);
    }
  }
  
  // Best session
  const sortedSessions = Object.entries(resultsBySession)
    .filter(([_, data]) => data.trades >= 5)
    .sort((a, b) => b[1].winRate - a[1].winRate);
  
  if (sortedSessions.length > 0) {
    const best = sortedSessions[0];
    recommendations.push(`Best performing session: ${best[0]} (${best[1].winRate}% win rate). Focus trading during this time.`);
  }
  
  return recommendations.join(' ');
}

interface WarningsInput {
  winRate: number;
  maxDrawdownPercent: number;
  totalTrades: number;
  longestLossStreak: number;
  avgConsecutiveLosses: number;
}

function generateWarnings(input: WarningsInput): string[] {
  const warnings: string[] = [];
  
  if (input.winRate < 55) {
    warnings.push('Win rate below 55% - not profitable with standard binary options payout');
  }
  
  if (input.maxDrawdownPercent > 30) {
    warnings.push('Maximum drawdown exceeds 30% - high risk of account blow');
  }
  
  if (input.longestLossStreak > 5) {
    warnings.push(`Longest losing streak: ${input.longestLossStreak} trades - ensure adequate bankroll`);
  }
  
  if (input.totalTrades < 30) {
    warnings.push('Results may not be statistically significant (< 30 trades)');
  }
  
  if (input.avgConsecutiveLosses > 2.5) {
    warnings.push('High average consecutive losses - consider stricter entry criteria');
  }
  
  return warnings;
}

// ============================================================
// MONTE CARLO SIMULATION
// ============================================================

export interface MonteCarloResult {
  ruinProbability: number; // Probability of losing X% of account
  expectedValue: number;
  standardDeviation: number;
  percentiles: {
    p5: number;
    p25: number;
    p50: number;
    p75: number;
    p95: number;
  };
}

export function runMonteCarlo(
  backtestResult: BacktestResult,
  simulations: number = 1000,
  tradesPerSim: number = 100,
  ruinThreshold: number = 50 // 50% loss
): MonteCarloResult {
  const winRate = backtestResult.winRate / 100;
  const payoutPercent = backtestResult.config.payoutPercent / 100;
  const betSize = backtestResult.config.betSize / 100;
  
  const finalBalances: number[] = [];
  let ruinCount = 0;
  
  for (let sim = 0; sim < simulations; sim++) {
    let balance = 1.0; // Normalized starting balance
    
    for (let trade = 0; trade < tradesPerSim; trade++) {
      const betAmount = balance * betSize;
      const isWin = Math.random() < winRate;
      
      if (isWin) {
        balance += betAmount * payoutPercent;
      } else {
        balance -= betAmount;
      }
      
      // Check for ruin
      if (balance <= (1 - ruinThreshold / 100)) {
        ruinCount++;
        break;
      }
    }
    
    finalBalances.push(balance);
  }
  
  // Sort for percentiles
  finalBalances.sort((a, b) => a - b);
  
  const mean = finalBalances.reduce((a, b) => a + b, 0) / simulations;
  const variance = finalBalances.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / simulations;
  const stdDev = Math.sqrt(variance);
  
  return {
    ruinProbability: Math.round((ruinCount / simulations) * 10000) / 100,
    expectedValue: Math.round((mean - 1) * 10000) / 100, // Return as percentage
    standardDeviation: Math.round(stdDev * 10000) / 100,
    percentiles: {
      p5: Math.round((finalBalances[Math.floor(simulations * 0.05)] - 1) * 10000) / 100,
      p25: Math.round((finalBalances[Math.floor(simulations * 0.25)] - 1) * 10000) / 100,
      p50: Math.round((finalBalances[Math.floor(simulations * 0.5)] - 1) * 10000) / 100,
      p75: Math.round((finalBalances[Math.floor(simulations * 0.75)] - 1) * 10000) / 100,
      p95: Math.round((finalBalances[Math.floor(simulations * 0.95)] - 1) * 10000) / 100,
    },
  };
}

// ============================================================
// OPTIMIZATION
// ============================================================

export interface OptimizationResult {
  bestConfig: Partial<ConfluenceConfig>;
  bestWinRate: number;
  bestProfit: number;
  iterations: number;
  improvements: { config: Partial<ConfluenceConfig>; winRate: number; profit: number }[];
}

export async function optimizeStrategy(
  baseConfig: BacktestConfig,
  historicalCandles: PriceCandle[],
  iterations: number = 20
): Promise<OptimizationResult> {
  const improvements: { config: Partial<ConfluenceConfig>; winRate: number; profit: number }[] = [];
  
  let bestConfig = { ...baseConfig.confluenceConfig };
  let bestWinRate = 0;
  let bestProfit = -Infinity;
  
  // Test different configurations
  const minIndicatorsOptions = [2, 3, 4];
  const minConfidenceOptions = [55, 60, 65, 70, 75];
  
  for (const minIndicators of minIndicatorsOptions) {
    for (const minConfidence of minConfidenceOptions) {
      const testConfig: BacktestConfig = {
        ...baseConfig,
        confluenceConfig: {
          ...baseConfig.confluenceConfig,
          minIndicatorsRequired: minIndicators,
          minConfidence,
        },
      };
      
      const result = await runBacktest(testConfig, historicalCandles);
      
      // Prioritize win rate, then profit
      const score = result.winRate * 100 + result.netProfitPercent;
      const bestScore = bestWinRate * 100 + bestProfit;
      
      if (score > bestScore && result.totalTrades >= 20) {
        bestWinRate = result.winRate;
        bestProfit = result.netProfitPercent;
        bestConfig = testConfig.confluenceConfig;
        
        improvements.push({
          config: { minIndicatorsRequired: minIndicators, minConfidence },
          winRate: result.winRate,
          profit: result.netProfitPercent,
        });
      }
    }
  }
  
  return {
    bestConfig,
    bestWinRate,
    bestProfit,
    iterations: minIndicatorsOptions.length * minConfidenceOptions.length,
    improvements,
  };
}

// ============================================================
// FORMAT HELPERS
// ============================================================

export function formatBacktestSummary(result: BacktestResult): string {
  const profitEmoji = result.netProfit >= 0 ? '📈' : '📉';
  const winRateEmoji = result.winRate >= 55 ? '✅' : result.winRate >= 50 ? '⚠️' : '❌';
  
  const lines = [
    '═══════════════════════════════════════',
    '         BACKTEST RESULTS',
    '═══════════════════════════════════════',
    '',
    `Symbol: ${result.config.symbol}`,
    `Timeframe: ${result.config.timeframe}`,
    `Period: ${new Date(result.config.startDate).toLocaleDateString()} - ${new Date(result.config.endDate).toLocaleDateString()}`,
    '',
    '─── PERFORMANCE ───',
    `${winRateEmoji} Win Rate: ${result.winRate}%`,
    `   Total Trades: ${result.totalTrades}`,
    `   Wins: ${result.winningTrades} | Losses: ${result.losingTrades}`,
    '',
    '─── PROFITABILITY ───',
    `${profitEmoji} Net P&L: $${result.netProfit} (${result.netProfitPercent}%)`,
    `   Starting: $${result.startingBalance}`,
    `   Ending: $${result.endingBalance}`,
    `   Max Drawdown: ${result.maxDrawdownPercent}%`,
    '',
    '─── STREAKS ───',
    `   Longest Win Streak: ${result.longestWinStreak}`,
    `   Longest Loss Streak: ${result.longestLossStreak}`,
    '',
    '─── SESSION PERFORMANCE ───',
  ];
  
  for (const [session, data] of Object.entries(result.resultsBySession)) {
    if (data.trades > 0) {
      lines.push(`   ${session}: ${data.winRate}% (${data.trades} trades)`);
    }
  }
  
  lines.push('');
  lines.push('─── INDICATOR ACCURACY ───');
  for (const [indicator, accuracy] of Object.entries(result.indicatorAccuracy)) {
    lines.push(`   ${indicator}: ${accuracy}%`);
  }
  
  if (result.warnings.length > 0) {
    lines.push('');
    lines.push('⚠️  WARNINGS:');
    for (const warning of result.warnings) {
      lines.push(`   • ${warning}`);
    }
  }
  
  lines.push('');
  lines.push('─── RECOMMENDATION ───');
  lines.push(result.recommendation);
  
  return lines.join('\n');
}
