/**
 * TikTok Social Connector
 */

export interface TikTokPostParams {
  videoUrl: string;
  caption: string;
  accessToken: string;
  hashtags?: string[];
}

export interface TikTokPostResult {
  success: boolean;
  postId?: string;
  error?: string;
}

export async function postToTikTok(params: TikTokPostParams): Promise<TikTokPostResult> {
  const { videoUrl, caption, accessToken, hashtags = [] } = params;

  // Build caption with hashtags
  const fullCaption = `${caption} ${hashtags.map(h => `#${h}`).join(' ')}`.trim();

  try {
    // TikTok API v2 endpoint
    const response = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        post_info: {
          title: fullCaption.slice(0, 150),
          privacy_level: 'PUBLIC_TO_EVERYONE',
          disable_comment: false,
          disable_duet: false,
          disable_stitch: false,
        },
        source_info: {
          source: 'PULL_FROM_URL',
          video_url: videoUrl,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    const data = await response.json();
    return { success: true, postId: data.data?.publish_id };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

export async function getTikTokStatus(publishId: string, accessToken: string): Promise<{
  status: 'PROCESSING' | 'PUBLISHED' | 'FAILED';
  error?: string;
}> {
  const response = await fetch('https://open.tiktokapis.com/v2/post/publish/status/fetch/', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ publish_id: publishId }),
  });

  const data = await response.json();
  return {
    status: data.data?.status || 'FAILED',
    error: data.error?.message,
  };
}
