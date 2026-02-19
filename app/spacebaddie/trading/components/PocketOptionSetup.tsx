'use client';

import { useState } from 'react';

/**
 * Pocket Option SSID Setup & Connection Tool
 * Guides the user through extracting their SSID and testing the connection.
 */
export function PocketOptionSetup() {
  const [ssid, setSsid] = useState('');
  const [demoMode, setDemoMode] = useState(true);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  const isValidFormat = ssid.includes('42["auth"') && ssid.includes('"session"');

  const testConnection = async () => {
    if (!ssid.trim()) return;
    setTesting(true);
    setResult(null);
    try {
      const res = await fetch('/api/trading/pocket-option', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'connect', ssid, demo: demoMode }),
      });
      const data = await res.json();
      if (data.status === 'connected' || data.balance !== undefined) {
        setResult({
          ok: true,
          message: `Connected! Balance: $${data.balance?.toFixed(2) ?? '?'} (${demoMode ? 'Demo' : 'Live'})`,
        });
      } else {
        setResult({ ok: false, message: data.error || 'Connection failed. Check SSID format.' });
      }
    } catch (err: any) {
      setResult({ ok: false, message: err.message || 'Bridge service not running.' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div style={{
      background: '#141418',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      borderRadius: '24px',
      padding: '24px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '12px', fontWeight: 900, color: '#a855f7', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>
          Pocket Option Setup
        </h3>
        <button
          onClick={() => setShowGuide(!showGuide)}
          style={{
            background: 'rgba(168, 85, 247, 0.1)',
            border: '1px solid rgba(168, 85, 247, 0.2)',
            borderRadius: '8px',
            padding: '6px 12px',
            color: '#a855f7',
            fontSize: '10px',
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          {showGuide ? 'HIDE GUIDE' : 'SHOW GUIDE'}
        </button>
      </div>

      {/* SSID Extraction Guide */}
      {showGuide && (
        <div style={{
          background: 'rgba(168, 85, 247, 0.05)',
          border: '1px solid rgba(168, 85, 247, 0.15)',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '20px',
        }}>
          <div style={{ fontSize: '11px', fontWeight: 900, color: '#c084fc', marginBottom: '16px', textTransform: 'uppercase' }}>
            How to Get Your SSID
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { step: 1, text: 'Open pocketoption.com and log into your account' },
              { step: 2, text: 'Press F12 to open Developer Tools (or right-click > Inspect)' },
              { step: 3, text: 'Go to the Network tab at the top of DevTools' },
              { step: 4, text: 'Click on the WS filter (WebSocket) to show only WebSocket connections' },
              { step: 5, text: 'Look for messages starting with 42["auth" in the Messages panel' },
              { step: 6, text: 'Copy the ENTIRE message including 42["auth",{...}]' },
            ].map(({ step, text }) => (
              <div key={step} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{
                  width: '24px', height: '24px', borderRadius: '50%',
                  background: 'rgba(168, 85, 247, 0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '11px', fontWeight: 900, color: '#c084fc',
                  flexShrink: 0,
                }}>
                  {step}
                </div>
                <div style={{ fontSize: '11px', color: '#ddd', lineHeight: '1.5' }}>{text}</div>
              </div>
            ))}
          </div>

          <div style={{
            marginTop: '16px',
            padding: '12px',
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '8px',
            fontFamily: 'monospace',
            fontSize: '10px',
            color: '#a78bfa',
            wordBreak: 'break-all',
            lineHeight: '1.5',
          }}>
            <div style={{ fontSize: '9px', color: '#666', marginBottom: '4px', fontFamily: 'system-ui' }}>Example format:</div>
            {'42["auth",{"session":"abc123def456","isDemo":1,"uid":12345678,"platform":1}]'}
          </div>

          <div style={{
            marginTop: '12px',
            padding: '10px',
            background: 'rgba(239, 68, 68, 0.05)',
            border: '1px solid rgba(239, 68, 68, 0.15)',
            borderRadius: '8px',
            fontSize: '10px',
            color: '#f87171',
            lineHeight: '1.5',
          }}>
            <strong>Important:</strong> Your SSID expires when you log out or after inactivity.
            You will need to re-extract it if the connection drops. Never share your SSID.
          </div>
        </div>
      )}

      {/* SSID Input */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ fontSize: '10px', fontWeight: 900, color: '#666', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
          Paste Your SSID
        </label>
        <textarea
          value={ssid}
          onChange={e => setSsid(e.target.value)}
          placeholder='42["auth",{"session":"...","isDemo":1,"uid":...,"platform":1}]'
          rows={3}
          style={{
            width: '100%',
            padding: '12px',
            background: 'rgba(0, 0, 0, 0.3)',
            border: `1px solid ${ssid && !isValidFormat ? 'rgba(239, 68, 68, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
            borderRadius: '12px',
            color: '#fff',
            fontSize: '11px',
            fontFamily: 'monospace',
            resize: 'vertical',
            outline: 'none',
          }}
        />
        {ssid && !isValidFormat && (
          <div style={{ fontSize: '9px', color: '#ef4444', marginTop: '4px', fontWeight: 700 }}>
            Invalid format. Must contain 42[&quot;auth&quot; and &quot;session&quot;
          </div>
        )}
        {ssid && isValidFormat && (
          <div style={{ fontSize: '9px', color: '#22c55e', marginTop: '4px', fontWeight: 700 }}>
            Format looks correct
          </div>
        )}
      </div>

      {/* Demo/Live toggle + Test button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '10px', color: demoMode ? '#22c55e' : '#ef4444', fontWeight: 900 }}>
            {demoMode ? 'DEMO' : 'LIVE'}
          </span>
          <button
            onClick={() => setDemoMode(!demoMode)}
            style={{
              width: '36px', height: '20px',
              background: demoMode ? '#22c55e' : '#ef4444',
              borderRadius: '10px', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center',
              justifyContent: demoMode ? 'flex-start' : 'flex-end', padding: '2px',
            }}
            title={demoMode ? 'Switch to Live' : 'Switch to Demo'}
          >
            <div style={{ width: '16px', height: '16px', background: '#fff', borderRadius: '50%' }} />
          </button>
        </div>

        <button
          onClick={testConnection}
          disabled={!isValidFormat || testing}
          style={{
            flex: 1,
            padding: '12px',
            background: isValidFormat ? 'rgba(168, 85, 247, 0.2)' : 'rgba(255, 255, 255, 0.05)',
            border: `1px solid ${isValidFormat ? 'rgba(168, 85, 247, 0.3)' : 'rgba(255, 255, 255, 0.08)'}`,
            borderRadius: '12px',
            color: isValidFormat ? '#c084fc' : '#555',
            fontSize: '12px',
            fontWeight: 900,
            cursor: isValidFormat && !testing ? 'pointer' : 'not-allowed',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            opacity: testing ? 0.6 : 1,
          }}
        >
          {testing ? 'TESTING...' : 'TEST CONNECTION'}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div style={{
          marginTop: '12px',
          padding: '12px',
          background: result.ok ? 'rgba(34, 197, 94, 0.05)' : 'rgba(239, 68, 68, 0.05)',
          border: `1px solid ${result.ok ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
          borderRadius: '10px',
          fontSize: '11px',
          fontWeight: 700,
          color: result.ok ? '#4ade80' : '#f87171',
        }}>
          {result.ok ? '+ ' : '- '}{result.message}
        </div>
      )}

      {!demoMode && (
        <div style={{
          marginTop: '12px',
          padding: '10px',
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '8px',
          fontSize: '10px',
          color: '#f87171',
          fontWeight: 700,
          textAlign: 'center',
          textTransform: 'uppercase',
          letterSpacing: '1px',
        }}>
          LIVE MODE - REAL MONEY AT RISK
        </div>
      )}
    </div>
  );
}
