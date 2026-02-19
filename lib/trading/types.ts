// Trading System Types

export interface PriceCandle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TradingSignal {
  id: string;
  symbol: string;
  direction: 'CALL' | 'PUT';
  strength: 'weak' | 'moderate' | 'strong' | 'very_strong';
  confidence: number;
  winProbability: number;
  timeframe: string;
  expiryMinutes: number;
  confluenceCount: number;
  reasoning: string[];
  suggestiveAdvice: string;
  bestEntryPrice: number;
  invalidationPrice: number;
  entryDeadline: number;
  riskLevel: 'low' | 'medium' | 'high';
  indicators: { name: string; direction: string }[];
  timestamp: number;
  // Enhanced signal fields for trading guidance
  entryWindow: string;      // e.g., "Enter within next 2-3 candles"
  optimalExpiry: string;    // e.g., "5 minutes"
  positionSize: string;     // e.g., "Risk max 2-5% of account"
  doNotTradeIf: string[];   // List of invalidation conditions
}

export interface IndicatorSnapshot {
  rsi: { value: number; signal: string };
  macd: { histogram: number; crossover: string };
  stochastic: { k: number; d: number; signal: string };
  ema: { trend: string; ema9: number; ema21: number };
  atr: { volatility: string; value: number };
  supportResistance: { 
    pricePosition: string;
    nearestSupport: number;
    nearestResistance: number;
  };
}

export interface SessionAnalysis {
  currentSession: string;
  quality: string;
  volatilityExpected: string;
  recommendedTimeframes: string[];
  recommendation: string;
  upcomingNews: { name: string; impact: string; currency: string }[];
}

export interface PocketOptionMeta {
  asset: string;       // PO asset name (e.g., "EURUSD_otc")
  duration: number;    // Trade duration in seconds
  isOTC: boolean;      // Whether using OTC market
  marketOpen: boolean; // Whether standard forex market is open
  payout?: number;     // Current payout percentage (when available)
}

export interface SignalResponse {
  signal: TradingSignal | null;
  indicators: IndicatorSnapshot;
  session: SessionAnalysis;
  candles: PriceCandle[];
  dataSource?: 'pocket_option' | 'finnhub' | 'twelve_data' | 'mock' | 'provided' | 'unknown';
  pocketOption?: PocketOptionMeta;
}

// Extended types for backtest, indicators, team features
export type TimeFrame = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d';
export type TradeDirection = 'CALL' | 'PUT';
export type MarketSession = 'asian' | 'london' | 'new_york' | 'london_ny_overlap' | 'off_hours';
export type TradingSession = MarketSession;

export interface BacktestConfig {
  symbol: string;
  timeframe: TimeFrame;
  startDate: Date;
  endDate: Date;
  minConfidence: number;
  minIndicators: number;
  initialBalance: number;
  positionSizePercent: number;
}

export interface BacktestTrade {
  entryTime: number;
  exitTime: number;
  direction: TradeDirection;
  entryPrice: number;
  exitPrice: number;
  confidence: number;
  result: 'win' | 'loss' | 'draw';
  pnl: number;
}

export interface BacktestResult {
  config: BacktestConfig;
  trades: BacktestTrade[];
  winRate: number;
  totalPnl: number;
  maxDrawdown: number;
  profitFactor: number;
  sharpeRatio: number;
  totalTrades: number;
}

export interface ConfluenceConfig {
  minIndicators: number;
  minConfidence: number;
  requiredIndicators?: string[];
}

export interface EconomicEvent {
  name: string;
  impact: 'low' | 'medium' | 'high';
  currency: string;
  time: Date;
  actual?: string;
  forecast?: string;
  previous?: string;
}

// Indicator result types
export interface RSIResult {
  value: number;
  signal: 'oversold' | 'overbought' | 'neutral';
  divergence?: 'bullish' | 'bearish' | 'none';
}

export interface MACDResult {
  macd: number;
  signal: number;
  histogram: number;
  crossover: 'bullish' | 'bearish' | 'none';
}

export interface BollingerBandsResult {
  upper: number;
  middle: number;
  lower: number;
  bandwidth: number;
  percentB: number;
}

export interface EMAResult {
  value: number;
  trend: 'bullish' | 'bearish' | 'neutral';
}

export interface StochasticResult {
  k: number;
  d: number;
  signal: 'oversold' | 'overbought' | 'neutral';
}

export interface ATRResult {
  value: number;
  volatility: 'low' | 'medium' | 'high';
}

export interface SupportResistanceResult {
  levels: number[];
  nearestSupport: number;
  nearestResistance: number;
  pricePosition: 'near_support' | 'near_resistance' | 'between';
}

// Team game types
export interface TeamMember {
  id: string;
  name: string;
  avatar?: string;
  stats: TeamMemberStats;
}

export interface TeamMemberStats {
  totalPredictions: number;
  correctPredictions: number;
  winRate: number;
  streak: number;
  points: number;
}

export interface TeamPrediction {
  id: string;
  symbol: string;
  direction: TradeDirection;
  confidence: number;
  expiryTime: number;
  createdAt: number;
  votes: PredictionVote[];
  result?: 'win' | 'loss' | 'pending';
}

export interface PredictionVote {
  memberId: string;
  vote: 'agree' | 'disagree';
  timestamp: number;
}

export interface LeaderboardEntry {
  rank: number;
  member: TeamMember;
  points: number;
  winRate: number;
}

export interface TeamLeaderboard {
  entries: LeaderboardEntry[];
  lastUpdated: number;
}

export interface TeamVoteRequest {
  predictionId: string;
  memberId: string;
  vote: 'agree' | 'disagree';
}

// ============================================
// ENHANCED ACCURACY TYPES
// ============================================

// Multi-Timeframe Analysis
export interface MultiTimeframeSignal {
  timeframe: TimeFrame;
  direction: 'CALL' | 'PUT' | 'NEUTRAL';
  confidence: number;
  trend: 'bullish' | 'bearish' | 'neutral';
}

export interface MultiTimeframeAnalysis {
  signals: MultiTimeframeSignal[];
  overallBias: 'CALL' | 'PUT' | 'NEUTRAL';
  agreement: number; // 0-100% how much timeframes agree
  strongestTimeframe: TimeFrame;
  recommendation: string;
}

// Chart Pattern Recognition
export type ChartPatternType = 
  | 'double_top' 
  | 'double_bottom' 
  | 'head_shoulders' 
  | 'inverse_head_shoulders'
  | 'ascending_triangle'
  | 'descending_triangle'
  | 'bullish_flag'
  | 'bearish_flag'
  | 'bullish_engulfing'
  | 'bearish_engulfing'
  | 'morning_star'
  | 'evening_star'
  | 'hammer'
  | 'shooting_star'
  | 'doji'
  | 'support_bounce'
  | 'resistance_rejection';

export interface ChartPattern {
  type: ChartPatternType;
  direction: 'bullish' | 'bearish' | 'neutral';
  reliability: number; // 0-100
  description: string;
  targetPrice?: number;
  stopLoss?: number;
  timestamp: number;
}

// Symbol Performance Tracking
export interface SymbolPerformance {
  symbol: string;
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  avgProfit: number;
  avgLoss: number;
  profitFactor: number;
  bestSession: MarketSession;
  bestTimeframe: TimeFrame;
  lastTraded: number;
}

// Session Performance Tracking
export interface SessionPerformance {
  session: MarketSession;
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  avgProfitPercent: number;
  recommendation: string;
}

// Streak Tracking
export interface TradingStreak {
  currentStreak: number;
  streakType: 'win' | 'loss' | 'none';
  longestWinStreak: number;
  longestLossStreak: number;
  lastFiveResults: ('win' | 'loss' | 'draw')[];
  hotStreak: boolean; // 3+ wins in a row
  coldStreak: boolean; // 3+ losses in a row
}

// Economic Calendar
export interface EconomicCalendarEvent {
  id: string;
  name: string;
  currency: string;
  impact: 'low' | 'medium' | 'high';
  time: Date;
  actual?: string;
  forecast?: string;
  previous?: string;
  affectedPairs: string[];
  tradingAdvice: string;
}

export interface EconomicCalendarState {
  events: EconomicCalendarEvent[];
  upcomingHighImpact: EconomicCalendarEvent[];
  shouldPauseTrading: boolean;
  pauseReason?: string;
  nextSafeWindow?: Date;
}

// Enhanced Signal Response with all new features
export interface EnhancedSignalResponse extends SignalResponse {
  multiTimeframe?: MultiTimeframeAnalysis;
  patterns?: ChartPattern[];
  symbolStats?: SymbolPerformance;
  sessionStats?: SessionPerformance;
  streak?: TradingStreak;
  economicCalendar?: EconomicCalendarState;
}
