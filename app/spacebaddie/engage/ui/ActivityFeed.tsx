'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface Signal {
  signal_id: string;
  tenant: string;
  platform: string;
  type: string;
  contact_id: string | null;
  conversation_id: string | null;
  content: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  spacebaddie_contacts?: {
    contact_id: string;
    handle: string;
    display_name: string | null;
    avatar_url: string | null;
    platform: string;
    follower: boolean;
  } | null;
}

const platformMeta: Record<string, { color: string; label: string }> = {
  youtube: { color: '#FF0000', label: 'YouTube' },
  tiktok: { color: '#FF2D55', label: 'TikTok' },
  instagram: { color: '#C13584', label: 'Instagram' },
  twitter: { color: '#1DA1F2', label: 'X' },
  facebook: { color: '#1877F2', label: 'Facebook' },
  linkedin: { color: '#0077B5', label: 'LinkedIn' },
};

const eventConfig: Record<string, { icon: string; label: string; color: string }> = {
  follow: { icon: '👤', label: 'New Follower', color: '#8A2BE2' },
  comment: { icon: '💬', label: 'Comment', color: '#FF6B9D' },
  mention: { icon: '📣', label: 'Mention', color: '#00D4D4' },
  dm: { icon: '✉️', label: 'Direct Message', color: '#F59E0B' },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function FilterChip({ label, active, onClick, accent }: {
  label: string; active: boolean; onClick: () => void; accent?: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 14px',
        borderRadius: '20px',
        border: active
          ? `1px solid ${accent || 'rgba(255,0,110,0.5)'}`
          : '1px solid rgba(255,255,255,0.1)',
        background: active
          ? `${accent || 'rgba(255,0,110,0.15)'}22`
          : 'rgba(255,255,255,0.03)',
        color: active ? '#fff' : '#888',
        fontSize: '12px',
        fontWeight: active ? 600 : 400,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        whiteSpace: 'nowrap' as const,
      }}
    >
      {label}
    </button>
  );
}

export function ActivityFeed() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [filterPlatform, setFilterPlatform] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [offset, setOffset] = useState(0);
  const limit = 30;

  const fetchSignals = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterPlatform !== 'all') params.set('platform', filterPlatform);
      if (filterType !== 'all') params.set('event_type', filterType);
      params.set('limit', String(limit));
      params.set('offset', String(offset));
      const res = await fetch(`/api/spacebaddie/engage/signals?${params}`);
      const data = await res.json();
      if (data.ok) {
        setSignals(data.signals);
        setTotal(data.total);
      }
    } catch (err) {
      console.error('[ActivityFeed] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [filterPlatform, filterType, offset]);

  useEffect(() => { fetchSignals(); }, [fetchSignals]);
  useEffect(() => { setOffset(0); }, [filterPlatform, filterType]);

  const platforms = ['all', 'instagram', 'tiktok', 'youtube', 'twitter', 'facebook', 'linkedin'];
  const eventTypes = ['all', 'follow', 'comment', 'mention', 'dm'];

  return (
    <div>
      {/* Filters */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap' as const,
        alignItems: 'center',
        gap: '12px',
        marginBottom: '20px',
        padding: '16px 20px',
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '14px',
        border: '1px solid rgba(255,255,255,0.08)',
      }}>
        <span style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase' as const, letterSpacing: '1px', fontWeight: 600 }}>
          Platform
        </span>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' as const }}>
          {platforms.map(p => (
            <FilterChip
              key={p}
              label={p === 'all' ? 'All' : platformMeta[p]?.label || p}
              active={filterPlatform === p}
              onClick={() => setFilterPlatform(p)}
              accent={p !== 'all' ? platformMeta[p]?.color : undefined}
            />
          ))}
        </div>

        <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)', margin: '0 8px' }} />

        <span style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase' as const, letterSpacing: '1px', fontWeight: 600 }}>
          Type
        </span>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' as const }}>
          {eventTypes.map(t => (
            <FilterChip
              key={t}
              label={t === 'all' ? 'All' : eventConfig[t]?.label || t}
              active={filterType === t}
              onClick={() => setFilterType(t)}
              accent={t !== 'all' ? eventConfig[t]?.color : undefined}
            />
          ))}
        </div>
      </div>

      {/* Count + Refresh */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <span style={{ fontSize: '13px', color: '#666' }}>
          {total} signal{total !== 1 ? 's' : ''} total
        </span>
        <button
          onClick={fetchSignals}
          style={{
            padding: '6px 16px',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.05)',
            color: '#C77DFF',
            fontSize: '12px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          Refresh
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px 0' }}>
          <div style={{
            width: '32px', height: '32px',
            border: '3px solid rgba(255,107,157,0.2)',
            borderTopColor: '#FF6B9D',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Empty State */}
      {!loading && signals.length === 0 && (
        <div style={{
          textAlign: 'center' as const,
          padding: '64px 32px',
          background: 'linear-gradient(135deg, rgba(255,0,110,0.05) 0%, rgba(138,43,226,0.05) 100%)',
          borderRadius: '20px',
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '20px',
            background: 'linear-gradient(135deg, rgba(255,0,110,0.15) 0%, rgba(138,43,226,0.15) 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '36px', margin: '0 auto 20px',
            border: '1px solid rgba(255,0,110,0.2)',
          }}>
            📡
          </div>
          <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#fff', margin: '0 0 8px' }}>
            No activity yet
          </h3>
          <p style={{ color: '#888', fontSize: '14px', maxWidth: '400px', margin: '0 auto 24px', lineHeight: 1.6 }}>
            When people follow you, comment, mention you, or send DMs, their activity will appear here in real time.
          </p>
          <a
            href="/spacebaddie/automation"
            style={{
              display: 'inline-block',
              padding: '10px 24px',
              background: 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'opacity 0.2s',
              boxShadow: '0 4px 20px rgba(255,0,110,0.25)',
            }}
          >
            Connect Platforms
          </a>
        </div>
      )}

      {/* Signal List */}
      {!loading && signals.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '8px' }}>
          {signals.map(signal => {
            const contact = signal.spacebaddie_contacts;
            const pMeta = platformMeta[signal.platform] || { color: '#888', label: signal.platform };
            const eMeta = eventConfig[signal.type] || { icon: '📌', label: signal.type, color: '#888' };
            return (
              <div
                key={signal.signal_id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '16px 20px',
                  background: 'rgba(255,255,255,0.04)',
                  borderRadius: '14px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  transition: 'all 0.2s ease',
                  cursor: 'default',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.07)';
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.15)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)';
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.08)';
                }}
              >
                {/* Event icon badge */}
                <div style={{
                  width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
                  background: `linear-gradient(135deg, ${eMeta.color}30, ${eMeta.color}10)`,
                  border: `1px solid ${eMeta.color}40`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '20px',
                }}>
                  {eMeta.icon}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>
                      {contact?.display_name || `@${contact?.handle || 'unknown'}`}
                    </span>
                    <span style={{
                      padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 700,
                      background: `${pMeta.color}20`, color: pMeta.color,
                      textTransform: 'uppercase' as const, letterSpacing: '0.5px',
                    }}>
                      {pMeta.label}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', color: eMeta.color, fontWeight: 500 }}>
                      {eMeta.label}
                    </span>
                    {signal.content && (
                      <span style={{
                        fontSize: '13px', color: '#888',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
                      }}>
                        &mdash; {signal.content}
                      </span>
                    )}
                  </div>
                </div>

                {/* Time + badges */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                  {contact?.follower && (
                    <span style={{
                      padding: '3px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: 600,
                      background: 'rgba(0,200,100,0.1)', color: '#00D4D4',
                      border: '1px solid rgba(0,200,100,0.2)',
                    }}>
                      Follower
                    </span>
                  )}
                  <span style={{ fontSize: '12px', color: '#555', whiteSpace: 'nowrap' as const }}>
                    {timeAgo(signal.created_at)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {!loading && total > limit && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '16px', paddingTop: '24px',
        }}>
          <button
            onClick={() => setOffset(Math.max(0, offset - limit))}
            disabled={offset === 0}
            style={{
              padding: '8px 20px', borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)',
              color: offset === 0 ? '#444' : '#fff',
              fontSize: '13px', cursor: offset === 0 ? 'not-allowed' : 'pointer',
              opacity: offset === 0 ? 0.4 : 1,
              transition: 'all 0.2s',
            }}
          >
            Previous
          </button>
          <span style={{ fontSize: '12px', color: '#666' }}>
            {offset + 1}&#8211;{Math.min(offset + limit, total)} of {total}
          </span>
          <button
            onClick={() => setOffset(offset + limit)}
            disabled={offset + limit >= total}
            style={{
              padding: '8px 20px', borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)',
              color: offset + limit >= total ? '#444' : '#fff',
              fontSize: '13px', cursor: offset + limit >= total ? 'not-allowed' : 'pointer',
              opacity: offset + limit >= total ? 0.4 : 1,
              transition: 'all 0.2s',
            }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
