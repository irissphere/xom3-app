/**
 * XOM3 Trading Engine
 * Binary Options / PocketOption Prediction System
 * 
 * Complete system for:
 * - Technical analysis with 6+ indicators
 * - Signal generation with confluence scoring
 * - Market session optimization
 * - Team prediction games with leaderboards
 * - Backtesting and strategy optimization
 */

// ============================================================
// TYPE EXPORTS
// ============================================================

export * from './types';

// ============================================================
// INDICATOR LIBRARY
// ============================================================

export {
  // Individual indicators
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  calculateEMACrossover,
  calculateStochastic,
  calculateATR,
  calculateSupportResistance,
  
  // Bulk calculation
  calculateAllIndicators,
  
  // Signal interpretation
  interpretRSI,
  interpretMACD,
  interpretBollinger,
  interpretEMA,
  interpretStochastic,
  interpretSupportResistance,
  interpretAllIndicators,
  
  type IndicatorSignal,
} from './indicators';

// ============================================================
// SIGNAL ENGINE
// ============================================================

export {
  generateSignal,
  generateMultipleSignals,
  rankSignals,
  isSignalStillValid,
  getSignalTimeRemaining,
  formatSignalSummary,
  
  type GenerateSignalOptions,
  type SignalGenerationResult,
  type RankedSignal,
} from './signal-engine';

// ============================================================
// SESSION ANALYZER
// ============================================================

export {
  MARKET_SESSIONS,
  getCurrentSession,
  isSessionActive,
  getHoursUntilSession,
  getNextOptimalSession,
  getRecommendedTimeframes,
  getUpcomingNews,
  isNearHighImpactNews,
  getVolatilityExpectation,
  getSessionAnalysis,
  getOptimalTradingWindows,
  formatSessionTime,
  formatSessionSummary,
  
  type VolatilityExpectation,
  type OptimalTradingWindow,
} from './session-analyzer';

// ============================================================
// TEAM PREDICTION GAME
// ============================================================

export {
  // Member management
  createTeamMember,
  getTeamMember,
  updateMemberStats,
  
  // Predictions
  createPrediction,
  castVote,
  endVoting,
  resolvePrediction,
  
  // Queries
  getActivePredictions,
  getVotingPredictions,
  getPredictionHistory,
  getPrediction,
  getMemberHistory,
  
  // Leaderboard
  getLeaderboard,
  getTeamStats,
  
  // Badges
  BADGES,
  
  // Formatting
  formatPredictionSummary,
  formatLeaderboardEntry,
  
  type CreatePredictionOptions,
  type TeamStats,
} from './team-game';

// ============================================================
// BACKTESTING
// ============================================================

export {
  runBacktest,
  runMonteCarlo,
  optimizeStrategy,
  formatBacktestSummary,
  
  type MonteCarloResult,
  type OptimizationResult,
} from './backtest-engine';

// ============================================================
// QUICK START GUIDE
// ============================================================

/**
 * ## Quick Start: Generate a Trading Signal
 * 
 * ```typescript
 * import { generateSignal, getSessionAnalysis } from '@/lib/trading';
 * 
 * // Get session info first
 * const session = getSessionAnalysis();
 * console.log(session.recommendation);
 * 
 * // Generate signal (requires price candles)
 * const result = generateSignal({
 *   symbol: 'EUR/USD',
 *   timeframe: '5m',
 *   candles: yourCandleData, // Array of PriceCandle
 * });
 * 
 * if (result.signal) {
 *   console.log(`${result.signal.direction} signal with ${result.signal.confidence}% confidence`);
 *   console.log(`Confluence: ${result.signal.confluenceCount} indicators agree`);
 * }
 * ```
 * 
 * ## Team Prediction Game
 * 
 * ```typescript
 * import { createPrediction, castVote, getLeaderboard } from '@/lib/trading';
 * 
 * // Create a prediction for the team
 * const prediction = createPrediction({
 *   symbol: 'EUR/USD',
 *   timeframe: '5m',
 *   expiryMinutes: 5,
 *   votingDurationMinutes: 2,
 * });
 * 
 * // Team members cast votes
 * castVote(prediction.id, 'user-123', 'CALL', 4, 'RSI oversold');
 * castVote(prediction.id, 'user-456', 'CALL', 5, 'Support bounce');
 * 
 * // Check leaderboard
 * const leaderboard = getLeaderboard('weekly');
 * ```
 * 
 * ## Backtest a Strategy
 * 
 * ```typescript
 * import { runBacktest, runMonteCarlo, formatBacktestSummary } from '@/lib/trading';
 * 
 * const result = await runBacktest({
 *   symbol: 'EUR/USD',
 *   timeframe: '5m',
 *   startDate: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 days ago
 *   endDate: Date.now(),
 *   initialBalance: 1000,
 *   betSize: 2, // 2% of balance per trade
 *   payoutPercent: 85, // PocketOption typical payout
 *   confluenceConfig: DEFAULT_CONFLUENCE_CONFIG,
 * }, historicalCandles);
 * 
 * console.log(formatBacktestSummary(result));
 * 
 * // Run Monte Carlo simulation
 * const monteCarlo = runMonteCarlo(result);
 * console.log(`Ruin probability: ${monteCarlo.ruinProbability}%`);
 * ```
 */
