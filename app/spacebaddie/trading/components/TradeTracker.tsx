'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';

interface TradeResult {
  id: string;
  symbol: string;
  direction: 'CALL' | 'PUT';
  result: 'win' | 'loss' | 'draw' | 'pending';
  entry_time: string;
  screenshot_url?: string;
  account_type?: 'demo' | 'real';
  amount?: number;
  payout_percentage?: number;
}

type AccountFilter = 'all' | 'demo' | 'real';

interface TradeTrackerProps {
  currentSymbol?: string;
  currentTimeframe?: string;
  currentSession?: string;
}

export const TradeTracker: React.FC<TradeTrackerProps> = ({
  currentSymbol = 'EUR/USD',
  currentTimeframe = '5m',
  currentSession,
}) => {
  const [trades, setTrades] = useState<TradeResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [accountFilter, setAccountFilter] = useState<AccountFilter>('all');
  const [showCalculator, setShowCalculator] = useState(false);
  const [newTrade, setNewTrade] = useState({
    symbol: currentSymbol,
    direction: 'CALL' as 'CALL' | 'PUT',
    result: 'pending' as 'win' | 'loss' | 'draw' | 'pending',
    account_type: 'demo' as 'demo' | 'real',
    amount: 10,
    payout_percentage: 85
  });

  // Update symbol when current symbol changes
  useEffect(() => {
    setNewTrade(prev => ({ ...prev, symbol: currentSymbol }));
  }, [currentSymbol]);

  useEffect(() => {
    fetchTrades();
  }, []);

  const fetchTrades = async () => {
    try {
      const { data, error } = await supabase
        .from('trading_results')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setTrades(data || []);
    } catch (error) {
      console.error('Error fetching trades:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogTrade = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return alert('Please sign in to log trades');

      // Build insert data - only include fields that exist in the database
      const insertData: Record<string, any> = {
        user_id: user.id,
        symbol: newTrade.symbol,
        direction: newTrade.direction,
        result: newTrade.result,
        amount: newTrade.amount,
        payout_percentage: newTrade.payout_percentage,
        entry_time: new Date().toISOString()
      };
      
      // Try to include optional columns (may not exist if migration hasn't run)
      // These will be silently ignored if the columns don't exist
      try {
        const { error } = await supabase
          .from('trading_results')
          .insert([{
            ...insertData,
            account_type: newTrade.account_type,
            market_session: currentSession || null,
            timeframe: currentTimeframe,
          }]);
        
        if (error) {
          // If error mentions missing column, retry without those fields
          if (error.message?.includes('column') || error.message?.includes('schema')) {
            const { error: fallbackError } = await supabase
              .from('trading_results')
              .insert([insertData]);
            if (fallbackError) throw fallbackError;
          } else {
            throw error;
          }
        }
      } catch (insertError: any) {
        // Fallback: insert without new columns
        const { error: fallbackError } = await supabase
          .from('trading_results')
          .insert([insertData]);
        if (fallbackError) throw fallbackError;
      }

      if (error) throw error;
      fetchTrades();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleUpdateResult = async (tradeId: string, result: 'win' | 'loss' | 'draw') => {
    try {
      const { error } = await supabase
        .from('trading_results')
        .update({ result })
        .eq('id', tradeId);

      if (error) throw error;
      fetchTrades();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleUploadScreenshot = async (tradeId: string, file: File) => {
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${tradeId}-${Math.random()}.${fileExt}`;
      const filePath = `screenshots/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('trading-screenshots')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('trading-screenshots')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('trading_results')
        .update({ screenshot_url: publicUrl })
        .eq('id', tradeId);

      if (updateError) throw updateError;
      
      fetchTrades();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setUploading(false);
    }
  };

  // Filter trades by account type
  const filteredTrades = useMemo(() => {
    if (accountFilter === 'all') return trades;
    return trades.filter(t => t.account_type === accountFilter);
  }, [trades, accountFilter]);

  // Calculate P/L statistics
  const stats = useMemo(() => {
    const filtered = filteredTrades;
    const completedTrades = filtered.filter(t => t.result === 'win' || t.result === 'loss');
    
    let totalWins = 0;
    let totalLosses = 0;
    let totalProfit = 0;
    let totalLoss = 0;
    let winCount = 0;
    let lossCount = 0;

    completedTrades.forEach(trade => {
      const amount = trade.amount || 0;
      const payout = trade.payout_percentage || 85;
      
      if (trade.result === 'win') {
        const profit = amount * (payout / 100);
        totalProfit += profit;
        totalWins += amount + profit;
        winCount++;
      } else if (trade.result === 'loss') {
        totalLoss += amount;
        lossCount++;
      }
    });

    const netPL = totalProfit - totalLoss;
    const winRate = completedTrades.length > 0 ? (winCount / completedTrades.length) * 100 : 0;
    const totalTrades = completedTrades.length;
    const pendingCount = filtered.filter(t => t.result === 'pending').length;

    return {
      totalProfit,
      totalLoss,
      netPL,
      winRate,
      winCount,
      lossCount,
      totalTrades,
      pendingCount,
      totalWins,
    };
  }, [filteredTrades]);

  // Calculate stats by account type for the calculator
  const demoStats = useMemo(() => {
    const demoTrades = trades.filter(t => t.account_type === 'demo' && (t.result === 'win' || t.result === 'loss'));
    let profit = 0, loss = 0;
    demoTrades.forEach(t => {
      const amt = t.amount || 0;
      const pay = t.payout_percentage || 85;
      if (t.result === 'win') profit += amt * (pay / 100);
      else loss += amt;
    });
    return { profit, loss, net: profit - loss, count: demoTrades.length };
  }, [trades]);

  const realStats = useMemo(() => {
    const realTrades = trades.filter(t => t.account_type === 'real' && (t.result === 'win' || t.result === 'loss'));
    let profit = 0, loss = 0;
    realTrades.forEach(t => {
      const amt = t.amount || 0;
      const pay = t.payout_percentage || 85;
      if (t.result === 'win') profit += amt * (pay / 100);
      else loss += amt;
    });
    return { profit, loss, net: profit - loss, count: realTrades.length };
  }, [trades]);

  return (
    <div style={{ background: 'rgba(30, 30, 45, 0.4)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '20px', padding: '24px' }}>
      {/* Header with Stats */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h3 style={{ fontWeight: 'bold', color: '#fff', textTransform: 'uppercase', fontSize: '12px', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          <span style={{ fontSize: '20px' }}>📝</span> Trade Journal
        </h3>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Account Type Filter */}
          <div style={{ display: 'flex', background: 'rgba(0, 0, 0, 0.3)', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
            {(['all', 'demo', 'real'] as const).map(type => (
              <button
                key={type}
                onClick={() => setAccountFilter(type)}
                style={{
                  background: accountFilter === type ? (type === 'real' ? 'rgba(34, 197, 94, 0.2)' : type === 'demo' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.1)') : 'transparent',
                  color: accountFilter === type ? (type === 'real' ? '#4ade80' : type === 'demo' ? '#60a5fa' : '#fff') : '#666',
                  border: 'none',
                  padding: '6px 12px',
                  fontSize: '9px',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
              >
                {type}
              </button>
            ))}
          </div>
          
          {/* Calculator Toggle */}
          <button
            onClick={() => setShowCalculator(!showCalculator)}
            style={{
              background: showCalculator ? 'rgba(168, 85, 247, 0.2)' : 'transparent',
              color: showCalculator ? '#c084fc' : '#666',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '6px 10px',
              fontSize: '14px',
              cursor: 'pointer',
            }}
            title="P/L Calculator"
          >
            🧮
          </button>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(34, 197, 94, 0.2)', textAlign: 'center' }}>
          <div style={{ fontSize: '8px', color: '#4ade80', fontWeight: 900, textTransform: 'uppercase', marginBottom: '4px' }}>Wins</div>
          <div style={{ fontSize: '18px', fontWeight: 900, color: '#4ade80' }}>{stats.winCount}</div>
        </div>
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)', textAlign: 'center' }}>
          <div style={{ fontSize: '8px', color: '#f87171', fontWeight: 900, textTransform: 'uppercase', marginBottom: '4px' }}>Losses</div>
          <div style={{ fontSize: '18px', fontWeight: 900, color: '#f87171' }}>{stats.lossCount}</div>
        </div>
        <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)', textAlign: 'center' }}>
          <div style={{ fontSize: '8px', color: '#888', fontWeight: 900, textTransform: 'uppercase', marginBottom: '4px' }}>Win Rate</div>
          <div style={{ fontSize: '18px', fontWeight: 900, color: stats.winRate >= 55 ? '#4ade80' : stats.winRate >= 45 ? '#f59e0b' : '#f87171' }}>{stats.winRate.toFixed(1)}%</div>
        </div>
        <div style={{ background: stats.netPL >= 0 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '12px', border: `1px solid ${stats.netPL >= 0 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`, textAlign: 'center' }}>
          <div style={{ fontSize: '8px', color: stats.netPL >= 0 ? '#4ade80' : '#f87171', fontWeight: 900, textTransform: 'uppercase', marginBottom: '4px' }}>Net P/L</div>
          <div style={{ fontSize: '18px', fontWeight: 900, color: stats.netPL >= 0 ? '#4ade80' : '#f87171' }}>${stats.netPL.toFixed(2)}</div>
        </div>
      </div>

      {/* P/L Calculator Panel */}
      {showCalculator && (
        <div style={{ background: 'rgba(168, 85, 247, 0.05)', border: '1px solid rgba(168, 85, 247, 0.2)', borderRadius: '16px', padding: '16px', marginBottom: '20px' }}>
          <div style={{ fontSize: '10px', fontWeight: 900, color: '#c084fc', textTransform: 'uppercase', marginBottom: '12px' }}>📊 P/L Calculator</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Demo Account Stats */}
            <div style={{ background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', padding: '12px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
              <div style={{ fontSize: '9px', fontWeight: 900, color: '#60a5fa', textTransform: 'uppercase', marginBottom: '10px' }}>🎮 Demo Account</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '10px' }}>
                <div><span style={{ color: '#666' }}>Trades:</span> <span style={{ color: '#fff', fontWeight: 800 }}>{demoStats.count}</span></div>
                <div><span style={{ color: '#666' }}>Profit:</span> <span style={{ color: '#4ade80', fontWeight: 800 }}>${demoStats.profit.toFixed(2)}</span></div>
                <div><span style={{ color: '#666' }}>Loss:</span> <span style={{ color: '#f87171', fontWeight: 800 }}>${demoStats.loss.toFixed(2)}</span></div>
                <div><span style={{ color: '#666' }}>Net:</span> <span style={{ color: demoStats.net >= 0 ? '#4ade80' : '#f87171', fontWeight: 900 }}>${demoStats.net.toFixed(2)}</span></div>
              </div>
            </div>
            {/* Real Account Stats */}
            <div style={{ background: 'rgba(34, 197, 94, 0.1)', borderRadius: '12px', padding: '12px', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
              <div style={{ fontSize: '9px', fontWeight: 900, color: '#4ade80', textTransform: 'uppercase', marginBottom: '10px' }}>💰 Real Account</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '10px' }}>
                <div><span style={{ color: '#666' }}>Trades:</span> <span style={{ color: '#fff', fontWeight: 800 }}>{realStats.count}</span></div>
                <div><span style={{ color: '#666' }}>Profit:</span> <span style={{ color: '#4ade80', fontWeight: 800 }}>${realStats.profit.toFixed(2)}</span></div>
                <div><span style={{ color: '#666' }}>Loss:</span> <span style={{ color: '#f87171', fontWeight: 800 }}>${realStats.loss.toFixed(2)}</span></div>
                <div><span style={{ color: '#666' }}>Net:</span> <span style={{ color: realStats.net >= 0 ? '#4ade80' : '#f87171', fontWeight: 900 }}>${realStats.net.toFixed(2)}</span></div>
              </div>
            </div>
          </div>
          {/* Combined Total */}
          <div style={{ marginTop: '12px', padding: '10px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', fontWeight: 900, color: '#888', textTransform: 'uppercase' }}>Combined Total:</span>
            <span style={{ fontSize: '16px', fontWeight: 900, color: (demoStats.net + realStats.net) >= 0 ? '#4ade80' : '#f87171' }}>
              ${(demoStats.net + realStats.net).toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* Quick Log Form */}
      <div style={{ background: 'rgba(0, 0, 0, 0.4)', borderRadius: '16px', padding: '16px', marginBottom: '20px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
        <div style={{ fontSize: '9px', fontWeight: 900, color: '#888', textTransform: 'uppercase', marginBottom: '12px' }}>Log New Trade</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '12px' }}>
          {/* Symbol */}
          <select 
            value={newTrade.symbol}
            onChange={(e) => setNewTrade({...newTrade, symbol: e.target.value})}
            style={{ background: 'rgba(30, 30, 45, 0.8)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '10px', padding: '10px 12px', fontSize: '11px', fontWeight: 'bold', color: '#fff', outline: 'none', cursor: 'pointer' }}
          >
            {['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'BTC/USD', 'ETH/USD', 'AAPL', 'TSLA', 'NVDA', 'SPY'].map(s => (
              <option key={s} value={s} style={{ background: '#1a1a2e' }}>{s}</option>
            ))}
          </select>
          
          {/* Direction */}
          <select 
            value={newTrade.direction}
            onChange={(e) => setNewTrade({...newTrade, direction: e.target.value as 'CALL' | 'PUT'})}
            style={{ background: 'rgba(30, 30, 45, 0.8)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '10px', padding: '10px 12px', fontSize: '11px', fontWeight: 'bold', color: '#fff', outline: 'none', cursor: 'pointer' }}
          >
            <option value="CALL" style={{ background: '#1a1a2e' }}>📈 CALL</option>
            <option value="PUT" style={{ background: '#1a1a2e' }}>📉 PUT</option>
          </select>
          
          {/* Account Type */}
          <select 
            value={newTrade.account_type}
            onChange={(e) => setNewTrade({...newTrade, account_type: e.target.value as 'demo' | 'real'})}
            style={{ background: newTrade.account_type === 'real' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(59, 130, 246, 0.2)', border: `1px solid ${newTrade.account_type === 'real' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`, borderRadius: '10px', padding: '10px 12px', fontSize: '11px', fontWeight: 'bold', color: newTrade.account_type === 'real' ? '#4ade80' : '#60a5fa', outline: 'none', cursor: 'pointer' }}
          >
            <option value="demo" style={{ background: '#1a1a2e' }}>🎮 DEMO</option>
            <option value="real" style={{ background: '#1a1a2e' }}>💰 REAL</option>
          </select>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
          {/* Amount */}
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#666', fontSize: '11px' }}>$</span>
            <input
              type="number"
              value={newTrade.amount}
              onChange={(e) => setNewTrade({...newTrade, amount: parseFloat(e.target.value) || 0})}
              placeholder="Amount"
              style={{ width: '100%', background: 'rgba(30, 30, 45, 0.8)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '10px', padding: '10px 12px 10px 24px', fontSize: '11px', fontWeight: 'bold', color: '#fff', outline: 'none' }}
            />
          </div>
          
          {/* Payout */}
          <div style={{ position: 'relative' }}>
            <input
              type="number"
              value={newTrade.payout_percentage}
              onChange={(e) => setNewTrade({...newTrade, payout_percentage: parseFloat(e.target.value) || 85})}
              placeholder="Payout %"
              style={{ width: '100%', background: 'rgba(30, 30, 45, 0.8)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '10px', padding: '10px 24px 10px 12px', fontSize: '11px', fontWeight: 'bold', color: '#fff', outline: 'none' }}
            />
            <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#666', fontSize: '11px' }}>%</span>
          </div>
          
          {/* Result */}
          <select 
            value={newTrade.result}
            onChange={(e) => setNewTrade({...newTrade, result: e.target.value as any})}
            style={{ background: 'rgba(30, 30, 45, 0.8)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '10px', padding: '10px 12px', fontSize: '11px', fontWeight: 'bold', color: '#fff', outline: 'none', cursor: 'pointer' }}
          >
            <option value="pending" style={{ background: '#1a1a2e' }}>⏳ PENDING</option>
            <option value="win" style={{ background: '#1a1a2e' }}>✅ WIN</option>
            <option value="loss" style={{ background: '#1a1a2e' }}>❌ LOSS</option>
          </select>
          
          {/* Submit */}
          <button 
            onClick={handleLogTrade}
            style={{ background: 'linear-gradient(135deg, #db2777, #9333ea)', color: '#fff', borderRadius: '10px', padding: '10px 16px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}
          >
            Log Trade
          </button>
        </div>
      </div>

      {/* History List */}
      <div style={{ fontSize: '9px', fontWeight: 900, color: '#888', textTransform: 'uppercase', marginBottom: '10px' }}>Recent Trades ({filteredTrades.length})</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '16px', color: '#888', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '2px' }}>Loading history...</div>
        ) : filteredTrades.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: '#666', fontStyle: 'italic', fontSize: '10px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '2px' }}>No trades logged yet.</div>
        ) : (
          filteredTrades.slice(0, 15).map((trade) => {
            const amount = trade.amount || 0;
            const payout = trade.payout_percentage || 85;
            const pl = trade.result === 'win' ? amount * (payout / 100) : trade.result === 'loss' ? -amount : 0;
            
            return (
              <div key={trade.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'rgba(0, 0, 0, 0.2)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '4px', height: '40px', borderRadius: '4px', background: trade.result === 'win' ? '#22c55e' : trade.result === 'loss' ? '#ef4444' : '#eab308' }} />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                      <span style={{ fontWeight: 900, color: '#fff', fontSize: '11px', textTransform: 'uppercase' }}>{trade.symbol}</span>
                      <span style={{ fontSize: '9px', fontWeight: 900, color: trade.direction === 'CALL' ? '#4ade80' : '#f87171' }}>{trade.direction}</span>
                      <span style={{ fontSize: '8px', padding: '2px 6px', borderRadius: '4px', background: trade.account_type === 'real' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(59, 130, 246, 0.2)', color: trade.account_type === 'real' ? '#4ade80' : '#60a5fa', fontWeight: 800 }}>
                        {trade.account_type === 'real' ? '💰' : '🎮'}
                      </span>
                    </div>
                    <div style={{ fontSize: '8px', color: '#666', fontWeight: 'bold' }}>{new Date(trade.entry_time).toLocaleString()}</div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {/* Amount & P/L */}
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '10px', color: '#888', fontWeight: 700 }}>${amount.toFixed(2)}</div>
                    {trade.result !== 'pending' && (
                      <div style={{ fontSize: '11px', fontWeight: 900, color: pl >= 0 ? '#4ade80' : '#f87171' }}>
                        {pl >= 0 ? '+' : ''}{pl.toFixed(2)}
                      </div>
                    )}
                  </div>
                  
                  {/* Screenshot */}
                  {trade.screenshot_url ? (
                    <a href={trade.screenshot_url} target="_blank" rel="noreferrer" style={{ fontSize: '10px', fontWeight: 900, color: '#60a5fa', textDecoration: 'none' }}>
                      📷
                    </a>
                  ) : (
                    <label style={{ cursor: 'pointer', fontSize: '12px', opacity: 0.5 }}>
                      {uploading ? '...' : '📷'}
                      <input 
                        type="file" 
                        style={{ display: 'none' }} 
                        accept="image/*"
                        onChange={(e) => e.target.files?.[0] && handleUploadScreenshot(trade.id, e.target.files[0])}
                      />
                    </label>
                  )}
                  
                  {/* Result / Quick Update */}
                  {trade.result === 'pending' ? (
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button onClick={() => handleUpdateResult(trade.id, 'win')} style={{ background: 'rgba(34, 197, 94, 0.2)', border: 'none', borderRadius: '6px', padding: '4px 8px', fontSize: '9px', color: '#4ade80', fontWeight: 900, cursor: 'pointer' }}>WIN</button>
                      <button onClick={() => handleUpdateResult(trade.id, 'loss')} style={{ background: 'rgba(239, 68, 68, 0.2)', border: 'none', borderRadius: '6px', padding: '4px 8px', fontSize: '9px', color: '#f87171', fontWeight: 900, cursor: 'pointer' }}>LOSS</button>
                    </div>
                  ) : (
                    <div style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', color: trade.result === 'win' ? '#4ade80' : trade.result === 'loss' ? '#f87171' : '#eab308', minWidth: '50px', textAlign: 'center' }}>
                      {trade.result === 'win' ? '✅' : trade.result === 'loss' ? '❌' : '⏳'} {trade.result}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
