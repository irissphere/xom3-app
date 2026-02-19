'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface WalletData {
  wallet: {
    balance: number;
    balanceFormatted: string;
    trialActive: boolean;
    trialDaysRemaining: number;
    trialExpiresAt: string | null;
    autoReload: {
      enabled: boolean;
      threshold: number;
      amount: number;
    };
  };
  trial: {
    freeCredits: string;
    durationDays: number;
  };
  recentTransactions: Array<{
    id: string;
    type: string;
    amount: number;
    description: string;
    createdAt: string;
  }>;
}

export default function WalletPage() {
  const router = useRouter();
  const [data, setData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/wallet/status')
      .then(res => res.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #070b14, #050810)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#94a3b8',
      }}>
        Loading wallet...
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #070b14, #050810)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ef4444',
      }}>
        Failed to load wallet
      </div>
    );
  }

  const { wallet, trial, recentTransactions } = data;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #070b14, #050810)',
      padding: '40px 24px',
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <button
            onClick={() => router.push('/')}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              padding: '8px 16px',
              color: '#94a3b8',
              cursor: 'pointer',
              marginBottom: '24px',
            }}
          >
            ← Home
          </button>
          <h1 style={{
            fontSize: '32px',
            fontWeight: 700,
            color: '#ffffff',
            margin: 0,
          }}>
            Your Wallet
          </h1>
          <p style={{ color: '#94a3b8', marginTop: '8px' }}>
            Manage your credits and usage
          </p>
        </div>

        {/* Balance Card */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(10, 132, 255, 0.15), rgba(99, 102, 241, 0.1))',
          border: '1px solid rgba(90, 200, 250, 0.2)',
          borderRadius: '16px',
          padding: '32px',
          marginBottom: '24px',
        }}>
          <div style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '8px' }}>
            Available Balance
          </div>
          <div style={{
            fontSize: '48px',
            fontWeight: 700,
            color: '#22c55e',
            fontFamily: 'var(--font-mono)',
          }}>
            {wallet.balanceFormatted}
          </div>
          
          {wallet.trialActive && (
            <div style={{
              marginTop: '16px',
              padding: '12px 16px',
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}>
              <span style={{ fontSize: '20px' }}>🎁</span>
              <div>
                <div style={{ color: '#22c55e', fontWeight: 600 }}>
                  Trial Active — {wallet.trialDaysRemaining} days left
                </div>
                <div style={{ color: '#94a3b8', fontSize: '13px' }}>
                  {trial.freeCredits} in free credits for {trial.durationDays} days
                </div>
              </div>
            </div>
          )}

          <button
            onClick={() => router.push('/wallet/add-funds')}
            style={{
              marginTop: '24px',
              padding: '14px 28px',
              background: 'linear-gradient(135deg, #0a84ff, #6366f1)',
              border: 'none',
              borderRadius: '10px',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '15px',
              cursor: 'pointer',
            }}
          >
            Add Funds
          </button>
        </div>

        {/* Auto-Reload Status */}
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px',
          padding: '20px 24px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <div style={{ color: '#ffffff', fontWeight: 600 }}>Auto-Reload</div>
            <div style={{ color: '#94a3b8', fontSize: '13px', marginTop: '4px' }}>
              {wallet.autoReload.enabled 
                ? `Reloads $${(wallet.autoReload.amount / 100).toFixed(0)} when below $${(wallet.autoReload.threshold / 100).toFixed(0)}`
                : 'Disabled — enable to never run out'}
            </div>
          </div>
          <div style={{
            padding: '6px 12px',
            borderRadius: '6px',
            background: wallet.autoReload.enabled ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255,255,255,0.05)',
            color: wallet.autoReload.enabled ? '#22c55e' : '#94a3b8',
            fontSize: '13px',
            fontWeight: 500,
          }}>
            {wallet.autoReload.enabled ? 'Active' : 'Off'}
          </div>
        </div>

        {/* Recent Transactions */}
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '16px 24px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}>
            <h2 style={{ margin: 0, fontSize: '16px', color: '#ffffff' }}>
              Recent Activity
            </h2>
          </div>
          
          {recentTransactions.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
              No transactions yet
            </div>
          ) : (
            <div>
              {recentTransactions.map((txn) => (
                <div
                  key={txn.id}
                  style={{
                    padding: '16px 24px',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ color: '#ffffff', fontSize: '14px' }}>
                      {txn.description}
                    </div>
                    <div style={{ color: '#64748b', fontSize: '12px', marginTop: '4px' }}>
                      {new Date(txn.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 600,
                    color: txn.amount > 0 ? '#22c55e' : '#ef4444',
                  }}>
                    {txn.amount > 0 ? '+' : ''}{(txn.amount / 100).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
