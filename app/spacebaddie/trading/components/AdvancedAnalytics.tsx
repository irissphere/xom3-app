'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';
import type {
  MultiTimeframeAnalysis,
  MultiTimeframeSignal,
  ChartPattern,
  EconomicCalendarState,
  TradingStreak,
  SymbolPerformance,
  SessionPerformance,
  TimeFrame,
  MarketSession,
} from '@/lib/trading/types';
import {
  detectPatterns,
  getEconomicCalendarState,
  calculateStreak,
  getCurrentSession,
} from '@/lib/trading/enhanced-analysis';
import type { PriceCandle } from '@/lib/trading/types';

interface AdvancedAnalyticsProps {
  symbol: string;
  timeframe: string;
  candles: PriceCandle[];
  onMTFUpdate?: (analysis: MultiTimeframeAnalysis) => void;
}

interface SymbolStats {
  symbol: string;
  total_trades: number;
  wins: number;
  losses: number;
  win_rate: number;
  total_profit: number;
  total_loss: number;
}

interface SessionStats {
  session: string;
  total_trades: number;
  wins: number;
  losses: number;
  win_rate: number;
}

interface StreakData {
  current_streak: number;
  streak_type: 'win' | 'loss' | 'none';
  longest_win_streak: number;
  longest_loss_streak: number;
  last_five: string[];
  hot_streak: boolean;
  cold_streak: boolean;
}

export const AdvancedAnalytics: React.FC<AdvancedAnalyticsProps> = ({
  symbol,
  timeframe,
  candles,
  onMTFUpdate,
}) => {
  const [activeTab, setActiveTab] = useState<'mtf' | 'patterns' | 'performance' | 'calendar'>('mtf');
  const [mtfSignals, setMtfSignals] = useState<MultiTimeframeSignal[]>([]);
  const [mtfLoading, setMtfLoading] = useState(false);
  const [symbolStats, setSymbolStats] = useState<SymbolStats[]>([]);
  const [sessionStats, setSessionStats] = useState<SessionStats[]>([]);
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [economicState, setEconomicState] = useState<EconomicCalendarState | null>(null);

  // Detect chart patterns from candles
  const patterns = useMemo(() => {
    if (candles.length < 10) return [];
    return detectPatterns(candles);
  }, [candles]);

  // Get economic calendar state
  useEffect(() => {
    const state = getEconomicCalendarState(symbol);
    setEconomicState(state);
    
    // Refresh every 5 minutes
    const interval = setInterval(() => {
      setEconomicState(getEconomicCalendarState(symbol));
    }, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [symbol]);

  // Fetch MTF signals
  const fetchMTFSignals = async () => {
    setMtfLoading(true);
    const higherTimeframes: TimeFrame[] = ['15m', '30m', '1h'];
    const signals: MultiTimeframeSignal[] = [];
    
    // Add current timeframe
    signals.push({
      timeframe: timeframe as TimeFrame,
      direction: 'NEUTRAL',
      confidence: 50,
      trend: 'neutral',
    });
    
    for (const tf of higherTimeframes) {
      if (tf === timeframe) continue;
      
      try {
        const res = await fetch(`/api/trading/signals?symbol=${encodeURIComponent(symbol)}&timeframe=${tf}`);
        const data = await res.json();
        
        if (data.signal) {
          signals.push({
            timeframe: tf,
            direction: data.signal.direction,
            confidence: data.signal.confidence,
            trend: data.indicators?.ema?.trend || 'neutral',
          });
        } else {
          signals.push({
            timeframe: tf,
            direction: 'NEUTRAL',
            confidence: 50,
            trend: data.indicators?.ema?.trend || 'neutral',
          });
        }
      } catch (e) {
        console.error(`Failed to fetch ${tf} signal:`, e);
      }
    }
    
    setMtfSignals(signals);
    setMtfLoading(false);
    
    // Calculate MTF analysis
    if (onMTFUpdate && signals.length > 0) {
      const callCount = signals.filter(s => s.direction === 'CALL').length;
      const putCount = signals.filter(s => s.direction === 'PUT').length;
      const agreement = Math.round((Math.max(callCount, putCount) / signals.length) * 100);
      
      onMTFUpdate({
        signals,
        overallBias: callCount > putCount ? 'CALL' : putCount > callCount ? 'PUT' : 'NEUTRAL',
        agreement,
        strongestTimeframe: signals.reduce((a, b) => a.confidence > b.confidence ? a : b).timeframe,
        recommendation: agreement >= 75 ? 'Strong alignment across timeframes' : 'Mixed signals - wait for alignment',
      });
    }
  };

  // Fetch performance data from Supabase
  const fetchPerformanceData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch symbol stats
      const { data: symbolData } = await supabase.rpc('get_stats_by_symbol', { p_user_id: user.id });
      if (symbolData) setSymbolStats(symbolData || []);

      // Fetch session stats
      const { data: sessionData } = await supabase.rpc('get_stats_by_session', { p_user_id: user.id });
      if (sessionData) setSessionStats(sessionData || []);

      // Fetch streak
      const { data: streakData } = await supabase.rpc('get_trading_streak', { p_user_id: user.id });
      if (streakData) setStreak(streakData);
    } catch (error) {
      console.error('Failed to fetch performance data:', error);
    }
  };

  useEffect(() => {
    fetchMTFSignals();
    fetchPerformanceData();
  }, [symbol, timeframe]);

  const currentSession = getCurrentSession();

  return (
    <div style={{ background: '#141418', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '24px', padding: '20px' }}>
      {/* Economic Calendar Alert */}
      {economicState?.shouldPauseTrading && (
        <div style={{ 
          background: 'rgba(239, 68, 68, 0.1)', 
          border: '2px solid rgba(239, 68, 68, 0.3)', 
          borderRadius: '16px', 
          padding: '16px', 
          marginBottom: '20px',
          animation: 'pulse 2s infinite'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>⚠️</span>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 900, color: '#ef4444', textTransform: 'uppercase' }}>Trading Paused</div>
              <div style={{ fontSize: '11px', color: '#f87171', marginTop: '4px' }}>{economicState.pauseReason}</div>
              {economicState.nextSafeWindow && (
                <div style={{ fontSize: '10px', color: '#888', marginTop: '4px' }}>
                  Safe to trade after: {economicState.nextSafeWindow.toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Streak Banner */}
      {streak && (streak.hot_streak || streak.cold_streak) && (
        <div style={{ 
          background: streak.hot_streak ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
          border: `1px solid ${streak.hot_streak ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`, 
          borderRadius: '12px', 
          padding: '12px 16px', 
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>{streak.hot_streak ? '🔥' : '❄️'}</span>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 900, color: streak.hot_streak ? '#4ade80' : '#f87171', textTransform: 'uppercase' }}>
                {streak.hot_streak ? 'Hot Streak!' : 'Cold Streak'}
              </div>
              <div style={{ fontSize: '10px', color: '#888' }}>
                {streak.current_streak} {streak.streak_type}s in a row
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            {streak.last_five?.slice(0, 5).map((r, i) => (
              <div key={i} style={{ 
                width: '20px', 
                height: '20px', 
                borderRadius: '4px', 
                background: r === 'win' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px'
              }}>
                {r === 'win' ? '✓' : '✗'}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '4px' }}>
        {[
          { id: 'mtf', label: '📊 Multi-TF', badge: mtfSignals.length },
          { id: 'patterns', label: '🎯 Patterns', badge: patterns.length },
          { id: 'performance', label: '📈 Stats', badge: null },
          { id: 'calendar', label: '📅 News', badge: economicState?.upcomingHighImpact.length || 0 },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              background: activeTab === tab.id ? 'rgba(168, 85, 247, 0.2)' : 'rgba(255, 255, 255, 0.03)',
              border: `1px solid ${activeTab === tab.id ? 'rgba(168, 85, 247, 0.3)' : 'rgba(255, 255, 255, 0.05)'}`,
              borderRadius: '10px',
              padding: '10px 16px',
              color: activeTab === tab.id ? '#c084fc' : '#888',
              fontSize: '11px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.label}
            {tab.badge !== null && tab.badge > 0 && (
              <span style={{ 
                background: 'rgba(168, 85, 247, 0.3)', 
                padding: '2px 6px', 
                borderRadius: '6px', 
                fontSize: '9px',
                fontWeight: 900
              }}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ minHeight: '200px' }}>
        {/* Multi-Timeframe Tab */}
        {activeTab === 'mtf' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h4 style={{ fontSize: '11px', fontWeight: 900, color: '#888', textTransform: 'uppercase', margin: 0 }}>
                Timeframe Alignment
              </h4>
              <button
                onClick={fetchMTFSignals}
                disabled={mtfLoading}
                style={{
                  background: 'rgba(168, 85, 247, 0.1)',
                  border: '1px solid rgba(168, 85, 247, 0.2)',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontSize: '9px',
                  fontWeight: 800,
                  color: '#a855f7',
                  cursor: 'pointer',
                  opacity: mtfLoading ? 0.5 : 1,
                }}
              >
                {mtfLoading ? 'Scanning...' : 'Refresh'}
              </button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
              {mtfSignals.map(sig => (
                <div key={sig.timeframe} style={{ 
                  background: 'rgba(255, 255, 255, 0.02)', 
                  borderRadius: '12px', 
                  padding: '14px',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '10px', color: '#666', fontWeight: 800, marginBottom: '8px' }}>{sig.timeframe}</div>
                  <div style={{ 
                    fontSize: '16px', 
                    fontWeight: 900, 
                    color: sig.direction === 'CALL' ? '#4ade80' : sig.direction === 'PUT' ? '#f87171' : '#888',
                    marginBottom: '6px'
                  }}>
                    {sig.direction === 'CALL' ? '↑' : sig.direction === 'PUT' ? '↓' : '−'}
                  </div>
                  <div style={{ fontSize: '9px', color: '#888' }}>{sig.confidence}%</div>
                  <div style={{ 
                    marginTop: '8px',
                    fontSize: '8px',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    background: sig.trend === 'bullish' ? 'rgba(34, 197, 94, 0.1)' : sig.trend === 'bearish' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                    color: sig.trend === 'bullish' ? '#4ade80' : sig.trend === 'bearish' ? '#f87171' : '#888',
                    fontWeight: 700,
                    textTransform: 'uppercase'
                  }}>
                    {sig.trend}
                  </div>
                </div>
              ))}
            </div>
            
            {mtfSignals.length > 0 && (
              <div style={{ 
                marginTop: '16px', 
                padding: '12px', 
                background: 'rgba(168, 85, 247, 0.05)', 
                borderRadius: '10px',
                border: '1px solid rgba(168, 85, 247, 0.1)'
              }}>
                {(() => {
                  const calls = mtfSignals.filter(s => s.direction === 'CALL').length;
                  const puts = mtfSignals.filter(s => s.direction === 'PUT').length;
                  const agreement = Math.round((Math.max(calls, puts) / mtfSignals.length) * 100);
                  const bias = calls > puts ? 'CALL' : puts > calls ? 'PUT' : 'NEUTRAL';
                  
                  return (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '10px', color: '#888', fontWeight: 700, marginBottom: '4px' }}>Overall Bias</div>
                        <div style={{ 
                          fontSize: '16px', 
                          fontWeight: 900, 
                          color: bias === 'CALL' ? '#4ade80' : bias === 'PUT' ? '#f87171' : '#888' 
                        }}>
                          {bias}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '10px', color: '#888', fontWeight: 700, marginBottom: '4px' }}>Agreement</div>
                        <div style={{ 
                          fontSize: '16px', 
                          fontWeight: 900, 
                          color: agreement >= 75 ? '#4ade80' : agreement >= 50 ? '#f59e0b' : '#f87171' 
                        }}>
                          {agreement}%
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* Patterns Tab */}
        {activeTab === 'patterns' && (
          <div>
            <h4 style={{ fontSize: '11px', fontWeight: 900, color: '#888', textTransform: 'uppercase', marginBottom: '16px' }}>
              Detected Chart Patterns
            </h4>
            
            {patterns.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#444' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔍</div>
                <div style={{ fontSize: '11px', fontWeight: 700 }}>No patterns detected</div>
                <div style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>Check back when price action develops</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {patterns.slice(0, 5).map((pattern, i) => (
                  <div key={i} style={{ 
                    background: 'rgba(255, 255, 255, 0.02)', 
                    borderRadius: '12px', 
                    padding: '14px',
                    border: `1px solid ${pattern.direction === 'bullish' ? 'rgba(34, 197, 94, 0.2)' : pattern.direction === 'bearish' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.05)'}`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ 
                          fontSize: '12px', 
                          fontWeight: 900, 
                          color: '#fff',
                          marginBottom: '4px',
                          textTransform: 'capitalize'
                        }}>
                          {pattern.type.replace(/_/g, ' ')}
                        </div>
                        <div style={{ fontSize: '10px', color: '#888', lineHeight: '1.4' }}>
                          {pattern.description}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ 
                          fontSize: '10px', 
                          fontWeight: 900, 
                          color: pattern.direction === 'bullish' ? '#4ade80' : pattern.direction === 'bearish' ? '#f87171' : '#888',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          background: pattern.direction === 'bullish' ? 'rgba(34, 197, 94, 0.1)' : pattern.direction === 'bearish' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                          textTransform: 'uppercase',
                          marginBottom: '6px'
                        }}>
                          {pattern.direction}
                        </div>
                        <div style={{ fontSize: '9px', color: '#666' }}>
                          Reliability: <span style={{ color: pattern.reliability >= 70 ? '#4ade80' : '#f59e0b', fontWeight: 800 }}>{pattern.reliability}%</span>
                        </div>
                      </div>
                    </div>
                    {(pattern.targetPrice || pattern.stopLoss) && (
                      <div style={{ display: 'flex', gap: '16px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        {pattern.targetPrice && (
                          <div style={{ fontSize: '9px' }}>
                            <span style={{ color: '#666' }}>Target:</span>{' '}
                            <span style={{ color: '#4ade80', fontWeight: 800 }}>{pattern.targetPrice.toFixed(5)}</span>
                          </div>
                        )}
                        {pattern.stopLoss && (
                          <div style={{ fontSize: '9px' }}>
                            <span style={{ color: '#666' }}>Stop:</span>{' '}
                            <span style={{ color: '#f87171', fontWeight: 800 }}>{pattern.stopLoss.toFixed(5)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Performance Tab */}
        {activeTab === 'performance' && (
          <div>
            {/* Streak Info */}
            {streak && (
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '11px', fontWeight: 900, color: '#888', textTransform: 'uppercase', marginBottom: '12px' }}>
                  Streak & Momentum
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                  <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '12px', borderRadius: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '8px', color: '#666', fontWeight: 800, marginBottom: '4px' }}>Current</div>
                    <div style={{ fontSize: '18px', fontWeight: 900, color: streak.streak_type === 'win' ? '#4ade80' : streak.streak_type === 'loss' ? '#f87171' : '#888' }}>
                      {streak.current_streak}
                    </div>
                    <div style={{ fontSize: '8px', color: '#666', textTransform: 'uppercase' }}>{streak.streak_type}s</div>
                  </div>
                  <div style={{ background: 'rgba(34, 197, 94, 0.05)', padding: '12px', borderRadius: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '8px', color: '#4ade80', fontWeight: 800, marginBottom: '4px' }}>Best Win</div>
                    <div style={{ fontSize: '18px', fontWeight: 900, color: '#4ade80' }}>{streak.longest_win_streak}</div>
                    <div style={{ fontSize: '8px', color: '#666' }}>streak</div>
                  </div>
                  <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '12px', borderRadius: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '8px', color: '#f87171', fontWeight: 800, marginBottom: '4px' }}>Worst Loss</div>
                    <div style={{ fontSize: '18px', fontWeight: 900, color: '#f87171' }}>{streak.longest_loss_streak}</div>
                    <div style={{ fontSize: '8px', color: '#666' }}>streak</div>
                  </div>
                  <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '12px', borderRadius: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '8px', color: '#666', fontWeight: 800, marginBottom: '4px' }}>Last 5</div>
                    <div style={{ display: 'flex', gap: '2px', justifyContent: 'center' }}>
                      {streak.last_five?.slice(0, 5).map((r, i) => (
                        <div key={i} style={{ 
                          width: '14px', 
                          height: '14px', 
                          borderRadius: '3px', 
                          background: r === 'win' ? '#4ade80' : '#f87171',
                          opacity: 0.8
                        }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Symbol Performance */}
            <h4 style={{ fontSize: '11px', fontWeight: 900, color: '#888', textTransform: 'uppercase', marginBottom: '12px' }}>
              Performance by Symbol
            </h4>
            {symbolStats.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#444', fontSize: '11px' }}>No trade data yet</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                {symbolStats.slice(0, 5).map(stat => (
                  <div key={stat.symbol} style={{ 
                    background: 'rgba(255, 255, 255, 0.02)', 
                    borderRadius: '10px', 
                    padding: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 900, color: '#fff' }}>{stat.symbol}</div>
                      <div style={{ fontSize: '9px', color: '#666' }}>{stat.total_trades} trades</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '8px', color: '#666', marginBottom: '2px' }}>W/L</div>
                        <div style={{ fontSize: '11px', fontWeight: 800 }}>
                          <span style={{ color: '#4ade80' }}>{stat.wins}</span>
                          <span style={{ color: '#666' }}>/</span>
                          <span style={{ color: '#f87171' }}>{stat.losses}</span>
                        </div>
                      </div>
                      <div style={{ 
                        padding: '6px 12px', 
                        borderRadius: '8px', 
                        background: stat.win_rate >= 55 ? 'rgba(34, 197, 94, 0.1)' : stat.win_rate >= 45 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      }}>
                        <div style={{ 
                          fontSize: '14px', 
                          fontWeight: 900, 
                          color: stat.win_rate >= 55 ? '#4ade80' : stat.win_rate >= 45 ? '#f59e0b' : '#f87171' 
                        }}>
                          {stat.win_rate.toFixed(0)}%
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Session Performance */}
            <h4 style={{ fontSize: '11px', fontWeight: 900, color: '#888', textTransform: 'uppercase', marginBottom: '12px' }}>
              Performance by Session
            </h4>
            {sessionStats.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#444', fontSize: '11px' }}>No session data yet</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                {sessionStats.filter(s => s.total_trades > 0).map(stat => (
                  <div key={stat.session} style={{ 
                    background: stat.session === currentSession ? 'rgba(168, 85, 247, 0.1)' : 'rgba(255, 255, 255, 0.02)', 
                    borderRadius: '10px', 
                    padding: '12px',
                    border: stat.session === currentSession ? '1px solid rgba(168, 85, 247, 0.2)' : '1px solid transparent'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: '10px', fontWeight: 900, color: stat.session === currentSession ? '#c084fc' : '#fff', textTransform: 'capitalize' }}>
                          {stat.session.replace(/_/g, ' ')}
                          {stat.session === currentSession && <span style={{ marginLeft: '6px' }}>●</span>}
                        </div>
                        <div style={{ fontSize: '9px', color: '#666', marginTop: '2px' }}>{stat.total_trades} trades</div>
                      </div>
                      <div style={{ 
                        fontSize: '14px', 
                        fontWeight: 900, 
                        color: stat.win_rate >= 55 ? '#4ade80' : stat.win_rate >= 45 ? '#f59e0b' : '#f87171' 
                      }}>
                        {stat.win_rate.toFixed(0)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Economic Calendar Tab */}
        {activeTab === 'calendar' && (
          <div>
            <h4 style={{ fontSize: '11px', fontWeight: 900, color: '#888', textTransform: 'uppercase', marginBottom: '16px' }}>
              Upcoming Economic Events
            </h4>
            
            {!economicState || economicState.events.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#444' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>📅</div>
                <div style={{ fontSize: '11px', fontWeight: 700 }}>No major events today</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {economicState.events.slice(0, 6).map(event => {
                  const eventTime = new Date(event.time);
                  const now = new Date();
                  const timeDiff = eventTime.getTime() - now.getTime();
                  const hoursAway = Math.round(timeDiff / (60 * 60 * 1000));
                  const minutesAway = Math.round(timeDiff / (60 * 1000));
                  const isPast = timeDiff < 0;
                  const isSoon = timeDiff > 0 && timeDiff < 60 * 60 * 1000;
                  
                  return (
                    <div key={event.id} style={{ 
                      background: 'rgba(255, 255, 255, 0.02)', 
                      borderRadius: '12px', 
                      padding: '14px',
                      border: `1px solid ${event.impact === 'high' ? 'rgba(239, 68, 68, 0.2)' : event.impact === 'medium' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.05)'}`,
                      opacity: isPast ? 0.5 : 1
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ 
                              fontSize: '9px', 
                              fontWeight: 900, 
                              padding: '2px 6px', 
                              borderRadius: '4px',
                              background: event.impact === 'high' ? 'rgba(239, 68, 68, 0.2)' : event.impact === 'medium' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                              color: event.impact === 'high' ? '#f87171' : event.impact === 'medium' ? '#f59e0b' : '#888',
                              textTransform: 'uppercase'
                            }}>
                              {event.impact}
                            </span>
                            <span style={{ fontSize: '10px', fontWeight: 800, color: '#60a5fa' }}>{event.currency}</span>
                          </div>
                          <div style={{ fontSize: '12px', fontWeight: 800, color: '#fff' }}>{event.name}</div>
                          <div style={{ fontSize: '9px', color: '#888', marginTop: '4px' }}>{event.tradingAdvice}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '11px', fontWeight: 800, color: isSoon ? '#f87171' : '#888' }}>
                            {eventTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div style={{ fontSize: '9px', color: isSoon ? '#f87171' : '#666' }}>
                            {isPast ? 'Past' : minutesAway < 60 ? `${minutesAway}m` : `${hoursAway}h`}
                          </div>
                        </div>
                      </div>
                      {event.forecast && (
                        <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '9px' }}>
                          <span><span style={{ color: '#666' }}>Forecast:</span> <span style={{ color: '#fff' }}>{event.forecast}</span></span>
                          {event.previous && <span><span style={{ color: '#666' }}>Previous:</span> <span style={{ color: '#888' }}>{event.previous}</span></span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
};
