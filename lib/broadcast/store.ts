// Broadcast Engine - In-Memory Store
// In production, replace with database (PostgreSQL, MongoDB, etc.)

import { BroadcastPost, PostRequest } from "./types";
import { generateHashtags, generateCTA, generateTrackingLink } from "./content-engine";

const posts: Map<string, BroadcastPost> = new Map();

export function storePost(post: BroadcastPost): void {
  posts.set(post.id, post);
}

/**
 * Create a new post
 */
export function createPost(request: PostRequest): BroadcastPost {
  const post: BroadcastPost = {
    id: `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    content: request.content,
    mediaUrl: request.mediaUrl,
    platforms: request.platforms,
    scheduledAt: request.scheduledAt,
    status: request.scheduledAt ? "scheduled" : "draft",
    metadata: {
      caption: request.metadata?.caption,
      hashtags: request.metadata?.hashtags || generateHashtags(request.content),
      description: request.metadata?.description,
      cta: request.metadata?.cta || generateCTA(),
      trackingLink: request.metadata?.trackingLink || generateTrackingLink(
        process.env.NEXT_PUBLIC_BASE_URL || "https://xom3.io",
        `post_${Date.now()}`,
        request.platforms[0] || "instagram"
      ),
      thumbnailUrl: request.metadata?.thumbnailUrl
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  storePost(post);
  return post;
}

/**
 * Get a post by ID
 */
export function getPost(postId: string): BroadcastPost | null {
  return posts.get(postId) || null;
}

/**
 * List all posts
 */
export function listPosts(filters?: {
  status?: BroadcastPost["status"];
  platform?: string;
  limit?: number;
}): BroadcastPost[] {
  let results = Array.from(posts.values());
  
  if (filters?.status) {
    results = results.filter(p => p.status === filters.status);
  }
  
  if (filters?.platform) {
    results = results.filter(p => p.platforms.includes(filters.platform as any));
  }
  
  if (filters?.limit) {
    results = results.slice(0, filters.limit);
  }
  
  return results.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * Update post status
 */
export function updatePostStatus(
  postId: string,
  status: BroadcastPost["status"],
  metadata?: Partial<BroadcastPost["metadata"]>
): BroadcastPost | null {
  const post = posts.get(postId);
  if (!post) return null;
  
  post.status = status;
  post.updatedAt = new Date().toISOString();
  
  if (status === "posted") {
    post.postedAt = new Date().toISOString();
  }
  
  if (metadata) {
    post.metadata = { ...post.metadata, ...metadata };
  }
  
  storePost(post);
  return post;
}

/**
 * Schedule a post
 */
export function schedulePost(postId: string, scheduledAt: string): BroadcastPost | null {
  const post = posts.get(postId);
  if (!post) return null;
  
  post.scheduledAt = scheduledAt;
  post.status = "scheduled";
  post.updatedAt = new Date().toISOString();
  
  storePost(post);
  return post;
}

/**
 * Update post engagement metrics
 */
export function updatePostEngagement(
  postId: string,
  engagement: Partial<BroadcastPost["engagement"]>
): BroadcastPost | null {
  const post = posts.get(postId);
  if (!post) return null;
  
  post.engagement = {
    ...post.engagement,
    ...engagement
  } as BroadcastPost["engagement"];
  
  post.updatedAt = new Date().toISOString();
  storePost(post);
  return post;
}
