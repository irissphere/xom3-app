/**
 * Social Autonomy Orchestration
 * 
 * Handles automated social media posting based on schedules and rules.
 */

import { getPostsDueForPublishing, updatePostStatus, type QueuedPost } from '@/lib/social/queue';
import { postToTikTok } from '@/lib/social/tiktok';
import { postReelToInstagram } from '@/lib/social/instagram';
import { uploadToYouTube } from '@/lib/social/youtube';
import { postToTwitter } from '@/lib/social/twitter';

export interface SocialAutonomyConfig {
  enabled: boolean;
  pollIntervalMs: number;
  maxConcurrent: number;
  retryAttempts: number;
  retryDelayMs: number;
}

const defaultConfig: SocialAutonomyConfig = {
  enabled: true,
  pollIntervalMs: 60000, // 1 minute
  maxConcurrent: 3,
  retryAttempts: 3,
  retryDelayMs: 30000,
};

let processingInterval: NodeJS.Timeout | null = null;

/**
 * Start the social autonomy processor
 */
export function startSocialAutonomy(config: Partial<SocialAutonomyConfig> = {}): void {
  const finalConfig = { ...defaultConfig, ...config };

  if (!finalConfig.enabled) {
    console.log('Social autonomy is disabled');
    return;
  }

  if (processingInterval) {
    console.log('Social autonomy already running');
    return;
  }

  processingInterval = setInterval(async () => {
    await processQueue(finalConfig);
  }, finalConfig.pollIntervalMs);

  console.log('Social autonomy started');
}

/**
 * Stop the social autonomy processor
 */
export function stopSocialAutonomy(): void {
  if (processingInterval) {
    clearInterval(processingInterval);
    processingInterval = null;
    console.log('Social autonomy stopped');
  }
}

/**
 * Process due posts in the queue
 */
async function processQueue(config: SocialAutonomyConfig): Promise<void> {
  const duePosts = getPostsDueForPublishing();

  if (duePosts.length === 0) return;

  const batch = duePosts.slice(0, config.maxConcurrent);

  await Promise.all(batch.map(post => publishPost(post, config)));
}

/**
 * Publish a single post to its platform
 */
async function publishPost(post: QueuedPost, config: SocialAutonomyConfig): Promise<void> {
  updatePostStatus(post.id, 'processing');

  let attempt = 0;
  let lastError: string | undefined;

  while (attempt < config.retryAttempts) {
    attempt++;

    try {
      const result = await dispatchToPlatform(post);

      if (result.success) {
        updatePostStatus(post.id, 'published', { postId: result.postId });
        return;
      }

      lastError = result.error;
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown error';
    }

    if (attempt < config.retryAttempts) {
      await new Promise(resolve => setTimeout(resolve, config.retryDelayMs));
    }
  }

  updatePostStatus(post.id, 'failed', { error: lastError });
}

/**
 * Dispatch post to the appropriate platform
 */
async function dispatchToPlatform(post: QueuedPost): Promise<{ success: boolean; postId?: string; error?: string }> {
  // This would need real access tokens from user's connected accounts
  const accessToken = 'PLACEHOLDER_TOKEN';

  switch (post.platform) {
    case 'tiktok':
      return postToTikTok({
        videoUrl: post.videoUrl,
        caption: post.caption,
        accessToken,
        hashtags: post.hashtags,
      });

    case 'instagram':
      return postReelToInstagram({
        videoUrl: post.videoUrl,
        caption: post.caption,
        accessToken,
        igUserId: 'PLACEHOLDER_USER_ID',
        hashtags: post.hashtags,
      });

    case 'youtube':
      return uploadToYouTube({
        videoUrl: post.videoUrl,
        title: post.caption.split('\n')[0] || 'Video',
        description: post.caption,
        accessToken,
        tags: post.hashtags,
        isShort: true,
      });

    case 'twitter':
      return postToTwitter({
        text: `${post.caption} ${post.hashtags.map(h => `#${h}`).join(' ')}`.slice(0, 280),
        accessToken,
        accessTokenSecret: '',
      });

    default:
      return { success: false, error: `Unsupported platform: ${post.platform}` };
  }
}

export { processQueue };
