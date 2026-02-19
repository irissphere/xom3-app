'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import DashboardShell from '../components/DashboardShell';
import { TradingChart } from './components/TradingChart';
import { EducationPanel } from './components/EducationPanel';
import { TradeTracker } from './components/TradeTracker';
import { AdvancedAnalytics } from './components/AdvancedAnalytics';
import { PocketOptionSetup } from './components/PocketOptionSetup';
import type { TradingSignal, IndicatorSnapshot, SessionAnalysis, PriceCandle, MultiTimeframeAnalysis, PocketOptionMeta } from '@/lib/trading/types';

const TRADING_ALLOWED_EMAILS = ['preston.chenault@xom3.io'];

// Pocket Option connection state type
interface POConnectionState {
  connected: boolean;
  demo_mode: boolean;
  balance: number;
  currency: string;
  daily_trades: number;
  daily_pnl: number;
  trading_enabled: boolean;
  error: string | null;
}

// Trade execution state
interface TradeExecution {
  loading: boolean;
  lastResult: { success: boolean; order_id?: string; message: string } | null;
  pendingOrderId: string | null;
}

// Format time ago
function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

// Format countdown timer
function formatCountdown(deadline: number, now: number): { text: string; expired: boolean; urgency: 'safe' | 'warning' | 'critical' } {
  const remaining = deadline - now;
  if (remaining <= 0) return { text: 'EXPIRED', expired: true, urgency: 'critical' };
  
  const seconds = Math.floor(remaining / 1000) % 60;
  const minutes = Math.floor(remaining / 60000);
  
  let urgency: 'safe' | 'warning' | 'critical' = 'safe';
  if (minutes < 1) urgency = 'critical';
  else if (minutes < 2) urgency = 'warning';
  
  return { 
    text: minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`,
    expired: false,
    urgency
  };
}

// Format timestamp to readable time
function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit',
    hour12: true 
  });
}

// Live signal entry for the feed
interface LiveSignalEntry {
  id: string;
  symbol: string;
  direction: 'CALL' | 'PUT';
  confidence: number;
  timestamp: number;
  expiresAt: number;
  timeframe: string;
}

export default function TradingPage() {
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState('EUR/USD');
  const [selectedTimeframe, setSelectedTimeframe] = useState('5m');
  const [signal, setSignal] = useState<TradingSignal | null>(null);
  const [indicators, setIndicators] = useState<IndicatorSnapshot | null>(null);
  const [session, setSession] = useState<SessionAnalysis | null>(null);
  const [candles, setCandles] = useState<PriceCandle[]>([]);
  const [fetchingSignal, setFetchingSignal] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [liveSignals, setLiveSignals] = useState<LiveSignalEntry[]>([]);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [scanning, setScanning] = useState(false);
  const [apiCallsToday, setApiCallsToday] = useState(0);
  const [autoTriggerEnabled, setAutoTriggerEnabled] = useState(false);
  const [lastScanTime, setLastScanTime] = useState<number | null>(null);
  const [mtfAnalysis, setMtfAnalysis] = useState<MultiTimeframeAnalysis | null>(null);
  const [poMeta, setPOMeta] = useState<PocketOptionMeta | null>(null);
  
  // Pocket Option connection state
  const [poConnection, setPOConnection] = useState<POConnectionState>({
    connected: false, demo_mode: true, balance: 0, currency: 'USD',
    daily_trades: 0, daily_pnl: 0, trading_enabled: true, error: null,
  });
  const [tradeExecution, setTradeExecution] = useState<TradeExecution>({
    loading: false, lastResult: null, pendingOrderId: null,
  });
  const [tradeAmount, setTradeAmount] = useState(1.0);
  const [useOTC, setUseOTC] = useState(false);
  const [payouts, setPayouts] = useState<Record<string, number>>({});
  
  // Assets to monitor for high-confidence signals
  const monitoredAssets = ['EUR/USD', 'GBP/USD', 'BTC/USD', 'ETH/USD', 'SPY', 'AAPL'];
  
  // Timeframes to scan for auto-trigger
  const scanTimeframes = ['5m', '15m', '30m', '1h']; // Skipped 1m to save credits
  
  // API limit protection
  const API_DAILY_LIMIT = 800;
  const API_PAUSE_THRESHOLD = 750;

  const symbols = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'BTC/USD', 'ETH/USD', 'AAPL', 'TSLA', 'NVDA', 'SPY'];
  const timeframes = ['1m', '5m', '15m', '30m', '1h'];

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Check authorization
  useEffect(() => {
    async function checkAuth() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email && TRADING_ALLOWED_EMAILS.includes(user.email.toLowerCase())) {
          setAuthorized(true);
        }
      } catch (e) {
        console.error('Auth check failed:', e);
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, []);

  // ─── Pocket Option connection polling ──────────────────────
  useEffect(() => {
    if (!authorized) return;
    const checkPO = async () => {
      try {
        const res = await fetch('/api/trading/pocket-option');
        const data = await res.json();
        setPOConnection({
          connected: data.connected ?? false,
          demo_mode: data.demo_mode ?? true,
          balance: data.balance ?? 0,
          currency: data.currency ?? 'USD',
          daily_trades: data.daily_trades ?? 0,
          daily_pnl: data.daily_pnl ?? 0,
          trading_enabled: data.trading_enabled ?? true,
          error: data.error ?? null,
        });
      } catch {
        setPOConnection(prev => ({ ...prev, connected: false, error: 'Bridge offline' }));
      }
    };
    checkPO();
    const interval = setInterval(checkPO, 15000);
    return () => clearInterval(interval);
  }, [authorized]);

  // Fetch payouts periodically
  useEffect(() => {
    if (!authorized) return;
    const fetchPayouts = async () => {
      try {
        const res = await fetch('/api/trading/pocket-option/payouts');
        const data = await res.json();
        if (data.payouts) setPayouts(data.payouts);
      } catch { /* silent */ }
    };
    fetchPayouts();
    const interval = setInterval(fetchPayouts, 60000);
    return () => clearInterval(interval);
  }, [authorized]);

  // Execute trade on Pocket Option
  const executeTrade = useCallback(async () => {
    if (!signal || !poConnection.connected || tradeExecution.loading) return;
    
    const poAsset = poMeta?.asset || selectedSymbol.replace('/', '');
    const poDuration = poMeta?.duration || 300;
    
    setTradeExecution(prev => ({ ...prev, loading: true }));
    try {
      // Get current user for trade logging
      let userId: string | undefined;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id;
      } catch { /* silent */ }

      const res = await fetch('/api/trading/pocket-option/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asset: poAsset,
          amount: tradeAmount,
          direction: signal.direction,
          duration: poDuration,
          confirm: true,
          // Metadata for Supabase trade logging
          signal_id: signal.id,
          symbol: selectedSymbol,
          confidence: signal.confidence,
          user_id: userId,
        }),
      });
      const data = await res.json();
      setTradeExecution({
        loading: false,
        lastResult: { success: data.success, order_id: data.order_id, message: data.message || data.error || '' },
        pendingOrderId: data.order_id || null,
      });
      
      // Auto-check result after duration + 5s buffer
      if (data.order_id) {
        setTimeout(async () => {
          try {
            const resultRes = await fetch(`/api/trading/pocket-option/result?order_id=${data.order_id}`);
            const resultData = await resultRes.json();
            setTradeExecution(prev => ({
              ...prev,
              lastResult: { 
                success: true, 
                order_id: data.order_id, 
                message: `Result: ${JSON.stringify(resultData.result)}` 
              },
              pendingOrderId: null,
            }));
            // Refresh PO balance
            try {
              const balRes = await fetch('/api/trading/pocket-option');
              const balData = await balRes.json();
              if (balData.balance) setPOConnection(prev => ({ ...prev, balance: balData.balance }));
            } catch { /* silent */ }
          } catch { /* silent */ }
        }, (poDuration + 5) * 1000);
      }
    } catch (err: any) {
      setTradeExecution({
        loading: false,
        lastResult: { success: false, message: err.message || 'Execution failed' },
        pendingOrderId: null,
      });
    }
  }, [signal, poConnection.connected, tradeExecution.loading, poMeta, selectedSymbol, tradeAmount]);

  // Clean up expired signals
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveSignals(prev => prev.filter(s => s.expiresAt > Date.now()));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Background auto-trigger scan
  const runBackgroundScan = useCallback(async () => {
    if (scanning) return;
    if (apiCallsToday >= API_PAUSE_THRESHOLD) {
      setAutoTriggerEnabled(false);
      return;
    }
    
    setScanning(true);
    const newSignals: LiveSignalEntry[] = [];
    let calls = 0;
    
    for (const tf of scanTimeframes) {
      for (const asset of monitoredAssets) {
        if (apiCallsToday + calls >= API_PAUSE_THRESHOLD) break;
        
        try {
          // Delay to respect rate limit
          if (calls > 0) await new Promise(r => setTimeout(r, 1000));
          
          const res = await fetch(`/api/trading/signals?symbol=${encodeURIComponent(asset)}&timeframe=${tf}`);
          const data = await res.json();
          calls++;
          
          if (data.signal && data.signal.confidence >= 80) {
            const expMinutes = data.signal.expiryMinutes || 5;
            newSignals.push({
              id: data.signal.id,
              symbol: data.signal.symbol,
              direction: data.signal.direction,
              confidence: data.signal.confidence,
              timestamp: data.signal.timestamp,
              expiresAt: data.signal.timestamp + (expMinutes * 60 * 1000),
              timeframe: tf,
            });
          }
        } catch (e) {
          console.error(`Failed to scan ${asset} ${tf}:`, e);
        }
      }
    }
    
    setApiCallsToday(prev => prev + calls);
    setLastScanTime(Date.now());
    
    setLiveSignals(prev => {
      const newMap = new Map(newSignals.map(s => [`${s.symbol}-${s.timeframe}`, s]));
      const existingFiltered = prev.filter(s => !newMap.has(`${s.symbol}-${s.timeframe}`));
      return [...newSignals, ...existingFiltered]
        .filter(s => s.expiresAt > Date.now())
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 20);
    });
    
    setScanning(false);
  }, [scanning, apiCallsToday]);

  // Auto-trigger interval (now every 10 mins to save credits)
  useEffect(() => {
    if (!authorized || !autoTriggerEnabled) return;
    
    const initialTimeout = setTimeout(() => runBackgroundScan(), 2000);
    const interval = setInterval(() => runBackgroundScan(), 10 * 60 * 1000);
    
    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [authorized, autoTriggerEnabled, runBackgroundScan]);

  // Main fetch signal for selected symbol
  const fetchSignal = useCallback(async () => {
    if (fetchingSignal) return;
    
    // Eco Mode: Stop if near limit
    if (apiCallsToday >= API_PAUSE_THRESHOLD) {
      setError('Daily API limit reached. Live updates paused.');
      setAutoRefresh(false);
      setAutoTriggerEnabled(false);
      return;
    }

    setFetchingSignal(true);
    setError(null);
    try {
      const res = await fetch(`/api/trading/signals?symbol=${encodeURIComponent(selectedSymbol)}&timeframe=${selectedTimeframe}`);
      const data = await res.json();
      
      if (data.error) throw new Error(data.message || data.error);
      
      setSignal(data.signal);
      setIndicators(data.indicators);
      setSession(data.session);
      setCandles(data.candles || []);
      if (data.pocketOption) setPOMeta(data.pocketOption);
      setApiCallsToday(prev => prev + 1);

      if (data.signal && data.signal.confidence >= 80) {
        const newEntry: LiveSignalEntry = {
          id: data.signal.id,
          symbol: data.signal.symbol,
          direction: data.signal.direction,
          confidence: data.signal.confidence,
          timestamp: data.signal.timestamp,
          expiresAt: data.signal.timestamp + (data.signal.expiryMinutes * 60 * 1000),
          timeframe: data.signal.timeframe,
        };
        setLiveSignals(prev => {
          const filtered = prev.filter(s => s.symbol !== newEntry.symbol || s.timeframe !== newEntry.timeframe);
          return [newEntry, ...filtered].slice(0, 15);
        });
      }
    } catch (err: any) {
      console.error('Failed to fetch signal:', err);
      setError(err.message || 'Failed to load live data');
    } finally {
      setFetchingSignal(false);
    }
  }, [selectedSymbol, selectedTimeframe, fetchingSignal, apiCallsToday]);

  useEffect(() => {
    if (authorized) fetchSignal();
  }, [authorized, selectedSymbol, selectedTimeframe]);

  useEffect(() => {
    if (!authorized || !autoRefresh) return;
    
    // Eco Mode: Slow down refresh if credits are getting low
    const intervalTime = apiCallsToday > 400 ? 120000 : 60000; 
    const interval = setInterval(fetchSignal, intervalTime); 
    return () => clearInterval(interval);
  }, [authorized, autoRefresh, fetchSignal, apiCallsToday]);

  if (loading) {
    return (
      <DashboardShell>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0a0f', color: '#db2777', fontWeight: 900, fontSize: '24px', textTransform: 'uppercase' }}>
          VERIFYING ACCESS...
        </div>
      </DashboardShell>
    );
  }

  if (!authorized) {
    return (
      <DashboardShell>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0a0f', padding: '40px', textAlign: 'center' }}>
          <span style={{ fontSize: '100px', marginBottom: '32px' }}>🔒</span>
          <h1 style={{ fontSize: '40px', fontWeight: 900, color: '#fff', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '-1px' }}>XOM3 OPERATOR ONLY</h1>
          <p style={{ color: '#888', maxWidth: '500px', fontSize: '18px', lineHeight: '1.6' }}>This high-performance alpha engine is restricted to authorized Preston Chenault accounts.</p>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div style={{ padding: '32px', background: '#0a0a0f', minHeight: '100vh', color: '#fff', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        
        {/* HEADER */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '24px',
          padding: '20px 32px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '24px',
          marginBottom: '32px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ fontSize: '32px' }}>💰</div>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 900, textTransform: 'uppercase', margin: 0, letterSpacing: '-1px' }}>TRADING ALPHA</h1>
              <p style={{ fontSize: '10px', color: '#22c55e', fontWeight: 800, textTransform: 'uppercase', margin: 0, letterSpacing: '2px', opacity: 0.8 }}>REAL-TIME CONFLUENCE ENGINE</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', background: '#000', borderRadius: '16px', padding: '4px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <select
                value={selectedSymbol}
                onChange={(e) => setSelectedSymbol(e.target.value)}
                style={{ background: 'transparent', color: '#fff', padding: '10px 20px', fontWeight: 800, border: 'none', cursor: 'pointer', outline: 'none', fontSize: '14px' }}
              >
                {symbols.map(s => <option key={s} value={s} style={{ background: '#000' }}>{s}</option>)}
              </select>
              <div style={{ width: '1px', height: '24px', background: 'rgba(255, 255, 255, 0.1)', alignSelf: 'center' }} />
              <select
                value={selectedTimeframe}
                onChange={(e) => setSelectedTimeframe(e.target.value)}
                style={{ background: 'transparent', color: '#fff', padding: '10px 20px', fontWeight: 800, border: 'none', cursor: 'pointer', outline: 'none', fontSize: '14px' }}
              >
                {timeframes.map(t => <option key={t} value={t} style={{ background: '#000' }}>{t}</option>)}
              </select>
            </div>

            <button
              onClick={fetchSignal}
              disabled={fetchingSignal}
              style={{
                background: '#22c55e',
                color: '#000',
                padding: '12px 24px',
                borderRadius: '16px',
                fontWeight: 900,
                fontSize: '14px',
                border: 'none',
                cursor: 'pointer',
                opacity: fetchingSignal ? 0.5 : 1,
                boxShadow: '0 4px 20px rgba(34, 197, 94, 0.2)',
                transition: 'all 0.2s'
              }}
            >
              {fetchingSignal ? 'ANALYZING...' : 'REFRESH'}
            </button>

            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              style={{
                width: '48px',
                height: '48px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: autoRefresh ? 'rgba(34, 197, 94, 0.1)' : 'transparent',
                color: autoRefresh ? '#22c55e' : '#444',
                fontSize: '20px',
                cursor: 'pointer'
              }}
            >
              {autoRefresh ? '●' : '○'}
            </button>
          </div>
        </div>

        {/* POCKET OPTION CONNECTION BAR */}
        <div style={{
          background: poConnection.connected ? 'rgba(34, 197, 94, 0.05)' : 'rgba(255, 255, 255, 0.02)',
          border: `1px solid ${poConnection.connected ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 255, 255, 0.08)'}`,
          borderRadius: '20px',
          padding: '16px 24px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '24px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '10px', height: '10px', borderRadius: '50%',
              background: poConnection.connected ? '#22c55e' : '#ef4444',
              boxShadow: poConnection.connected ? '0 0 8px #22c55e' : 'none',
            }} />
            <div>
              <div style={{ fontSize: '11px', fontWeight: 900, color: poConnection.connected ? '#22c55e' : '#666', textTransform: 'uppercase', letterSpacing: '1px' }}>
                {poConnection.connected ? 'POCKET OPTION CONNECTED' : 'PO BRIDGE OFFLINE'}
              </div>
              {poConnection.connected && (
                <div style={{ fontSize: '10px', color: '#888', marginTop: '2px' }}>
                  {poConnection.demo_mode ? 'DEMO' : 'LIVE'} | {poConnection.daily_trades} trades today | P&L: ${poConnection.daily_pnl >= 0 ? '+' : ''}{poConnection.daily_pnl.toFixed(2)}
                </div>
              )}
              {!poConnection.connected && poConnection.error && (
                <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>{poConnection.error}</div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {poConnection.connected && (
              <>
                <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '8px 16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <div style={{ fontSize: '8px', color: '#666', fontWeight: 900, textTransform: 'uppercase' }}>Balance</div>
                  <div style={{ fontSize: '16px', fontWeight: 900, color: '#fff' }}>${poConnection.balance.toFixed(2)}</div>
                </div>
                {/* OTC Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '9px', color: '#666', fontWeight: 800 }}>OTC</span>
                  <button
                    onClick={() => setUseOTC(!useOTC)}
                    style={{
                      width: '32px', height: '18px',
                      background: useOTC ? '#a855f7' : '#333',
                      borderRadius: '10px', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center',
                      justifyContent: useOTC ? 'flex-end' : 'flex-start', padding: '2px',
                    }}
                  >
                    <div style={{ width: '14px', height: '14px', background: '#fff', borderRadius: '50%' }} />
                  </button>
                </div>
                {/* Payout display */}
                {(() => {
                  const assetKey = useOTC
                    ? selectedSymbol.replace('/', '') + '_otc'
                    : selectedSymbol.replace('/', '');
                  const payout = payouts[assetKey];
                  return payout ? (
                    <div style={{ background: payout >= 80 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(245, 158, 11, 0.1)', padding: '8px 12px', borderRadius: '12px', border: `1px solid ${payout >= 80 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(245, 158, 11, 0.2)'}` }}>
                      <div style={{ fontSize: '8px', color: '#666', fontWeight: 900, textTransform: 'uppercase' }}>Payout</div>
                      <div style={{ fontSize: '14px', fontWeight: 900, color: payout >= 80 ? '#22c55e' : '#f59e0b' }}>{payout}%</div>
                    </div>
                  ) : null;
                })()}
              </>
            )}
          </div>
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '2px solid #ef4444', borderRadius: '20px', padding: '20px', marginBottom: '32px', color: '#f87171', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '24px' }}>⚠️</span>
            <div style={{ fontSize: '14px', fontWeight: 600 }}>{error}</div>
          </div>
        )}

        {/* MAIN GRID */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '32px' }}>
          
          {/* LEFT SIDE */}
          <div style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: '32px' }}>
            
            <div style={{ background: '#141418', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '24px', padding: '24px' }}>
              <h3 style={{ fontSize: '12px', fontWeight: 900, color: '#888', textTransform: 'uppercase', marginBottom: '20px', letterSpacing: '1px' }}>Market Session</h3>
              {session ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ fontSize: '28px', fontWeight: 900, color: '#fff' }}>{session.currentSession.replace('_', ' ').toUpperCase()}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)', textAlign: 'center' }}>
                      <div style={{ fontSize: '9px', color: '#666', textTransform: 'uppercase', fontWeight: 900 }}>Volatility</div>
                      <div style={{ fontSize: '14px', fontWeight: 900, color: session.volatilityExpected === 'high' ? '#ef4444' : '#22c55e' }}>{session.volatilityExpected.toUpperCase()}</div>
                    </div>
                    <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)', textAlign: 'center' }}>
                      <div style={{ fontSize: '9px', color: '#666', textTransform: 'uppercase', fontWeight: 900 }}>Quality</div>
                      <div style={{ fontSize: '14px', fontWeight: 900, color: session.quality === 'optimal' ? '#22c55e' : '#f59e0b' }}>{session.quality.toUpperCase()}</div>
                    </div>
                  </div>
                  <div style={{ padding: '12px', background: 'rgba(34, 197, 94, 0.05)', borderRadius: '12px', border: '1px solid rgba(34, 197, 94, 0.1)', fontSize: '12px', color: '#86efac', lineHeight: '1.5' }}>
                    {session.recommendation}
                  </div>
                </div>
              ) : <div style={{ height: '150px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '16px' }} />}
            </div>

            <div style={{ background: '#141418', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '24px', padding: '24px' }}>
              <h3 style={{ fontSize: '12px', fontWeight: 900, color: '#888', textTransform: 'uppercase', marginBottom: '20px', letterSpacing: '1px' }}>Quick Metrics</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {indicators ? (
                  <>
                    {[
                      { label: 'RSI', value: indicators.rsi.value.toFixed(1), color: indicators.rsi.signal === 'oversold' ? '#22c55e' : indicators.rsi.signal === 'overbought' ? '#ef4444' : '#fff' },
                      { label: 'MACD', value: indicators.macd.crossover.toUpperCase(), color: indicators.macd.histogram > 0 ? '#22c55e' : '#ef4444' },
                      { label: 'STOCH', value: indicators.stochastic.signal.toUpperCase(), color: indicators.stochastic.signal === 'neutral' ? '#fff' : '#22c55e' },
                      { label: 'TREND', value: indicators.ema.trend.toUpperCase(), color: indicators.ema.trend === 'bullish' ? '#22c55e' : '#ef4444' }
                    ].map((m, i) => (
                      <div key={i} style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <div style={{ fontSize: '9px', color: '#666', fontWeight: 900, textTransform: 'uppercase' }}>{m.label}</div>
                        <div style={{ fontSize: '16px', fontWeight: 900, color: m.color }}>{m.value}</div>
                      </div>
                    ))}
                  </>
                ) : <div style={{ gridColumn: 'span 2', height: '150px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '16px' }} />}
              </div>
            </div>

            <EducationPanel />
            <PocketOptionSetup />
          </div>

          {/* RIGHT SIDE */}
          <div style={{ gridColumn: 'span 8', display: 'flex', flexDirection: 'column', gap: '32px' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
              {/* SIGNAL PANEL */}
              <div style={{
                borderRadius: '24px',
                padding: '2px',
                background: signal ? (signal.direction === 'CALL' ? 'linear-gradient(135deg, #22c55e, #10b981)' : 'linear-gradient(135deg, #ef4444, #f43f5e)') : 'rgba(255, 255, 255, 0.1)',
              }}>
                <div style={{ background: '#0a0a0f', borderRadius: '22px', padding: '24px', height: '100%' }}>
                  <h3 style={{ fontSize: '10px', fontWeight: 900, color: '#888', textTransform: 'uppercase', marginBottom: '20px' }}>Current Signal</h3>
                  {signal ? (() => {
                    const countdown = formatCountdown(signal.entryDeadline, currentTime);
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ fontSize: '42px', fontWeight: 900, color: '#fff', fontStyle: 'italic' }}>{signal.direction}</div>
                          <div style={{ fontSize: '32px', fontWeight: 900, color: signal.direction === 'CALL' ? '#22c55e' : '#ef4444' }}>{signal.confidence}%</div>
                        </div>
                        
                        {/* Timing Section */}
                        <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px', padding: '12px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                              <div style={{ fontSize: '8px', color: '#666', fontWeight: 900, textTransform: 'uppercase', marginBottom: '4px' }}>Signal Started</div>
                              <div style={{ fontSize: '12px', fontWeight: 800, color: '#fff' }}>{formatTime(signal.timestamp)}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: '8px', color: '#666', fontWeight: 900, textTransform: 'uppercase', marginBottom: '4px' }}>Entry Deadline</div>
                              <div style={{ fontSize: '12px', fontWeight: 800, color: countdown.urgency === 'critical' ? '#ef4444' : countdown.urgency === 'warning' ? '#f59e0b' : '#22c55e' }}>
                                {countdown.expired ? '⚠️ EXPIRED' : `⏱️ ${countdown.text}`}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Strategy Details */}
                        <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                            <span style={{ color: '#666', fontWeight: 900 }}>ENTRY</span>
                            <span style={{ fontWeight: 800 }}>{signal.entryWindow}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                            <span style={{ color: '#666', fontWeight: 900 }}>EXPIRY</span>
                            <span style={{ fontWeight: 800 }}>{signal.optimalExpiry}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                            <span style={{ color: '#666', fontWeight: 900 }}>WIN PROB</span>
                            <span style={{ fontWeight: 800, color: signal.winProbability >= 75 ? '#22c55e' : '#f59e0b' }}>{signal.winProbability}%</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                            <span style={{ color: '#666', fontWeight: 900 }}>POSITION</span>
                            <span style={{ fontWeight: 800, fontSize: '10px' }}>{signal.positionSize}</span>
                          </div>
                        </div>
                        
                        {/* MTF Alignment Indicator */}
                        {mtfAnalysis && (
                          <div style={{ 
                            background: mtfAnalysis.agreement >= 75 ? 'rgba(34, 197, 94, 0.05)' : 'rgba(245, 158, 11, 0.05)', 
                            border: `1px solid ${mtfAnalysis.agreement >= 75 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`, 
                            borderRadius: '10px', 
                            padding: '10px' 
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ fontSize: '8px', fontWeight: 900, color: mtfAnalysis.agreement >= 75 ? '#22c55e' : '#f59e0b', textTransform: 'uppercase' }}>
                                📊 Multi-TF: {mtfAnalysis.overallBias}
                              </div>
                              <div style={{ fontSize: '10px', fontWeight: 900, color: mtfAnalysis.agreement >= 75 ? '#4ade80' : '#f59e0b' }}>
                                {mtfAnalysis.agreement}% aligned
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Do Not Trade If */}
                        {signal.doNotTradeIf && signal.doNotTradeIf.length > 0 && (
                          <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '10px', padding: '10px' }}>
                            <div style={{ fontSize: '8px', fontWeight: 900, color: '#ef4444', textTransform: 'uppercase', marginBottom: '6px' }}>Do Not Trade If:</div>
                            {signal.doNotTradeIf.slice(0, 3).map((condition, i) => (
                              <div key={i} style={{ fontSize: '9px', color: '#f87171', lineHeight: '1.4', marginBottom: '2px' }}>• {condition}</div>
                            ))}
                          </div>
                        )}

                        {/* ─── EXECUTE ON POCKET OPTION ────────── */}
                        {poConnection.connected && signal.confidence >= 70 && (
                          <div style={{
                            background: signal.direction === 'CALL' ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                            border: `1px solid ${signal.direction === 'CALL' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                            borderRadius: '12px',
                            padding: '12px',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                              <div style={{ fontSize: '8px', fontWeight: 900, color: signal.direction === 'CALL' ? '#22c55e' : '#ef4444', textTransform: 'uppercase' }}>
                                Execute on PO {poConnection.demo_mode ? '(DEMO)' : '(LIVE)'}
                              </div>
                              {poMeta && (
                                <div style={{ fontSize: '8px', color: '#888' }}>
                                  {poMeta.asset} | {poMeta.duration}s
                                </div>
                              )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ position: 'relative', flex: '0 0 80px' }}>
                                <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', color: '#888', fontWeight: 900 }}>$</span>
                                <input
                                  type="number"
                                  value={tradeAmount}
                                  onChange={e => setTradeAmount(Math.max(0.01, parseFloat(e.target.value) || 1))}
                                  min="0.01"
                                  step="0.5"
                                  style={{
                                    width: '100%', padding: '8px 8px 8px 20px',
                                    background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px', color: '#fff', fontSize: '12px', fontWeight: 900,
                                    outline: 'none',
                                  }}
                                />
                              </div>
                              <button
                                onClick={executeTrade}
                                disabled={tradeExecution.loading || !poConnection.trading_enabled}
                                style={{
                                  flex: 1,
                                  padding: '10px',
                                  background: signal.direction === 'CALL'
                                    ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                                    : 'linear-gradient(135deg, #ef4444, #dc2626)',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '8px',
                                  fontWeight: 900,
                                  fontSize: '11px',
                                  cursor: tradeExecution.loading ? 'wait' : 'pointer',
                                  opacity: tradeExecution.loading ? 0.5 : 1,
                                  textTransform: 'uppercase',
                                  letterSpacing: '1px',
                                }}
                              >
                                {tradeExecution.loading ? 'PLACING...' : `${signal.direction} $${tradeAmount.toFixed(2)}`}
                              </button>
                            </div>
                            {tradeExecution.lastResult && (
                              <div style={{
                                marginTop: '6px', fontSize: '9px', fontWeight: 700,
                                color: tradeExecution.lastResult.success ? '#4ade80' : '#f87171',
                              }}>
                                {tradeExecution.lastResult.message}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })() : (
                    <div style={{ padding: '40px 0', textAlign: 'center', color: '#444' }}>
                      <div style={{ fontSize: '32px', marginBottom: '8px' }}>📡</div>
                      <div style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' }}>Scanning...</div>
                    </div>
                  )}
                </div>
              </div>

              {/* SCANNING / LIVE FEED */}
              <div style={{ background: '#141418', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '24px', padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '12px', fontWeight: 900, color: '#888', textTransform: 'uppercase' }}>{scanning ? '🔄 Scanning...' : '📡 Live Signals'}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 900, color: apiCallsToday >= API_PAUSE_THRESHOLD ? '#ef4444' : '#22c55e' }}>{apiCallsToday}/{API_DAILY_LIMIT} API</div>
                    <button
                      onClick={() => setAutoTriggerEnabled(!autoTriggerEnabled)}
                      style={{ width: '32px', height: '18px', background: autoTriggerEnabled ? '#22c55e' : '#333', borderRadius: '10px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: autoTriggerEnabled ? 'flex-end' : 'flex-start', padding: '2px' }}
                    >
                      <div style={{ width: '14px', height: '14px', background: '#fff', borderRadius: '50%' }} />
                    </button>
                  </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                  {liveSignals.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#444', fontSize: '11px', fontWeight: 900 }}>NO HIGH-CONF SIGNALS</div>
                  ) : (
                    liveSignals.map(sig => {
                      const remaining = Math.max(0, Math.floor((sig.expiresAt - currentTime) / 1000));
                      const mins = Math.floor(remaining / 60);
                      const secs = remaining % 60;
                      const isExpiring = remaining < 60;
                      
                      return (
                        <div key={sig.id} onClick={() => { setSelectedSymbol(sig.symbol); setSelectedTimeframe(sig.timeframe); }} style={{ padding: '10px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)', cursor: 'pointer' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '10px', fontWeight: 900, color: sig.direction === 'CALL' ? '#22c55e' : '#ef4444' }}>{sig.direction}</span>
                              <span style={{ fontSize: '12px', fontWeight: 900 }}>{sig.symbol}</span>
                              <span style={{ fontSize: '9px', color: '#666', fontWeight: 700 }}>{sig.timeframe}</span>
                            </div>
                            <span style={{ fontSize: '12px', fontWeight: 900, color: '#22c55e' }}>{sig.confidence}%</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '8px', color: '#666' }}>{timeAgo(sig.timestamp)}</span>
                            <span style={{ fontSize: '9px', fontWeight: 800, color: isExpiring ? '#ef4444' : '#f59e0b' }}>
                              {remaining > 0 ? `⏱️ ${mins}:${secs.toString().padStart(2, '0')} left` : '⚠️ EXPIRED'}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* STRATEGY DETAILS PANEL */}
            {signal && (
              <div style={{ background: '#141418', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '24px', padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '12px', fontWeight: 900, color: '#888', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>Strategy Details</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '10px', color: '#666', fontWeight: 700 }}>Confluence:</span>
                    <div style={{ display: 'flex', gap: '2px' }}>
                      {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} style={{ width: '16px', height: '8px', borderRadius: '2px', background: i <= signal.confluenceCount ? (signal.direction === 'CALL' ? '#22c55e' : '#ef4444') : 'rgba(255, 255, 255, 0.1)' }} />
                      ))}
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 900, color: signal.confluenceCount >= 4 ? '#22c55e' : signal.confluenceCount >= 3 ? '#f59e0b' : '#666' }}>
                      {signal.confluenceCount}/5
                    </span>
                  </div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  {/* Confirming Indicators */}
                  <div style={{ background: 'rgba(255, 255, 255, 0.02)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <div style={{ fontSize: '9px', fontWeight: 900, color: '#666', textTransform: 'uppercase', marginBottom: '12px' }}>Confirming Indicators</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {signal.indicators.map((ind, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#fff' }}>{ind.name}</span>
                          <span style={{ fontSize: '10px', fontWeight: 900, color: ind.direction === signal.direction ? '#22c55e' : '#ef4444', padding: '2px 8px', borderRadius: '4px', background: ind.direction === signal.direction ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)' }}>
                            {ind.direction}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Signal Reasoning */}
                  <div style={{ background: 'rgba(255, 255, 255, 0.02)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <div style={{ fontSize: '9px', fontWeight: 900, color: '#666', textTransform: 'uppercase', marginBottom: '12px' }}>Signal Reasoning</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {signal.reasoning.slice(0, 4).map((reason, i) => (
                        <div key={i} style={{ fontSize: '10px', color: '#aaa', lineHeight: '1.4' }}>
                          • {reason}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Entry Rules */}
                <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  <div style={{ background: 'rgba(34, 197, 94, 0.05)', borderRadius: '10px', padding: '12px', border: '1px solid rgba(34, 197, 94, 0.1)' }}>
                    <div style={{ fontSize: '8px', fontWeight: 900, color: '#22c55e', textTransform: 'uppercase', marginBottom: '6px' }}>Best Entry Price</div>
                    <div style={{ fontSize: '14px', fontWeight: 900, color: '#fff' }}>{signal.bestEntryPrice.toFixed(5)}</div>
                  </div>
                  <div style={{ background: 'rgba(239, 68, 68, 0.05)', borderRadius: '10px', padding: '12px', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                    <div style={{ fontSize: '8px', fontWeight: 900, color: '#ef4444', textTransform: 'uppercase', marginBottom: '6px' }}>Invalidation</div>
                    <div style={{ fontSize: '14px', fontWeight: 900, color: '#fff' }}>{signal.invalidationPrice.toFixed(5)}</div>
                  </div>
                  <div style={{ background: 'rgba(168, 85, 247, 0.05)', borderRadius: '10px', padding: '12px', border: '1px solid rgba(168, 85, 247, 0.1)' }}>
                    <div style={{ fontSize: '8px', fontWeight: 900, color: '#a855f7', textTransform: 'uppercase', marginBottom: '6px' }}>Risk Level</div>
                    <div style={{ fontSize: '14px', fontWeight: 900, color: signal.riskLevel === 'low' ? '#22c55e' : signal.riskLevel === 'medium' ? '#f59e0b' : '#ef4444', textTransform: 'uppercase' }}>{signal.riskLevel}</div>
                  </div>
                </div>
                
                {/* Trade Advice */}
                <div style={{ marginTop: '16px', padding: '16px', background: signal.direction === 'CALL' ? 'rgba(34, 197, 94, 0.05)' : 'rgba(239, 68, 68, 0.05)', borderRadius: '12px', border: `1px solid ${signal.direction === 'CALL' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}` }}>
                  <div style={{ fontSize: '9px', fontWeight: 900, color: signal.direction === 'CALL' ? '#22c55e' : '#ef4444', textTransform: 'uppercase', marginBottom: '8px' }}>Trade Advice</div>
                  <div style={{ fontSize: '12px', color: '#fff', lineHeight: '1.5' }}>{signal.suggestiveAdvice}</div>
                </div>
              </div>
            )}

            {/* CHART */}
            <div style={{ background: '#141418', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '32px', overflow: 'hidden' }}>
              {candles.length > 0 ? (
                <TradingChart data={candles} symbol={selectedSymbol} />
              ) : (
                <div style={{ height: '450px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0, 0, 0, 0.4)' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ width: '40px', height: '40px', border: '4px solid #db2777', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
                    <div style={{ color: '#888', fontWeight: 900, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '2px' }}>Loading Live Market...</div>
                  </div>
                </div>
              )}
            </div>

            {/* ADVANCED ANALYTICS */}
            <AdvancedAnalytics 
              symbol={selectedSymbol}
              timeframe={selectedTimeframe}
              candles={candles}
              onMTFUpdate={setMtfAnalysis}
            />

            <TradeTracker 
              currentSymbol={selectedSymbol}
              currentTimeframe={selectedTimeframe}
              currentSession={session?.currentSession}
            />
          </div>
        </div>

        {/* DISCLAIMER */}
        <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)', borderRadius: '24px', padding: '24px', marginTop: '48px' }}>
          <div style={{ fontSize: '10px', color: '#991b1b', textAlign: 'center', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '4px' }}>
            ⚠️ DISCLAIMER: HIGH RISK FINANCIAL INSTRUMENTS. FOR EDUCATIONAL PURPOSES ONLY.
          </div>
        </div>

        <style jsx>{`
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        `}</style>
      </div>
    </DashboardShell>
  );
}
