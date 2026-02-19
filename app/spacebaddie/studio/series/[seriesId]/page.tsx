'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import DashboardShell from '../../../components/DashboardShell';

interface Episode {
  episodeId: string;
  episodeNumber: number;
  status: string;
  script?: string;
  scriptSummary?: string;
  videoUrl?: string;
  videoJobId?: string;
  scheduledAt?: string;
  postedAt?: string;
  createdAt: string;
}

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
  avatarImageUrl?: string;
  voiceStyle?: string;
  postTimeUtc?: string;
  createdAt: string;
  episodes?: Episode[];
}

const STATUS_COLORS: Record<string, string> = {
  active: '#00C853',
  draft: '#FFC107',
  paused: '#FF9800',
  completed: '#00D4D4',
  scheduled: '#8A2BE2',
  posted: '#00C853',
  failed: '#FF6B6B',
  generating_script: '#00D4D4',
  generating_video: '#C77DFF',
  pending_video: '#FFB800',
  pending_schedule: '#FFB800',
};

// Episode Card Component with expandable details
const POLL_INTERVAL_MS = 15000; // 15 seconds

function EpisodeCard({ episode, onRefresh }: { episode: Episode; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [localVideoUrl, setLocalVideoUrl] = useState<string | null>(episode.videoUrl || null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Sync local state when parent passes updated episode (e.g. after refresh)
  useEffect(() => {
    if (episode.videoUrl) {
      setLocalVideoUrl(episode.videoUrl);
    }
  }, [episode.videoUrl]);

  // Auto-poll video status when episode has job but no video yet
  useEffect(() => {
    const hasJob = !!episode.videoJobId;
    const hasVideo = !!(localVideoUrl || episode.videoUrl);
    if (!hasJob || hasVideo) return;

    const check = async () => {
      try {
        const res = await fetch(`/api/spacebaddie/series/episode/${episode.episodeId}/status`);
        const data = await res.json();
        if (data.videoUrl) {
          setLocalVideoUrl(data.videoUrl);
          setStatusMessage('Video is ready!');
          onRefresh();
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        } else if (data.status === 'failed') {
          setStatusMessage(data.error || 'Video generation failed');
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        }
      } catch {
        // Ignore transient errors; next poll will retry
      }
    };

    pollIntervalRef.current = setInterval(check, POLL_INTERVAL_MS);
    check(); // Check immediately
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [episode.episodeId, episode.videoJobId, episode.videoUrl, localVideoUrl, onRefresh]);

  const handleCheckVideoStatus = async () => {
    setCheckingStatus(true);
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/spacebaddie/series/episode/${episode.episodeId}/status`);
      const data = await res.json();
      
      if (data.videoUrl) {
        setLocalVideoUrl(data.videoUrl);
        setStatusMessage('🎉 Video is ready!');
        // Also refresh the full series data
        setTimeout(() => onRefresh(), 1000);
      } else if (data.status === 'failed') {
        setStatusMessage(`❌ ${data.error || 'Video generation failed'}`);
      } else {
        setStatusMessage(`⏳ ${data.message || 'Still processing...'}`);
      }
    } catch (err: any) {
      setStatusMessage(`Error: ${err.message}`);
    } finally {
      setCheckingStatus(false);
    }
  };

  const statusColor = STATUS_COLORS[episode.status] || '#888';
  const isProcessing = ['generating_script', 'generating_video', 'pending_video', 'pending_schedule'].includes(episode.status);

  return (
    <div style={{
      background: 'rgba(0,0,0,0.3)',
      borderRadius: '10px',
      overflow: 'hidden',
      border: expanded ? '1px solid rgba(138,43,226,0.3)' : '1px solid transparent',
      transition: 'all 0.2s ease',
    }}>
      {/* Header - Always visible, clickable */}
      <div 
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          cursor: 'pointer',
        }}
      >
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '8px',
          background: statusColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#000',
          fontWeight: 700,
          flexShrink: 0,
        }}>
          {episode.episodeNumber}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: '#fff', fontWeight: 600, marginBottom: '4px' }}>
            Episode {episode.episodeNumber}
          </p>
          <p style={{ 
            color: '#888', 
            fontSize: '13px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {episode.scriptSummary || (episode.script ? episode.script.substring(0, 60) + '...' : 'No script yet')}
          </p>
        </div>
        <span style={{
          padding: '4px 10px',
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: 600,
          background: `${statusColor}20`,
          color: statusColor,
          flexShrink: 0,
        }}>
          {episode.status.replace(/_/g, ' ')}
        </span>
        <span style={{ 
          color: '#888', 
          fontSize: '18px',
          transition: 'transform 0.2s ease',
          transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
        }}>
          ▼
        </span>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div style={{
          padding: '0 16px 16px 16px',
          borderTop: '1px solid rgba(255,255,255,0.1)',
        }}>
          {/* Video Preview */}
          {(localVideoUrl || episode.videoUrl) && (
            <div style={{ marginTop: '16px', marginBottom: '16px' }}>
              <h4 style={{ color: '#888', fontSize: '12px', marginBottom: '12px', textTransform: 'uppercase' }}>Video Preview</h4>
              <video
                src={localVideoUrl || episode.videoUrl}
                controls
                style={{
                  width: '100%',
                  maxHeight: '400px',
                  borderRadius: '8px',
                  background: '#000',
                }}
              />
              <div style={{ marginTop: '12px', display: 'flex', gap: '12px' }}>
                <a
                  href={localVideoUrl || episode.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '8px 16px',
                    background: 'rgba(0,212,212,0.2)',
                    borderRadius: '6px',
                    color: '#00D4D4',
                    textDecoration: 'none',
                    fontSize: '13px',
                    fontWeight: 500,
                  }}
                >
                  🔗 Open in New Tab
                </a>
                <a
                  href={localVideoUrl || episode.videoUrl}
                  download={`episode-${episode.episodeNumber}.mp4`}
                  style={{
                    padding: '8px 16px',
                    background: 'rgba(138,43,226,0.2)',
                    borderRadius: '6px',
                    color: '#C77DFF',
                    textDecoration: 'none',
                    fontSize: '13px',
                    fontWeight: 500,
                  }}
                >
                  ⬇️ Download
                </a>
              </div>
            </div>
          )}

          {/* Check Video Status - Show when no video URL yet */}
          {!localVideoUrl && !episode.videoUrl && (
            <div style={{ 
              marginTop: '16px', 
              padding: '16px',
              background: 'rgba(138,43,226,0.1)',
              borderRadius: '8px',
              textAlign: 'center',
            }}>
              <div style={{ 
                fontSize: '24px', 
                marginBottom: '8px',
              }}>
                🎬
              </div>
              <p style={{ color: '#C77DFF', fontWeight: 500, marginBottom: '8px' }}>
                Video is being generated by HeyGen
              </p>
              <p style={{ color: '#888', fontSize: '13px', marginBottom: '12px' }}>
                This usually takes 1-5 minutes depending on script length
              </p>
              {statusMessage && (
                <p style={{ 
                  color: statusMessage.includes('ready') ? '#00C853' : 
                         statusMessage.includes('❌') ? '#FF6B6B' : '#FFB800',
                  fontSize: '14px',
                  marginBottom: '12px',
                  fontWeight: 500,
                }}>
                  {statusMessage}
                </p>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); handleCheckVideoStatus(); }}
                disabled={checkingStatus}
                style={{
                  padding: '10px 20px',
                  background: checkingStatus ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #00D4D4 0%, #8A2BE2 100%)',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: checkingStatus ? 'not-allowed' : 'pointer',
                }}
              >
                {checkingStatus ? '⏳ Checking HeyGen...' : '🔄 Check Video Status'}
              </button>
            </div>
          )}

          {/* Processing Status - for script generation */}
          {isProcessing && !episode.videoJobId && (
            <div style={{ 
              marginTop: '16px', 
              padding: '16px',
              background: 'rgba(138,43,226,0.1)',
              borderRadius: '8px',
              textAlign: 'center',
            }}>
              <div style={{ 
                fontSize: '24px', 
                marginBottom: '8px',
              }}>
                {episode.status === 'generating_script' ? '✍️' : '⏳'}
              </div>
              <p style={{ color: '#C77DFF', fontWeight: 500 }}>
                {episode.status === 'generating_script' ? 'Generating script...' : 'Processing...'}
              </p>
            </div>
          )}

          {/* Script */}
          {episode.script && (
            <div style={{ marginTop: '16px' }}>
              <h4 style={{ color: '#888', fontSize: '12px', marginBottom: '8px', textTransform: 'uppercase' }}>Script</h4>
              <div style={{
                padding: '12px',
                background: 'rgba(0,0,0,0.4)',
                borderRadius: '8px',
                maxHeight: '200px',
                overflow: 'auto',
              }}>
                <p style={{ color: '#fff', fontSize: '14px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {episode.script}
                </p>
              </div>
            </div>
          )}

          {/* Schedule Info */}
          <div style={{ 
            marginTop: '16px', 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
            gap: '12px' 
          }}>
            {episode.scheduledAt && (
              <div style={{ padding: '12px', background: 'rgba(0,0,0,0.4)', borderRadius: '8px' }}>
                <p style={{ color: '#888', fontSize: '11px', marginBottom: '4px' }}>SCHEDULED</p>
                <p style={{ color: '#fff', fontSize: '13px' }}>{new Date(episode.scheduledAt).toLocaleString()}</p>
              </div>
            )}
            {episode.postedAt && (
              <div style={{ padding: '12px', background: 'rgba(0,0,0,0.4)', borderRadius: '8px' }}>
                <p style={{ color: '#888', fontSize: '11px', marginBottom: '4px' }}>POSTED</p>
                <p style={{ color: '#00C853', fontSize: '13px' }}>{new Date(episode.postedAt).toLocaleString()}</p>
              </div>
            )}
            <div style={{ padding: '12px', background: 'rgba(0,0,0,0.4)', borderRadius: '8px' }}>
              <p style={{ color: '#888', fontSize: '11px', marginBottom: '4px' }}>CREATED</p>
              <p style={{ color: '#fff', fontSize: '13px' }}>{new Date(episode.createdAt).toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SeriesManagePage() {
  const params = useParams();
  const router = useRouter();
  const seriesId = params?.seriesId as string;

  const [series, setSeries] = useState<Series | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  
  // Edit state
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    storyArc: '',
    characterPersona: '',
    avatarImageUrl: '',
    frequency: 'daily',
    status: 'active',
  });
  
  // Image upload
  const [uploading, setUploading] = useState(false);
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null);

  // Auth check
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Listen for auth state changes
  useEffect(() => {
    // Check initial session
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session?.user);
      setAuthChecked(true);
    };
    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[SeriesManage] Auth event:', event, !!session);
      setIsAuthenticated(!!session?.user);
      setAuthChecked(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchSeries = useCallback(async () => {
    if (!seriesId) return;
    
    try {
      setLoading(true);
      const res = await fetch(`/api/spacebaddie/series/${seriesId}`);
      const data = await res.json();
      
      if (data.ok && data.series) {
        setSeries(data.series);
        setEditForm({
          title: data.series.title || '',
          storyArc: data.series.storyArc || '',
          characterPersona: data.series.characterPersona || '',
          avatarImageUrl: data.series.avatarImageUrl || '',
          frequency: data.series.frequency || 'daily',
          status: data.series.status || 'draft',
        });
      } else {
        setMessage({ text: data.error || 'Series not found', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: 'Failed to load series', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [seriesId]);

  useEffect(() => {
    if (authChecked) {
      if (isAuthenticated && seriesId) {
        fetchSeries();
      } else if (!isAuthenticated) {
        setLoading(false);
      }
    }
  }, [authChecked, isAuthenticated, seriesId, fetchSeries]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage(null);

    // Create local preview immediately
    const localPreview = URL.createObjectURL(file);
    setUploadedImagePreview(localPreview);

    try {
      const formData = new FormData();
      formData.append('file', file);

      console.log('[SeriesManage] Uploading file:', file.name, file.size);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      console.log('[SeriesManage] Upload response:', data);

      if (data.url || data.ok) {
        const imageUrl = data.url;
        setEditForm(prev => ({ ...prev, avatarImageUrl: imageUrl }));
        setUploadedImagePreview(imageUrl);
        setMessage({ text: `Image uploaded! URL: ${imageUrl.substring(0, 50)}...`, type: 'success' });
        
        // Auto-save the image immediately
        if (seriesId) {
          console.log('[SeriesManage] Auto-saving avatar to series...');
          const saveRes = await fetch(`/api/spacebaddie/series/${seriesId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ avatarImageUrl: imageUrl }),
          });
          const saveData = await saveRes.json();
          console.log('[SeriesManage] Save response:', saveData);
          
          if (saveData.ok) {
            setMessage({ text: 'Avatar image saved to series!', type: 'success' });
            // Update local series state directly to preserve image preview
            setSeries(prev => prev ? { ...prev, avatarImageUrl: imageUrl } : prev);
            // Keep the preview
            setUploadedImagePreview(imageUrl);
          } else {
            setMessage({ text: `Image uploaded but save failed: ${saveData.error}`, type: 'error' });
          }
        }
      } else {
        setMessage({ text: data.error || 'Upload failed', type: 'error' });
        setUploadedImagePreview(null);
      }
    } catch (err: any) {
      console.error('[SeriesManage] Upload error:', err);
      setMessage({ text: `Upload error: ${err.message}`, type: 'error' });
      setUploadedImagePreview(null);
    } finally {
      setUploading(false);
    }
  };

  const handleUpdate = async () => {
    setUpdating(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/spacebaddie/series/${seriesId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editForm.title,
          storyArc: editForm.storyArc,
          characterPersona: editForm.characterPersona,
          avatarImageUrl: editForm.avatarImageUrl,
          frequency: editForm.frequency,
          status: editForm.status,
        }),
      });

      const data = await res.json();

      if (data.ok) {
        setMessage({ text: 'Series updated!', type: 'success' });
        setEditMode(false);
        fetchSeries();
      } else {
        setMessage({ text: data.error || 'Update failed', type: 'error' });
      }
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setUpdating(false);
    }
  };

  const handleGenerateEpisode = async () => {
    if (!series?.avatarImageUrl && !editForm.avatarImageUrl) {
      setMessage({ text: 'Please upload an avatar image first!', type: 'error' });
      setEditMode(true);
      return;
    }

    setGenerating(true);
    setMessage(null);

    try {
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
        setMessage({ text: data.error || 'Generation failed', type: 'error' });
      }
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this series? This cannot be undone.')) {
      return;
    }

    try {
      const res = await fetch(`/api/spacebaddie/series/${seriesId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.ok) {
        router.push('/spacebaddie/automation');
      } else {
        setMessage({ text: data.error || 'Delete failed', type: 'error' });
      }
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    background: 'rgba(0,0,0,0.4)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
  };

  if (!authChecked || loading) {
    return (
      <DashboardShell>
        <div style={{ padding: '60px', textAlign: 'center', color: '#888' }}>
          {!authChecked ? 'Checking authentication...' : 'Loading series...'}
        </div>
      </DashboardShell>
    );
  }

  if (!isAuthenticated) {
    return (
      <DashboardShell>
        <div style={{ padding: '60px', textAlign: 'center' }}>
          <h2 style={{ color: '#FF6B6B', marginBottom: '16px' }}>Authentication Required</h2>
          <p style={{ color: '#888', marginBottom: '24px' }}>Please log in to manage your content series.</p>
          <Link 
            href="/spacebaddie/login" 
            style={{ 
              display: 'inline-block',
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)',
              borderRadius: '8px',
              color: '#fff',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            Sign In →
          </Link>
        </div>
      </DashboardShell>
    );
  }

  if (!series) {
    return (
      <DashboardShell>
        <div style={{ padding: '60px', textAlign: 'center' }}>
          <h2 style={{ color: '#FF6B6B', marginBottom: '16px' }}>Series Not Found</h2>
          <Link href="/spacebaddie/automation" style={{ color: '#00D4D4' }}>
            ← Back to Automation
          </Link>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div style={{ padding: '32px', maxWidth: '1000px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <Link
            href="/spacebaddie/automation"
            style={{ color: '#888', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}
          >
            ← Back to Automation
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ fontSize: '28px', color: '#fff', marginBottom: '4px' }}>{series.title}</h1>
              <p style={{ color: '#888' }}>
                {series.contentStyle} • {series.frequency} • {series.platforms.join(', ')}
              </p>
            </div>
            <span style={{
              padding: '6px 16px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: 600,
              background: `${STATUS_COLORS[series.status] || '#888'}20`,
              color: STATUS_COLORS[series.status] || '#888',
              textTransform: 'uppercase',
            }}>
              {series.status}
            </span>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div style={{
            padding: '14px 18px',
            borderRadius: '10px',
            marginBottom: '24px',
            background: message.type === 'success' ? 'rgba(0,200,83,0.15)' : 'rgba(255,0,0,0.15)',
            border: `1px solid ${message.type === 'success' ? 'rgba(0,200,83,0.4)' : 'rgba(255,0,0,0.4)'}`,
            color: message.type === 'success' ? '#00C853' : '#FF6B6B',
          }}>
            {message.type === 'success' ? '✅' : '❌'} {message.text}
          </div>
        )}

        {/* Avatar Image Check */}
        {!series.avatarImageUrl && (
          <div style={{
            padding: '20px',
            background: 'rgba(255,152,0,0.15)',
            border: '1px solid rgba(255,152,0,0.4)',
            borderRadius: '12px',
            marginBottom: '24px',
          }}>
            <p style={{ color: '#FF9800', fontWeight: 600, marginBottom: '8px' }}>
              ⚠️ No Avatar Image
            </p>
            <p style={{ color: '#888', fontSize: '14px', marginBottom: '12px' }}>
              This series needs an avatar image to generate videos. Please upload one below.
            </p>
            <button
              onClick={() => setEditMode(true)}
              style={{
                padding: '8px 16px',
                background: '#FF9800',
                border: 'none',
                borderRadius: '6px',
                color: '#000',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Add Avatar Image
            </button>
          </div>
        )}

        {/* Main Content */}
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '24px' }}>
          {/* Left Column - Avatar & Actions */}
          <div>
            {/* Avatar Preview */}
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '16px',
              padding: '20px',
              marginBottom: '20px',
            }}>
              <h3 style={{ color: '#888', fontSize: '12px', marginBottom: '12px', textTransform: 'uppercase' }}>Avatar</h3>
              {(() => {
                const imageUrl = uploadedImagePreview || editForm.avatarImageUrl || series.avatarImageUrl;
                console.log('[SeriesManage] Avatar URL:', imageUrl);
                return (
                  <div style={{
                    width: '100%',
                    aspectRatio: '1',
                    borderRadius: '12px',
                    background: !imageUrl ? 'linear-gradient(135deg, #8A2BE2 0%, #00D4D4 100%)' : '#000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '12px',
                    border: imageUrl ? '2px solid #00C853' : '2px dashed rgba(255,255,255,0.2)',
                    overflow: 'hidden',
                    position: 'relative',
                  }}>
                    {imageUrl ? (
                      <img 
                        src={imageUrl} 
                        alt="Avatar"
                        crossOrigin="anonymous"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          borderRadius: '10px',
                        }}
                        onError={(e) => {
                          console.error('[SeriesManage] Image failed to load:', imageUrl);
                          // Try without crossOrigin
                          const img = e.target as HTMLImageElement;
                          if (img.crossOrigin) {
                            console.log('[SeriesManage] Retrying without crossOrigin...');
                            img.crossOrigin = '';
                            img.src = imageUrl;
                          }
                        }}
                        onLoad={() => console.log('[SeriesManage] Image loaded successfully')}
                      />
                    ) : (
                      <span style={{ fontSize: '48px' }}>🤖</span>
                    )}
                  </div>
                );
              })()}
              {/* Show current URL for debugging */}
              {(series.avatarImageUrl || editForm.avatarImageUrl) && (
                <p style={{ color: '#666', fontSize: '10px', marginBottom: '8px', wordBreak: 'break-all' }}>
                  URL: {(series.avatarImageUrl || editForm.avatarImageUrl || '').substring(0, 60)}...
                </p>
              )}
              {/* Always show upload button */}
              <label style={{
                display: 'block',
                padding: '10px',
                background: uploading ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #8A2BE2 0%, #FF006E 100%)',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                textAlign: 'center',
                cursor: uploading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 600,
              }}>
                {uploading ? '⏳ Uploading...' : (series.avatarImageUrl ? '📷 Change Image' : '📷 Upload Avatar Image')}
                <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} disabled={uploading} />
              </label>
              {(uploadedImagePreview || editForm.avatarImageUrl || series.avatarImageUrl) && (
                <p style={{ color: '#00C853', fontSize: '11px', marginTop: '8px', textAlign: 'center' }}>
                  ✓ Image ready
                </p>
              )}
            </div>

            {/* Progress */}
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '16px',
              padding: '20px',
              marginBottom: '20px',
            }}>
              <h3 style={{ color: '#888', fontSize: '12px', marginBottom: '12px', textTransform: 'uppercase' }}>Progress</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#fff' }}>Episodes</span>
                <span style={{ color: '#00D4D4' }}>{series.currentEpisode} / {series.totalEpisodes}</span>
              </div>
              <div style={{
                height: '8px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '4px',
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${(series.currentEpisode / series.totalEpisodes) * 100}%`,
                  background: 'linear-gradient(90deg, #00D4D4, #8A2BE2)',
                  borderRadius: '4px',
                }} />
              </div>
              {series.nextEpisodeAt && series.status === 'active' && (
                <p style={{ color: '#888', fontSize: '12px', marginTop: '12px' }}>
                  Next: {new Date(series.nextEpisodeAt).toLocaleString()}
                </p>
              )}
            </div>

            {/* Actions */}
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '16px',
              padding: '20px',
            }}>
              <h3 style={{ color: '#888', fontSize: '12px', marginBottom: '12px', textTransform: 'uppercase' }}>Actions</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  onClick={handleGenerateEpisode}
                  disabled={generating || series.currentEpisode >= series.totalEpisodes}
                  style={{
                    padding: '12px',
                    background: generating ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #00D4D4 0%, #8A2BE2 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontWeight: 600,
                    cursor: generating ? 'not-allowed' : 'pointer',
                  }}
                >
                  {generating ? '⏳ Generating...' : '⚡ Generate Episode Now'}
                </button>
                <button
                  onClick={() => setEditMode(!editMode)}
                  style={{
                    padding: '12px',
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px',
                    color: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  {editMode ? '✕ Cancel Edit' : '✏️ Edit Series'}
                </button>
                <button
                  onClick={handleDelete}
                  style={{
                    padding: '12px',
                    background: 'rgba(255,0,0,0.1)',
                    border: '1px solid rgba(255,0,0,0.3)',
                    borderRadius: '8px',
                    color: '#FF6B6B',
                    cursor: 'pointer',
                  }}
                >
                  🗑️ Delete Series
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - Details & Episodes */}
          <div>
            {/* Edit Form */}
            {editMode ? (
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '24px',
              }}>
                <h3 style={{ color: '#fff', fontSize: '18px', marginBottom: '20px' }}>Edit Series</h3>
                
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', color: '#888', marginBottom: '8px', fontSize: '14px' }}>Title</label>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    style={inputStyle}
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', color: '#888', marginBottom: '8px', fontSize: '14px' }}>Avatar Image URL</label>
                  <input
                    type="text"
                    value={editForm.avatarImageUrl}
                    onChange={(e) => setEditForm({ ...editForm, avatarImageUrl: e.target.value })}
                    placeholder="https://..."
                    style={inputStyle}
                  />
                  <p style={{ color: '#666', fontSize: '12px', marginTop: '6px' }}>Or upload using the button on the left</p>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', color: '#888', marginBottom: '8px', fontSize: '14px' }}>Story Arc</label>
                  <textarea
                    value={editForm.storyArc}
                    onChange={(e) => setEditForm({ ...editForm, storyArc: e.target.value })}
                    rows={3}
                    style={{ ...inputStyle, resize: 'vertical' }}
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', color: '#888', marginBottom: '8px', fontSize: '14px' }}>Character Persona</label>
                  <textarea
                    value={editForm.characterPersona}
                    onChange={(e) => setEditForm({ ...editForm, characterPersona: e.target.value })}
                    rows={3}
                    style={{ ...inputStyle, resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                  <div>
                    <label style={{ display: 'block', color: '#888', marginBottom: '8px', fontSize: '14px' }}>Frequency</label>
                    <select
                      value={editForm.frequency}
                      onChange={(e) => setEditForm({ ...editForm, frequency: e.target.value })}
                      style={inputStyle}
                    >
                      <option value="hourly">Hourly</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#888', marginBottom: '8px', fontSize: '14px' }}>Status</label>
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                      style={inputStyle}
                    >
                      <option value="draft">Draft</option>
                      <option value="active">Active</option>
                      <option value="paused">Paused</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleUpdate}
                  disabled={updating}
                  style={{
                    width: '100%',
                    padding: '14px',
                    background: updating ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #00D4D4 0%, #8A2BE2 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '16px',
                    cursor: updating ? 'not-allowed' : 'pointer',
                  }}
                >
                  {updating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            ) : (
              /* Series Details View */
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '24px',
              }}>
                <h3 style={{ color: '#fff', fontSize: '18px', marginBottom: '20px' }}>Series Details</h3>
                
                {series.storyArc && (
                  <div style={{ marginBottom: '20px' }}>
                    <h4 style={{ color: '#888', fontSize: '12px', marginBottom: '8px', textTransform: 'uppercase' }}>Story Arc</h4>
                    <p style={{ color: '#fff', lineHeight: 1.6 }}>{series.storyArc}</p>
                  </div>
                )}

                {series.characterPersona && (
                  <div style={{ marginBottom: '20px' }}>
                    <h4 style={{ color: '#888', fontSize: '12px', marginBottom: '8px', textTransform: 'uppercase' }}>Character Persona</h4>
                    <p style={{ color: '#fff', lineHeight: 1.6 }}>{series.characterPersona}</p>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                  <div style={{ padding: '16px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
                    <p style={{ color: '#888', fontSize: '11px', marginBottom: '4px' }}>FREQUENCY</p>
                    <p style={{ color: '#fff', fontWeight: 600 }}>{series.frequency}</p>
                  </div>
                  <div style={{ padding: '16px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
                    <p style={{ color: '#888', fontSize: '11px', marginBottom: '4px' }}>PLATFORMS</p>
                    <p style={{ color: '#fff', fontWeight: 600 }}>{series.platforms.join(', ')}</p>
                  </div>
                  <div style={{ padding: '16px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
                    <p style={{ color: '#888', fontSize: '11px', marginBottom: '4px' }}>CREATED</p>
                    <p style={{ color: '#fff', fontWeight: 600 }}>{new Date(series.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Episodes List */}
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '16px',
              padding: '24px',
            }}>
              <h3 style={{ color: '#fff', fontSize: '18px', marginBottom: '20px' }}>Episodes</h3>
              
              {!series.episodes || series.episodes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                  <p style={{ fontSize: '32px', marginBottom: '12px' }}>📹</p>
                  <p>No episodes generated yet</p>
                  <p style={{ fontSize: '13px', marginTop: '8px' }}>Click "Generate Episode Now" to create the first one</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {series.episodes.map((ep) => (
                    <EpisodeCard key={ep.episodeId} episode={ep} onRefresh={fetchSeries} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
