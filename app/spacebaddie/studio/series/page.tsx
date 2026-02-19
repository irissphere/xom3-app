'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import DashboardShell from '../../components/DashboardShell';

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
  createdAt: string;
}

interface ConnectedPlatform {
  platform: string;
  connected: boolean;
}

interface CreateSeriesForm {
  title: string;
  description: string;
  storyArc: string;
  characterPersona: string;
  contentStyle: string;
  totalEpisodes: number;
  episodeDuration: number;
  frequency: string;
  platforms: string[];
  avatarImageUrl: string;
  voiceStyle: string;
  autoStart: boolean;
  backgroundScene?: string;
  cinematicScene?: boolean;
  voiceGender?: 'male' | 'female';
}

const ALL_PLATFORMS = ['youtube', 'tiktok', 'instagram', 'twitter', 'facebook', 'linkedin'];

const PLATFORM_INFO: Record<string, { icon: string; color: string; name: string }> = {
  youtube: { icon: '📺', color: '#FF0000', name: 'YouTube' },
  tiktok: { icon: '🎵', color: '#FF006E', name: 'TikTok' },
  instagram: { icon: '📸', color: '#C77DFF', name: 'Instagram' },
  twitter: { icon: '🐦', color: '#1DA1F2', name: 'Twitter/X' },
  facebook: { icon: '👥', color: '#1877F2', name: 'Facebook' },
  linkedin: { icon: '💼', color: '#0077B5', name: 'LinkedIn' },
};

export default function SeriesStudioPage() {
  const router = useRouter();
  const [series, setSeries] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [step, setStep] = useState<'list' | 'create'>('list');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [user, setUser] = useState<any>(null);
  
  // Connected platforms
  const [connectedPlatforms, setConnectedPlatforms] = useState<ConnectedPlatform[]>([]);
  const [loadingPlatforms, setLoadingPlatforms] = useState(true);
  
  // AI suggestion state
  const [generatingAI, setGeneratingAI] = useState(false);

  const [form, setForm] = useState<CreateSeriesForm>({
    title: '',
    description: '',
    storyArc: '',
    characterPersona: '',
    contentStyle: 'storytelling',
    totalEpisodes: 10,
    episodeDuration: 30,
    frequency: 'daily',
    platforms: [],
    avatarImageUrl: '',
    voiceStyle: 'engaging',
    autoStart: false,
    backgroundScene: 'studio',
    cinematicScene: false,
    voiceGender: 'female',
  });

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
          setIsAuthenticated(false);
          setUser(null);
        } else {
          setIsAuthenticated(true);
          setUser(user);
        }
      } catch (err) {
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, []);

  // Fetch connected platforms
  const fetchConnectedPlatforms = useCallback(async () => {
    try {
      setLoadingPlatforms(true);
      const res = await fetch('/api/spacebaddie/automation/connect');
      const data = await res.json();
      
      if (data.ok && data.platforms) {
        setConnectedPlatforms(data.platforms.map((p: any) => ({
          platform: p.platform,
          connected: p.status === 'connected',
        })));
        
        // Auto-select connected platforms
        const connected = data.platforms
          .filter((p: any) => p.status === 'connected')
          .map((p: any) => p.platform);
        
        if (connected.length > 0) {
          setForm(prev => ({ ...prev, platforms: connected }));
        }
      }
    } catch (err) {
      console.error('[Series] Platforms fetch error:', err);
    } finally {
      setLoadingPlatforms(false);
    }
  }, []);

  const fetchSeries = useCallback(async () => {
    try {
      const res = await fetch('/api/spacebaddie/series');
      const data = await res.json();
      if (data.ok) {
        setSeries(data.series || []);
      }
    } catch (err) {
      console.error('[Series] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchSeries();
      fetchConnectedPlatforms();
    } else if (isAuthenticated === false) {
      setLoading(false);
      setLoadingPlatforms(false);
    }
  }, [isAuthenticated, fetchSeries, fetchConnectedPlatforms]);

  // Toggle platform selection
  const togglePlatform = (platform: string) => {
    setForm(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter(p => p !== platform)
        : [...prev.platforms, platform],
    }));
  };

  // Generate AI suggestions
  const generateAISuggestions = async () => {
    if (!form.title) {
      setMessage({ text: 'Please enter a series title first', type: 'error' });
      return;
    }

    setGeneratingAI(true);
    setMessage(null);

    try {
      const res = await fetch('/api/avatar/script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: `Generate a story arc and character persona for a content series called "${form.title}". 
                  Content style: ${form.contentStyle}. 
                  Format your response as:
                  STORY ARC: [2-3 sentences describing the overall narrative]
                  CHARACTER PERSONA: [2-3 sentences describing who the avatar is, their personality and speaking style]`,
          tone: form.contentStyle === 'comedy' ? 'humorous' : 'engaging',
          duration: 60,
        }),
      });

      const data = await res.json();
      const script = Array.isArray(data.scripts) ? data.scripts[0] : data.script;

      if (script) {
        // Parse the response
        const storyMatch = script.match(/STORY ARC:\s*(.+?)(?=CHARACTER PERSONA:|$)/is);
        const personaMatch = script.match(/CHARACTER PERSONA:\s*(.+?)$/is);

        if (storyMatch || personaMatch) {
          setForm(prev => ({
            ...prev,
            storyArc: storyMatch ? storyMatch[1].trim() : prev.storyArc,
            characterPersona: personaMatch ? personaMatch[1].trim() : prev.characterPersona,
          }));
          setMessage({ text: 'AI suggestions generated!', type: 'success' });
        } else {
          // Use the whole script as story arc
          setForm(prev => ({
            ...prev,
            storyArc: script.substring(0, 500),
          }));
          setMessage({ text: 'AI suggestion generated!', type: 'success' });
        }
      } else {
        setMessage({ text: 'Could not generate suggestions. Please try again.', type: 'error' });
      }
    } catch (err: any) {
      setMessage({ text: 'AI generation failed. Please fill in manually.', type: 'error' });
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (data.url) {
        setUploadedImage(data.url);
        setForm(prev => ({ ...prev, avatarImageUrl: data.url }));
        setMessage({ text: 'Image uploaded!', type: 'success' });
      } else {
        const localUrl = URL.createObjectURL(file);
        setUploadedImage(localUrl);
        setForm(prev => ({ ...prev, avatarImageUrl: localUrl }));
      }
    } catch (err) {
      const localUrl = URL.createObjectURL(file);
      setUploadedImage(localUrl);
      setForm(prev => ({ ...prev, avatarImageUrl: localUrl }));
    } finally {
      setUploading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.title || (!form.storyArc && !form.characterPersona)) {
      setMessage({ text: 'Title and either Story Arc or Character Persona required', type: 'error' });
      return;
    }

    if (!form.avatarImageUrl) {
      setMessage({ text: 'Please upload an avatar image', type: 'error' });
      return;
    }

    if (form.platforms.length === 0) {
      setMessage({ text: 'Please select at least one platform to post to', type: 'error' });
      return;
    }

    setCreating(true);
    setMessage(null);

    try {
      // Auto-detect user's browser timezone for accurate scheduling
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      const res = await fetch('/api/spacebaddie/series', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          timezone: userTimezone,
          backgroundScene: form.backgroundScene || undefined,
          voiceGender: form.voiceGender || undefined,
        }),
      });

      const data = await res.json();

      if (data.ok) {
        setMessage({ text: data.message || 'Series created!', type: 'success' });
        setTimeout(() => {
          router.push('/spacebaddie/automation');
        }, 2000);
      } else {
        setMessage({ text: data.error || 'Failed to create series', type: 'error' });
      }
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setCreating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#00C853';
      case 'draft': return '#FFC107';
      case 'paused': return '#FF9800';
      case 'completed': return '#00D4D4';
      default: return '#888';
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '14px 16px',
    background: 'rgba(0,0,0,0.4)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '10px',
    color: '#fff',
    fontSize: '15px',
    outline: 'none',
  };

  // Get connected platform count
  const connectedCount = connectedPlatforms.filter(p => p.connected).length;

  return (
    <DashboardShell>
      <div style={{ padding: '32px', maxWidth: '1000px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <Link
            href="/spacebaddie/studio"
            style={{ color: '#888', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}
          >
            ← Back to Studio
          </Link>
          <h1 style={{
            fontSize: '36px',
            fontWeight: 700,
            background: 'linear-gradient(135deg, #00D4D4 0%, #8A2BE2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '8px',
          }}>
            🤖 Content Series
          </h1>
          <p style={{ color: '#888', fontSize: '16px' }}>
            Create autonomous content series that generate and post videos automatically
          </p>
        </div>

        {/* Auth Check */}
        {isAuthenticated === false && (
          <div style={{
            padding: '20px',
            background: 'rgba(255,0,0,0.1)',
            border: '1px solid rgba(255,0,0,0.3)',
            borderRadius: '12px',
            marginBottom: '24px',
          }}>
            <p style={{ color: '#FF6B6B', marginBottom: '12px' }}>
              ❌ Authentication required to create content series
            </p>
            <Link
              href="/spacebaddie/login"
              style={{
                display: 'inline-block',
                padding: '10px 24px',
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
        )}

        {/* Message */}
        {message && (
          <div style={{
            padding: '14px 18px',
            borderRadius: '10px',
            marginBottom: '24px',
            background: message.type === 'success' ? 'rgba(0,200,83,0.15)' : 'rgba(255,0,0,0.15)',
            border: `1px solid ${message.type === 'success' ? 'rgba(0,200,83,0.4)' : 'rgba(255,0,0,0.4)'}`,
            color: message.type === 'success' ? '#00C853' : '#FF6B6B',
            fontSize: '14px',
          }}>
            {message.type === 'success' ? '✅' : '❌'} {message.text}
          </div>
        )}

        {/* Only show content if authenticated */}
        {isAuthenticated && (
          <>
            {/* Toggle between list and create */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
              <button
                onClick={() => setStep('list')}
                style={{
                  padding: '12px 24px',
                  borderRadius: '10px',
                  border: step === 'list' ? '2px solid #00D4D4' : '1px solid rgba(255,255,255,0.15)',
                  background: step === 'list' ? 'rgba(0,212,212,0.15)' : 'rgba(255,255,255,0.05)',
                  color: step === 'list' ? '#00D4D4' : '#888',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                📋 My Series ({series.length})
              </button>
              <button
                onClick={() => setStep('create')}
                style={{
                  padding: '12px 24px',
                  borderRadius: '10px',
                  border: step === 'create' ? '2px solid #8A2BE2' : '1px solid rgba(255,255,255,0.15)',
                  background: step === 'create' ? 'rgba(138,43,226,0.15)' : 'rgba(255,255,255,0.05)',
                  color: step === 'create' ? '#C77DFF' : '#888',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                + Create New Series
              </button>
            </div>

            {/* Series List */}
            {step === 'list' && (
              <div>
                {loading ? (
                  <div style={{ textAlign: 'center', padding: '60px', color: '#888' }}>Loading...</div>
                ) : series.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '80px 40px',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '16px',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}>
                    <div style={{ fontSize: '64px', marginBottom: '20px' }}>🎬</div>
                    <h3 style={{ color: '#fff', fontSize: '22px', marginBottom: '12px' }}>No Series Yet</h3>
                    <p style={{ color: '#888', marginBottom: '24px' }}>Create your first autonomous content series</p>
                    <button
                      onClick={() => setStep('create')}
                      style={{
                        padding: '14px 32px',
                        background: 'linear-gradient(135deg, #00D4D4 0%, #8A2BE2 100%)',
                        border: 'none',
                        borderRadius: '12px',
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: '16px',
                        cursor: 'pointer',
                      }}
                    >
                      + Create Your First Series
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: '20px' }}>
                    {series.map((s) => (
                      <div key={s.seriesId} style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '16px',
                        padding: '24px',
                        display: 'flex',
                        gap: '20px',
                        alignItems: 'center',
                      }}>
                        <div style={{
                          width: '80px',
                          height: '80px',
                          borderRadius: '12px',
                          background: s.avatarImageUrl 
                            ? `url(${s.avatarImageUrl}) center/cover` 
                            : 'linear-gradient(135deg, #8A2BE2 0%, #00D4D4 100%)',
                          flexShrink: 0,
                        }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                            <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 600 }}>{s.title}</h3>
                            <span style={{
                              padding: '4px 12px',
                              borderRadius: '20px',
                              fontSize: '11px',
                              fontWeight: 600,
                              background: `${getStatusColor(s.status)}20`,
                              color: getStatusColor(s.status),
                              textTransform: 'uppercase',
                            }}>
                              {s.status}
                            </span>
                          </div>
                          <p style={{ color: '#888', fontSize: '14px', marginBottom: '8px' }}>
                            {s.contentStyle} • {s.frequency} • {s.platforms.join(', ')}
                          </p>
                          <div style={{ color: '#666', fontSize: '13px' }}>
                            Episode {s.currentEpisode}/{s.totalEpisodes}
                            {s.status === 'active' && s.nextEpisodeAt && (
                              <> • Next: {new Date(s.nextEpisodeAt).toLocaleDateString()}</>
                            )}
                          </div>
                        </div>
                        <Link
                          href="/spacebaddie/automation"
                          style={{
                            padding: '10px 20px',
                            background: 'rgba(255,255,255,0.1)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '8px',
                            color: '#fff',
                            textDecoration: 'none',
                            fontSize: '14px',
                          }}
                        >
                          Manage →
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Create Form */}
            {step === 'create' && (
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '16px',
                padding: '32px',
              }}>
                <h2 style={{ color: '#fff', fontSize: '24px', marginBottom: '24px' }}>Create New Series</h2>

                {/* Step 1: Avatar Upload */}
                <div style={{ marginBottom: '32px' }}>
                  <h3 style={{ color: '#C77DFF', fontSize: '16px', marginBottom: '16px' }}>
                    Step 1: Upload Your Avatar
                  </h3>
                  <div style={{
                    border: '2px dashed rgba(255,255,255,0.2)',
                    borderRadius: '16px',
                    padding: '40px',
                    textAlign: 'center',
                    background: uploadedImage ? `url(${uploadedImage}) center/cover` : 'transparent',
                    position: 'relative',
                    minHeight: '200px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {uploadedImage && (
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(0,0,0,0.5)',
                        borderRadius: '14px',
                      }} />
                    )}
                    <div style={{ position: 'relative', zIndex: 1 }}>
                      {uploading ? (
                        <p style={{ color: '#888' }}>Uploading...</p>
                      ) : uploadedImage ? (
                        <>
                          <p style={{ color: '#00C853', marginBottom: '12px', fontWeight: 600 }}>✅ Avatar Ready</p>
                          <label style={{
                            padding: '10px 20px',
                            background: 'rgba(255,255,255,0.2)',
                            borderRadius: '8px',
                            color: '#fff',
                            cursor: 'pointer',
                            fontSize: '14px',
                          }}>
                            Change Image
                            <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                          </label>
                        </>
                      ) : (
                        <>
                          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📷</div>
                          <p style={{ color: '#888', marginBottom: '16px' }}>Upload a photo for your avatar</p>
                          <label style={{
                            padding: '12px 24px',
                            background: 'linear-gradient(135deg, #C77DFF 0%, #FF6B9D 100%)',
                            borderRadius: '10px',
                            color: '#fff',
                            cursor: 'pointer',
                            fontWeight: 600,
                          }}>
                            Choose Image
                            <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                          </label>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Step 2: Series Details */}
                <div style={{ marginBottom: '32px' }}>
                  <h3 style={{ color: '#C77DFF', fontSize: '16px', marginBottom: '16px' }}>
                    Step 2: Series Details
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div>
                      <label style={{ display: 'block', color: '#888', marginBottom: '8px', fontSize: '14px' }}>Series Title *</label>
                      <input
                        type="text"
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        placeholder="My Daily Show"
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', color: '#888', marginBottom: '8px', fontSize: '14px' }}>Number of Episodes</label>
                      <input
                        type="number"
                        value={form.totalEpisodes}
                        onChange={(e) => setForm({ ...form, totalEpisodes: parseInt(e.target.value) || 10 })}
                        min={1}
                        max={100}
                        style={inputStyle}
                      />
                    </div>
                  </div>
                </div>

                {/* Step 3: Story & Character with AI */}
                <div style={{ marginBottom: '32px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ color: '#C77DFF', fontSize: '16px' }}>
                      Step 3: Story & Character
                    </h3>
                    <button
                      onClick={generateAISuggestions}
                      disabled={generatingAI || !form.title}
                      style={{
                        padding: '8px 16px',
                        background: generatingAI ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #00D4D4 0%, #8A2BE2 100%)',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: generatingAI || !form.title ? 'not-allowed' : 'pointer',
                        opacity: !form.title ? 0.5 : 1,
                      }}
                    >
                      {generatingAI ? '⏳ Generating...' : '✨ AI Suggest'}
                    </button>
                  </div>
                  
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', color: '#888', marginBottom: '8px', fontSize: '14px' }}>Story Arc *</label>
                    <textarea
                      value={form.storyArc}
                      onChange={(e) => setForm({ ...form, storyArc: e.target.value })}
                      placeholder="A young creator discovers the power of AI and builds a content empire, facing challenges along the way..."
                      rows={3}
                      style={{ ...inputStyle, resize: 'vertical' }}
                    />
                    <p style={{ color: '#666', fontSize: '12px', marginTop: '6px' }}>The overall narrative arc that will unfold across episodes</p>
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#888', marginBottom: '8px', fontSize: '14px' }}>Character Persona *</label>
                    <textarea
                      value={form.characterPersona}
                      onChange={(e) => setForm({ ...form, characterPersona: e.target.value })}
                      placeholder="I'm Alex, an enthusiastic tech creator who loves sharing AI tips and tricks. I'm friendly, energetic, and always excited about new technology..."
                      rows={3}
                      style={{ ...inputStyle, resize: 'vertical' }}
                    />
                    <p style={{ color: '#666', fontSize: '12px', marginTop: '6px' }}>Who is your avatar? Their personality, voice, and style</p>
                  </div>
                </div>

                {/* Step 4: Platform Selection */}
                <div style={{ marginBottom: '32px' }}>
                  <h3 style={{ color: '#C77DFF', fontSize: '16px', marginBottom: '16px' }}>
                    Step 4: Select Platforms
                  </h3>
                  
                  {loadingPlatforms ? (
                    <p style={{ color: '#888' }}>Loading platforms...</p>
                  ) : connectedCount === 0 ? (
                    <div style={{
                      padding: '20px',
                      background: 'rgba(255,152,0,0.1)',
                      border: '1px solid rgba(255,152,0,0.3)',
                      borderRadius: '12px',
                    }}>
                      <p style={{ color: '#FF9800', marginBottom: '12px' }}>
                        ⚠️ No social platforms connected. Connect at least one to post content.
                      </p>
                      <Link
                        href="/spacebaddie/automation"
                        style={{
                          display: 'inline-block',
                          padding: '8px 16px',
                          background: 'rgba(255,152,0,0.2)',
                          borderRadius: '6px',
                          color: '#FF9800',
                          textDecoration: 'none',
                          fontSize: '14px',
                        }}
                      >
                        Connect Platforms →
                      </Link>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                      {ALL_PLATFORMS.map((platform) => {
                        const info = PLATFORM_INFO[platform];
                        const platformData = connectedPlatforms.find(p => p.platform === platform);
                        const isConnected = platformData?.connected || false;
                        const isSelected = form.platforms.includes(platform);

                        return (
                          <button
                            key={platform}
                            onClick={() => isConnected && togglePlatform(platform)}
                            disabled={!isConnected}
                            style={{
                              padding: '14px',
                              borderRadius: '12px',
                              border: isSelected 
                                ? `2px solid ${info.color}` 
                                : '1px solid rgba(255,255,255,0.1)',
                              background: isSelected 
                                ? `${info.color}20` 
                                : 'rgba(255,255,255,0.03)',
                              cursor: isConnected ? 'pointer' : 'not-allowed',
                              opacity: isConnected ? 1 : 0.4,
                              textAlign: 'left',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{ fontSize: '20px' }}>{info.icon}</span>
                              <div>
                                <p style={{ 
                                  color: isSelected ? info.color : '#fff', 
                                  fontWeight: 600,
                                  fontSize: '14px',
                                }}>
                                  {info.name}
                                </p>
                                <p style={{ 
                                  color: isConnected ? '#00C853' : '#FF6B6B', 
                                  fontSize: '11px' 
                                }}>
                                  {isConnected ? '✓ Connected' : '✗ Not connected'}
                                </p>
                              </div>
                              {isSelected && (
                                <span style={{ marginLeft: 'auto', color: info.color }}>✓</span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  
                  {form.platforms.length > 0 && (
                    <p style={{ color: '#00D4D4', fontSize: '13px', marginTop: '12px' }}>
                      ✓ Will post to: {form.platforms.map(p => PLATFORM_INFO[p]?.name).join(', ')}
                    </p>
                  )}
                </div>

                {/* Step 5: Settings */}
                <div style={{ marginBottom: '32px' }}>
                  <h3 style={{ color: '#C77DFF', fontSize: '16px', marginBottom: '16px' }}>
                    Step 5: Schedule & Settings
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
                    <div>
                      <label style={{ display: 'block', color: '#888', marginBottom: '8px', fontSize: '14px' }}>Content Style</label>
                      <select
                        value={form.contentStyle}
                        onChange={(e) => setForm({ ...form, contentStyle: e.target.value })}
                        style={inputStyle}
                      >
                        <option value="storytelling">Storytelling</option>
                        <option value="educational">Educational</option>
                        <option value="comedy">Comedy</option>
                        <option value="news">News/Updates</option>
                        <option value="promotional">Promotional</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', color: '#888', marginBottom: '8px', fontSize: '14px' }}>Frequency</label>
                      <select
                        value={form.frequency}
                        onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                        style={inputStyle}
                      >
                        <option value="hourly">Hourly</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', color: '#888', marginBottom: '8px', fontSize: '14px' }}>Episode Length</label>
                      <select
                        value={form.episodeDuration}
                        onChange={(e) => setForm({ ...form, episodeDuration: parseInt(e.target.value) })}
                        style={inputStyle}
                      >
                        <option value={15}>15 seconds</option>
                        <option value={30}>30 seconds</option>
                        <option value={60}>60 seconds</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Scene & Voice Settings */}
                <div style={{ marginBottom: '32px' }}>
                  <h3 style={{ color: '#fff', fontSize: '16px', marginBottom: '16px', fontWeight: 600 }}>
                    🎬 Scene & Voice
                  </h3>
                  
                  {/* Cinematic Scene Toggle */}
                  <div
                    onClick={() => setForm({ ...form, cinematicScene: !form.cinematicScene })}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '14px 16px',
                      marginBottom: '16px',
                      background: form.cinematicScene
                        ? 'linear-gradient(135deg, rgba(255,0,110,0.12), rgba(138,43,226,0.12))'
                        : 'rgba(255,255,255,0.03)',
                      border: form.cinematicScene ? '1px solid rgba(255,0,110,0.3)' : '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{
                      width: '40px', height: '22px', borderRadius: '11px', position: 'relative',
                      background: form.cinematicScene ? 'linear-gradient(135deg, #FF006E, #8A2BE2)' : 'rgba(255,255,255,0.15)',
                    }}>
                      <div style={{
                        width: '18px', height: '18px', borderRadius: '50%', background: '#fff',
                        position: 'absolute', top: '2px', left: form.cinematicScene ? '20px' : '2px',
                        transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                      }} />
                    </div>
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: form.cinematicScene ? '#fff' : '#aaa', margin: 0 }}>
                        Cinematic Scene Mode
                      </p>
                      <p style={{ fontSize: '11px', color: form.cinematicScene ? '#ccc' : '#666', margin: '2px 0 0' }}>
                        {form.cinematicScene ? 'AI places your avatar in real-life scenes' : 'Enable for realistic environments'}
                      </p>
                    </div>
                  </div>

                  {/* Background Scene Picker */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', color: '#888', marginBottom: '8px', fontSize: '13px' }}>Background Scene</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                      {[
                        { id: 'studio', icon: '🎬', name: 'Studio' },
                        { id: 'office', icon: '🏢', name: 'Office' },
                        { id: 'beach', icon: '🏖️', name: 'Beach' },
                        { id: 'forest', icon: '🌲', name: 'Forest' },
                        { id: 'city-night', icon: '🌃', name: 'City Night' },
                        { id: 'neon', icon: '🌈', name: 'Neon' },
                        { id: 'podcast', icon: '🎙️', name: 'Podcast' },
                        { id: 'mountain', icon: '⛰️', name: 'Mountain' },
                      ].map(scene => (
                        <button
                          key={scene.id}
                          onClick={() => setForm({ ...form, backgroundScene: scene.id })}
                          style={{
                            padding: '10px 6px',
                            borderRadius: '10px',
                            border: form.backgroundScene === scene.id ? '2px solid #FF006E' : '1px solid rgba(255,255,255,0.1)',
                            background: form.backgroundScene === scene.id ? 'rgba(255,0,110,0.1)' : 'rgba(255,255,255,0.03)',
                            color: form.backgroundScene === scene.id ? '#fff' : '#888',
                            cursor: 'pointer',
                            textAlign: 'center',
                            fontSize: '12px',
                          }}
                        >
                          <div style={{ fontSize: '20px', marginBottom: '4px' }}>{scene.icon}</div>
                          {scene.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Voice Gender */}
                  <div>
                    <label style={{ display: 'block', color: '#888', marginBottom: '8px', fontSize: '13px' }}>Voice Gender</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {(['female', 'male'] as const).map(g => (
                        <button
                          key={g}
                          onClick={() => setForm({ ...form, voiceGender: g })}
                          style={{
                            flex: 1,
                            padding: '10px',
                            borderRadius: '10px',
                            border: form.voiceGender === g ? '2px solid #C77DFF' : '1px solid rgba(255,255,255,0.1)',
                            background: form.voiceGender === g ? 'rgba(199,125,255,0.15)' : 'rgba(255,255,255,0.03)',
                            color: form.voiceGender === g ? '#C77DFF' : '#888',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '13px',
                          }}
                        >
                          {g === 'female' ? '♀ Female' : '♂ Male'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Auto-start toggle */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '16px 20px',
                  background: 'rgba(0,212,212,0.1)',
                  border: '1px solid rgba(0,212,212,0.3)',
                  borderRadius: '12px',
                  marginBottom: '32px',
                }}>
                  <input
                    type="checkbox"
                    id="autoStart"
                    checked={form.autoStart}
                    onChange={(e) => setForm({ ...form, autoStart: e.target.checked })}
                    style={{ width: '20px', height: '20px', accentColor: '#00D4D4' }}
                  />
                  <label htmlFor="autoStart" style={{ color: '#fff', flex: 1 }}>
                    <strong>Start generating immediately</strong>
                    <p style={{ color: '#888', fontSize: '13px', marginTop: '4px' }}>
                      First episode will be created right away and posted according to schedule
                    </p>
                  </label>
                </div>

                {/* Create Button */}
                <button
                  onClick={handleCreate}
                  disabled={creating || form.platforms.length === 0}
                  style={{
                    width: '100%',
                    padding: '16px 32px',
                    background: (creating || form.platforms.length === 0) 
                      ? 'rgba(255,255,255,0.1)' 
                      : 'linear-gradient(135deg, #00D4D4 0%, #8A2BE2 100%)',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '18px',
                    cursor: (creating || form.platforms.length === 0) ? 'not-allowed' : 'pointer',
                  }}
                >
                  {creating ? '⏳ Creating Series...' : '🚀 Create Series'}
                </button>

                {/* Info */}
                <div style={{
                  marginTop: '24px',
                  padding: '16px',
                  background: 'rgba(138,43,226,0.1)',
                  border: '1px solid rgba(138,43,226,0.3)',
                  borderRadius: '10px',
                }}>
                  <p style={{ color: '#C77DFF', fontSize: '14px', marginBottom: '8px', fontWeight: 600 }}>
                    What happens next?
                  </p>
                  <ul style={{ color: '#888', fontSize: '13px', margin: 0, paddingLeft: '20px', lineHeight: 1.7 }}>
                    <li>AI writes each episode's script continuing your story</li>
                    <li>Your avatar speaks the script in generated videos</li>
                    <li>Videos are automatically scheduled and posted to {form.platforms.length > 0 ? form.platforms.map(p => PLATFORM_INFO[p]?.name).join(', ') : 'selected platforms'}</li>
                    <li>You can pause, edit, or generate episodes manually anytime</li>
                  </ul>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardShell>
  );
}
