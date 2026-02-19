'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface Series {
  seriesId: string;
  title: string;
  description?: string;
  storyArc?: string;
  characterPersona?: string;
  contentStyle: string;
  totalEpisodes: number;
  currentEpisode: number;
  frequency: string;
  platforms: string[];
  status: string;
  nextEpisodeAt?: string;
  createdAt: string;
}

interface CreateSeriesForm {
  title: string;
  description: string;
  storyArc: string;
  characterPersona: string;
  contentStyle: string;
  totalEpisodes: number;
  frequency: string;
  platforms: string[];
  autoStart: boolean;
}

export function ContentSeries() {
  const [series, setSeries] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [form, setForm] = useState<CreateSeriesForm>({
    title: '',
    description: '',
    storyArc: '',
    characterPersona: '',
    contentStyle: 'storytelling',
    totalEpisodes: 10,
    frequency: 'daily',
    platforms: ['youtube'],
    autoStart: false,
  });

  const fetchSeries = useCallback(async () => {
    try {
      const res = await fetch('/api/spacebaddie/series');
      const data = await res.json();
      if (data.ok) {
        setSeries(data.series || []);
      }
    } catch (err) {
      console.error('[ContentSeries] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSeries();
  }, [fetchSeries]);

  const handleCreate = async () => {
    if (!form.title || (!form.storyArc && !form.characterPersona)) {
      setMessage({ text: 'Title and either Story Arc or Character Persona required', type: 'error' });
      return;
    }

    setCreating(true);
    setMessage(null);

    try {
      const res = await fetch('/api/spacebaddie/series', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (data.ok) {
        setMessage({ text: data.message || 'Series created!', type: 'success' });
        setShowCreateForm(false);
        setForm({
          title: '',
          description: '',
          storyArc: '',
          characterPersona: '',
          contentStyle: 'storytelling',
          totalEpisodes: 10,
          frequency: 'daily',
          platforms: ['youtube'],
          autoStart: false,
        });
        fetchSeries();
      } else {
        setMessage({ text: data.error || 'Failed to create series', type: 'error' });
      }
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setCreating(false);
    }
  };

  const handleAction = async (seriesId: string, action: 'activate' | 'pause' | 'delete' | 'generate') => {
    setActionLoading(seriesId);
    setMessage(null);

    try {
      if (action === 'delete') {
        const res = await fetch(`/api/spacebaddie/series/${seriesId}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.ok) {
          setMessage({ text: 'Series deleted', type: 'success' });
          fetchSeries();
        } else {
          setMessage({ text: data.error, type: 'error' });
        }
      } else if (action === 'generate') {
        const res = await fetch('/api/spacebaddie/series/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ seriesId }),
        });
        const data = await res.json();
        if (data.ok) {
          setMessage({ text: data.message || 'Episode generated!', type: 'success' });
          fetchSeries();
        } else {
          setMessage({ text: data.error, type: 'error' });
        }
      } else {
        // Include browser timezone so scheduling uses the correct local time
        const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const res = await fetch(`/api/spacebaddie/series/${seriesId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            status: action === 'activate' ? 'active' : 'paused',
            timezone: userTimezone,
          }),
        });
        const data = await res.json();
        if (data.ok) {
          setMessage({ text: data.message || `Series ${action}d`, type: 'success' });
          fetchSeries();
        } else {
          setMessage({ text: data.error, type: 'error' });
        }
      }
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return { bg: 'rgba(0,200,83,0.2)', color: '#00C853' };
      case 'draft': return { bg: 'rgba(255,193,7,0.2)', color: '#FFC107' };
      case 'paused': return { bg: 'rgba(255,152,0,0.2)', color: '#FF9800' };
      case 'completed': return { bg: 'rgba(0,212,212,0.2)', color: '#00D4D4' };
      case 'failed': return { bg: 'rgba(255,0,0,0.2)', color: '#FF6B6B' };
      default: return { bg: 'rgba(136,136,136,0.2)', color: '#888' };
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    background: 'rgba(0,0,0,0.4)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(138,43,226,0.08) 0%, rgba(255,0,110,0.05) 100%)',
      border: '1px solid rgba(199,125,255,0.15)',
      borderRadius: '20px',
      padding: '28px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h3 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <span style={{ 
              background: 'linear-gradient(135deg, #FF006E 0%, #C77DFF 100%)', 
              WebkitBackgroundClip: 'text', 
              WebkitTextFillColor: 'transparent',
              fontSize: '26px' 
            }}>🎬</span> 
            Autonomous Content Series
          </h3>
          <p style={{ color: '#888', fontSize: '13px' }}>AI-powered video series that generate and post automatically</p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          style={{
            padding: '12px 24px',
            background: showCreateForm 
              ? 'rgba(255,107,107,0.15)' 
              : 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)',
            border: showCreateForm ? '1px solid rgba(255,107,107,0.3)' : 'none',
            borderRadius: '12px',
            color: showCreateForm ? '#FF6B6B' : '#fff',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '14px',
            boxShadow: showCreateForm ? 'none' : '0 4px 20px rgba(255,0,110,0.3)',
            transition: 'all 0.2s ease',
          }}
        >
          {showCreateForm ? '✕ Cancel' : '+ Create Series'}
        </button>
      </div>

      {/* Message */}
      {message && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '16px',
          background: message.type === 'success' ? 'rgba(0,200,83,0.1)' : 'rgba(255,0,0,0.1)',
          border: `1px solid ${message.type === 'success' ? 'rgba(0,200,83,0.3)' : 'rgba(255,0,0,0.3)'}`,
          color: message.type === 'success' ? '#00C853' : '#FF6B6B',
        }}>
          {message.type === 'success' ? '✅' : '❌'} {message.text}
        </div>
      )}

      {/* Create Form */}
      {showCreateForm && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(0,0,0,0.4) 0%, rgba(138,43,226,0.1) 100%)',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
          border: '1px solid rgba(199,125,255,0.2)',
        }}>
          <h4 style={{ color: '#fff', marginBottom: '20px', fontSize: '18px', fontWeight: 600 }}>
            ✨ Create New Series
          </h4>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', color: '#C77DFF', marginBottom: '8px', fontSize: '13px', fontWeight: 500 }}>Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="My Daily Show"
                  style={{...inputStyle, borderRadius: '10px', border: '1px solid rgba(199,125,255,0.2)'}}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', color: '#C77DFF', marginBottom: '8px', fontSize: '13px', fontWeight: 500 }}>Episodes</label>
                <input
                  type="number"
                  value={form.totalEpisodes}
                  onChange={(e) => setForm({ ...form, totalEpisodes: parseInt(e.target.value) || 10 })}
                  min={1}
                  max={100}
                  style={{...inputStyle, borderRadius: '10px', border: '1px solid rgba(199,125,255,0.2)'}}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', color: '#C77DFF', marginBottom: '8px', fontSize: '13px', fontWeight: 500 }}>Story Arc *</label>
              <textarea
                value={form.storyArc}
                onChange={(e) => setForm({ ...form, storyArc: e.target.value })}
                placeholder="A young creator discovers the power of AI and builds an empire..."
                rows={3}
                style={{ ...inputStyle, resize: 'vertical', borderRadius: '10px', border: '1px solid rgba(199,125,255,0.2)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', color: '#C77DFF', marginBottom: '8px', fontSize: '13px', fontWeight: 500 }}>Character Persona *</label>
              <textarea
                value={form.characterPersona}
                onChange={(e) => setForm({ ...form, characterPersona: e.target.value })}
                placeholder="I'm Alex, an enthusiastic tech creator who loves sharing AI tips..."
                rows={2}
                style={{ ...inputStyle, resize: 'vertical', borderRadius: '10px', border: '1px solid rgba(199,125,255,0.2)' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', color: '#C77DFF', marginBottom: '8px', fontSize: '13px', fontWeight: 500 }}>Content Style</label>
                <select
                  value={form.contentStyle}
                  onChange={(e) => setForm({ ...form, contentStyle: e.target.value })}
                  style={{...inputStyle, borderRadius: '10px', border: '1px solid rgba(199,125,255,0.2)'}}
                >
                  <option value="storytelling">Storytelling</option>
                  <option value="educational">Educational</option>
                  <option value="comedy">Comedy</option>
                  <option value="news">News/Updates</option>
                  <option value="promotional">Promotional</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', color: '#C77DFF', marginBottom: '8px', fontSize: '13px', fontWeight: 500 }}>Frequency</label>
                <select
                  value={form.frequency}
                  onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                  style={{...inputStyle, borderRadius: '10px', border: '1px solid rgba(199,125,255,0.2)'}}
                >
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'rgba(199,125,255,0.1)', borderRadius: '10px' }}>
              <input
                type="checkbox"
                id="autoStart"
                checked={form.autoStart}
                onChange={(e) => setForm({ ...form, autoStart: e.target.checked })}
                style={{ width: '18px', height: '18px', accentColor: '#FF006E' }}
              />
              <label htmlFor="autoStart" style={{ color: '#fff', fontSize: '14px' }}>
                Auto-start series immediately
              </label>
            </div>

            <button
              onClick={handleCreate}
              disabled={creating}
              style={{
                padding: '14px 28px',
                background: creating ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)',
                border: 'none',
                borderRadius: '12px',
                color: '#fff',
                fontWeight: 600,
                cursor: creating ? 'not-allowed' : 'pointer',
                fontSize: '15px',
                boxShadow: creating ? 'none' : '0 4px 20px rgba(255,0,110,0.3)',
                transition: 'all 0.2s ease',
              }}
            >
              {creating ? '⏳ Creating...' : '🚀 Create Series'}
            </button>
          </div>
        </div>
      )}

      {/* Series List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#888' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '3px solid rgba(199,125,255,0.2)',
            borderTopColor: '#C77DFF',
            borderRadius: '50%',
            margin: '0 auto 16px',
            animation: 'spin 1s linear infinite',
          }} />
          Loading series...
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : series.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '60px 32px',
          background: 'linear-gradient(135deg, rgba(138,43,226,0.05) 0%, rgba(255,0,110,0.03) 100%)',
          borderRadius: '16px',
          border: '1px dashed rgba(199,125,255,0.3)',
        }}>
          <div style={{ 
            fontSize: '56px', 
            marginBottom: '16px',
            filter: 'drop-shadow(0 4px 20px rgba(199,125,255,0.3))',
          }}>🎬</div>
          <h4 style={{ color: '#fff', marginBottom: '8px', fontSize: '18px', fontWeight: 600 }}>No Content Series Yet</h4>
          <p style={{ color: '#888', maxWidth: '300px', margin: '0 auto' }}>
            Create your first autonomous series to start generating content automatically!
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {series.map((s) => {
            const statusStyle = getStatusColor(s.status);
            const progress = (s.currentEpisode / s.totalEpisodes) * 100;

            return (
              <div key={s.seriesId} style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(138,43,226,0.08) 100%)',
                border: '1px solid rgba(199,125,255,0.15)',
                borderRadius: '16px',
                padding: '20px',
                transition: 'all 0.2s ease',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <h4 style={{ color: '#fff', fontWeight: 600, fontSize: '16px', marginBottom: '6px' }}>{s.title}</h4>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ 
                        padding: '4px 10px', 
                        background: 'rgba(199,125,255,0.15)', 
                        borderRadius: '20px', 
                        fontSize: '11px', 
                        color: '#C77DFF',
                        textTransform: 'capitalize',
                      }}>
                        {s.contentStyle}
                      </span>
                      <span style={{ 
                        padding: '4px 10px', 
                        background: 'rgba(0,212,212,0.15)', 
                        borderRadius: '20px', 
                        fontSize: '11px', 
                        color: '#00D4D4',
                        textTransform: 'capitalize',
                      }}>
                        {s.frequency}
                      </span>
                    </div>
                  </div>
                  <span style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: 600,
                    background: statusStyle.bg,
                    color: statusStyle.color,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>
                    {s.status}
                  </span>
                </div>

                {/* Progress */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: '#aaa', fontSize: '13px' }}>
                      Episode {s.currentEpisode} of {s.totalEpisodes}
                    </span>
                    <span style={{ 
                      color: '#C77DFF', 
                      fontSize: '13px', 
                      fontWeight: 600 
                    }}>{Math.round(progress)}%</span>
                  </div>
                  <div style={{
                    height: '8px',
                    background: 'rgba(255,255,255,0.08)',
                    borderRadius: '4px',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${progress}%`,
                      background: 'linear-gradient(90deg, #FF006E, #C77DFF)',
                      borderRadius: '4px',
                      transition: 'width 0.3s ease',
                      boxShadow: '0 0 10px rgba(255,0,110,0.4)',
                    }} />
                  </div>
                </div>

                {/* Next Episode */}
                {s.status === 'active' && s.nextEpisodeAt && (
                  <div style={{ 
                    color: '#00D4D4', 
                    fontSize: '12px', 
                    marginBottom: '16px',
                    padding: '8px 12px',
                    background: 'rgba(0,212,212,0.1)',
                    borderRadius: '8px',
                    display: 'inline-block',
                  }}>
                    ⏰ Next episode: {new Date(s.nextEpisodeAt).toLocaleString()}
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {s.status === 'draft' && (
                    <button
                      onClick={() => handleAction(s.seriesId, 'activate')}
                      disabled={actionLoading === s.seriesId}
                      style={{
                        padding: '8px 16px',
                        background: 'linear-gradient(135deg, #00C853 0%, #00D4D4 100%)',
                        border: 'none',
                        borderRadius: '10px',
                        color: '#fff',
                        fontSize: '13px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        boxShadow: '0 2px 10px rgba(0,200,83,0.3)',
                      }}
                    >
                      ▶️ Activate
                    </button>
                  )}
                  {s.status === 'active' && (
                    <>
                      <button
                        onClick={() => handleAction(s.seriesId, 'pause')}
                        disabled={actionLoading === s.seriesId}
                        style={{
                          padding: '8px 16px',
                          background: 'rgba(255,152,0,0.15)',
                          border: '1px solid rgba(255,152,0,0.3)',
                          borderRadius: '10px',
                          color: '#FF9800',
                          fontSize: '13px',
                          fontWeight: 500,
                          cursor: 'pointer',
                        }}
                      >
                        ⏸️ Pause
                      </button>
                      <button
                        onClick={() => handleAction(s.seriesId, 'generate')}
                        disabled={actionLoading === s.seriesId}
                        style={{
                          padding: '8px 16px',
                          background: 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)',
                          border: 'none',
                          borderRadius: '10px',
                          color: '#fff',
                          fontSize: '13px',
                          fontWeight: 500,
                          cursor: 'pointer',
                          boxShadow: '0 2px 10px rgba(255,0,110,0.3)',
                        }}
                      >
                        ⚡ Generate Now
                      </button>
                    </>
                  )}
                  {s.status === 'paused' && (
                    <button
                      onClick={() => handleAction(s.seriesId, 'activate')}
                      disabled={actionLoading === s.seriesId}
                      style={{
                        padding: '8px 16px',
                        background: 'linear-gradient(135deg, #00C853 0%, #00D4D4 100%)',
                        border: 'none',
                        borderRadius: '10px',
                        color: '#fff',
                        fontSize: '13px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        boxShadow: '0 2px 10px rgba(0,200,83,0.3)',
                      }}
                    >
                      ▶️ Resume
                    </button>
                  )}
                  <Link
                    href={`/spacebaddie/studio/series/${s.seriesId}`}
                    style={{
                      padding: '8px 16px',
                      background: 'rgba(0,212,212,0.12)',
                      border: '1px solid rgba(0,212,212,0.25)',
                      borderRadius: '10px',
                      color: '#00D4D4',
                      fontSize: '13px',
                      fontWeight: 500,
                      textDecoration: 'none',
                    }}
                  >
                    ⚙️ Manage
                  </Link>
                  <button
                    onClick={() => handleAction(s.seriesId, 'delete')}
                    disabled={actionLoading === s.seriesId}
                    style={{
                      padding: '8px 16px',
                      background: 'rgba(255,107,107,0.1)',
                      border: '1px solid rgba(255,107,107,0.2)',
                      borderRadius: '10px',
                      color: '#FF6B6B',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info Box */}
      <div style={{
        marginTop: '28px',
        padding: '20px',
        background: 'linear-gradient(135deg, rgba(199,125,255,0.08) 0%, rgba(255,0,110,0.05) 100%)',
        border: '1px solid rgba(199,125,255,0.2)',
        borderRadius: '16px',
        display: 'flex',
        gap: '16px',
        alignItems: 'flex-start',
      }}>
        <div style={{
          width: '44px',
          height: '44px',
          background: 'linear-gradient(135deg, #C77DFF 0%, #FF006E 100%)',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '22px',
          flexShrink: 0,
        }}>
          🤖
        </div>
        <div>
          <h5 style={{ color: '#fff', marginBottom: '10px', fontSize: '15px', fontWeight: 600 }}>How Autonomous Series Work</h5>
          <ul style={{ color: '#999', fontSize: '13px', margin: 0, paddingLeft: '18px', lineHeight: 1.8 }}>
            <li>AI writes each episode&apos;s script continuing your story</li>
            <li>Videos are generated automatically using your avatar</li>
            <li>Episodes are scheduled and posted to your platforms</li>
            <li>Story context is maintained across all episodes</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
