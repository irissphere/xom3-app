'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

// ============================================================
// TYPES
// ============================================================

interface TradingSignal {
  id: string;
  symbol: string;
  direction: 'CALL' | 'PUT';
  strength: 'weak' | 'moderate' | 'strong' | 'very_strong';
  confidence: number;
  timeframe: string;
  expiryMinutes: number;
  confluenceCount: number;
  reasoning: string[];
  generatedAt: number;
  validUntil: number;
  session: string;
  sessionQuality: 'optimal' | 'good' | 'poor';
  riskLevel: 'low' | 'medium' | 'high';
  avoidReasons?: string[];
  indicators: { name: string; direction: string; weight: number }[];
}

interface IndicatorSnapshot {
  rsi: { value: number; signal: string; divergence?: string };
  macd: { macd: number; signal: number; histogram: number; crossover: string };
  bollinger: { upper: number; middle: number; lower: number; width: number; position: string };
  ema: { fast: number; slow: number; trend: string; crossover: string };
  stochastic: { k: number; d: number; signal: string; crossover: string };
  atr: { value: number; volatility: string; percentOfPrice: number };
  supportResistance: { supports: number[]; resistances: number[]; pricePosition: string };
}

interface SessionAnalysis {
  currentSession: string;
  isOverlap: boolean;
  quality: 'optimal' | 'good' | 'poor';
  volatilityExpected: 'low' | 'medium' | 'high';
  recommendedTimeframes: string[];
  hoursUntilNextOptimal: number;
  recommendation: string;
  upcomingNews: { name: string; impact: string; currency: string }[];
}

interface TeamPrediction {
  id: string;
  symbol: string;
  direction: 'CALL' | 'PUT';
  timeframe: string;
  status: 'voting' | 'active' | 'resolved';
  votes: { odelsUserId: string; direction: 'CALL' | 'PUT'; confidence: number }[];
  consensusDirection: 'CALL' | 'PUT' | null;
  consensusConfidence: number;
  result?: 'win' | 'loss' | 'draw';
}

interface LeaderboardEntry {
  rank: number;
  userName: string;
  points: number;
  winRate: number;
  streak: number;
}

interface TeamStats {
  totalMembers: number;
  totalPredictions: number;
  overallWinRate: number;
  activePredictions: number;
  todaysWinRate: number;
}

// ============================================================
// STYLES
// ============================================================

const styles = {
  container: {
    minHeight: '100vh',
    background: '#0d0d0f',
    color: '#f7f8ff',
    padding: '1.5rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
    borderBottom: '1px solid #1a1a1f',
    paddingBottom: '1rem',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '1.5rem',
  },
  panel: {
    background: '#141418',
    borderRadius: '12px',
    padding: '1.25rem',
    border: '1px solid #1f1f24',
  },
  panelTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    marginBottom: '1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  badge: (color: string) => ({
    display: 'inline-flex',
    alignItems: 'center',
    padding: '0.25rem 0.75rem',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: 600,
    background: `${color}22`,
    color,
  }),
  button: (primary = false) => ({
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 500,
    background: primary ? '#22c55e' : '#2a2a30',
    color: primary ? '#000' : '#f7f8ff',
    fontSize: '0.875rem',
  }),
  indicator: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.5rem 0',
    borderBottom: '1px solid #1f1f24',
  },
  signal: (direction: 'CALL' | 'PUT') => ({
    padding: '1rem',
    background: direction === 'CALL' ? '#22c55e11' : '#ef444411',
    border: `1px solid ${direction === 'CALL' ? '#22c55e44' : '#ef444444'}`,
    borderRadius: '8px',
    marginBottom: '1rem',
  }),
  muted: {
    color: '#8b92a7',
    fontSize: '0.875rem',
  },
};

// ============================================================
// COMPONENTS
// ============================================================

function SessionPanel({ session }: { session: SessionAnalysis | null }) {
  if (!session) return <div style={styles.panel}>Loading session...</div>;

  const qualityColor = {
    optimal: '#22c55e',
    good: '#f59e0b',
    poor: '#ef4444',
  }[session.quality];

  return (
    <div style={styles.panel}>
      <div style={styles.panelTitle}>
        ⏰ Market Session
        <span style={styles.badge(qualityColor)}>{session.quality.toUpperCase()}</span>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>
          {session.currentSession.replace('_', ' ').toUpperCase()}
        </div>
        {session.isOverlap && (
          <span style={styles.badge('#9B7EDE')}>OVERLAP</span>
        )}
      </div>

      <div style={styles.indicator}>
        <span style={styles.muted}>Volatility Expected</span>
        <span style={styles.badge(
          session.volatilityExpected === 'high' ? '#ef4444' :
          session.volatilityExpected === 'medium' ? '#f59e0b' : '#22c55e'
        )}>{session.volatilityExpected.toUpperCase()}</span>
      </div>

      <div style={styles.indicator}>
        <span style={styles.muted}>Recommended Timeframes</span>
        <span>{session.recommendedTimeframes.join(', ')}</span>
      </div>

      {session.hoursUntilNextOptimal > 0 && (
        <div style={styles.indicator}>
          <span style={styles.muted}>Next Optimal Session</span>
          <span>{session.hoursUntilNextOptimal.toFixed(1)}h</span>
        </div>
      )}

      <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#1a1a1f', borderRadius: '8px' }}>
        <div style={{ fontSize: '0.75rem', color: '#8b92a7', marginBottom: '0.25rem' }}>RECOMMENDATION</div>
        <div style={{ fontSize: '0.875rem' }}>{session.recommendation}</div>
      </div>

      {session.upcomingNews.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#8b92a7', marginBottom: '0.5rem' }}>UPCOMING NEWS</div>
          {session.upcomingNews.map((event, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '0.875rem' }}>
                {event.impact === 'high' ? '🔴' : event.impact === 'medium' ? '🟡' : '🟢'}
              </span>
              <span style={{ fontSize: '0.875rem' }}>{event.name} ({event.currency})</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SignalPanel({ signal, indicators }: { signal: TradingSignal | null; indicators: IndicatorSnapshot | null }) {
  if (!signal) {
    return (
      <div style={styles.panel}>
        <div style={styles.panelTitle}>📊 Current Signal</div>
        <div style={{ textAlign: 'center', padding: '2rem', color: '#8b92a7' }}>
          No signal generated. Waiting for confluence...
        </div>
        {indicators && (
          <div style={{ marginTop: '1rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#8b92a7', marginBottom: '0.5rem' }}>INDICATORS</div>
            <div style={styles.indicator}>
              <span>RSI</span>
              <span style={styles.badge(
                indicators.rsi.signal === 'oversold' ? '#22c55e' :
                indicators.rsi.signal === 'overbought' ? '#ef4444' : '#8b92a7'
              )}>{indicators.rsi.value.toFixed(1)}</span>
            </div>
            <div style={styles.indicator}>
              <span>MACD</span>
              <span style={styles.badge(
                indicators.macd.crossover === 'bullish' ? '#22c55e' :
                indicators.macd.crossover === 'bearish' ? '#ef4444' : '#8b92a7'
              )}>{indicators.macd.crossover}</span>
            </div>
            <div style={styles.indicator}>
              <span>Stochastic</span>
              <span>{indicators.stochastic.k.toFixed(1)} / {indicators.stochastic.d.toFixed(1)}</span>
            </div>
            <div style={styles.indicator}>
              <span>Bollinger Position</span>
              <span>{indicators.bollinger.position}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  const directionColor = signal.direction === 'CALL' ? '#22c55e' : '#ef4444';
  const directionEmoji = signal.direction === 'CALL' ? '📈' : '📉';

  return (
    <div style={styles.panel}>
      <div style={styles.panelTitle}>
        📊 Current Signal
        <span style={styles.badge(directionColor)}>{signal.direction}</span>
      </div>

      <div style={styles.signal(signal.direction)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>{directionEmoji} {signal.direction}</span>
          <span style={{ fontSize: '1.25rem', fontWeight: 600, color: directionColor }}>{signal.confidence}%</span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={styles.badge('#6366f1')}>{signal.symbol}</span>
          <span style={styles.badge('#8b92a7')}>{signal.timeframe}</span>
          <span style={styles.badge('#f59e0b')}>{signal.confluenceCount} indicators</span>
          <span style={styles.badge(
            signal.strength === 'very_strong' ? '#22c55e' :
            signal.strength === 'strong' ? '#4ade80' :
            signal.strength === 'moderate' ? '#f59e0b' : '#8b92a7'
          )}>{signal.strength.replace('_', ' ')}</span>
        </div>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <div style={{ fontSize: '0.75rem', color: '#8b92a7', marginBottom: '0.5rem' }}>CONFIRMING INDICATORS</div>
        {signal.indicators.map((ind, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{ color: ind.direction === 'CALL' ? '#22c55e' : '#ef4444' }}>
              {ind.direction === 'CALL' ? '↑' : '↓'}
            </span>
            <span style={{ fontSize: '0.875rem' }}>{ind.name}</span>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <div style={{ fontSize: '0.75rem', color: '#8b92a7', marginBottom: '0.5rem' }}>REASONS</div>
        {signal.reasoning.slice(0, 4).map((reason, i) => (
          <div key={i} style={{ fontSize: '0.75rem', color: '#a0a0a8', marginBottom: '0.25rem' }}>
            • {reason}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <span style={styles.badge(
          signal.riskLevel === 'high' ? '#ef4444' :
          signal.riskLevel === 'medium' ? '#f59e0b' : '#22c55e'
        )}>Risk: {signal.riskLevel}</span>
        <span style={styles.badge('#8b92a7')}>Expiry: {signal.expiryMinutes}m</span>
      </div>
    </div>
  );
}

function TeamPanel({ 
  stats, 
  predictions, 
  leaderboard,
  onVote,
}: { 
  stats: TeamStats | null;
  predictions: TeamPrediction[];
  leaderboard: LeaderboardEntry[];
  onVote: (predictionId: string, direction: 'CALL' | 'PUT') => void;
}) {
  const [activeTab, setActiveTab] = useState<'predictions' | 'leaderboard'>('predictions');

  return (
    <div style={styles.panel}>
      <div style={styles.panelTitle}>
        👥 Team Predictions
        {stats && (
          <span style={styles.badge('#6366f1')}>{stats.totalMembers} members</span>
        )}
      </div>

      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ textAlign: 'center', padding: '0.75rem', background: '#1a1a1f', borderRadius: '8px' }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{stats.overallWinRate}%</div>
            <div style={{ fontSize: '0.75rem', color: '#8b92a7' }}>Win Rate</div>
          </div>
          <div style={{ textAlign: 'center', padding: '0.75rem', background: '#1a1a1f', borderRadius: '8px' }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{stats.totalPredictions}</div>
            <div style={{ fontSize: '0.75rem', color: '#8b92a7' }}>Total Predictions</div>
          </div>
          <div style={{ textAlign: 'center', padding: '0.75rem', background: '#1a1a1f', borderRadius: '8px' }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{stats.activePredictions}</div>
            <div style={{ fontSize: '0.75rem', color: '#8b92a7' }}>Active</div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button 
          onClick={() => setActiveTab('predictions')}
          style={{
            ...styles.button(activeTab === 'predictions'),
            flex: 1,
          }}
        >
          Predictions
        </button>
        <button 
          onClick={() => setActiveTab('leaderboard')}
          style={{
            ...styles.button(activeTab === 'leaderboard'),
            flex: 1,
          }}
        >
          Leaderboard
        </button>
      </div>

      {activeTab === 'predictions' && (
        <div>
          {predictions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: '#8b92a7' }}>
              No active predictions. Create one!
            </div>
          ) : (
            predictions.map((pred) => (
              <div key={pred.id} style={{ 
                padding: '0.75rem', 
                background: '#1a1a1f', 
                borderRadius: '8px',
                marginBottom: '0.75rem',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 600 }}>{pred.symbol}</span>
                  <span style={styles.badge(
                    pred.status === 'voting' ? '#f59e0b' :
                    pred.status === 'active' ? '#22c55e' : '#8b92a7'
                  )}>{pred.status}</span>
                </div>
                
                {pred.consensusDirection && (
                  <div style={{ marginBottom: '0.5rem' }}>
                    <span style={styles.badge(
                      pred.consensusDirection === 'CALL' ? '#22c55e' : '#ef4444'
                    )}>
                      {pred.consensusDirection} ({pred.consensusConfidence}%)
                    </span>
                    <span style={{ ...styles.muted, marginLeft: '0.5rem' }}>
                      {pred.votes.length} votes
                    </span>
                  </div>
                )}

                {pred.status === 'voting' && (
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button 
                      onClick={() => onVote(pred.id, 'CALL')}
                      style={{ ...styles.button(), background: '#22c55e22', color: '#22c55e', flex: 1 }}
                    >
                      📈 CALL
                    </button>
                    <button 
                      onClick={() => onVote(pred.id, 'PUT')}
                      style={{ ...styles.button(), background: '#ef444422', color: '#ef4444', flex: 1 }}
                    >
                      📉 PUT
                    </button>
                  </div>
                )}

                {pred.result && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <span style={styles.badge(
                      pred.result === 'win' ? '#22c55e' :
                      pred.result === 'loss' ? '#ef4444' : '#8b92a7'
                    )}>
                      {pred.result === 'win' ? '✅ WIN' : pred.result === 'loss' ? '❌ LOSS' : '➖ DRAW'}
                    </span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'leaderboard' && (
        <div>
          {leaderboard.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: '#8b92a7' }}>
              No entries yet. Start predicting!
            </div>
          ) : (
            leaderboard.slice(0, 10).map((entry) => (
              <div key={entry.rank} style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '0.75rem',
                background: entry.rank <= 3 ? '#1a1a1f' : 'transparent',
                borderRadius: '8px',
                marginBottom: '0.25rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.25rem' }}>
                    {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
                  </span>
                  <span>{entry.userName}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={styles.muted}>{entry.winRate}%</span>
                  <span style={{ fontWeight: 600 }}>{entry.points} pts</span>
                  {entry.streak > 0 && (
                    <span style={styles.badge('#f59e0b')}>🔥 {entry.streak}</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================

export default function WealthEnginePage() {
  const [selectedSymbol, setSelectedSymbol] = useState('EUR/USD');
  const [selectedTimeframe, setSelectedTimeframe] = useState('5m');
  const [signal, setSignal] = useState<TradingSignal | null>(null);
  const [indicators, setIndicators] = useState<IndicatorSnapshot | null>(null);
  const [session, setSession] = useState<SessionAnalysis | null>(null);
  const [predictions, setPredictions] = useState<TeamPrediction[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [teamStats, setTeamStats] = useState<TeamStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const symbols = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD', 'BTC/USD', 'ETH/USD'];
  const timeframes = ['1m', '5m', '15m', '30m', '1h'];

  const fetchSignal = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/trading/signals?symbol=${encodeURIComponent(selectedSymbol)}&timeframe=${selectedTimeframe}`);
      const data = await res.json();
      setSignal(data.signal);
      setIndicators(data.indicators);
      setSession(data.session);
    } catch (error) {
      console.error('Failed to fetch signal:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedSymbol, selectedTimeframe]);

  const fetchTeamData = useCallback(async () => {
    try {
      const [activeRes, lbRes, statsRes] = await Promise.all([
        fetch('/api/trading/team?action=active'),
        fetch('/api/trading/team?action=leaderboard&period=weekly'),
        fetch('/api/trading/team?action=stats'),
      ]);
      
      const [activeData, lbData, statsData] = await Promise.all([
        activeRes.json(),
        lbRes.json(),
        statsRes.json(),
      ]);

      setPredictions(activeData.predictions || []);
      setLeaderboard(lbData.leaderboard?.entries || []);
      setTeamStats(statsData.stats);
    } catch (error) {
      console.error('Failed to fetch team data:', error);
    }
  }, []);

  const handleVote = async (predictionId: string, direction: 'CALL' | 'PUT') => {
    try {
      await fetch('/api/trading/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'vote',
          predictionId,
          userId: `user-${Math.random().toString(36).slice(2, 8)}`,
          userName: 'Demo User',
          direction,
          confidence: 4,
        }),
      });
      fetchTeamData();
    } catch (error) {
      console.error('Failed to vote:', error);
    }
  };

  const createPrediction = async () => {
    try {
      await fetch('/api/trading/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_prediction',
          symbol: selectedSymbol,
          timeframe: selectedTimeframe,
          expiryMinutes: selectedTimeframe === '1m' ? 1 : 5,
          votingDurationMinutes: 2,
        }),
      });
      fetchTeamData();
    } catch (error) {
      console.error('Failed to create prediction:', error);
    }
  };

  useEffect(() => {
    fetchSignal();
    fetchTeamData();
  }, [fetchSignal, fetchTeamData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchSignal();
      fetchTeamData();
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchSignal, fetchTeamData]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.title}>
          💰 Wealth Engine
          <span style={styles.badge('#6366f1')}>TRADING SIGNALS</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <select
            value={selectedSymbol}
            onChange={(e) => setSelectedSymbol(e.target.value)}
            title="Select trading symbol"
            aria-label="Select trading symbol"
            style={{ 
              padding: '0.5rem 1rem', 
              borderRadius: '8px', 
              background: '#2a2a30', 
              color: '#f7f8ff',
              border: '1px solid #3a3a40',
            }}
          >
            {symbols.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            title="Select timeframe"
            aria-label="Select timeframe"
            style={{ 
              padding: '0.5rem 1rem', 
              borderRadius: '8px', 
              background: '#2a2a30', 
              color: '#f7f8ff',
              border: '1px solid #3a3a40',
            }}
          >
            {timeframes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <button onClick={fetchSignal} style={styles.button(true)} disabled={loading}>
            {loading ? 'Loading...' : '🔄 Refresh'}
          </button>
          <button 
            onClick={() => setAutoRefresh(!autoRefresh)} 
            style={styles.badge(autoRefresh ? '#22c55e' : '#8b92a7')}
          >
            {autoRefresh ? '🟢 Auto' : '⏸ Paused'}
          </button>
          <Link href="/" style={{ color: '#8b92a7', textDecoration: 'none', fontSize: '0.875rem' }}>
            ← Back
          </Link>
        </div>
      </div>

      <div style={styles.grid}>
        <SessionPanel session={session} />
        <SignalPanel signal={signal} indicators={indicators} />
        <div style={styles.panel}>
          <div style={styles.panelTitle}>🎯 Quick Actions</div>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <button 
              onClick={createPrediction} 
              style={{ ...styles.button(true), width: '100%', padding: '0.75rem' }}
            >
              + Create Team Prediction
            </button>
            <button 
              onClick={fetchSignal} 
              style={{ ...styles.button(), width: '100%', padding: '0.75rem' }}
            >
              🔄 Generate New Signal
            </button>
          </div>

          {indicators && (
            <div style={{ marginTop: '1.5rem' }}>
              <div style={{ fontSize: '0.75rem', color: '#8b92a7', marginBottom: '0.75rem' }}>INDICATOR STATUS</div>
              <div style={styles.indicator}>
                <span>RSI ({indicators.rsi.value.toFixed(1)})</span>
                <span style={styles.badge(
                  indicators.rsi.signal === 'oversold' ? '#22c55e' :
                  indicators.rsi.signal === 'overbought' ? '#ef4444' : '#8b92a7'
                )}>{indicators.rsi.signal}</span>
              </div>
              <div style={styles.indicator}>
                <span>MACD</span>
                <span style={styles.badge(
                  indicators.macd.histogram > 0 ? '#22c55e' : '#ef4444'
                )}>{indicators.macd.crossover}</span>
              </div>
              <div style={styles.indicator}>
                <span>Stochastic</span>
                <span style={styles.badge(
                  indicators.stochastic.signal === 'oversold' ? '#22c55e' :
                  indicators.stochastic.signal === 'overbought' ? '#ef4444' : '#8b92a7'
                )}>{indicators.stochastic.signal}</span>
              </div>
              <div style={styles.indicator}>
                <span>EMA Trend</span>
                <span style={styles.badge(
                  indicators.ema.trend === 'bullish' ? '#22c55e' :
                  indicators.ema.trend === 'bearish' ? '#ef4444' : '#8b92a7'
                )}>{indicators.ema.trend}</span>
              </div>
              <div style={styles.indicator}>
                <span>Volatility (ATR)</span>
                <span style={styles.badge(
                  indicators.atr.volatility === 'high' ? '#ef4444' :
                  indicators.atr.volatility === 'medium' ? '#f59e0b' : '#22c55e'
                )}>{indicators.atr.volatility}</span>
              </div>
              <div style={styles.indicator}>
                <span>S/R Position</span>
                <span>{indicators.supportResistance.pricePosition}</span>
              </div>
            </div>
          )}
        </div>
        <TeamPanel 
          stats={teamStats}
          predictions={predictions}
          leaderboard={leaderboard}
          onVote={handleVote}
        />
      </div>

      <div style={{ marginTop: '2rem', padding: '1rem', background: '#141418', borderRadius: '12px', border: '1px solid #1f1f24' }}>
        <div style={{ fontSize: '0.75rem', color: '#8b92a7', marginBottom: '0.5rem' }}>DISCLAIMER</div>
        <div style={{ fontSize: '0.75rem', color: '#666' }}>
          This is a trading analysis tool for educational purposes only. Binary options trading carries significant risk. 
          Past performance does not guarantee future results. Always practice responsible risk management.
        </div>
      </div>
    </div>
  );
}
