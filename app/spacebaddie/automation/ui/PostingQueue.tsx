'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ContentQueueItem, SocialPlatform } from '@/lib/spacebaddie/types';

interface QueuedPost {
  postId: string;
  contentType: string;
  contentText?: string;
  contentUrl?: string;
  thumbnailUrl?: string;
  platforms: string[];
  scheduledTime: string;
  status: string;
  tags?: string[];
  createdAt: string;
  postedAt?: string;
  errorMessage?: string;
}

interface PostingQueueProps {
  queue: ContentQueueItem[];
  platforms: SocialPlatform[];
  onUpdate: (updatedQueue: ContentQueueItem[]) => void;
}

export function PostingQueue({ queue, platforms, onUpdate }: PostingQueueProps) {
  const [dbPosts, setDbPosts] = useState<QueuedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({ queued: 0, posted: 0, failed: 0, posting: 0 });
  const [cancelling, setCancelling] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch('/api/spacebaddie/social/schedule?status=all&limit=20', { credentials: 'include' });
      const data = await res.json();

      if (data.ok) {
        setDbPosts(data.posts || []);
        setCounts(data.counts || { queued: 0, posted: 0, failed: 0, posting: 0 });
      }
    } catch (err) {
      console.error('[PostingQueue] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
    // Refresh every 30 seconds
    const interval = setInterval(fetchPosts, 30000);
    return () => clearInterval(interval);
  }, [fetchPosts]);

  const handleCancel = async (postId: string) => {
    setCancelling(postId);
    try {
      const res = await fetch(`/api/spacebaddie/social/schedule?postId=${postId}`, {
        credentials: 'include',
        method: 'DELETE',
      });
      const data = await res.json();

      if (data.ok) {
        fetchPosts();
      } else {
        console.error('Cancel failed:', data.error);
      }
    } catch (err) {
      console.error('[PostingQueue] Cancel error:', err);
    } finally {
      setCancelling(null);
    }
  };

  const getStatusStyle = (status: string): React.CSSProperties => {
    const styles: Record<string, React.CSSProperties> = {
      posted: { color: '#00D4D4', background: 'rgba(0,212,212,0.2)' },
      posting: { color: '#FF6B9D', background: 'rgba(255,107,157,0.2)' },
      failed: { color: '#ff6b6b', background: 'rgba(255,0,0,0.2)' },
      queued: { color: '#C77DFF', background: 'rgba(199,125,255,0.2)' },
      cancelled: { color: '#888', background: 'rgba(136,136,136,0.2)' },
    };
    return styles[status] || styles.queued;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'posted': return '✅';
      case 'posting': return '⏳';
      case 'failed': return '❌';
      case 'cancelled': return '🚫';
      default: return '⏰';
    }
  };

  const platformColors: Record<string, string> = {
    youtube: '#ff0000',
    tiktok: '#ff006e',
    instagram: '#c77dff',
    twitter: '#1da1f2',
    facebook: '#1877f2',
    linkedin: '#0077b5',
  };

  const platformIcons: Record<string, string> = {
    youtube: '📺',
    tiktok: '🎵',
    instagram: '📸',
    twitter: '🐦',
    facebook: '👥',
    linkedin: '💼',
  };

  // Combine database posts with any local queue items
  const allItems = dbPosts;

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(138,43,226,0.05) 100%)',
      border: '1px solid rgba(199,125,255,0.15)',
      borderRadius: '20px',
      padding: '24px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ 
            background: 'linear-gradient(135deg, #00D4D4 0%, #C77DFF 100%)', 
            WebkitBackgroundClip: 'text', 
            WebkitTextFillColor: 'transparent',
            fontSize: '20px' 
          }}>📋</span> 
          Post Queue
        </h3>
        <button
          onClick={fetchPosts}
          style={{
            padding: '8px 14px',
            borderRadius: '10px',
            border: '1px solid rgba(199,125,255,0.2)',
            background: 'rgba(199,125,255,0.1)',
            color: '#C77DFF',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 500,
            transition: 'all 0.2s ease',
          }}
        >
          🔄 Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <div style={{ 
            width: '36px', 
            height: '36px', 
            border: '3px solid rgba(199,125,255,0.2)',
            borderTopColor: '#C77DFF',
            borderRadius: '50%',
            margin: '0 auto 16px',
            animation: 'spin 1s linear infinite',
          }} />
          <p style={{ color: '#888', fontSize: '13px' }}>Loading queue...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : allItems.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '48px 20px',
          background: 'rgba(199,125,255,0.05)',
          borderRadius: '16px',
          border: '1px dashed rgba(199,125,255,0.2)',
        }}>
          <div style={{ 
            fontSize: '44px', 
            marginBottom: '12px',
            filter: 'drop-shadow(0 4px 12px rgba(199,125,255,0.2))',
          }}>📭</div>
          <h4 style={{ fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: '6px' }}>No content scheduled</h4>
          <p style={{ color: '#888', fontSize: '13px' }}>Schedule your first post to see it here.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {allItems.map((item) => (
            <div key={item.postId} style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(138,43,226,0.06) 100%)',
              border: '1px solid rgba(199,125,255,0.12)',
              borderRadius: '14px',
              padding: '16px',
              transition: 'all 0.2s ease',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ flex: 1 }}>
                  <h4 style={{ color: '#fff', fontWeight: 600, marginBottom: '4px', fontSize: '14px' }}>
                    {item.contentType === 'video' ? '🎬 Video' : 
                     item.contentType === 'image' ? '🖼️ Image' : '📝 Post'}
                  </h4>
                  <p style={{ color: '#999', fontSize: '13px', lineHeight: 1.4 }}>
                    {item.contentText?.substring(0, 60)}
                    {(item.contentText?.length || 0) > 60 && '...'}
                  </p>
                </div>
                <div style={{
                  padding: '5px 12px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'capitalize',
                  ...getStatusStyle(item.status),
                }}>
                  {getStatusIcon(item.status)} {item.status}
                </div>
              </div>

              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                fontSize: '12px', 
                color: '#888', 
                marginBottom: '10px',
                padding: '8px 10px',
                background: 'rgba(0,0,0,0.2)',
                borderRadius: '8px',
              }}>
                <span>📅 {new Date(item.scheduledTime).toLocaleString('en-US', { 
                  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                })}</span>
              </div>

              {item.errorMessage && (
                <div style={{ 
                  color: '#ff6b6b', 
                  fontSize: '11px', 
                  marginBottom: '10px',
                  padding: '6px 10px',
                  background: 'rgba(255,107,107,0.1)',
                  borderRadius: '6px',
                }}>
                  ⚠️ {item.errorMessage}
                </div>
              )}

              {/* Platform badges */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: item.status === 'queued' ? '12px' : '0' }}>
                {item.platforms.map((platform) => (
                  <div
                    key={platform}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 10px',
                      borderRadius: '20px',
                      fontSize: '11px',
                      color: '#fff',
                      background: `${platformColors[platform]}dd` || '#666',
                      textTransform: 'capitalize',
                      fontWeight: 500,
                    }}
                  >
                    <span style={{ fontSize: '12px' }}>{platformIcons[platform] || '📱'}</span>
                    <span>{platform}</span>
                  </div>
                ))}
              </div>

              {/* Actions */}
              {item.status === 'queued' && (
                <button
                  onClick={() => handleCancel(item.postId)}
                  disabled={cancelling === item.postId}
                  style={{
                    padding: '8px 14px',
                    background: 'rgba(255,107,107,0.12)',
                    border: '1px solid rgba(255,107,107,0.2)',
                    borderRadius: '10px',
                    color: '#FF6B6B',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: cancelling === item.postId ? 'not-allowed' : 'pointer',
                    opacity: cancelling === item.postId ? 0.5 : 1,
                    transition: 'all 0.2s ease',
                  }}
                >
                  {cancelling === item.postId ? '...' : '✕ Cancel'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Queue Stats */}
      <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(199,125,255,0.1)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', textAlign: 'center' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(199,125,255,0.1) 0%, rgba(199,125,255,0.05) 100%)',
            border: '1px solid rgba(199,125,255,0.15)',
            borderRadius: '12px',
            padding: '14px 10px',
          }}>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#C77DFF' }}>
              {counts.queued}
            </div>
            <div style={{ fontSize: '11px', color: '#999', fontWeight: 500 }}>Queued</div>
          </div>
          <div style={{
            background: 'linear-gradient(135deg, rgba(0,212,212,0.1) 0%, rgba(0,212,212,0.05) 100%)',
            border: '1px solid rgba(0,212,212,0.15)',
            borderRadius: '12px',
            padding: '14px 10px',
          }}>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#00D4D4' }}>
              {counts.posted}
            </div>
            <div style={{ fontSize: '11px', color: '#999', fontWeight: 500 }}>Posted</div>
          </div>
          {(counts.posting > 0 || counts.failed > 0) && (
            <>
              {counts.posting > 0 && (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(255,107,157,0.1) 0%, rgba(255,107,157,0.05) 100%)',
                  border: '1px solid rgba(255,107,157,0.15)',
                  borderRadius: '12px',
                  padding: '14px 10px',
                }}>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: '#FF6B9D' }}>
                    {counts.posting}
                  </div>
                  <div style={{ fontSize: '11px', color: '#999', fontWeight: 500 }}>Posting</div>
                </div>
              )}
              {counts.failed > 0 && (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(255,107,107,0.1) 0%, rgba(255,107,107,0.05) 100%)',
                  border: '1px solid rgba(255,107,107,0.15)',
                  borderRadius: '12px',
                  padding: '14px 10px',
                }}>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: '#FF6B6B' }}>
                    {counts.failed}
                  </div>
                  <div style={{ fontSize: '11px', color: '#999', fontWeight: 500 }}>Failed</div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
