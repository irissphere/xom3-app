/**
 * Social Lane In-Memory Store
 * 
 * Stores social posts, YouTube videos, and queue state.
 * In production, this would be backed by Airtable or PostgreSQL.
 */

import type { 
  SocialPost, 
  YouTubeVideo, 
  SocialQueueItem, 
  PostStatus, 
  SocialPlatform,
  SocialStatsResponse 
} from "./types";

// ============================================================
// In-Memory Data Store
// ============================================================

let posts: SocialPost[] = [];
let videos: YouTubeVideo[] = [];

// ============================================================
// Demo Data Seeding
// ============================================================

function seedDemoData(): void {
  const now = new Date();
  
  posts = [
    {
      id: "post-001",
      platform: "twitter",
      content: "🚀 Excited to announce our new enterprise automation platform! #AI #Automation #BusinessGrowth",
      status: "scheduled",
      scheduledAt: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(),
      clientId: "client-001",
      clientName: "Apex Solutions",
      createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
      createdBy: "operator"
    },
    {
      id: "post-002",
      platform: "linkedin",
      content: "Healthcare benefits enrollment is complex. Our AI-powered CRM simplifies the entire process for agents and brokers. See how we're transforming the industry.\n\n#HealthInsurance #InsurTech #ACA",
      status: "published",
      publishedAt: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
      clientId: "client-002",
      clientName: "BenefitsPro Group",
      platformPostId: "li-12345",
      platformLink: "https://linkedin.com/posts/12345",
      engagement: { likes: 45, comments: 8, shares: 12, views: 892 },
      createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
      createdBy: "operator"
    },
    {
      id: "post-003",
      platform: "instagram",
      content: "Behind the scenes of our autonomous lead processing system 🤖\n\nWatch leads flow from intake → triage → qualification → close.\n\n#Automation #Sales #Tech",
      status: "draft",
      mediaUrls: ["https://example.com/demo-video.mp4"],
      thumbnailUrl: "https://example.com/thumb.jpg",
      createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      createdBy: "operator"
    },
    {
      id: "post-004",
      platform: "twitter",
      content: "API rate limit exceeded - retrying in 15 minutes...",
      status: "failed",
      errorMessage: "Twitter API rate limit exceeded (429)",
      retryCount: 2,
      scheduledAt: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
      createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      createdBy: "operator"
    },
    {
      id: "post-005",
      platform: "facebook",
      content: "Medicare Advantage open enrollment starts October 15! Are your clients ready? Our platform tracks every touchpoint automatically. \n\nBook a demo: link in bio",
      status: "scheduled",
      scheduledAt: new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString(),
      clientId: "client-003",
      clientName: "MediCare Connect",
      createdAt: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(),
      createdBy: "operator"
    },
    {
      id: "post-006",
      platform: "tiktok",
      content: "POV: You just automated your entire lead follow-up sequence 😱 #automation #salesops #ai",
      status: "published",
      publishedAt: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(),
      platformLink: "https://tiktok.com/@xom3/video/123",
      engagement: { likes: 234, comments: 18, shares: 45, views: 5600 },
      createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
      createdBy: "operator"
    }
  ];

  videos = [
    {
      id: "video-001",
      title: "XOM3 Enterprise Demo: Full Pipeline Automation",
      description: "See how XOM3 transforms lead intake, qualification, and close into a fully autonomous process. Perfect for benefits brokers, insurance agencies, and sales teams.",
      tags: ["automation", "CRM", "insurance", "sales", "AI"],
      category: "Science & Technology",
      visibility: "public",
      status: "published",
      youtubeVideoId: "dQw4w9WgXcQ",
      youtubeLink: "https://youtube.com/watch?v=dQw4w9WgXcQ",
      publishedAt: new Date(now.getTime() - 72 * 60 * 60 * 1000).toISOString(),
      clientId: "client-001",
      clientName: "Apex Solutions",
      engagement: { views: 1240, likes: 89, comments: 12, shares: 23, watchTimeMinutes: 4500 },
      createdAt: new Date(now.getTime() - 96 * 60 * 60 * 1000).toISOString(),
      createdBy: "operator"
    },
    {
      id: "video-002",
      title: "Medicare Enrollment: Agent Training Series #1",
      description: "Part 1 of our comprehensive training series for Medicare enrollment agents. Learn the intake process and compliance requirements.",
      tags: ["Medicare", "training", "insurance", "compliance"],
      category: "Education",
      visibility: "unlisted",
      status: "scheduled",
      scheduledAt: new Date(now.getTime() + 72 * 60 * 60 * 1000).toISOString(),
      thumbnailUrl: "https://example.com/medicare-thumb.jpg",
      clientId: "client-002",
      clientName: "BenefitsPro Group",
      createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
      createdBy: "operator"
    }
  ];
}

// Initialize demo data
seedDemoData();

// ============================================================
// Post CRUD Operations
// ============================================================

export function getPosts(): SocialPost[] {
  return [...posts].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getPostById(id: string): SocialPost | undefined {
  return posts.find(p => p.id === id);
}

export function getPostsByStatus(status: PostStatus): SocialPost[] {
  return posts.filter(p => p.status === status);
}

export function getPostsByPlatform(platform: SocialPlatform): SocialPost[] {
  return posts.filter(p => p.platform === platform);
}

export function createPost(post: Omit<SocialPost, "id" | "createdAt">): SocialPost {
  const newPost: SocialPost = {
    ...post,
    id: `post-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString()
  };
  posts.push(newPost);
  return newPost;
}

export function updatePost(id: string, updates: Partial<SocialPost>): SocialPost | null {
  const index = posts.findIndex(p => p.id === id);
  if (index === -1) return null;
  
  posts[index] = {
    ...posts[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };
  return posts[index];
}

export function deletePost(id: string): boolean {
  const index = posts.findIndex(p => p.id === id);
  if (index === -1) return false;
  posts.splice(index, 1);
  return true;
}

// ============================================================
// Video CRUD Operations
// ============================================================

export function getVideos(): YouTubeVideo[] {
  return [...videos].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getVideoById(id: string): YouTubeVideo | undefined {
  return videos.find(v => v.id === id);
}

export function createVideo(video: Omit<YouTubeVideo, "id" | "createdAt">): YouTubeVideo {
  const newVideo: YouTubeVideo = {
    ...video,
    id: `video-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString()
  };
  videos.push(newVideo);
  return newVideo;
}

export function updateVideo(id: string, updates: Partial<YouTubeVideo>): YouTubeVideo | null {
  const index = videos.findIndex(v => v.id === id);
  if (index === -1) return null;
  
  videos[index] = {
    ...videos[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };
  return videos[index];
}

// ============================================================
// Queue Operations
// ============================================================

export function getQueue(filters?: {
  platform?: SocialPlatform;
  status?: PostStatus;
  clientId?: string;
}): SocialQueueItem[] {
  const allItems: SocialQueueItem[] = [
    ...posts.map(p => ({
      id: p.id,
      type: "post" as const,
      platform: p.platform,
      content: p.content.substring(0, 140) + (p.content.length > 140 ? "..." : ""),
      status: p.status,
      scheduledAt: p.scheduledAt,
      link: p.platformLink,
      clientId: p.clientId,
      clientName: p.clientName,
      thumbnailUrl: p.thumbnailUrl,
      createdAt: p.createdAt
    })),
    ...videos.map(v => ({
      id: v.id,
      type: "video" as const,
      platform: "youtube" as SocialPlatform,
      content: v.title,
      status: v.status,
      scheduledAt: v.scheduledAt,
      link: v.youtubeLink,
      clientId: v.clientId,
      clientName: v.clientName,
      thumbnailUrl: v.thumbnailUrl,
      createdAt: v.createdAt
    }))
  ];

  let filtered = allItems;

  if (filters?.platform) {
    filtered = filtered.filter(item => item.platform === filters.platform);
  }
  if (filters?.status) {
    filtered = filtered.filter(item => item.status === filters.status);
  }
  if (filters?.clientId) {
    filtered = filtered.filter(item => item.clientId === filters.clientId);
  }

  return filtered.sort((a, b) => {
    // Sort by scheduled time first (upcoming first), then by created time
    if (a.scheduledAt && b.scheduledAt) {
      return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
    }
    if (a.scheduledAt) return -1;
    if (b.scheduledAt) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

// ============================================================
// Stats & Analytics
// ============================================================

export function getStats(): SocialStatsResponse {
  const allPosts = [...posts, ...videos.map(v => ({ ...v, platform: "youtube" as SocialPlatform }))];
  
  const byStatus = {
    scheduled: allPosts.filter(p => p.status === "scheduled").length,
    published: allPosts.filter(p => p.status === "published").length,
    failed: allPosts.filter(p => p.status === "failed").length,
    draft: allPosts.filter(p => p.status === "draft").length
  };

  const byPlatform: Record<SocialPlatform, number> = {
    twitter: posts.filter(p => p.platform === "twitter").length,
    instagram: posts.filter(p => p.platform === "instagram").length,
    youtube: videos.length,
    linkedin: posts.filter(p => p.platform === "linkedin").length,
    tiktok: posts.filter(p => p.platform === "tiktok").length,
    facebook: posts.filter(p => p.platform === "facebook").length
  };

  // Calculate engagement from published posts
  const publishedPosts = posts.filter(p => p.status === "published" && p.engagement);
  const totalReach = publishedPosts.reduce((acc, p) => acc + (p.engagement?.views || 0), 0);
  const totalEngagements = publishedPosts.reduce((acc, p) => 
    acc + (p.engagement?.likes || 0) + (p.engagement?.comments || 0) + (p.engagement?.shares || 0), 0
  );
  const avgEngagementRate = totalReach > 0 ? (totalEngagements / totalReach) * 100 : 0;

  return {
    totalPosts: allPosts.length,
    scheduled: byStatus.scheduled,
    published: byStatus.published,
    failed: byStatus.failed,
    byPlatform,
    recentEngagement: {
      totalReach,
      totalEngagements,
      averageEngagementRate: Math.round(avgEngagementRate * 100) / 100
    }
  };
}

// ============================================================
// Demo Data Reset
// ============================================================

export function resetDemoData(): void {
  seedDemoData();
}
