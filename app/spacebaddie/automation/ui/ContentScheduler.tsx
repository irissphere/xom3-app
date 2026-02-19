'use client';

import React, { useState, useEffect } from 'react';
import { SocialPlatform, TimeSlot } from '@/lib/spacebaddie/types';
import { supabase, getCurrentUser } from '@/lib/supabase/client';

interface ContentSchedulerProps {
  platforms: SocialPlatform[];
  schedule: {
    frequency: 'hourly' | 'daily' | 'weekly';
    optimalTimes: TimeSlot[];
    autoOptimize: boolean;
  };
  onSchedule: (content: any, platforms: string[], scheduleTime: Date) => void;
  initialMediaUrl?: string;
  initialTitle?: string;
}

interface LibraryVideo {
  id: string;
  video_url: string;
  title: string;
  created_at: string;
}

export function ContentScheduler({ platforms, schedule, onSchedule, initialMediaUrl, initialTitle }: ContentSchedulerProps) {
  const [content, setContent] = useState({
    title: initialTitle ?? '',
    description: '',
    mediaUrl: initialMediaUrl ?? '',
    hashtags: '',
    cta: 'Learn More'
  });
  const [libraryPickerOpen, setLibraryPickerOpen] = useState(false);
  const [libraryVideos, setLibraryVideos] = useState<LibraryVideo[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);

  useEffect(() => {
    if (initialMediaUrl || initialTitle) {
      setContent(prev => ({
        ...prev,
        mediaUrl: initialMediaUrl ?? prev.mediaUrl,
        title: initialTitle ?? prev.title,
      }));
    }
  }, [initialMediaUrl, initialTitle]);

  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  // Only default to optimal time if we have real data
  const hasOptimalTimes = schedule.optimalTimes && schedule.optimalTimes.length > 0;
  const [useOptimalTime, setUseOptimalTime] = useState(hasOptimalTimes);
  const [isPosting, setIsPosting] = useState(false);
  const [postResult, setPostResult] = useState<{ success: boolean; message: string; postUrl?: string; privacyNote?: string } | null>(null);
  const [aiLoading, setAiLoading] = useState<'title' | 'description' | 'hashtags' | 'all' | null>(null);

  const handleAiAssist = async (type: 'title' | 'description' | 'hashtags' | 'all') => {
    setAiLoading(type);
    try {
      const res = await fetch('/api/spacebaddie/ai-assist', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          context: {
            title: content.title,
            description: content.description,
            hashtags: content.hashtags,
            mediaUrl: content.mediaUrl,
            platforms: selectedPlatforms,
            cta: content.cta,
          },
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setContent(prev => ({
          ...prev,
          ...(data.title ? { title: data.title } : {}),
          ...(data.description ? { description: data.description } : {}),
          ...(data.hashtags ? { hashtags: data.hashtags } : {}),
        }));
      }
    } catch (err) {
      console.error('[AI Assist] Error:', err);
    } finally {
      setAiLoading(null);
    }
  };

  const handlePlatformToggle = (platformName: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platformName)
        ? prev.filter(p => p !== platformName)
        : [...prev, platformName]
    );
  };

  const fetchLibraryVideos = async () => {
    setLibraryLoading(true);
    try {
      const user = await getCurrentUser();
      if (!user) {
        setLibraryVideos([]);
        return;
      }
      const all: LibraryVideo[] = [];
      const { data: standard } = await supabase
        .from('spacebaddie_video_jobs')
        .select('id, video_url, created_at')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .not('video_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(50);
      if (standard) {
        all.push(...standard.map(v => ({
          id: v.id,
          video_url: v.video_url,
          title: `Video ${v.id.slice(0, 8)}`,
          created_at: v.created_at,
        })));
      }
      const { data: cinematic } = await supabase
        .from('spacebaddie_projects')
        .select('id, video_url, title, created_at')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .not('video_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(50);
      if (cinematic) {
        all.push(...cinematic.map(v => ({
          id: v.id,
          video_url: v.video_url,
          title: v.title || `Cinematic ${v.id.slice(0, 8)}`,
          created_at: v.created_at,
        })));
      }
      all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setLibraryVideos(all.slice(0, 24));
    } catch (e) {
      console.error('Failed to load library:', e);
      setLibraryVideos([]);
    } finally {
      setLibraryLoading(false);
    }
  };

  const openLibraryPicker = () => {
    setLibraryPickerOpen(true);
    fetchLibraryVideos();
  };

  const selectLibraryVideo = (v: LibraryVideo) => {
    setContent(prev => ({ ...prev, mediaUrl: v.video_url, title: prev.title || v.title }));
    setLibraryPickerOpen(false);
  };

  const handleSchedule = async () => {
    if (!content.title || selectedPlatforms.length === 0) return;

    let targetTime: Date;
    
    // Only use optimal time if we have real data AND user opted in
    if (useOptimalTime && hasOptimalTimes) {
      const today = new Date();
      const dayOfWeek = today.getDay();
      const optimalSlot = schedule.optimalTimes.find(t => t.day === dayOfWeek);
      if (optimalSlot) {
        targetTime = new Date(today);
        targetTime.setHours(optimalSlot.hour, 0, 0, 0);
        // If optimal time is in the past, schedule for tomorrow
        if (targetTime < new Date()) {
          targetTime.setDate(targetTime.getDate() + 1);
        }
      } else {
        // No optimal slot for today, use manual time
        targetTime = new Date(`${scheduleDate}T${scheduleTime}`);
      }
    } else {
      // Use manually selected time
      targetTime = new Date(`${scheduleDate}T${scheduleTime}`);
    }

    // Validate time is in the future
    if (targetTime <= new Date()) {
      setPostResult({ success: false, message: 'Scheduled time must be in the future' });
      return;
    }

    setIsPosting(true);
    setPostResult(null);

    try {
      const tags = content.hashtags
        .split(/[#,\s]+/)
        .filter(t => t.length > 0)
        .map(t => t.replace(/^#/, ''));

      // Include user's timezone so the backend stores it on the post queue row
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      const res = await fetch('/api/spacebaddie/social/schedule', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType: content.mediaUrl ? 'video' : 'text',
          contentText: `${content.title}\n\n${content.description}`,
          contentUrl: content.mediaUrl || undefined,
          platforms: selectedPlatforms,
          scheduledTime: targetTime.toISOString(),
          timezone: userTimezone,
          tags,
          sourceType: 'manual',
        }),
      });

      const data = await res.json();

      if (data.ok) {
        setPostResult({ success: true, message: data.message || 'Post scheduled!' });
        // Also call the parent onSchedule for any additional handling
        onSchedule(content, selectedPlatforms, targetTime);
        // Reset form
        setContent({ title: '', description: '', mediaUrl: '', hashtags: '', cta: 'Learn More' });
        setSelectedPlatforms([]);
        setScheduleDate('');
        setScheduleTime('');
      } else {
        setPostResult({ success: false, message: data.error || 'Failed to schedule post' });
      }
    } catch (err: any) {
      setPostResult({ success: false, message: err.message });
    }

    setIsPosting(false);
  };

  // Post immediately to selected platforms
  const handlePostNow = async () => {
    if (!content.title || selectedPlatforms.length === 0) return;
    if (!content.mediaUrl && selectedPlatforms.includes('youtube')) {
      setPostResult({ success: false, message: 'YouTube requires a video URL' });
      return;
    }

    setIsPosting(true);
    setPostResult(null);

    const results: { platform: string; success: boolean; message: string; postUrl?: string }[] = [];

    for (const platform of selectedPlatforms) {
      try {
        const tags = content.hashtags
          .split(/[#,\s]+/)
          .filter(t => t.length > 0)
          .map(t => t.replace(/^#/, ''));

        const res = await fetch('/api/spacebaddie/social/post', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            platform,
            type: content.mediaUrl ? 'video' : 'text',
            title: content.title,
            description: content.description,
            videoUrl: content.mediaUrl || undefined,
            tags,
            privacy: 'public',
          }),
        });

        const data = await res.json();
        results.push({
          platform,
          success: data.ok,
          message: data.ok ? `Posted! ${data.postUrl || ''}` : data.error,
          postUrl: data.postUrl || undefined,
        });
      } catch (err: any) {
        results.push({
          platform,
          success: false,
          message: err.message,
          postUrl: undefined,
        });
      }
    }

    const allSuccess = results.every(r => r.success);
    const successCount = results.filter(r => r.success).length;
    
    if (allSuccess) {
      // Collect post URLs for display
      const ytResult = results.find(r => r.platform === 'youtube' && r.success);
      const postUrl = ytResult?.postUrl || results.find(r => r.success)?.postUrl;
      
      setPostResult({ 
        success: true, 
        message: `Posted to ${successCount} platform${successCount > 1 ? 's' : ''}!`,
        postUrl: postUrl || undefined,
        privacyNote: ytResult ? 'Note: YouTube may set new uploads to "Private" until the app is verified by Google. Check YouTube Studio to change visibility.' : undefined,
      });
      // Reset form on success
      setContent({ title: '', description: '', mediaUrl: '', hashtags: '', cta: 'Learn More' });
      setSelectedPlatforms([]);
    } else {
      const errors = results.filter(r => !r.success).map(r => `${r.platform}: ${r.message}`);
      setPostResult({ 
        success: false, 
        message: errors.join('; ') 
      });
    }

    setIsPosting(false);
  };

  const getOptimalTimeForToday = () => {
    const today = new Date().getDay();
    const optimal = schedule.optimalTimes.find(t => t.day === today);
    return optimal;
  };

  const optimalTime = getOptimalTimeForToday();

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

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '8px',
    color: '#888',
    fontSize: '14px',
  };

  const connectedPlatforms = platforms.filter(p => p.connected);
  const hasNoPlatforms = connectedPlatforms.length === 0;

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '20px',
      padding: '0',
      overflow: 'hidden',
    }}>
      {/* No platforms warning */}
      {hasNoPlatforms && (
        <div style={{
          padding: '20px 24px',
          background: 'rgba(255,107,157,0.1)',
          borderBottom: '1px solid rgba(255,107,157,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <span style={{ fontSize: '20px' }}>⚠️</span>
          <div>
            <div style={{ color: '#FF6B9D', fontWeight: 600, fontSize: '14px' }}>No platforms connected</div>
            <div style={{ color: '#888', fontSize: '13px' }}>Connect a social account above to start posting</div>
          </div>
        </div>
      )}

      <div style={{ padding: '24px' }}>
        {/* Two-column layout on larger screens */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: '32px' }}>
          
          {/* Left Column: Content Form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* AI Assist All Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => handleAiAssist('all')}
                disabled={aiLoading !== null}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  border: '1px solid rgba(168,85,247,0.4)',
                  background: 'linear-gradient(135deg, rgba(168,85,247,0.15), rgba(255,107,157,0.15))',
                  color: '#C77DFF',
                  fontWeight: 600,
                  fontSize: '12px',
                  cursor: aiLoading ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  opacity: aiLoading ? 0.6 : 1,
                }}
              >
                {aiLoading === 'all' ? '...' : '✨'} AI Write All
              </button>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={{ color: '#888', fontSize: '14px' }}>Title *</label>
                <button
                  type="button"
                  onClick={() => handleAiAssist('title')}
                  disabled={aiLoading !== null}
                  title="AI-generate a title"
                  style={{
                    padding: '3px 10px',
                    borderRadius: '12px',
                    border: '1px solid rgba(168,85,247,0.3)',
                    background: 'rgba(168,85,247,0.08)',
                    color: '#A855F7',
                    fontSize: '11px',
                    cursor: aiLoading ? 'wait' : 'pointer',
                    opacity: aiLoading ? 0.6 : 1,
                  }}
                >
                  {aiLoading === 'title' ? '...' : '✨ AI'}
                </button>
              </div>
              <input
                type="text"
                value={content.title}
                onChange={(e) => setContent(prev => ({ ...prev, title: e.target.value }))}
                style={inputStyle}
                placeholder="Enter your content title..."
              />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={{ color: '#888', fontSize: '14px' }}>Description</label>
                <button
                  type="button"
                  onClick={() => handleAiAssist('description')}
                  disabled={aiLoading !== null}
                  title="AI-generate a description"
                  style={{
                    padding: '3px 10px',
                    borderRadius: '12px',
                    border: '1px solid rgba(168,85,247,0.3)',
                    background: 'rgba(168,85,247,0.08)',
                    color: '#A855F7',
                    fontSize: '11px',
                    cursor: aiLoading ? 'wait' : 'pointer',
                    opacity: aiLoading ? 0.6 : 1,
                  }}
                >
                  {aiLoading === 'description' ? '...' : '✨ AI'}
                </button>
              </div>
              <textarea
                value={content.description}
                onChange={(e) => setContent(prev => ({ ...prev, description: e.target.value }))}
                rows={5}
                style={{ ...inputStyle, resize: 'vertical' }}
                placeholder="Describe your content..."
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Media URL (optional)</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="url"
                    value={content.mediaUrl}
                    onChange={(e) => setContent(prev => ({ ...prev, mediaUrl: e.target.value }))}
                    style={{ ...inputStyle, flex: 1 }}
                    placeholder="https://... or select from library"
                  />
                  <button
                    type="button"
                    onClick={openLibraryPicker}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,107,157,0.4)',
                      background: 'rgba(255,107,157,0.1)',
                      color: '#FF6B9D',
                      fontWeight: 500,
                      fontSize: '12px',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Select from Library
                  </button>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Call to Action</label>
                <select
                  value={content.cta}
                  onChange={(e) => setContent(prev => ({ ...prev, cta: e.target.value }))}
                  style={inputStyle}
                  title="Call to Action"
                  aria-label="Call to Action"
                >
                  <option value="Learn More">Learn More</option>
                  <option value="Watch Now">Watch Now</option>
                  <option value="Follow Me">Follow Me</option>
                  <option value="Subscribe">Subscribe</option>
                  <option value="Shop Now">Shop Now</option>
                  <option value="Join Community">Join Community</option>
                </select>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={{ color: '#888', fontSize: '14px' }}>Hashtags</label>
                <button
                  type="button"
                  onClick={() => handleAiAssist('hashtags')}
                  disabled={aiLoading !== null}
                  title="AI-generate hashtags"
                  style={{
                    padding: '3px 10px',
                    borderRadius: '12px',
                    border: '1px solid rgba(168,85,247,0.3)',
                    background: 'rgba(168,85,247,0.08)',
                    color: '#A855F7',
                    fontSize: '11px',
                    cursor: aiLoading ? 'wait' : 'pointer',
                    opacity: aiLoading ? 0.6 : 1,
                  }}
                >
                  {aiLoading === 'hashtags' ? '...' : '✨ AI'}
                </button>
              </div>
              <input
                type="text"
                value={content.hashtags}
                onChange={(e) => setContent(prev => ({ ...prev, hashtags: e.target.value }))}
                style={inputStyle}
                placeholder="#gaming #contentcreator #spacebaddie"
              />
            </div>
          </div>

          {/* Right Column: Platforms & Schedule */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '20px',
            background: 'rgba(255,255,255,0.02)',
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            {/* Platform Selection */}
            <div>
              <label style={{ ...labelStyle, marginBottom: '12px' }}>Post to *</label>
              {connectedPlatforms.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {connectedPlatforms.map((platform) => (
                    <button
                      key={platform.name}
                      onClick={() => handlePlatformToggle(platform.name)}
                      style={{
                        padding: '10px 16px',
                        borderRadius: '10px',
                        border: selectedPlatforms.includes(platform.name) 
                          ? '2px solid #FF6B9D' 
                          : '1px solid rgba(255,255,255,0.12)',
                        background: selectedPlatforms.includes(platform.name) 
                          ? 'rgba(255,0,110,0.15)' 
                          : 'rgba(255,255,255,0.03)',
                        color: selectedPlatforms.includes(platform.name) ? '#FF6B9D' : '#999',
                        textTransform: 'capitalize',
                        cursor: 'pointer',
                        fontWeight: 500,
                        fontSize: '13px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {platform.name}
                    </button>
                  ))}
                </div>
              ) : (
                <div style={{ color: '#666', fontSize: '13px', fontStyle: 'italic' }}>
                  No connected platforms
                </div>
              )}
            </div>

            {/* Date/Time Selection */}
            <div>
              <label style={{ ...labelStyle, marginBottom: '12px' }}>Schedule for</label>
              
              {/* Only show AI optimal time option if we have real data */}
              {schedule.optimalTimes && schedule.optimalTimes.length > 0 && (
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  cursor: 'pointer',
                  marginBottom: '12px',
                  padding: '10px 12px',
                  background: useOptimalTime ? 'rgba(0,200,100,0.1)' : 'transparent',
                  borderRadius: '8px',
                  border: useOptimalTime ? '1px solid rgba(0,200,100,0.3)' : '1px solid transparent',
                }}>
                  <input
                    type="checkbox"
                    checked={useOptimalTime}
                    onChange={(e) => setUseOptimalTime(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: '#00D4D4' }}
                  />
                  <span style={{ fontSize: '13px', color: useOptimalTime ? '#00D4D4' : '#999' }}>
                    🎯 Use optimal time {optimalTime && `(${optimalTime.hour}:00)`}
                  </span>
                </label>
              )}

              {(!schedule.optimalTimes || schedule.optimalTimes.length === 0 || !useOptimalTime) && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    style={{ ...inputStyle, fontSize: '13px', padding: '10px 12px' }}
                    title="Schedule date"
                    aria-label="Schedule date"
                  />
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    style={{ ...inputStyle, fontSize: '13px', padding: '10px 12px' }}
                    title="Schedule time"
                    aria-label="Schedule time"
                  />
                </div>
              )}

              {/* Quick Schedule */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button
                  onClick={() => {
                    const now = new Date();
                    now.setHours(now.getHours() + 1);
                    setScheduleDate(now.toISOString().split('T')[0]);
                    setScheduleTime(now.toTimeString().slice(0, 5));
                    setUseOptimalTime(false);
                  }}
                  style={{
                    flex: 1,
                    padding: '8px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#888',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  In 1 hour
                </button>
                <button
                  onClick={() => {
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    setScheduleDate(tomorrow.toISOString().split('T')[0]);
                    setScheduleTime('09:00');
                    setUseOptimalTime(false);
                  }}
                  style={{
                    flex: 1,
                    padding: '8px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#888',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  Tomorrow 9 AM
                </button>
              </div>
            </div>

            {/* Post Result Message */}
            {postResult && (
              <div style={{
                padding: '12px 14px',
                borderRadius: '10px',
                background: postResult.success ? 'rgba(0,200,100,0.1)' : 'rgba(255,0,0,0.1)',
                border: `1px solid ${postResult.success ? 'rgba(0,200,100,0.3)' : 'rgba(255,0,0,0.3)'}`,
                color: postResult.success ? '#00D4D4' : '#FF6B6B',
                fontSize: '13px',
              }}>
                <div>{postResult.success ? '✅' : '❌'} {postResult.message}</div>
                {postResult.postUrl && (
                  <div style={{ marginTop: '8px' }}>
                    <a 
                      href={postResult.postUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ color: '#A855F7', textDecoration: 'underline', fontWeight: 500 }}
                    >
                      View on YouTube &rarr;
                    </a>
                  </div>
                )}
                {postResult.privacyNote && (
                  <div style={{ 
                    marginTop: '8px', 
                    fontSize: '12px', 
                    color: '#F59E0B',
                    background: 'rgba(245, 158, 11, 0.08)',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    lineHeight: '1.4',
                  }}>
                    ⚠️ {postResult.privacyNote}
                    <br />
                    <a 
                      href="https://studio.youtube.com" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ color: '#A855F7', textDecoration: 'underline' }}
                    >
                      Open YouTube Studio
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: 'auto' }}>
              <button
                onClick={handlePostNow}
                disabled={!content.title || selectedPlatforms.length === 0 || isPosting}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  background: (!content.title || selectedPlatforms.length === 0 || isPosting) 
                    ? 'rgba(255,255,255,0.08)' 
                    : 'linear-gradient(135deg, #00D4D4 0%, #00A3FF 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  color: (!content.title || selectedPlatforms.length === 0 || isPosting) ? '#555' : '#fff',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: (!content.title || selectedPlatforms.length === 0 || isPosting) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {isPosting ? '⏳ Posting...' : '🚀 Post Now'}
              </button>

              <button
                onClick={handleSchedule}
                disabled={!content.title || selectedPlatforms.length === 0 || (!scheduleDate && !useOptimalTime)}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  background: (!content.title || selectedPlatforms.length === 0 || (!scheduleDate && !useOptimalTime)) 
                    ? 'rgba(255,255,255,0.08)' 
                    : 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  color: (!content.title || selectedPlatforms.length === 0 || (!scheduleDate && !useOptimalTime)) ? '#555' : '#fff',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: (!content.title || selectedPlatforms.length === 0 || (!scheduleDate && !useOptimalTime)) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                📅 Schedule
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Select from Library modal */}
      {libraryPickerOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
          onClick={() => setLibraryPickerOpen(false)}
        >
          <div
            style={{
              background: '#1a1a24',
              borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.1)',
              maxWidth: '640px',
              width: '100%',
              maxHeight: '80vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#fff' }}>Select from Library</h3>
              <button
                type="button"
                onClick={() => setLibraryPickerOpen(false)}
                style={{ background: 'none', border: 'none', color: '#888', fontSize: '20px', cursor: 'pointer' }}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div style={{ padding: '16px', overflow: 'auto', flex: 1 }}>
              {libraryLoading ? (
                <p style={{ color: '#888', textAlign: 'center', padding: '24px' }}>Loading your videos...</p>
              ) : libraryVideos.length === 0 ? (
                <p style={{ color: '#888', textAlign: 'center', padding: '24px' }}>No completed videos yet. Create one in Studio or Projects first.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
                  {libraryVideos.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => selectLibraryVideo(v)}
                      style={{
                        padding: 0,
                        border: '2px solid rgba(255,107,157,0.3)',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        background: 'rgba(255,255,255,0.03)',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <div style={{ aspectRatio: '9/16', background: 'rgba(0,0,0,0.3)', position: 'relative' }}>
                        {v.video_url ? (
                          <video
                            src={v.video_url}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            muted
                            playsInline
                            preload="metadata"
                          />
                        ) : (
                          <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>🎬</span>
                        )}
                      </div>
                      <div style={{ padding: '8px 10px' }}>
                        <p style={{ margin: 0, fontSize: '12px', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.title}</p>
                        <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#666' }}>{new Date(v.created_at).toLocaleDateString()}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}







