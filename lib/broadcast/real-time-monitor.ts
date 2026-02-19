// Real-Time Engagement Monitor
// AKV: Live engagement tracking with webhooks and polling

import { Platform, ScrapedEngagement } from "./types";
import { emitSignal } from "@/lib/uoi/signals";

export interface RealTimeConfig {
  platform: Platform;
  postId: string;
  webhookUrl?: string;
  pollInterval?: number; // seconds
  enabled: boolean;
}

export interface EngagementUpdate {
  platform: Platform;
  postId: string;
  type: 'comment' | 'like' | 'share' | 'view' | 'follow';
  count: number;
  change: number; // delta from last check
  timestamp: string;
  metadata?: any;
}

class RealTimeMonitor {
  private monitors = new Map<string, NodeJS.Timeout>();
  private webhooks = new Map<string, RealTimeConfig>();
  private lastCounts = new Map<string, number>();

  /**
   * Start monitoring a post for real-time engagement
   */
  startMonitoring(config: RealTimeConfig): void {
    const key = `${config.platform}:${config.postId}`;

    // Stop existing monitor if any
    this.stopMonitoring(config.platform, config.postId);

    if (!config.enabled) return;

    console.log(`[RealTime] Starting monitoring for ${key}`);

    // Set up polling
    if (config.pollInterval && config.pollInterval > 0) {
      const interval = setInterval(() => {
        this.pollEngagement(config);
      }, config.pollInterval * 1000);

      this.monitors.set(key, interval);
    }

    // Register webhook if provided
    if (config.webhookUrl) {
      this.webhooks.set(key, config);
    }
  }

  /**
   * Stop monitoring a post
   */
  stopMonitoring(platform: Platform, postId: string): void {
    const key = `${platform}:${postId}`;

    const monitor = this.monitors.get(key);
    if (monitor) {
      clearInterval(monitor);
      this.monitors.delete(key);
    }

    this.webhooks.delete(key);
    console.log(`[RealTime] Stopped monitoring for ${key}`);
  }

  /**
   * Poll for engagement updates
   */
  private async pollEngagement(config: RealTimeConfig): Promise<void> {
    try {
      const updates = await this.fetchEngagementUpdates(config);

      for (const update of updates) {
        this.processEngagementUpdate(update);
      }
    } catch (error) {
      console.error(`[RealTime] Poll error for ${config.platform}:${config.postId}:`, error);
    }
  }

  /**
   * Fetch engagement updates from platform APIs
   */
  private async fetchEngagementUpdates(config: RealTimeConfig): Promise<EngagementUpdate[]> {
    const updates: EngagementUpdate[] = [];

    try {
      switch (config.platform) {
        case "youtube":
          updates.push(...await this.pollYouTubeEngagement(config.postId));
          break;
        case "twitter":
          updates.push(...await this.pollTwitterEngagement(config.postId));
          break;
        case "instagram":
          updates.push(...await this.pollInstagramEngagement(config.postId));
          break;
        case "facebook":
          updates.push(...await this.pollFacebookEngagement(config.postId));
          break;
        case "tiktok":
          updates.push(...await this.pollTikTokEngagement(config.postId));
          break;
        case "linkedin":
          updates.push(...await this.pollLinkedInEngagement(config.postId));
          break;
      }
    } catch (error) {
      console.error(`[RealTime] Fetch error for ${config.platform}:`, error);
    }

    return updates;
  }

  /**
   * Process an engagement update
   */
  private processEngagementUpdate(update: EngagementUpdate): void {
    const key = `${update.platform}:${update.postId}:${update.type}`;
    const lastCount = this.lastCounts.get(key) || 0;
    const change = update.count - lastCount;

    // Only emit if there's a change
    if (change !== 0) {
      this.lastCounts.set(key, update.count);

      // Emit signal for real-time updates
      emitSignal({
        source: "real_time_monitor",
        type: "engagement_update",
        payload: {
          ...update,
          change,
          previousCount: lastCount,
        },
        priority: "medium"
      });

      console.log(`[RealTime] ${update.platform}:${update.postId} ${update.type}: ${lastCount} → ${update.count} (${change > 0 ? '+' : ''}${change})`);
    }
  }

  /**
   * Handle webhook data from platforms
   */
  async handleWebhook(platform: Platform, webhookData: any): Promise<void> {
    try {
      const updates = this.parseWebhookData(platform, webhookData);

      for (const update of updates) {
        this.processEngagementUpdate(update);
      }
    } catch (error) {
      console.error(`[RealTime] Webhook processing error for ${platform}:`, error);
    }
  }

  /**
   * Parse webhook data into engagement updates
   */
  private parseWebhookData(platform: Platform, data: any): EngagementUpdate[] {
    const updates: EngagementUpdate[] = [];

    switch (platform) {
      case "instagram":
        // Instagram webhooks for comments, likes, etc.
        if (data.entry) {
          for (const entry of data.entry) {
            if (entry.messaging) {
              // Direct messages
              updates.push({
                platform,
                postId: entry.messaging[0].sender.id,
                type: "comment",
                count: 1,
                change: 1,
                timestamp: new Date().toISOString(),
                metadata: entry.messaging[0]
              });
            }
          }
        }
        break;

      case "facebook":
        // Facebook webhooks
        if (data.entry) {
          for (const entry of data.entry) {
            if (entry.messaging) {
              updates.push({
                platform,
                postId: entry.messaging[0].sender.id,
                type: "comment",
                count: 1,
                change: 1,
                timestamp: new Date().toISOString(),
                metadata: entry.messaging[0]
              });
            }
          }
        }
        break;

      // Add other platform webhook parsers as needed
    }

    return updates;
  }

  // ============================================================================
  // Platform-Specific Polling Implementations
  // ============================================================================

  private async pollYouTubeEngagement(postId: string): Promise<EngagementUpdate[]> {
    const updates: EngagementUpdate[] = [];

    try {
      const { getAccessToken } = await import("@/lib/oauth/token-storage");
      const accessToken = await getAccessToken("demo-user", "youtube");

      if (!accessToken) return updates;

      const { google } = await import('googleapis');
      const youtube = google.youtube('v3');

      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: accessToken });

      const response = await youtube.videos.list({
        auth: oauth2Client,
        part: ['statistics'],
        id: [postId],
      });

      const video = response.data.items?.[0];
      if (video?.statistics) {
        const stats = video.statistics;

        updates.push({
          platform: "youtube",
          postId,
          type: "view",
          count: parseInt(stats.viewCount || '0'),
          change: 0, // Will be calculated by processEngagementUpdate
          timestamp: new Date().toISOString(),
        });

        updates.push({
          platform: "youtube",
          postId,
          type: "like",
          count: parseInt(stats.likeCount || '0'),
          change: 0,
          timestamp: new Date().toISOString(),
        });

        updates.push({
          platform: "youtube",
          postId,
          type: "comment",
          count: parseInt(stats.commentCount || '0'),
          change: 0,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("[RealTime] YouTube polling error:", error);
    }

    return updates;
  }

  private async pollTwitterEngagement(postId: string): Promise<EngagementUpdate[]> {
    const updates: EngagementUpdate[] = [];

    try {
      const { getAccessToken } = await import("@/lib/oauth/token-storage");
      const accessToken = await getAccessToken("demo-user", "twitter");

      if (!accessToken) return updates;

      const { TwitterApi } = await import('twitter-api-v2');
      const twitterClient = new TwitterApi(accessToken);

      const tweet = await twitterClient.v2.singleTweet(postId, {
        'tweet.fields': ['public_metrics'],
      });

      if (tweet.data?.public_metrics) {
        const metrics = tweet.data.public_metrics;

        updates.push({
          platform: "twitter",
          postId,
          type: "like",
          count: metrics.like_count,
          change: 0,
          timestamp: new Date().toISOString(),
        });

        updates.push({
          platform: "twitter",
          postId,
          type: "share",
          count: metrics.retweet_count,
          change: 0,
          timestamp: new Date().toISOString(),
        });

        updates.push({
          platform: "twitter",
          postId,
          type: "comment",
          count: metrics.reply_count,
          change: 0,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("[RealTime] Twitter polling error:", error);
    }

    return updates;
  }

  private async pollInstagramEngagement(postId: string): Promise<EngagementUpdate[]> {
    const updates: EngagementUpdate[] = [];

    try {
      const { getAccessToken } = await import("@/lib/oauth/token-storage");
      const accessToken = await getAccessToken("demo-user", "instagram");

      if (!accessToken) return updates;

      const response = await fetch(
        `https://graph.facebook.com/v18.0/${postId}?fields=like_count,comments_count&access_token=${accessToken}`
      );

      if (response.ok) {
        const data = await response.json();

        updates.push({
          platform: "instagram",
          postId,
          type: "like",
          count: data.like_count || 0,
          change: 0,
          timestamp: new Date().toISOString(),
        });

        updates.push({
          platform: "instagram",
          postId,
          type: "comment",
          count: data.comments_count || 0,
          change: 0,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("[RealTime] Instagram polling error:", error);
    }

    return updates;
  }

  private async pollFacebookEngagement(postId: string): Promise<EngagementUpdate[]> {
    const updates: EngagementUpdate[] = [];

    try {
      const { getAccessToken } = await import("@/lib/oauth/token-storage");
      const accessToken = await getAccessToken("demo-user", "facebook");

      if (!accessToken) return updates;

      const response = await fetch(
        `https://graph.facebook.com/v18.0/${postId}?fields=reactions.summary(true),comments.summary(true)&access_token=${accessToken}`
      );

      if (response.ok) {
        const data = await response.json();

        updates.push({
          platform: "facebook",
          postId,
          type: "like",
          count: data.reactions?.summary?.total_count || 0,
          change: 0,
          timestamp: new Date().toISOString(),
        });

        updates.push({
          platform: "facebook",
          postId,
          type: "comment",
          count: data.comments?.summary?.total_count || 0,
          change: 0,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("[RealTime] Facebook polling error:", error);
    }

    return updates;
  }

  private async pollTikTokEngagement(postId: string): Promise<EngagementUpdate[]> {
    // TikTok doesn't have a public API for real-time engagement polling
    // Would need to use TikTok Business API or web scraping
    return [];
  }

  private async pollLinkedInEngagement(postId: string): Promise<EngagementUpdate[]> {
    const updates: EngagementUpdate[] = [];

    try {
      const { getAccessToken } = await import("@/lib/oauth/token-storage");
      const accessToken = await getAccessToken("demo-user", "linkedin");

      if (!accessToken) return updates;

      const response = await fetch(
        `https://api.linkedin.com/v2/socialActions/${postId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();

        updates.push({
          platform: "linkedin",
          postId,
          type: "like",
          count: data.likesSummary?.totalLikes || 0,
          change: 0,
          timestamp: new Date().toISOString(),
        });

        updates.push({
          platform: "linkedin",
          postId,
          type: "comment",
          count: data.commentsSummary?.totalComments || 0,
          change: 0,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("[RealTime] LinkedIn polling error:", error);
    }

    return updates;
  }

  /**
   * Get monitoring status
   */
  getStatus(): { platform: Platform; postId: string; active: boolean }[] {
    return Array.from(this.monitors.keys()).map(key => {
      const [platform, postId] = key.split(':');
      return {
        platform: platform as Platform,
        postId,
        active: true,
      };
    });
  }

  /**
   * Stop all monitoring
   */
  stopAll(): void {
    for (const [key, interval] of Array.from(this.monitors)) {
      clearInterval(interval);
    }
    this.monitors.clear();
    this.webhooks.clear();
    this.lastCounts.clear();
    console.log("[RealTime] Stopped all monitoring");
  }
}

// Export singleton instance
export const realTimeMonitor = new RealTimeMonitor();



