'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase, getCurrentUser } from '@/lib/supabase/client';
import DashboardShell from '../components/DashboardShell';

interface Project {
  id: string;
  status: string;
  video_url: string | null;
  created_at: string;
  type: 'standard' | 'cinematic';
  prompt?: string;
  title?: string;
}

interface ContentSeries {
  series_id: string;
  title: string;
  description?: string;
  status: string;
  total_episodes: number;
  current_episode: number;
  frequency: string;
  platforms: string[];
  next_episode_at?: string;
  created_at: string;
}

export default function SpaceBaddieProjectsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [contentSeries, setContentSeries] = useState<ContentSeries[]>([]);
  const [filter, setFilter] = useState<'all' | 'videos' | 'series'>('all');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  // Auto-poll cinematic status when viewing a processing project
  useEffect(() => {
    if (!selectedProject || selectedProject.type !== 'cinematic' || selectedProject.status !== 'processing') {
      return;
    }
    const jobId = selectedProject.id.startsWith('proj_') ? selectedProject.id.slice(5) : selectedProject.id;
    if (!jobId) return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/spacebaddie/cinematic/status?jobId=${encodeURIComponent(jobId)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === 'completed' || data.status === 'failed') {
          setProjects(prev => prev.map(p =>
            p.id === selectedProject.id ? { ...p, status: data.status, video_url: data.videoUrl || p.video_url } : p
          ));
          setSelectedProject(prev => prev ? { ...prev, status: data.status, video_url: data.videoUrl || prev.video_url } : null);
        }
      } catch {
        // Ignore poll errors
      }
    };

    poll();
    const interval = setInterval(poll, 15000);
    return () => clearInterval(interval);
  }, [selectedProject?.id, selectedProject?.type, selectedProject?.status]);

  const loadProjects = async () => {
    try {
      const userData = await getCurrentUser();
      if (!userData) {
        router.push('/spacebaddie/login');
        return;
      }
      setUser(userData);

      // Load standard videos from spacebaddie_video_jobs
      const { data: standardVideos } = await supabase
        .from('spacebaddie_video_jobs')
        .select('*')
        .eq('user_id', userData.id)
        .order('created_at', { ascending: false });

      // Load cinematic videos from spacebaddie_projects
      const { data: cinematicVideos } = await supabase
        .from('spacebaddie_projects')
        .select('*')
        .eq('user_id', userData.id)
        .order('created_at', { ascending: false });

      // Combine all projects
      const allProjects: Project[] = [];

      if (standardVideos) {
        allProjects.push(...standardVideos.map(v => ({
          id: v.id,
          status: v.status,
          video_url: v.video_url,
          created_at: v.created_at,
          type: 'standard' as const,
          prompt: v.script || v.prompt,
          title: `Video ${v.id.slice(0, 6)}`,
        })));
      }

      if (cinematicVideos) {
        allProjects.push(...cinematicVideos.map(v => ({
          id: v.id,
          status: v.status,
          video_url: v.video_url,
          created_at: v.created_at,
          type: 'cinematic' as const,
          prompt: v.prompt,
          title: v.title || `Cinematic ${v.id.slice(0, 6)}`,
        })));
      }

      // Sort by date
      allProjects.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setProjects(allProjects);

      // Load content series
      const { data: seriesData } = await supabase
        .from('spacebaddie_content_series')
        .select('*')
        .eq('user_id', userData.id)
        .order('created_at', { ascending: false });

      if (seriesData) {
        setContentSeries(seriesData);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = filter === 'series' 
    ? [] 
    : projects;

  const handleSaveTitle = async () => {
    if (!selectedProject || !user) return;
    setSaving(true);
    try {
      if (selectedProject.type === 'cinematic') {
        const { error } = await supabase
          .from('spacebaddie_projects')
          .update({ title: editTitle })
          .eq('id', selectedProject.id)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('spacebaddie_video_jobs')
          .update({ script: editTitle || null })
          .eq('id', selectedProject.id)
          .eq('user_id', user.id);
        if (error) throw error;
      }
      setProjects(prev => prev.map(p =>
        p.id === selectedProject.id ? { ...p, title: editTitle, prompt: p.type === 'standard' ? (editTitle || p.prompt) : p.prompt } : p
      ));
      setSelectedProject(prev => prev ? { ...prev, title: editTitle } : null);
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedProject || !user) return;
    if (!confirm('Delete this video? This cannot be undone.')) return;
    setDeleting(true);
    try {
      const table = selectedProject.type === 'cinematic' ? 'spacebaddie_projects' : 'spacebaddie_video_jobs';
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', selectedProject.id)
        .eq('user_id', user.id);
      if (error) throw error;
      setProjects(prev => prev.filter(p => p.id !== selectedProject.id));
      setSelectedProject(null);
    } catch (err) {
      console.error('Failed to delete:', err);
    } finally {
      setDeleting(false);
    }
  };

  const handlePostToSocial = () => {
    if (!selectedProject?.video_url) return;
    const url = `/spacebaddie/automation?videoUrl=${encodeURIComponent(selectedProject.video_url)}&title=${encodeURIComponent(selectedProject.title || '')}`;
    router.push(url);
    setSelectedProject(null);
  };

  const handleCheckStatus = async () => {
    if (!selectedProject || selectedProject.type !== 'cinematic' || !user) return;
    setCheckingStatus(true);
    try {
      const jobId = selectedProject.id.startsWith('proj_') ? selectedProject.id.slice(5) : selectedProject.id;
      const res = await fetch(`/api/spacebaddie/cinematic/status?jobId=${encodeURIComponent(jobId)}`);
      const data = await res.json();
      if (data.status === 'completed' || data.status === 'failed') {
        setProjects(prev => prev.map(p =>
          p.id === selectedProject.id ? { ...p, status: data.status, video_url: data.videoUrl || p.video_url } : p
        ));
        setSelectedProject(prev => prev ? { ...prev, status: data.status, video_url: data.videoUrl || prev.video_url } : null);
      }
    } catch (err) {
      console.error('Check status failed:', err);
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleCheckStatusFor = async (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    if (project.type !== 'cinematic' || project.status === 'completed' || project.status === 'failed') return;
    setCheckingStatus(true);
    try {
      const jobId = project.id.startsWith('proj_') ? project.id.slice(5) : project.id;
      const res = await fetch(`/api/spacebaddie/cinematic/status?jobId=${encodeURIComponent(jobId)}`);
      const data = await res.json();
      if (data.status === 'completed' || data.status === 'failed') {
        setProjects(prev => prev.map(p =>
          p.id === project.id ? { ...p, status: data.status, video_url: data.videoUrl || p.video_url } : p
        ));
        if (selectedProject?.id === project.id) {
          setSelectedProject(prev => prev ? { ...prev, status: data.status, video_url: data.videoUrl || prev.video_url } : null);
        }
      }
    } catch (err) {
      console.error('Check status failed:', err);
    } finally {
      setCheckingStatus(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return { bg: 'rgba(0,212,180,0.2)', color: '#00D4B4' };
      case 'processing': return { bg: 'rgba(255,200,0,0.2)', color: '#FFC800' };
      case 'failed': return { bg: 'rgba(255,80,80,0.2)', color: '#FF5050' };
      default: return { bg: 'rgba(150,150,150,0.2)', color: '#999' };
    }
  };

  if (loading) {
    return (
      <DashboardShell>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '400px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            border: '2px solid rgba(255,107,157,0.3)',
            borderTopColor: '#FF6B9D',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }} />
        </div>
        <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: '32px',
          flexWrap: 'wrap',
          gap: '16px',
        }}>
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '8px', color: '#fff' }}>
              My Projects
            </h1>
            <p style={{ color: '#888' }}>
              {projects.length} videos • {contentSeries.length} series • {projects.filter(p => p.type === 'cinematic').length} cinematic • {projects.filter(p => p.type === 'standard').length} standard
            </p>
          </div>
          <Link
            href="/spacebaddie/studio"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)',
              borderRadius: '12px',
              color: '#fff',
              fontWeight: 600,
              textDecoration: 'none',
              fontSize: '14px',
            }}
          >
            <span>+</span> Create New Video
          </Link>
        </div>

        {/* Filter Tabs */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '24px',
          flexWrap: 'wrap',
        }}>
          {(['all', 'videos', 'series'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                background: filter === f
                  ? 'linear-gradient(135deg, rgba(255,0,110,0.3) 0%, rgba(138,43,226,0.3) 100%)'
                  : 'rgba(255,255,255,0.05)',
                color: filter === f ? '#FF6B9D' : '#888',
                cursor: 'pointer',
                fontWeight: filter === f ? 600 : 400,
                fontSize: '14px',
                transition: 'all 0.2s',
              }}
            >
              {f === 'all' ? '📁 All' : f === 'videos' ? '🎥 Videos' : '📺 Content Series'}
            </button>
          ))}
        </div>

        {/* Videos Section */}
        {filter !== 'series' && (
          <>
            {(filter === 'all' || filter === 'videos') && (
              <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#fff', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span>🎥</span> Videos
              </h2>
            )}

            {/* Projects Grid */}
            {filteredProjects.length === 0 ? (
              <div style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '16px',
                padding: '64px 32px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '64px', marginBottom: '16px' }}>🎥</div>
                <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '8px', color: '#fff' }}>
                  No videos yet
                </h2>
                <p style={{ color: '#888', marginBottom: '24px', maxWidth: '400px', margin: '0 auto 24px' }}>
                  Start creating AI videos to build your content library
                </p>
                <Link
                  href="/spacebaddie/studio"
              style={{
                display: 'inline-block',
                padding: '14px 28px',
                background: 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)',
                borderRadius: '12px',
                color: '#fff',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Create Your First Video
            </Link>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '20px',
          }}>
            {filteredProjects.map((project) => {
              const statusStyle = getStatusColor(project.status);
              return (
                <div
                  key={project.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setSelectedProject(project);
                    setEditTitle(project.title ?? '');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedProject(project);
                      setEditTitle(project.title ?? '');
                    }
                  }}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    transition: 'all 0.2s',
                    cursor: 'pointer',
                  }}
                >
                  {/* Video Preview */}
                  <div style={{
                    aspectRatio: '9/16',
                    background: project.type === 'cinematic'
                      ? 'linear-gradient(135deg, rgba(199,125,255,0.3) 0%, rgba(255,0,110,0.3) 100%)'
                      : 'linear-gradient(135deg, rgba(138,43,226,0.3) 0%, rgba(255,107,157,0.3) 100%)',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {project.video_url && project.status === 'completed' ? (
                      <video
                        src={project.video_url}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        muted
                        playsInline
                        onMouseEnter={(e) => e.currentTarget.play()}
                        onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                      />
                    ) : (
                      <span style={{ fontSize: '48px' }}>
                        {project.type === 'cinematic' ? '🎬' : '🎥'}
                      </span>
                    )}

                    {/* Type Badge */}
                    <div style={{
                      position: 'absolute',
                      top: '8px',
                      left: '8px',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 600,
                      background: project.type === 'cinematic'
                        ? 'linear-gradient(135deg, #C77DFF 0%, #FF6B9D 100%)'
                        : 'rgba(255,255,255,0.2)',
                      color: '#fff',
                    }}>
                      {project.type === 'cinematic' ? 'Cinematic' : 'Standard'}
                    </div>

                    {/* Status Badge */}
                    <div style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 500,
                      background: statusStyle.bg,
                      color: statusStyle.color,
                      textTransform: 'capitalize',
                    }}>
                      {project.status}
                    </div>

                    {/* Check Status for processing cinematic */}
                    {project.type === 'cinematic' && project.status === 'processing' && (
                      <button
                        type="button"
                        onClick={(e) => handleCheckStatusFor(project, e)}
                        disabled={checkingStatus}
                        style={{
                          position: 'absolute',
                          bottom: '8px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          padding: '8px 14px',
                          borderRadius: '8px',
                          background: 'rgba(59,130,246,0.9)',
                          color: '#fff',
                          border: 'none',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: checkingStatus ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        {checkingStatus ? '⏳ Checking…' : '🔄 Check Status'}
                      </button>
                    )}

                    {/* Download Button for Completed */}
                    {project.video_url && project.status === 'completed' && (
                      <a
                        href={project.video_url}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          position: 'absolute',
                          bottom: '8px',
                          right: '8px',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          background: 'rgba(0,0,0,0.6)',
                          color: '#fff',
                          textDecoration: 'none',
                          fontSize: '12px',
                          fontWeight: 500,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        ⬇️ Download
                      </a>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ padding: '16px' }}>
                    <p style={{
                      fontSize: '14px',
                      fontWeight: 500,
                      color: '#fff',
                      marginBottom: '4px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {project.title}
                    </p>
                    <p style={{ fontSize: '12px', color: '#666' }}>
                      {new Date(project.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    {project.prompt && (
                      <p style={{
                        fontSize: '12px',
                        color: '#888',
                        marginTop: '8px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}>
                        {project.prompt}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
          </>
        )}

        {/* Content Series Section */}
        {(filter === 'all' || filter === 'series') && (
          <div style={{ marginTop: '40px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
            }}>
              <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span>📺</span> Content Series
              </h2>
              <Link
                href="/spacebaddie/automation?tab=series"
                style={{
                  padding: '8px 16px',
                  background: 'rgba(199,125,255,0.2)',
                  border: '1px solid rgba(199,125,255,0.3)',
                  borderRadius: '8px',
                  color: '#C77DFF',
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: 500,
                }}
              >
                + Create Series
              </Link>
            </div>

            {contentSeries.length === 0 ? (
              <div style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '16px',
                padding: '48px 32px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>📺</div>
                <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px', color: '#fff' }}>
                  No Content Series Yet
                </h3>
                <p style={{ color: '#888', marginBottom: '20px', fontSize: '14px', maxWidth: '400px', margin: '0 auto 20px' }}>
                  Create autonomous content series that generate and post videos on a schedule.
                </p>
                <Link
                  href="/spacebaddie/automation?tab=series"
                  style={{
                    display: 'inline-block',
                    padding: '12px 24px',
                    background: 'linear-gradient(135deg, #C77DFF 0%, #FF6B9D 100%)',
                    borderRadius: '10px',
                    color: '#fff',
                    fontWeight: 600,
                    textDecoration: 'none',
                    fontSize: '14px',
                  }}
                >
                  Create Your First Series
                </Link>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '20px',
              }}>
                {contentSeries.map((series) => {
                  const progress = series.total_episodes > 0
                    ? Math.round((series.current_episode / series.total_episodes) * 100)
                    : 0;
                  const statusColor = series.status === 'active' 
                    ? { bg: 'rgba(0,212,180,0.2)', color: '#00D4B4' }
                    : series.status === 'paused'
                    ? { bg: 'rgba(255,200,0,0.2)', color: '#FFC800' }
                    : series.status === 'completed'
                    ? { bg: 'rgba(59,130,246,0.2)', color: '#3B82F6' }
                    : { bg: 'rgba(150,150,150,0.2)', color: '#999' };
                  
                  return (
                    <Link
                      key={series.series_id}
                      href={`/spacebaddie/studio/series/${series.series_id}`}
                      style={{
                        display: 'block',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '16px',
                        padding: '20px',
                        textDecoration: 'none',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#fff', margin: 0 }}>
                          {series.title}
                        </h3>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 500,
                          background: statusColor.bg,
                          color: statusColor.color,
                          textTransform: 'capitalize',
                        }}>
                          {series.status}
                        </span>
                      </div>

                      {series.description && (
                        <p style={{
                          fontSize: '13px',
                          color: '#888',
                          marginBottom: '12px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}>
                          {series.description}
                        </p>
                      )}

                      {/* Progress Bar */}
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ fontSize: '12px', color: '#888' }}>
                            Episode {series.current_episode} of {series.total_episodes}
                          </span>
                          <span style={{ fontSize: '12px', color: '#C77DFF' }}>{progress}%</span>
                        </div>
                        <div style={{
                          height: '6px',
                          background: 'rgba(255,255,255,0.1)',
                          borderRadius: '3px',
                          overflow: 'hidden',
                        }}>
                          <div style={{
                            height: '100%',
                            width: `${progress}%`,
                            background: 'linear-gradient(90deg, #C77DFF 0%, #FF6B9D 100%)',
                            borderRadius: '3px',
                          }} />
                        </div>
                      </div>

                      {/* Meta Info */}
                      <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#666' }}>
                        <span>📅 {series.frequency}</span>
                        <span>📱 {series.platforms?.join(', ') || 'No platforms'}</span>
                      </div>

                      {series.next_episode_at && series.status === 'active' && (
                        <p style={{ fontSize: '11px', color: '#C77DFF', marginTop: '10px' }}>
                          Next episode: {new Date(series.next_episode_at).toLocaleString()}
                        </p>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Info Banner */}
        <div style={{
          marginTop: '32px',
          padding: '20px',
          background: 'rgba(199,125,255,0.1)',
          border: '1px solid rgba(199,125,255,0.2)',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: '24px' }}>💡</span>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <p style={{ color: '#C77DFF', fontWeight: 500, marginBottom: '4px' }}>Pro Tip</p>
            <p style={{ color: '#888', fontSize: '14px' }}>
              Click a video to view details, edit title, delete, or post to social. Create a Content Series for automated video publishing.
            </p>
          </div>
        </div>

        {/* Video Detail Modal */}
        {selectedProject && (
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
            onClick={() => setSelectedProject(null)}
          >
            <div
              style={{
                background: '#1a1a24',
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.1)',
                maxWidth: '560px',
                width: '100%',
                maxHeight: '90vh',
                overflow: 'auto',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#fff', margin: 0 }}>Video details</h2>
                <button
                  type="button"
                  onClick={() => setSelectedProject(null)}
                  style={{ background: 'none', border: 'none', color: '#888', fontSize: '20px', cursor: 'pointer', padding: '4px' }}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <div style={{ padding: '20px' }}>
                {selectedProject.video_url && selectedProject.status === 'completed' ? (
                  <video
                    src={selectedProject.video_url}
                    controls
                    style={{ width: '100%', borderRadius: '8px', marginBottom: '16px', background: '#000' }}
                    playsInline
                  />
                ) : (
                  <div style={{ aspectRatio: '9/16', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                    <span style={{ fontSize: '48px' }}>{selectedProject.type === 'cinematic' ? '🎬' : '🎥'}</span>
                    <span style={{ color: '#666', marginLeft: '8px' }}>{selectedProject.status}</span>
                  </div>
                )}
                <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px' }}>Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '14px',
                    marginBottom: '12px',
                  }}
                />
                {selectedProject.prompt && (
                  <>
                    <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px' }}>Script / prompt</label>
                    <p style={{ fontSize: '13px', color: '#ccc', marginBottom: '16px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{selectedProject.prompt}</p>
                  </>
                )}
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '16px' }}>
                  {new Date(selectedProject.created_at).toLocaleString('en-US')} · {selectedProject.type === 'cinematic' ? 'Cinematic' : 'Standard'} · {selectedProject.status}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {selectedProject.type === 'cinematic' && selectedProject.status === 'processing' && (
                    <button
                      type="button"
                      onClick={handleCheckStatus}
                      disabled={checkingStatus}
                      style={{
                        padding: '10px 16px',
                        background: 'rgba(59,130,246,0.2)',
                        border: '1px solid rgba(59,130,246,0.4)',
                        borderRadius: '8px',
                        color: '#3b82f6',
                        fontWeight: 500,
                        cursor: checkingStatus ? 'not-allowed' : 'pointer',
                        fontSize: '13px',
                      }}
                    >
                      {checkingStatus ? 'Checking…' : 'Check Status'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveTitle}
                    disabled={saving}
                    style={{
                      padding: '10px 16px',
                      background: 'linear-gradient(135deg, #C77DFF 0%, #FF6B9D 100%)',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                      fontWeight: 500,
                      cursor: saving ? 'not-allowed' : 'pointer',
                      fontSize: '13px',
                    }}
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    style={{
                      padding: '10px 16px',
                      background: 'rgba(239,68,68,0.2)',
                      border: '1px solid rgba(239,68,68,0.4)',
                      borderRadius: '8px',
                      color: '#ef4444',
                      fontWeight: 500,
                      cursor: deleting ? 'not-allowed' : 'pointer',
                      fontSize: '13px',
                    }}
                  >
                    {deleting ? 'Deleting…' : 'Delete'}
                  </button>
                  {selectedProject.video_url && selectedProject.status === 'completed' && (
                    <button
                      type="button"
                      onClick={handlePostToSocial}
                      style={{
                        padding: '10px 16px',
                        background: 'rgba(59,130,246,0.2)',
                        border: '1px solid rgba(59,130,246,0.4)',
                        borderRadius: '8px',
                        color: '#3b82f6',
                        fontWeight: 500,
                        cursor: 'pointer',
                        fontSize: '13px',
                      }}
                    >
                      Post to Social
                    </button>
                  )}
                  {selectedProject.video_url && selectedProject.status === 'completed' && (
                    <a
                      href={selectedProject.video_url}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: '10px 16px',
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: '8px',
                        color: '#fff',
                        fontWeight: 500,
                        textDecoration: 'none',
                        fontSize: '13px',
                      }}
                    >
                      Download
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
