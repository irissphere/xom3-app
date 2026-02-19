/**
 * Instagram Social Connector (via Facebook Graph API)
 */

export interface InstagramPostParams {
  videoUrl: string;
  caption: string;
  accessToken: string;
  igUserId: string;
  hashtags?: string[];
  coverUrl?: string;
}

export interface InstagramPostResult {
  success: boolean;
  postId?: string;
  containerId?: string;
  error?: string;
}

const GRAPH_API_BASE = 'https://graph.facebook.com/v19.0';

/**
 * Post a Reel to Instagram
 */
export async function postReelToInstagram(params: InstagramPostParams): Promise<InstagramPostResult> {
  const { videoUrl, caption, accessToken, igUserId, hashtags = [], coverUrl } = params;

  const fullCaption = `${caption}\n\n${hashtags.map(h => `#${h}`).join(' ')}`.trim();

  try {
    // Step 1: Create media container
    const containerResponse = await fetch(
      `${GRAPH_API_BASE}/${igUserId}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_type: 'REELS',
          video_url: videoUrl,
          caption: fullCaption,
          cover_url: coverUrl,
          access_token: accessToken,
        }),
      }
    );

    if (!containerResponse.ok) {
      const error = await containerResponse.text();
      return { success: false, error };
    }

    const containerData = await containerResponse.json();
    const containerId = containerData.id;

    // Step 2: Wait for processing and publish
    await waitForContainerReady(containerId, accessToken);

    // Step 3: Publish the container
    const publishResponse = await fetch(
      `${GRAPH_API_BASE}/${igUserId}/media_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: containerId,
          access_token: accessToken,
        }),
      }
    );

    if (!publishResponse.ok) {
      const error = await publishResponse.text();
      return { success: false, containerId, error };
    }

    const publishData = await publishResponse.json();
    return { success: true, postId: publishData.id, containerId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function waitForContainerReady(containerId: string, accessToken: string): Promise<void> {
  const maxAttempts = 60;
  const pollInterval = 5000;

  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch(
      `${GRAPH_API_BASE}/${containerId}?fields=status_code&access_token=${accessToken}`
    );
    const data = await response.json();

    if (data.status_code === 'FINISHED') return;
    if (data.status_code === 'ERROR') throw new Error('Container processing failed');

    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  throw new Error('Container processing timed out');
}

export async function getInstagramInsights(mediaId: string, accessToken: string): Promise<{
  impressions?: number;
  reach?: number;
  plays?: number;
  likes?: number;
  comments?: number;
  shares?: number;
}> {
  const response = await fetch(
    `${GRAPH_API_BASE}/${mediaId}/insights?metric=impressions,reach,plays,likes,comments,shares&access_token=${accessToken}`
  );
  const data = await response.json();

  const insights: Record<string, number> = {};
  for (const metric of data.data || []) {
    insights[metric.name] = metric.values?.[0]?.value || 0;
  }

  return insights;
}
