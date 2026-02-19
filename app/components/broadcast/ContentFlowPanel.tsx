"use client";

// Broadcast Engine - Content Flow Panel
// Shows scheduled posts, posted content, cross-posting map, performance metrics

import { useEffect, useState } from "react";

interface Post {
  id: string;
  platform: string[];
  content: string;
  status: string;
  scheduled_at?: string;
  posted_at?: string;
  engagement?: {
    likes?: number;
    comments?: number;
    shares?: number;
    views?: number;
  };
}

export default function ContentFlowPanel() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchPosts();
    const interval = setInterval(fetchPosts, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);
  
  async function fetchPosts() {
    try {
      const response = await fetch("/api/broadcast/dashboard/posts?limit=20");
      const data = await response.json();
      if (data.success) {
        setPosts(data.posts);
      }
    } catch (error) {
      console.error("Failed to fetch posts:", error);
    } finally {
      setLoading(false);
    }
  }
  
  const scheduled = posts.filter(p => p.status === "scheduled");
  const posted = posts.filter(p => p.status === "posted");
  const failed = posts.filter(p => p.status === "failed");
  
  return (
    <div className="broadcast-panel content-flow">
      <h3>Content Flow</h3>
      
      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <div className="stats-grid">
            <div className="stat">
              <div className="stat-value">{scheduled.length}</div>
              <div className="stat-label">Scheduled</div>
            </div>
            <div className="stat">
              <div className="stat-value">{posted.length}</div>
              <div className="stat-label">Posted</div>
            </div>
            <div className="stat">
              <div className="stat-value">{failed.length}</div>
              <div className="stat-label">Failed</div>
            </div>
          </div>
          
          <div className="posts-list">
            <h4>Recent Posts</h4>
            {posts.slice(0, 10).map(post => (
              <div key={post.id} className="post-item">
                <div className="post-platforms">
                  {post.platform.map(p => (
                    <span key={p} className="platform-badge">{p}</span>
                  ))}
                </div>
                <div className="post-content">{post.content}</div>
                <div className="post-status">{post.status}</div>
                {post.engagement && (
                  <div className="post-engagement">
                    👁 {post.engagement.views || 0} | 
                    ❤️ {post.engagement.likes || 0} | 
                    💬 {post.engagement.comments || 0}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
