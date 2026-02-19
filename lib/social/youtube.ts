/**
 * YouTube Social Connector
 */

export interface YouTubeUploadParams {
  videoUrl: string;
  title: string;
  description: string;
  accessToken: string;
  categoryId?: string;
  tags?: string[];
  privacyStatus?: 'public' | 'private' | 'unlisted';
  isShort?: boolean;
}

export interface YouTubeUploadResult {
  success: boolean;
  videoId?: string;
  error?: string;
}

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

/**
 * Upload video to YouTube (Shorts or regular)
 */
export async function uploadToYouTube(params: YouTubeUploadParams): Promise<YouTubeUploadResult> {
  const {
    title,
    description,
    accessToken,
    categoryId = '22', // People & Blogs
    tags = [],
    privacyStatus = 'public',
    isShort = true,
  } = params;

  // For Shorts, add #Shorts to title if not present
  const finalTitle = isShort && !title.includes('#Shorts') 
    ? `${title} #Shorts` 
    : title;

  try {
    // Step 1: Create video metadata
    const metadataResponse = await fetch(
      `${YOUTUBE_API_BASE}/videos?part=snippet,status&uploadType=resumable`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          snippet: {
            title: finalTitle.slice(0, 100),
            description: description.slice(0, 5000),
            categoryId,
            tags,
          },
          status: {
            privacyStatus,
            selfDeclaredMadeForKids: false,
          },
        }),
      }
    );

    if (!metadataResponse.ok) {
      const error = await metadataResponse.text();
      return { success: false, error };
    }

    // For full implementation, would need to handle resumable upload
    // This is a simplified version
    const data = await metadataResponse.json();
    return { success: true, videoId: data.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function getYouTubeAnalytics(videoId: string, accessToken: string): Promise<{
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
}> {
  const response = await fetch(
    `${YOUTUBE_API_BASE}/videos?part=statistics&id=${videoId}`,
    {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    }
  );

  const data = await response.json();
  const stats = data.items?.[0]?.statistics;

  return {
    views: parseInt(stats?.viewCount || '0'),
    likes: parseInt(stats?.likeCount || '0'),
    comments: parseInt(stats?.commentCount || '0'),
    shares: 0, // YouTube does not expose share count
  };
}
