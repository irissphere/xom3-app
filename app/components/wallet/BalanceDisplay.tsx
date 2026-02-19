'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface WalletStatus {
  balance: string;
  balanceCents: number;
  isTrialUser: boolean;
  trialDaysRemaining: number | null;
  trialCreditsRemaining: string | null;
  lowBalance: boolean;
  autoReloadEnabled: boolean;
  hasPaymentMethod: boolean;
}

interface Transaction {
  id: string;
  type: string;
  amountCents: number;
  description: string;
  category: string;
  createdAt: string;
}

export function BalanceDisplay({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [wallet, setWallet] = useState<WalletStatus | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWalletStatus();
  }, []);

  async function fetchWalletStatus() {
    try {
      const res = await fetch('/api/wallet/status');
      const data = await res.json();
      if (data.ok) {
        setWallet(data.wallet);
        setTransactions(data.recentTransactions || []);
      }
    } catch (err) {
      console.error('Failed to fetch wallet status:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{
        padding: compact ? '12px 16px' : '20px 24px',
        borderRadius: '12px',
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
      }}>
        <div style={{ color: '#64748b', fontSize: '14px' }}>Loading...</div>
      </div>
    );
  }

  if (!wallet) {
    return null;
  }

  // Compact version for nav/header
  if (compact) {
    return (
      <button
        onClick={() => router.push('/wallet')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 14px',
          borderRadius: '10px',
          background: wallet.lowBalance 
            ? 'rgba(239, 68, 68, 0.15)' 
            : 'rgba(34, 197, 94, 0.1)',
          border: `1px solid ${wallet.lowBalance ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 197, 94, 0.2)'}`,
          color: wallet.lowBalance ? '#f87171' : '#22c55e',
          fontSize: '14px',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        <span style={{ fontSize: '16px' }}>💰</span>
        {wallet.balance}
        {wallet.lowBalance && (
          <span style={{ 
            width: '8px', 
            height: '8px', 
            borderRadius: '50%', 
            background: '#ef4444',
            animation: 'pulse 2s infinite',
          }} />
        )}
      </button>
    );
  }

  // Full version for dashboard/wallet page
  return (
    <div style={{
      padding: '24px',
      borderRadius: '16px',
      background: 'linear-gradient(180deg, rgba(10, 14, 26, 0.9), rgba(12, 18, 34, 0.8))',
      border: '1px solid rgba(255, 255, 255, 0.08)',
    }}>
      {/* Balance Header */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ 
          fontSize: '12px', 
          fontWeight: 600, 
          color: '#64748b', 
          letterSpacing: '0.05em',
          marginBottom: '6px',
        }}>
          AVAILABLE BALANCE
        </div>
        <div style={{
          fontSize: '36px',
          fontWeight: 700,
          color: wallet.lowBalance ? '#f87171' : '#22c55e',
          letterSpacing: '-0.02em',
        }}>
          {wallet.balance}
        </div>
        
        {/* Trial info */}
        {wallet.isTrialUser && wallet.trialDaysRemaining !== null && (
          <div style={{
            marginTop: '12px',
            padding: '10px 14px',
            borderRadius: '10px',
            background: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            fontSize: '13px',
            color: '#a5b4fc',
          }}>
            <strong>Trial:</strong> {wallet.trialDaysRemaining} days remaining
            {wallet.trialCreditsRemaining && (
              <span style={{ marginLeft: '12px' }}>
                • {wallet.trialCreditsRemaining} credits left
              </span>
            )}
          </div>
        )}

        {/* Low balance warning */}
        {wallet.lowBalance && (
          <div style={{
            marginTop: '12px',
            padding: '12px 16px',
            borderRadius: '10px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            <span style={{ fontSize: '18px' }}>⚠️</span>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#f87171' }}>
                Low Balance
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                Add funds to keep your automations running
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Funds Button */}
      <button
        onClick={() => router.push('/wallet/add-funds')}
        style={{
          width: '100%',
          padding: '14px 20px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #22c55e, #16a34a)',
          border: 'none',
          color: '#ffffff',
          fontWeight: 600,
          fontSize: '15px',
          cursor: 'pointer',
          marginBottom: '16px',
        }}
      >
        + Add Funds
      </button>

      {/* Quick Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px',
        marginBottom: '20px',
      }}>
        <div style={{
          padding: '12px',
          borderRadius: '10px',
          background: 'rgba(255, 255, 255, 0.03)',
        }}>
          <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Auto-reload</div>
          <div style={{ fontSize: '14px', color: wallet.autoReloadEnabled ? '#22c55e' : '#94a3b8' }}>
            {wallet.autoReloadEnabled ? 'On' : 'Off'}
          </div>
        </div>
        <div style={{
          padding: '12px',
          borderRadius: '10px',
          background: 'rgba(255, 255, 255, 0.03)',
        }}>
          <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Payment</div>
          <div style={{ fontSize: '14px', color: wallet.hasPaymentMethod ? '#22c55e' : '#94a3b8' }}>
            {wallet.hasPaymentMethod ? 'Added' : 'None'}
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      {transactions.length > 0 && (
        <div>
          <div style={{ 
            fontSize: '12px', 
            fontWeight: 600, 
            color: '#64748b', 
            letterSpacing: '0.05em',
            marginBottom: '12px',
          }}>
            RECENT ACTIVITY
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {transactions.slice(0, 5).map((tx) => (
              <div
                key={tx.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.02)',
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', color: '#e2e8f0' }}>
                    {tx.description}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    {new Date(tx.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: tx.type === 'debit' ? '#f87171' : '#22c55e',
                }}>
                  {tx.type === 'debit' ? '-' : '+'}${(tx.amountCents / 100).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* View All Link */}
      <button
        onClick={() => router.push('/wallet/history')}
        style={{
          width: '100%',
          padding: '12px',
          marginTop: '16px',
          borderRadius: '10px',
          background: 'transparent',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          color: '#94a3b8',
          fontSize: '13px',
          cursor: 'pointer',
        }}
      >
        View All Transactions →
      </button>
    </div>
  );
}



















