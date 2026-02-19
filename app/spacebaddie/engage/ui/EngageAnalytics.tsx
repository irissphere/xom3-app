'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface AnalyticsData {
  total_followers: number;
  new_followers: number;
  total_contacts: number;
  open_conversations: number;
  messages_sent: number;
  reply_rate: number;
  signals_by_type: Record<string, number>;
  signals_by_platform: Record<string, number>;
  messages_by_status: Record<string, number>;
}

const platformColors: Record<string, string> = {
  youtube: '#FF0000',
  tiktok: '#FF2D55',
  instagram: '#C13584',
  twitter: '#1DA1F2',
  facebook: '#1877F2',
  linkedin: '#0077B5',
};

const eventConfig: Record<string, { icon: string; color: string }> = {
  follow: { icon: '👤', color: '#8A2BE2' },
  comment: { icon: '💬', color: '#FF6B9D' },
  mention: { icon: '📣', color: '#00D4D4' },
  dm: { icon: '✉️', color: '#F59E0B' },
};

const statusColors: Record<string, string> = {
  queued: '#F59E0B',
  sending: '#3B82F6',
  sent: '#22C55E',
  failed: '#EF4444',
};

function StatCard({ label, value, icon, gradient }: {
  label: string; value: string | number; icon: string; gradient: string;
}) {
  return (
    <div style={{
      padding: '20px',
      background: 'rgba(255,255,255,0.04)',
      borderRadius: '16px',
      border: '1px solid rgba(255,255,255,0.08)',
      transition: 'all 0.2s ease',
    }}>
      <div style={{
        width: '40px', height: '40px', borderRadius: '12px',
        background: gradient,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '20px', marginBottom: '14px',
      }}>
        {icon}
      </div>
      <div style={{
        fontSize: '28px', fontWeight: 700, color: '#fff', lineHeight: 1,
        marginBottom: '4px',
      }}>
        {value}
      </div>
      <div style={{ fontSize: '12px', color: '#666', fontWeight: 500 }}>{label}</div>
    </div>
  );
}

function BarRow({ label, value, maxValue, color }: {
  label: string; value: number; maxValue: number; color: string;
}) {
  const pct = maxValue > 0 ? (value / maxValue) * 100 : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <span style={{
        fontSize: '12px', color: '#888', width: '80px', textAlign: 'right' as const,
        textTransform: 'capitalize' as const, overflow: 'hidden', textOverflow: 'ellipsis',
        whiteSpace: 'nowrap' as const,
      }}>
        {label}
      </span>
      <div style={{
        flex: 1, height: '24px', borderRadius: '6px',
        background: 'rgba(255,255,255,0.04)',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', borderRadius: '6px',
          background: `linear-gradient(90deg, ${color}, ${color}AA)`,
          width: `${pct}%`,
          transition: 'width 0.6s ease',
          minWidth: value > 0 ? '4px' : '0',
        }} />
      </div>
      <span style={{ fontSize: '13px', color: '#fff', fontWeight: 600, width: '32px' }}>{value}</span>
    </div>
  );
}

export function EngageAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/spacebaddie/engage/analytics?days=${days}`);
      const result = await res.json();
      if (result.ok) setData(result.stats);
    } catch (err) {
      console.error('[EngageAnalytics] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  const dayOptions = [7, 14, 30, 90];

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px 0' }}>
        <div style={{
          width: '32px', height: '32px',
          border: '3px solid rgba(255,107,157,0.2)', borderTopColor: '#FF6B9D',
          borderRadius: '50%', animation: 'spin 1s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{
        textAlign: 'center' as const, padding: '64px 32px',
        background: 'linear-gradient(135deg, rgba(138,43,226,0.05), rgba(0,212,212,0.05))',
        borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)',
      }}>
        <div style={{
          width: '80px', height: '80px', borderRadius: '20px',
          background: 'linear-gradient(135deg, rgba(138,43,226,0.15), rgba(0,212,212,0.15))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '36px', margin: '0 auto 20px',
        }}>
          📊
        </div>
        <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#fff', margin: '0 0 8px' }}>No analytics data</h3>
        <p style={{ color: '#888', fontSize: '14px' }}>Analytics will appear once you start receiving social engagement.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Period selector */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '24px',
      }}>
        <span style={{ fontSize: '13px', color: '#888' }}>Engagement overview</span>
        <div style={{ display: 'flex', gap: '6px' }}>
          {dayOptions.map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              style={{
                padding: '6px 14px', borderRadius: '20px', fontSize: '12px',
                border: days === d ? '1px solid rgba(138,43,226,0.5)' : '1px solid rgba(255,255,255,0.1)',
                background: days === d ? 'rgba(138,43,226,0.15)' : 'rgba(255,255,255,0.03)',
                color: days === d ? '#C77DFF' : '#888',
                fontWeight: days === d ? 600 : 400,
                cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '12px', marginBottom: '28px',
      }}>
        <StatCard label="Total Followers" value={data.total_followers} icon="👥"
          gradient="linear-gradient(135deg, rgba(138,43,226,0.2), rgba(138,43,226,0.1))" />
        <StatCard label={`New (${days}d)`} value={data.new_followers} icon="🆕"
          gradient="linear-gradient(135deg, rgba(255,0,110,0.2), rgba(255,0,110,0.1))" />
        <StatCard label="Contacts" value={data.total_contacts} icon="📇"
          gradient="linear-gradient(135deg, rgba(0,212,212,0.2), rgba(0,212,212,0.1))" />
        <StatCard label="Open Convos" value={data.open_conversations} icon="💬"
          gradient="linear-gradient(135deg, rgba(34,197,94,0.2), rgba(34,197,94,0.1))" />
        <StatCard label="Messages Sent" value={data.messages_sent} icon="📤"
          gradient="linear-gradient(135deg, rgba(59,130,246,0.2), rgba(59,130,246,0.1))" />
        <StatCard label="Reply Rate" value={`${data.reply_rate}%`} icon="⚡"
          gradient="linear-gradient(135deg, rgba(245,158,11,0.2), rgba(245,158,11,0.1))" />
      </div>

      {/* Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        {/* Signals by Type */}
        <div style={{
          padding: '24px', background: 'rgba(255,255,255,0.03)',
          borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)',
        }}>
          <h3 style={{
            margin: '0 0 20px', fontSize: '14px', fontWeight: 600, color: '#fff',
            display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            <span style={{ fontSize: '18px' }}>📡</span>
            Signals by Type
          </h3>
          {Object.keys(data.signals_by_type).length === 0 ? (
            <p style={{ color: '#555', fontSize: '13px', textAlign: 'center' as const, padding: '20px 0' }}>No data yet</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '10px' }}>
              {Object.entries(data.signals_by_type).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                <BarRow
                  key={type}
                  label={type}
                  value={count}
                  maxValue={Math.max(...Object.values(data.signals_by_type))}
                  color={eventConfig[type]?.color || '#888'}
                />
              ))}
            </div>
          )}
        </div>

        {/* Signals by Platform */}
        <div style={{
          padding: '24px', background: 'rgba(255,255,255,0.03)',
          borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)',
        }}>
          <h3 style={{
            margin: '0 0 20px', fontSize: '14px', fontWeight: 600, color: '#fff',
            display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            <span style={{ fontSize: '18px' }}>📱</span>
            Signals by Platform
          </h3>
          {Object.keys(data.signals_by_platform).length === 0 ? (
            <p style={{ color: '#555', fontSize: '13px', textAlign: 'center' as const, padding: '20px 0' }}>No data yet</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '10px' }}>
              {Object.entries(data.signals_by_platform).sort((a, b) => b[1] - a[1]).map(([platform, count]) => (
                <BarRow
                  key={platform}
                  label={platform}
                  value={count}
                  maxValue={Math.max(...Object.values(data.signals_by_platform))}
                  color={platformColors[platform] || '#888'}
                />
              ))}
            </div>
          )}
        </div>

        {/* Message Status */}
        <div style={{
          padding: '24px', background: 'rgba(255,255,255,0.03)',
          borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)',
        }}>
          <h3 style={{
            margin: '0 0 20px', fontSize: '14px', fontWeight: 600, color: '#fff',
            display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            <span style={{ fontSize: '18px' }}>📨</span>
            Message Status
          </h3>
          {Object.keys(data.messages_by_status).length === 0 ? (
            <p style={{ color: '#555', fontSize: '13px', textAlign: 'center' as const, padding: '20px 0' }}>No data yet</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '10px' }}>
              {Object.entries(data.messages_by_status).sort((a, b) => b[1] - a[1]).map(([status, count]) => (
                <BarRow
                  key={status}
                  label={status}
                  value={count}
                  maxValue={Math.max(...Object.values(data.messages_by_status))}
                  color={statusColors[status] || '#888'}
                />
              ))}
            </div>
          )}
        </div>

        {/* Engagement Breakdown */}
        <div style={{
          padding: '24px', background: 'rgba(255,255,255,0.03)',
          borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)',
        }}>
          <h3 style={{
            margin: '0 0 20px', fontSize: '14px', fontWeight: 600, color: '#fff',
            display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            <span style={{ fontSize: '18px' }}>🎯</span>
            Engagement Breakdown
          </h3>
          {Object.keys(data.signals_by_type).length === 0 ? (
            <p style={{ color: '#555', fontSize: '13px', textAlign: 'center' as const, padding: '20px 0' }}>No data yet</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '14px' }}>
              {Object.entries(data.signals_by_type).map(([type, count]) => {
                const total = Object.values(data.signals_by_type).reduce((a, b) => a + b, 0);
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                const ec = eventConfig[type];
                return (
                  <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
                      background: `linear-gradient(135deg, ${ec?.color || '#888'}25, ${ec?.color || '#888'}10)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '16px',
                    }}>
                      {ec?.icon || '📌'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '12px', color: '#ccc', textTransform: 'capitalize' as const }}>{type}</span>
                        <span style={{ fontSize: '11px', color: '#666' }}>{pct}%</span>
                      </div>
                      <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: '3px',
                          background: `linear-gradient(90deg, ${ec?.color || '#888'}, ${ec?.color || '#888'}88)`,
                          width: `${pct}%`,
                          transition: 'width 0.6s ease',
                        }} />
                      </div>
                    </div>
                    <span style={{ fontSize: '13px', color: '#fff', fontWeight: 600, width: '28px', textAlign: 'right' as const }}>
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
