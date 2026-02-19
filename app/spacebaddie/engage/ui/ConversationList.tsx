'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface Contact {
  contact_id: string;
  handle: string;
  display_name: string | null;
  avatar_url: string | null;
  platform: string;
  follower: boolean;
  profile_url: string | null;
}

interface Message {
  message_id: string;
  tenant: string;
  conversation_id: string;
  contact_id: string;
  direction: string;
  channel: string;
  content: string;
  status: string;
  created_at: string;
  sent_at: string | null;
  error: string | null;
}

interface Conversation {
  conversation_id: string;
  tenant: string;
  platform: string;
  contact_id: string;
  status: string;
  last_message_at: string | null;
  created_at: string;
  spacebaddie_contacts: Contact | null;
  message_count: number;
  last_message: Message | null;
}

const platformMeta: Record<string, { color: string; label: string }> = {
  youtube: { color: '#FF0000', label: 'YouTube' },
  tiktok: { color: '#FF2D55', label: 'TikTok' },
  instagram: { color: '#C13584', label: 'Instagram' },
  twitter: { color: '#1DA1F2', label: 'X' },
  facebook: { color: '#1877F2', label: 'Facebook' },
  linkedin: { color: '#0077B5', label: 'LinkedIn' },
};

const statusStyle: Record<string, { bg: string; color: string }> = {
  queued: { bg: 'rgba(245,158,11,0.1)', color: '#F59E0B' },
  sending: { bg: 'rgba(59,130,246,0.1)', color: '#3B82F6' },
  sent: { bg: 'rgba(0,200,100,0.1)', color: '#22C55E' },
  failed: { bg: 'rgba(239,68,68,0.1)', color: '#EF4444' },
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

export function ConversationList() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConvo, setSelectedConvo] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [filterPlatform, setFilterPlatform] = useState('all');

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterPlatform !== 'all') params.set('platform', filterPlatform);
      const res = await fetch(`/api/spacebaddie/engage/conversations?${params}`);
      const data = await res.json();
      if (data.ok) setConversations(data.conversations);
    } catch (err) {
      console.error('[ConversationList] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [filterPlatform]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  const fetchMessages = useCallback(async (convoId: string) => {
    try {
      setMessagesLoading(true);
      const res = await fetch(`/api/spacebaddie/engage/conversations?conversation_id=${convoId}`);
      const data = await res.json();
      if (data.ok) setMessages(data.messages);
    } catch (err) {
      console.error('[ConversationList] Messages fetch error:', err);
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  const handleSelect = (convoId: string) => {
    if (selectedConvo === convoId) { setSelectedConvo(null); setMessages([]); return; }
    setSelectedConvo(convoId);
    fetchMessages(convoId);
  };

  const handleSend = async (convo: Conversation) => {
    if (!replyText.trim() || sending) return;
    try {
      setSending(true);
      const res = await fetch('/api/spacebaddie/engage/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: convo.conversation_id,
          contact_id: convo.contact_id,
          content: replyText.trim(),
          channel: 'dm',
        }),
      });
      const data = await res.json();
      if (data.ok) { setReplyText(''); fetchMessages(convo.conversation_id); fetchConversations(); }
    } catch (err) {
      console.error('[ConversationList] Reply error:', err);
    } finally {
      setSending(false);
    }
  };

  const platforms = ['all', 'instagram', 'tiktok', 'youtube', 'twitter', 'facebook', 'linkedin'];

  return (
    <div>
      {/* Platform filter */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px',
        padding: '14px 20px', background: 'rgba(255,255,255,0.03)',
        borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)',
      }}>
        <span style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase' as const, letterSpacing: '1px', fontWeight: 600 }}>
          Platform
        </span>
        {platforms.map(p => (
          <button
            key={p}
            onClick={() => setFilterPlatform(p)}
            style={{
              padding: '5px 14px', borderRadius: '20px', fontSize: '12px',
              border: filterPlatform === p ? `1px solid ${platformMeta[p]?.color || 'rgba(255,0,110,0.5)'}` : '1px solid rgba(255,255,255,0.1)',
              background: filterPlatform === p ? `${platformMeta[p]?.color || '#FF006E'}18` : 'rgba(255,255,255,0.03)',
              color: filterPlatform === p ? '#fff' : '#888',
              fontWeight: filterPlatform === p ? 600 : 400,
              cursor: 'pointer', transition: 'all 0.2s ease',
            }}
          >
            {p === 'all' ? 'All' : platformMeta[p]?.label || p}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px 0' }}>
          <div style={{
            width: '32px', height: '32px',
            border: '3px solid rgba(255,107,157,0.2)', borderTopColor: '#FF6B9D',
            borderRadius: '50%', animation: 'spin 1s linear infinite',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Empty State */}
      {!loading && conversations.length === 0 && (
        <div style={{
          textAlign: 'center' as const, padding: '64px 32px',
          background: 'linear-gradient(135deg, rgba(0,212,212,0.05) 0%, rgba(138,43,226,0.05) 100%)',
          borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)',
        }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '20px',
            background: 'linear-gradient(135deg, rgba(0,212,212,0.15), rgba(138,43,226,0.15))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '36px', margin: '0 auto 20px',
            border: '1px solid rgba(0,212,212,0.2)',
          }}>
            💬
          </div>
          <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#fff', margin: '0 0 8px' }}>No conversations yet</h3>
          <p style={{ color: '#888', fontSize: '14px', maxWidth: '400px', margin: '0 auto', lineHeight: 1.6 }}>
            Conversations are created automatically when someone interacts with you.
            Enable auto-reply in the Auto-Reply tab to start engaging.
          </p>
        </div>
      )}

      {/* Conversation List */}
      {!loading && conversations.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '8px' }}>
          {conversations.map(convo => {
            const contact = convo.spacebaddie_contacts;
            const isSelected = selectedConvo === convo.conversation_id;
            const pMeta = platformMeta[convo.platform] || { color: '#888', label: convo.platform };

            return (
              <div key={convo.conversation_id} style={{
                borderRadius: '14px',
                border: isSelected ? `1px solid ${pMeta.color}40` : '1px solid rgba(255,255,255,0.08)',
                overflow: 'hidden',
                transition: 'all 0.2s ease',
              }}>
                {/* Header */}
                <button
                  onClick={() => handleSelect(convo.conversation_id)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '16px',
                    padding: '16px 20px', textAlign: 'left' as const, cursor: 'pointer',
                    background: isSelected ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
                    border: 'none', color: '#fff', transition: 'background 0.2s',
                  }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
                    background: `linear-gradient(135deg, ${pMeta.color}60, ${pMeta.color})`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '16px', fontWeight: 700, color: '#fff',
                    overflow: 'hidden',
                  }}>
                    {contact?.avatar_url
                      ? <img src={contact.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' as const }} />
                      : (contact?.handle || '?').charAt(0).toUpperCase()
                    }
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>
                        {contact?.display_name || `@${contact?.handle || 'unknown'}`}
                      </span>
                      <span style={{
                        padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 700,
                        background: `${pMeta.color}20`, color: pMeta.color,
                        textTransform: 'uppercase' as const,
                      }}>
                        {pMeta.label}
                      </span>
                      {contact?.follower && (
                        <span style={{
                          padding: '2px 8px', borderRadius: '8px', fontSize: '10px', fontWeight: 600,
                          background: 'rgba(0,200,100,0.1)', color: '#00D4D4',
                        }}>
                          Follower
                        </span>
                      )}
                    </div>
                    {convo.last_message && (
                      <p style={{
                        fontSize: '12px', color: '#888', margin: '4px 0 0',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
                      }}>
                        {convo.last_message.direction === 'outgoing' ? 'You: ' : ''}
                        {convo.last_message.content}
                      </p>
                    )}
                  </div>

                  {/* Meta */}
                  <div style={{ flexShrink: 0, textAlign: 'right' as const }}>
                    <div style={{ fontSize: '11px', color: '#555' }}>
                      {convo.last_message_at ? timeAgo(convo.last_message_at) : ''}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end', marginTop: '4px' }}>
                      <span style={{ fontSize: '10px', color: '#666' }}>
                        {convo.message_count} msg{convo.message_count !== 1 ? 's' : ''}
                      </span>
                      <span style={{
                        padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 500,
                        background: convo.status === 'open' ? 'rgba(0,200,100,0.1)' : 'rgba(255,255,255,0.05)',
                        color: convo.status === 'open' ? '#22C55E' : '#666',
                      }}>
                        {convo.status}
                      </span>
                    </div>
                  </div>

                  <svg
                    width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2"
                    style={{ transition: 'transform 0.2s', transform: isSelected ? 'rotate(180deg)' : 'none', flexShrink: 0 }}
                  >
                    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {/* Expanded Messages */}
                {isSelected && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.2)' }}>
                    {messagesLoading ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px' }}>
                        <div style={{
                          width: '24px', height: '24px',
                          border: '2px solid rgba(255,107,157,0.2)', borderTopColor: '#FF6B9D',
                          borderRadius: '50%', animation: 'spin 1s linear infinite',
                        }} />
                      </div>
                    ) : messages.length === 0 ? (
                      <div style={{ padding: '24px', textAlign: 'center' as const, color: '#666', fontSize: '13px' }}>
                        No messages in this conversation.
                      </div>
                    ) : (
                      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column' as const, gap: '10px', maxHeight: '320px', overflowY: 'auto' as const }}>
                        {messages.map(msg => {
                          const isOut = msg.direction === 'outgoing';
                          const st = statusStyle[msg.status] || { bg: 'transparent', color: '#888' };
                          return (
                            <div key={msg.message_id} style={{ display: 'flex', justifyContent: isOut ? 'flex-end' : 'flex-start' }}>
                              <div style={{
                                maxWidth: '70%', padding: '10px 14px', borderRadius: '14px', fontSize: '13px',
                                background: isOut
                                  ? 'linear-gradient(135deg, rgba(138,43,226,0.2), rgba(255,0,110,0.15))'
                                  : 'rgba(255,255,255,0.06)',
                                border: isOut ? '1px solid rgba(138,43,226,0.25)' : '1px solid rgba(255,255,255,0.08)',
                                color: '#e0e0e0',
                              }}>
                                <p style={{ margin: 0 }}>{msg.content}</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                                  <span style={{ fontSize: '10px', color: '#555' }}>{timeAgo(msg.created_at)}</span>
                                  {isOut && (
                                    <span style={{
                                      fontSize: '10px', padding: '1px 6px', borderRadius: '4px',
                                      background: st.bg, color: st.color,
                                    }}>
                                      {msg.status}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Reply Composer */}
                    <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input
                          type="text"
                          value={replyText}
                          onChange={e => setReplyText(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleSend(convo)}
                          placeholder="Type a reply..."
                          style={{
                            flex: 1, padding: '10px 16px', borderRadius: '10px',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: '#fff', fontSize: '13px', outline: 'none',
                          }}
                        />
                        <button
                          onClick={() => handleSend(convo)}
                          disabled={!replyText.trim() || sending}
                          style={{
                            padding: '10px 20px', borderRadius: '10px', border: 'none',
                            background: !replyText.trim() || sending
                              ? 'rgba(255,255,255,0.08)'
                              : 'linear-gradient(135deg, #FF006E, #8A2BE2)',
                            color: !replyText.trim() || sending ? '#555' : '#fff',
                            fontSize: '13px', fontWeight: 600, cursor: !replyText.trim() || sending ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s',
                          }}
                        >
                          {sending ? 'Sending...' : 'Send'}
                        </button>
                      </div>
                      <p style={{ fontSize: '10px', color: '#555', margin: '6px 0 0' }}>
                        Messages are queued and sent via your connected platform.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
