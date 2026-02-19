'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase, getCurrentUser } from '@/lib/supabase/client';
import DashboardShell from '../components/DashboardShell';

interface VideoJob {
  id: string;
  status: string;
  video_url: string | null;
  created_at: string;
}

interface Stats {
  videosMade: number;
  postsSent: number;
  totalViews: number;
  engagement: number;
}

export default function SpaceBaddieDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState<VideoJob[]>([]);
  const [stats, setStats] = useState<Stats>({
    videosMade: 0,
    postsSent: 0,
    totalViews: 0,
    engagement: 0,
  });

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await getCurrentUser();
      if (!userData) {
        router.push('/spacebaddie/login');
        return;
      }
      setUser(userData);

      // Load standard videos from spacebaddie_video_jobs
      const { data: standardVideos, count: standardCount } = await supabase
        .from('spacebaddie_video_jobs')
        .select('*', { count: 'exact' })
        .eq('user_id', userData.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      // Load cinematic videos from spacebaddie_projects
      const { data: cinematicVideos, count: cinematicCount } = await supabase
        .from('spacebaddie_projects')
        .select('*', { count: 'exact' })
        .eq('user_id', userData.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      // Combine and sort by created_at
      const allVideos: VideoJob[] = [];
      
      if (standardVideos) {
        allVideos.push(...standardVideos.map(v => ({
          id: v.id,
          status: v.status,
          video_url: v.video_url,
          created_at: v.created_at,
        })));
      }
      
      if (cinematicVideos) {
        allVideos.push(...cinematicVideos.map(v => ({
          id: v.id,
          status: v.status,
          video_url: v.video_url,
          created_at: v.created_at,
        })));
      }
      
      // Sort combined list by date
      allVideos.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setVideos(allVideos.slice(0, 10));
      
      const totalCount = (standardCount || 0) + (cinematicCount || 0);
      const completedVideos = allVideos.filter(v => v.status === 'completed').length;
      
      // Query real post stats from spacebaddie_post_queue
      const { data: postStats } = await supabase
        .from('spacebaddie_post_queue')
        .select('status, performance_views, performance_likes, performance_shares, performance_comments')
        .eq('user_id', userData.id);
      
      // Calculate real metrics
      let postsSent = 0;
      let totalViews = 0;
      let totalInteractions = 0;
      
      if (postStats) {
        postStats.forEach(post => {
          if (post.status === 'posted') {
            postsSent++;
            totalViews += post.performance_views || 0;
            totalInteractions += (post.performance_likes || 0) + 
                                (post.performance_shares || 0) + 
                                (post.performance_comments || 0);
          }
        });
      }
      
      // Calculate engagement rate (interactions / views * 100), default to 0 if no views
      const engagementRate = totalViews > 0 ? Math.round((totalInteractions / totalViews) * 100) : 0;
      
      setStats({
        videosMade: totalCount || completedVideos,
        postsSent,
        totalViews,
        engagement: engagementRate,
      });
    } catch (error) {
      console.error('Failed to load user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDisplayName = () => {
    if (user?.profile?.display_name) return user.profile.display_name;
    if (user?.email) return user.email.split('@')[0];
    return 'Creator';
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
        {/* Welcome */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{
            fontSize: '32px',
            fontWeight: 700,
            marginBottom: '8px',
            color: '#fff',
          }}>
            Welcome back,{' '}
            <span style={{
              background: 'linear-gradient(135deg, #C77DFF 0%, #FF6B9D 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              {getDisplayName()}!
            </span>
          </h1>
          <p style={{ color: '#888', fontSize: '16px' }}>Here's what's happening with your content</p>
        </div>

        {/* Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '32px',
        }}>
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px',
            padding: '24px',
          }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🎬</div>
            <p style={{
              fontSize: '36px',
              fontWeight: 700,
              color: '#FF6B9D',
              marginBottom: '4px',
            }}>{stats.videosMade}</p>
            <p style={{ color: '#888', fontSize: '14px' }}>Videos Made</p>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px',
            padding: '24px',
          }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🚀</div>
            <p style={{
              fontSize: '36px',
              fontWeight: 700,
              color: '#FF6B9D',
              marginBottom: '4px',
            }}>{stats.postsSent}</p>
            <p style={{ color: '#888', fontSize: '14px' }}>Posts Sent</p>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px',
            padding: '24px',
          }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>👁️</div>
            <p style={{
              fontSize: '36px',
              fontWeight: 700,
              color: '#00D4D4',
              marginBottom: '4px',
            }}>{stats.totalViews.toLocaleString()}</p>
            <p style={{ color: '#888', fontSize: '14px' }}>Total Views</p>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px',
            padding: '24px',
          }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>📈</div>
            <p style={{
              fontSize: '36px',
              fontWeight: 700,
              color: '#00D4D4',
              marginBottom: '4px',
            }}>{stats.engagement}%</p>
            <p style={{ color: '#888', fontSize: '14px' }}>Engagement</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px', color: '#fff' }}>Quick Actions</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <Link
              href="/spacebaddie/studio"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '20px',
                background: 'linear-gradient(135deg, rgba(255,0,110,0.15) 0%, rgba(138,43,226,0.15) 100%)',
                border: '1px solid rgba(255,0,110,0.3)',
                borderRadius: '16px',
                textDecoration: 'none',
                color: '#fff',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
              }}>🎬</div>
              <div>
                <h3 style={{ fontWeight: 600, marginBottom: '4px' }}>Create New Video</h3>
                <p style={{ color: '#888', fontSize: '14px' }}>Transform a photo into a talking video</p>
              </div>
            </Link>
            <Link
              href="/spacebaddie/automation"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '20px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '16px',
                textDecoration: 'none',
                color: '#fff',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
              }}>🚀</div>
              <div>
                <h3 style={{ fontWeight: 600, marginBottom: '4px' }}>Schedule Posts</h3>
                <p style={{ color: '#888', fontSize: '14px' }}>Auto-post to all your platforms</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Recent Videos */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#fff' }}>Recent Videos</h2>
            <Link href="/spacebaddie/projects" style={{ color: '#FF6B9D', fontSize: '14px', textDecoration: 'none' }}>
              View all →
            </Link>
          </div>

          {videos.length === 0 ? (
            <div style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '16px',
              padding: '48px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎬</div>
              <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px', color: '#fff' }}>No videos yet</h3>
              <p style={{ color: '#888', marginBottom: '24px' }}>Create your first AI video in minutes</p>
              <Link
                href="/spacebaddie/studio"
                style={{
                  display: 'inline-block',
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)',
                  borderRadius: '12px',
                  color: '#fff',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                Get Started
              </Link>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
              {videos.slice(0, 4).map((video) => (
                <div key={video.id} style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    aspectRatio: '9/16',
                    background: 'linear-gradient(135deg, rgba(138,43,226,0.3) 0%, rgba(255,0,110,0.3) 100%)',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {video.video_url ? (
                      <video
                        src={video.video_url}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        muted
                      />
                    ) : (
                      <span style={{ fontSize: '32px' }}>🎬</span>
                    )}
                    <div style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 500,
                      background: video.status === 'completed' ? 'rgba(0,200,0,0.2)' : 'rgba(255,200,0,0.2)',
                      color: video.status === 'completed' ? '#0f0' : '#ff0',
                    }}>
                      {video.status}
                    </div>
                  </div>
                  <div style={{ padding: '12px' }}>
                    <p style={{ fontSize: '12px', color: '#888' }}>
                      {new Date(video.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
