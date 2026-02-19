'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface Rule {
  id: string | null;
  user_id: string;
  event_type: string;
  platform: string;
  enabled: boolean;
  template: string;
  delay_seconds: number;
  created_at: string | null;
  updated_at: string | null;
}

const eventTypeConfig: Record<string, { icon: string; label: string; description: string; color: string }> = {
  follow: { icon: '👤', label: 'New Follower', description: 'Auto-reply when someone follows you', color: '#8A2BE2' },
  comment: { icon: '💬', label: 'Comment', description: 'Auto-reply to comments on your posts', color: '#FF6B9D' },
  mention: { icon: '📣', label: 'Mention', description: 'Auto-reply when someone mentions you', color: '#00D4D4' },
  dm: { icon: '✉️', label: 'Direct Message', description: 'Auto-reply to incoming DMs', color: '#F59E0B' },
};

const platformOptions = [
  { value: 'all', label: 'All Platforms' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'twitter', label: 'X (Twitter)' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'linkedin', label: 'LinkedIn' },
];

export function AutoReplyRules() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editingRule, setEditingRule] = useState<string | null>(null);
  const [previewHandle, setPreviewHandle] = useState('johndoe');

  const fetchRules = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/spacebaddie/engage/rules');
      const data = await res.json();
      if (data.ok) setRules(data.rules);
    } catch (err) {
      console.error('[AutoReplyRules] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  const handleToggle = (eventType: string) => {
    setRules(prev => prev.map(r => r.event_type === eventType ? { ...r, enabled: !r.enabled } : r));
  };
  const handleTemplateChange = (eventType: string, template: string) => {
    setRules(prev => prev.map(r => r.event_type === eventType ? { ...r, template } : r));
  };
  const handleDelayChange = (eventType: string, delay: number) => {
    setRules(prev => prev.map(r => r.event_type === eventType ? { ...r, delay_seconds: delay } : r));
  };
  const handlePlatformChange = (eventType: string, platform: string) => {
    setRules(prev => prev.map(r => r.event_type === eventType ? { ...r, platform } : r));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await fetch('/api/spacebaddie/engage/rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rules }),
      });
      const data = await res.json();
      if (data.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
    } catch (err) {
      console.error('[AutoReplyRules] Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  const renderTemplate = (template: string) => template.replace(/\{\{handle\}\}/g, previewHandle);

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

  return (
    <div>
      {/* Header bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '24px', padding: '16px 20px',
        background: 'rgba(255,255,255,0.03)', borderRadius: '14px',
        border: '1px solid rgba(255,255,255,0.08)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase' as const, letterSpacing: '1px', fontWeight: 600 }}>
            Preview as
          </span>
          <input
            type="text"
            value={previewHandle}
            onChange={e => setPreviewHandle(e.target.value)}
            placeholder="handle"
            style={{
              padding: '6px 12px', borderRadius: '8px', width: '140px',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff', fontSize: '13px', outline: 'none',
            }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {saved && (
            <span style={{ fontSize: '13px', color: '#22C55E', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="3">
                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Saved
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '8px 24px', borderRadius: '10px', border: 'none',
              background: saving ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)',
              color: saving ? '#555' : '#fff',
              fontSize: '13px', fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
              boxShadow: saving ? 'none' : '0 4px 16px rgba(255,0,110,0.2)',
              transition: 'all 0.2s',
            }}
          >
            {saving ? 'Saving...' : 'Save Rules'}
          </button>
        </div>
      </div>

      {/* Rule Cards */}
      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '12px' }}>
        {rules.map(rule => {
          const config = eventTypeConfig[rule.event_type];
          if (!config) return null;
          const isEditing = editingRule === rule.event_type;

          return (
            <div
              key={rule.event_type}
              style={{
                borderRadius: '16px',
                border: rule.enabled ? `1px solid ${config.color}30` : '1px solid rgba(255,255,255,0.06)',
                background: rule.enabled
                  ? `linear-gradient(135deg, ${config.color}08, ${config.color}04)`
                  : 'rgba(255,255,255,0.02)',
                overflow: 'hidden',
                transition: 'all 0.2s ease',
              }}
            >
              {/* Rule Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '18px 20px' }}>
                {/* Icon */}
                <div style={{
                  width: '48px', height: '48px', borderRadius: '14px', flexShrink: 0,
                  background: `linear-gradient(135deg, ${config.color}25, ${config.color}10)`,
                  border: `1px solid ${config.color}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '22px',
                }}>
                  {config.icon}
                </div>

                {/* Label */}
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#fff' }}>
                    {config.label}
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#666' }}>{config.description}</p>
                </div>

                {/* Platform badge */}
                <span style={{
                  padding: '4px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 500,
                  background: 'rgba(255,255,255,0.05)', color: '#888',
                  textTransform: 'capitalize' as const,
                }}>
                  {rule.platform === 'all' ? 'All Platforms' : rule.platform}
                </span>

                {/* Toggle */}
                <button
                  onClick={() => handleToggle(rule.event_type)}
                  title={rule.enabled ? `Disable ${config.label} auto-reply` : `Enable ${config.label} auto-reply`}
                  style={{
                    position: 'relative' as const,
                    width: '48px', height: '26px', borderRadius: '13px',
                    background: rule.enabled
                      ? `linear-gradient(135deg, ${config.color}, ${config.color}CC)`
                      : 'rgba(255,255,255,0.1)',
                    border: 'none', cursor: 'pointer',
                    transition: 'background 0.2s',
                    boxShadow: rule.enabled ? `0 2px 12px ${config.color}40` : 'none',
                  }}
                >
                  <div style={{
                    position: 'absolute' as const, top: '3px',
                    left: rule.enabled ? '24px' : '3px',
                    width: '20px', height: '20px', borderRadius: '50%',
                    background: '#fff',
                    transition: 'left 0.2s ease',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                  }} />
                </button>

                {/* Expand */}
                <button
                  onClick={() => setEditingRule(isEditing ? null : rule.event_type)}
                  title={isEditing ? 'Collapse' : 'Edit rule'}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#666', padding: '4px',
                    transition: 'color 0.2s',
                  }}
                >
                  <svg
                    width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    style={{ transition: 'transform 0.2s', transform: isEditing ? 'rotate(180deg)' : 'none' }}
                  >
                    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>

              {/* Expanded Editor */}
              {isEditing && (
                <div style={{
                  padding: '20px', borderTop: '1px solid rgba(255,255,255,0.06)',
                  background: 'rgba(0,0,0,0.15)',
                }}>
                  {/* Template */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '11px', color: '#666', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '8px', fontWeight: 600 }}>
                      Reply Template
                    </label>
                    <textarea
                      value={rule.template}
                      onChange={e => handleTemplateChange(rule.event_type, e.target.value)}
                      rows={3}
                      placeholder="Enter your auto-reply template..."
                      style={{
                        width: '100%', padding: '12px 16px', borderRadius: '10px',
                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                        color: '#fff', fontSize: '13px', outline: 'none', resize: 'none' as const,
                        lineHeight: 1.5, fontFamily: 'inherit',
                      }}
                    />
                  </div>

                  {/* Preview */}
                  <div style={{
                    padding: '14px 16px', borderRadius: '10px', marginBottom: '16px',
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    <div style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '6px' }}>
                      Preview
                    </div>
                    <p style={{ margin: 0, fontSize: '13px', color: '#ccc', lineHeight: 1.5 }}>
                      {renderTemplate(rule.template)}
                    </p>
                  </div>

                  {/* Platform + Delay */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: '#666', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '8px', fontWeight: 600 }}>
                        Platform
                      </label>
                      <select
                        value={rule.platform}
                        onChange={e => handlePlatformChange(rule.event_type, e.target.value)}
                        title="Select platform for this rule"
                        style={{
                          width: '100%', padding: '10px 14px', borderRadius: '10px',
                          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                          color: '#fff', fontSize: '13px', outline: 'none',
                          appearance: 'none' as const, cursor: 'pointer',
                        }}
                      >
                        {platformOptions.map(p => (
                          <option key={p.value} value={p.value} style={{ background: '#1a1a2e', color: '#fff' }}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: '#666', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '8px', fontWeight: 600 }}>
                        Delay (seconds)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={86400}
                        value={rule.delay_seconds}
                        onChange={e => handleDelayChange(rule.event_type, parseInt(e.target.value) || 0)}
                        title="Reply delay in seconds"
                        placeholder="0"
                        style={{
                          width: '100%', padding: '10px 14px', borderRadius: '10px',
                          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                          color: '#fff', fontSize: '13px', outline: 'none',
                        }}
                      />
                      <p style={{ fontSize: '10px', color: '#555', margin: '4px 0 0' }}>0 = instant reply</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Help card */}
      <div style={{
        marginTop: '24px', padding: '20px',
        background: 'linear-gradient(135deg, rgba(0,212,212,0.05) 0%, rgba(138,43,226,0.05) 100%)',
        borderRadius: '14px', border: '1px solid rgba(0,212,212,0.15)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
            background: 'linear-gradient(135deg, rgba(0,212,212,0.15), rgba(138,43,226,0.15))',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
          }}>
            💡
          </div>
          <div>
            <h4 style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: 600, color: '#fff' }}>How auto-reply works</h4>
            <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: '#888', lineHeight: 1.8 }}>
              <li>When a social event is received, the system checks your rules.</li>
              <li>If a matching rule is enabled, the reply is queued and sent via your connected platform.</li>
              <li>Use <code style={{ color: '#C77DFF', background: 'rgba(138,43,226,0.15)', padding: '1px 6px', borderRadius: '4px', fontSize: '11px' }}>{'{{handle}}'}</code> in templates to personalize with their username.</li>
              <li>Set a delay to avoid appearing like an instant bot response.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
