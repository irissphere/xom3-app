'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const PRESET_AMOUNTS = [
  { cents: 2500, label: '$25' },
  { cents: 5000, label: '$50' },
  { cents: 10000, label: '$100' },
  { cents: 25000, label: '$250' },
];

export default function AddFundsPage() {
  const router = useRouter();
  const [selectedAmount, setSelectedAmount] = useState(5000);
  const [customAmount, setCustomAmount] = useState('');
  const [autoReloadEnabled, setAutoReloadEnabled] = useState(false);
  const [autoReloadThreshold, setAutoReloadThreshold] = useState(10);
  const [autoReloadAmount, setAutoReloadAmount] = useState(25);
  const [loading, setLoading] = useState(false);

  const handleAddFunds = async () => {
    setLoading(true);
    try {
      const amount = customAmount ? parseInt(customAmount) * 100 : selectedAmount;
      
      // First update auto-reload if enabled
      if (autoReloadEnabled) {
        await fetch('/api/wallet/add-funds', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            autoReload: {
              enabled: true,
              threshold: autoReloadThreshold * 100,
              amount: autoReloadAmount * 100,
            },
          }),
        });
      }

      // Add funds
      const res = await fetch('/api/wallet/add-funds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });

      if (res.ok) {
        router.push('/wallet');
      }
    } catch (error) {
      console.error('Failed to add funds:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #070b14, #050810)',
      padding: '40px 24px',
    }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <button
            onClick={() => router.push('/wallet')}
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
            ← Back to Wallet
          </button>
          <h1 style={{
            fontSize: '28px',
            fontWeight: 700,
            color: '#ffffff',
            margin: 0,
          }}>
            Add Funds
          </h1>
          <p style={{ color: '#94a3b8', marginTop: '8px' }}>
            Top up your wallet to keep automations running
          </p>
        </div>

        {/* Amount Selection */}
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
        }}>
          <div style={{ color: '#ffffff', fontWeight: 600, marginBottom: '16px' }}>
            Select Amount
          </div>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '12px',
            marginBottom: '16px',
          }}>
            {PRESET_AMOUNTS.map(({ cents, label }) => (
              <button
                key={cents}
                onClick={() => { setSelectedAmount(cents); setCustomAmount(''); }}
                style={{
                  padding: '16px',
                  borderRadius: '10px',
                  border: selectedAmount === cents && !customAmount
                    ? '2px solid #0a84ff'
                    : '1px solid rgba(255,255,255,0.1)',
                  background: selectedAmount === cents && !customAmount
                    ? 'rgba(10, 132, 255, 0.1)'
                    : 'rgba(255,255,255,0.02)',
                  color: '#ffffff',
                  fontSize: '18px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <div style={{ position: 'relative' }}>
            <span style={{
              position: 'absolute',
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#64748b',
              fontSize: '18px',
            }}>
              $
            </span>
            <input
              type="number"
              placeholder="Custom amount"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              style={{
                width: '100%',
                padding: '16px 16px 16px 36px',
                borderRadius: '10px',
                border: customAmount 
                  ? '2px solid #0a84ff' 
                  : '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.02)',
                color: '#ffffff',
                fontSize: '18px',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Auto-Reload */}
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: autoReloadEnabled ? '20px' : '0',
          }}>
            <div>
              <div style={{ color: '#ffffff', fontWeight: 600 }}>
                Auto-Reload
              </div>
              <div style={{ color: '#94a3b8', fontSize: '13px', marginTop: '4px' }}>
                Never run out of credits
              </div>
            </div>
            <button
              onClick={() => setAutoReloadEnabled(!autoReloadEnabled)}
              style={{
                width: '52px',
                height: '28px',
                borderRadius: '14px',
                border: 'none',
                background: autoReloadEnabled ? '#0a84ff' : 'rgba(255,255,255,0.1)',
                cursor: 'pointer',
                position: 'relative',
                transition: 'background 200ms',
              }}
            >
              <div style={{
                width: '22px',
                height: '22px',
                borderRadius: '11px',
                background: '#ffffff',
                position: 'absolute',
                top: '3px',
                left: autoReloadEnabled ? '27px' : '3px',
                transition: 'left 200ms',
              }} />
            </button>
          </div>

          {autoReloadEnabled && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
            }}>
              <div>
                <label style={{ color: '#94a3b8', fontSize: '13px', display: 'block', marginBottom: '8px' }}>
                  When balance drops below
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#64748b',
                  }}>
                    $
                  </span>
                  <input
                    type="number"
                    value={autoReloadThreshold}
                    onChange={(e) => setAutoReloadThreshold(parseInt(e.target.value) || 0)}
                    style={{
                      width: '100%',
                      padding: '12px 12px 12px 28px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.1)',
                      background: 'rgba(255,255,255,0.02)',
                      color: '#ffffff',
                      fontSize: '16px',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>
              <div>
                <label style={{ color: '#94a3b8', fontSize: '13px', display: 'block', marginBottom: '8px' }}>
                  Reload amount
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#64748b',
                  }}>
                    $
                  </span>
                  <input
                    type="number"
                    value={autoReloadAmount}
                    onChange={(e) => setAutoReloadAmount(parseInt(e.target.value) || 0)}
                    style={{
                      width: '100%',
                      padding: '12px 12px 12px 28px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.1)',
                      background: 'rgba(255,255,255,0.02)',
                      color: '#ffffff',
                      fontSize: '16px',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          onClick={handleAddFunds}
          disabled={loading}
          style={{
            width: '100%',
            padding: '18px',
            borderRadius: '12px',
            border: 'none',
            background: 'linear-gradient(135deg, #0a84ff, #6366f1)',
            color: '#ffffff',
            fontSize: '16px',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Processing...' : `Add ${customAmount ? `$${customAmount}` : `$${selectedAmount / 100}`}`}
        </button>

        <p style={{
          textAlign: 'center',
          color: '#64748b',
          fontSize: '13px',
          marginTop: '16px',
        }}>
          Secure payment powered by Stripe
        </p>
      </div>
    </div>
  );
}
