/**
 * Social Media Queue Manager
 */

export interface QueuedPost {
  id: string;
  platform: 'tiktok' | 'instagram' | 'youtube' | 'twitter' | 'facebook' | 'linkedin';
  videoUrl: string;
  caption: string;
  hashtags: string[];
  scheduledFor: Date;
  status: 'pending' | 'processing' | 'published' | 'failed';
  error?: string;
  postId?: string;
  userId: string;
  createdAt: Date;
}

export interface QueueStats {
  pending: number;
  processing: number;
  published: number;
  failed: number;
  nextScheduled?: Date;
}

// In-memory queue for development (use Supabase in production)
const queue: QueuedPost[] = [];

export function addToQueue(post: Omit<QueuedPost, 'id' | 'status' | 'createdAt'>): QueuedPost {
  const newPost: QueuedPost = {
    ...post,
    id: crypto.randomUUID(),
    status: 'pending',
    createdAt: new Date(),
  };
  queue.push(newPost);
  return newPost;
}

export function getQueuedPosts(userId: string, options?: {
  platform?: QueuedPost['platform'];
  status?: QueuedPost['status'];
  limit?: number;
}): QueuedPost[] {
  let filtered = queue.filter(p => p.userId === userId);

  if (options?.platform) {
    filtered = filtered.filter(p => p.platform === options.platform);
  }
  if (options?.status) {
    filtered = filtered.filter(p => p.status === options.status);
  }

  filtered.sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime());

  if (options?.limit) {
    return filtered.slice(0, options.limit);
  }
  return filtered;
}

export function updatePostStatus(
  postId: string, 
  status: QueuedPost['status'], 
  details?: { postId?: string; error?: string }
): void {
  const post = queue.find(p => p.id === postId);
  if (post) {
    post.status = status;
    if (details?.postId) post.postId = details.postId;
    if (details?.error) post.error = details.error;
  }
}

export function removeFromQueue(postId: string): boolean {
  const index = queue.findIndex(p => p.id === postId);
  if (index > -1) {
    queue.splice(index, 1);
    return true;
  }
  return false;
}

export function getQueueStats(userId: string): QueueStats {
  const userPosts = queue.filter(p => p.userId === userId);

  const stats: QueueStats = {
    pending: userPosts.filter(p => p.status === 'pending').length,
    processing: userPosts.filter(p => p.status === 'processing').length,
    published: userPosts.filter(p => p.status === 'published').length,
    failed: userPosts.filter(p => p.status === 'failed').length,
  };

  const nextPending = userPosts
    .filter(p => p.status === 'pending')
    .sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime())[0];

  if (nextPending) {
    stats.nextScheduled = nextPending.scheduledFor;
  }

  return stats;
}

export function getPostsDueForPublishing(): QueuedPost[] {
  const now = new Date();
  return queue.filter(
    p => p.status === 'pending' && p.scheduledFor <= now
  );
}
