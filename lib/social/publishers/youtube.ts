/**
 * YouTube Publisher
 * Uploads videos and manages channel using YouTube Data API v3
 * AKV: Social Sovereign - YouTube Lane
 */

import { getAccessToken, markTokenUsed } from "@/lib/oauth/token-storage";

export interface YouTubeUploadResult {
  success: boolean;
  videoId?: string;
  videoUrl?: string;
  error?: string;
}

export interface YouTubeVideoOptions {
  tenantId?: string;
  title: string;
  description?: string;
  tags?: string[];
  categoryId?: string; // Default: 22 (People & Blogs)
  privacyStatus?: "public" | "private" | "unlisted";
  madeForKids?: boolean;
  scheduledStartTime?: string; // ISO date for scheduled publish
}

export interface YouTubePostResult {
  success: boolean;
  postId?: string;
  error?: string;
}

/**
 * Create a community post on YouTube
 * Note: Community posts require the channel to have certain subscriber thresholds
 */
export async function createYouTubeCommunityPost(
  content: string,
  tenantId: string = "default"
): Promise<YouTubePostResult> {
  const accessToken = await getAccessToken(tenantId, "youtube");
  if (!accessToken) {
    return {
      success: false,
      error: "YouTube not connected. Please connect your Google account first.",
    };
  }

  try {
    // YouTube Community Posts API (Activities)
    // Note: This is limited - YouTube Data API doesn't fully support community posts
    // For now, we return a message about this limitation
    
    console.log("[YouTube] Community post requested:", content.substring(0, 50));
    
    return {
      success: false,
      error: "YouTube community posts are not supported via API. Use YouTube Studio directly.",
    };
  } catch (error: any) {
    console.error("[YouTube] Community post error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get channel info for authenticated user
 */
export async function getYouTubeChannel(
  tenantId: string = "default"
): Promise<{ success: boolean; channel?: any; error?: string }> {
  const accessToken = await getAccessToken(tenantId, "youtube");
  if (!accessToken) {
    return { success: false, error: "YouTube not connected" };
  }

  try {
    const response = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&mine=true",
      {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData?.error?.message || `Failed to get channel: ${response.status}`,
      };
    }

    const data = await response.json();
    const channel = data.items?.[0];

    if (!channel) {
      return { success: false, error: "No YouTube channel found for this account" };
    }

    await markTokenUsed(tenantId, "youtube");

    return {
      success: true,
      channel: {
        id: channel.id,
        title: channel.snippet?.title,
        description: channel.snippet?.description,
        customUrl: channel.snippet?.customUrl,
        thumbnail: channel.snippet?.thumbnails?.default?.url,
        subscriberCount: channel.statistics?.subscriberCount,
        videoCount: channel.statistics?.videoCount,
        viewCount: channel.statistics?.viewCount,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Upload a video to YouTube
 * This is a resumable upload - for large files
 */
export async function uploadYouTubeVideo(
  videoFile: Buffer | Blob,
  options: YouTubeVideoOptions
): Promise<YouTubeUploadResult> {
  const tenantId = options.tenantId || "default";
  const accessToken = await getAccessToken(tenantId, "youtube");
  
  if (!accessToken) {
    return {
      success: false,
      error: "YouTube not connected. Please connect your Google account first.",
    };
  }

  try {
    // Step 1: Initialize resumable upload
    const metadata = {
      snippet: {
        title: options.title,
        description: options.description || "",
        tags: options.tags || [],
        categoryId: options.categoryId || "22", // People & Blogs
      },
      status: {
        privacyStatus: options.privacyStatus || "private",
        madeForKids: options.madeForKids || false,
        selfDeclaredMadeForKids: options.madeForKids || false,
      },
    };

    // If scheduled, add publishAt
    if (options.scheduledStartTime && options.privacyStatus === "private") {
      (metadata.status as any).publishAt = options.scheduledStartTime;
    }

    // Initialize upload
    const initResponse = await fetch(
      "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "X-Upload-Content-Type": "video/*",
        },
        body: JSON.stringify(metadata),
      }
    );

    if (!initResponse.ok) {
      const errorData = await initResponse.json().catch(() => ({}));
      return {
        success: false,
        error: errorData?.error?.message || `Upload init failed: ${initResponse.status}`,
      };
    }

    const uploadUrl = initResponse.headers.get("Location");
    if (!uploadUrl) {
      return { success: false, error: "No upload URL returned" };
    }

    // Step 2: Upload the video data
    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "video/*",
      },
      body: videoFile as any,
    });

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json().catch(() => ({}));
      return {
        success: false,
        error: errorData?.error?.message || `Upload failed: ${uploadResponse.status}`,
      };
    }

    const videoData = await uploadResponse.json();
    const videoId = videoData.id;

    await markTokenUsed(tenantId, "youtube");

    console.log("[YouTube] Video uploaded successfully:", videoId);

    return {
      success: true,
      videoId,
      videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
    };
  } catch (error: any) {
    console.error("[YouTube] Upload error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Update video metadata
 */
export async function updateYouTubeVideo(
  videoId: string,
  updates: Partial<YouTubeVideoOptions>,
  tenantId: string = "default"
): Promise<{ success: boolean; error?: string }> {
  const accessToken = await getAccessToken(tenantId, "youtube");
  if (!accessToken) {
    return { success: false, error: "YouTube not connected" };
  }

  try {
    const metadata: any = { id: videoId };

    if (updates.title || updates.description || updates.tags) {
      metadata.snippet = {};
      if (updates.title) metadata.snippet.title = updates.title;
      if (updates.description) metadata.snippet.description = updates.description;
      if (updates.tags) metadata.snippet.tags = updates.tags;
      if (updates.categoryId) metadata.snippet.categoryId = updates.categoryId;
    }

    if (updates.privacyStatus !== undefined) {
      metadata.status = { privacyStatus: updates.privacyStatus };
    }

    const parts = [];
    if (metadata.snippet) parts.push("snippet");
    if (metadata.status) parts.push("status");

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=${parts.join(",")}`,
      {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(metadata),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData?.error?.message || `Update failed: ${response.status}`,
      };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Delete a video
 */
export async function deleteYouTubeVideo(
  videoId: string,
  tenantId: string = "default"
): Promise<{ success: boolean; error?: string }> {
  const accessToken = await getAccessToken(tenantId, "youtube");
  if (!accessToken) {
    return { success: false, error: "YouTube not connected" };
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${videoId}`,
      {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok && response.status !== 204) {
      return { success: false, error: `Delete failed: ${response.status}` };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * List videos from channel
 */
export async function listYouTubeVideos(
  tenantId: string = "default",
  maxResults: number = 10
): Promise<{ success: boolean; videos?: any[]; error?: string }> {
  const accessToken = await getAccessToken(tenantId, "youtube");
  if (!accessToken) {
    return { success: false, error: "YouTube not connected" };
  }

  try {
    // First get the channel's upload playlist
    const channelResponse = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?part=contentDetails&mine=true",
      {
        headers: { "Authorization": `Bearer ${accessToken}` },
      }
    );

    if (!channelResponse.ok) {
      return { success: false, error: "Failed to get channel" };
    }

    const channelData = await channelResponse.json();
    const uploadsPlaylistId = channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;

    if (!uploadsPlaylistId) {
      return { success: true, videos: [] };
    }

    // Get videos from uploads playlist
    const videosResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,status&playlistId=${uploadsPlaylistId}&maxResults=${maxResults}`,
      {
        headers: { "Authorization": `Bearer ${accessToken}` },
      }
    );

    if (!videosResponse.ok) {
      return { success: false, error: "Failed to get videos" };
    }

    const videosData = await videosResponse.json();
    const videos = videosData.items?.map((item: any) => ({
      id: item.snippet?.resourceId?.videoId,
      title: item.snippet?.title,
      description: item.snippet?.description,
      thumbnail: item.snippet?.thumbnails?.medium?.url,
      publishedAt: item.snippet?.publishedAt,
      privacyStatus: item.status?.privacyStatus,
    })) || [];

    return { success: true, videos };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Types are already exported above
