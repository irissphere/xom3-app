// Platform User Info Fetchers
// AKV: Fetch user profile after OAuth to display in UI

import { OAuthPlatform, PlatformUserInfo } from "./types";

/**
 * Fetch YouTube user info
 */
async function fetchYouTubeUserInfo(accessToken: string): Promise<PlatformUserInfo> {
  const response = await fetch(
    "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch YouTube user info: ${response.status}`);
  }

  const data = await response.json();
  const channel = data.items?.[0];

  if (!channel) {
    throw new Error("No YouTube channel found");
  }

  return {
    id: channel.id,
    username: channel.snippet.customUrl || channel.id,
    displayName: channel.snippet.title,
    profileUrl: `https://youtube.com/channel/${channel.id}`,
    profileImage: channel.snippet.thumbnails?.default?.url,
  };
}

/**
 * Fetch Twitter/X user info
 */
async function fetchTwitterUserInfo(accessToken: string): Promise<PlatformUserInfo> {
  const response = await fetch(
    "https://api.twitter.com/2/users/me?user.fields=profile_image_url,username,name",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch Twitter user info: ${response.status}`);
  }

  const data = await response.json();
  const user = data.data;

  return {
    id: user.id,
    username: user.username,
    displayName: user.name,
    profileUrl: `https://twitter.com/${user.username}`,
    profileImage: user.profile_image_url,
  };
}

/**
 * Fetch Instagram user info (via Meta Graph API)
 */
async function fetchInstagramUserInfo(accessToken: string): Promise<PlatformUserInfo> {
  // First, get the Instagram Business Account ID
  const accountsResponse = await fetch(
    `https://graph.facebook.com/v18.0/me/accounts?fields=instagram_business_account&access_token=${accessToken}`
  );

  if (!accountsResponse.ok) {
    throw new Error(`Failed to fetch Instagram accounts: ${accountsResponse.status}`);
  }

  const accountsData = await accountsResponse.json();
  const igAccount = accountsData.data?.[0]?.instagram_business_account;

  if (!igAccount) {
    throw new Error("No Instagram Business Account found. Make sure your Instagram is connected to a Facebook Page.");
  }

  // Now fetch Instagram user info
  const userResponse = await fetch(
    `https://graph.facebook.com/v18.0/${igAccount.id}?fields=username,name,profile_picture_url&access_token=${accessToken}`
  );

  if (!userResponse.ok) {
    throw new Error(`Failed to fetch Instagram user info: ${userResponse.status}`);
  }

  const userData = await userResponse.json();

  return {
    id: userData.id,
    username: userData.username,
    displayName: userData.name,
    profileUrl: `https://instagram.com/${userData.username}`,
    profileImage: userData.profile_picture_url,
  };
}

/**
 * Fetch Facebook user info
 */
async function fetchFacebookUserInfo(accessToken: string): Promise<PlatformUserInfo> {
  // Get Pages the user manages
  const response = await fetch(
    `https://graph.facebook.com/v18.0/me/accounts?fields=id,name,picture&access_token=${accessToken}`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch Facebook pages: ${response.status}`);
  }

  const data = await response.json();
  const page = data.data?.[0];

  if (!page) {
    // If no page, get personal profile
    const profileResponse = await fetch(
      `https://graph.facebook.com/v18.0/me?fields=id,name,picture&access_token=${accessToken}`
    );
    
    if (!profileResponse.ok) {
      throw new Error(`Failed to fetch Facebook profile: ${profileResponse.status}`);
    }
    
    const profile = await profileResponse.json();
    
    return {
      id: profile.id,
      username: profile.id,
      displayName: profile.name,
      profileUrl: `https://facebook.com/${profile.id}`,
      profileImage: profile.picture?.data?.url,
    };
  }

  return {
    id: page.id,
    username: page.id,
    displayName: page.name,
    profileUrl: `https://facebook.com/${page.id}`,
    profileImage: page.picture?.data?.url,
    metadata: { isPage: true },
  };
}

/**
 * Fetch TikTok user info
 */
async function fetchTikTokUserInfo(accessToken: string): Promise<PlatformUserInfo> {
  const response = await fetch(
    "https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name,username",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch TikTok user info: ${response.status}`);
  }

  const data = await response.json();
  const user = data.data?.user;

  if (!user) {
    throw new Error("No TikTok user data returned");
  }

  return {
    id: user.open_id,
    username: user.username,
    displayName: user.display_name,
    profileUrl: user.username ? `https://tiktok.com/@${user.username}` : undefined,
    profileImage: user.avatar_url,
  };
}

/**
 * Fetch LinkedIn user info
 */
async function fetchLinkedInUserInfo(accessToken: string): Promise<PlatformUserInfo> {
  const response = await fetch(
    "https://api.linkedin.com/v2/userinfo",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch LinkedIn user info: ${response.status}`);
  }

  const data = await response.json();

  return {
    id: data.sub,
    username: data.email,
    displayName: data.name,
    profileUrl: `https://linkedin.com/in/${data.sub}`,
    profileImage: data.picture,
    email: data.email,
  };
}

/**
 * Fetch user info for platform
 */
export async function fetchPlatformUserInfo(
  platform: OAuthPlatform,
  accessToken: string
): Promise<PlatformUserInfo> {
  switch (platform) {
    case "youtube":
      return fetchYouTubeUserInfo(accessToken);
    case "twitter":
      return fetchTwitterUserInfo(accessToken);
    case "instagram":
      return fetchInstagramUserInfo(accessToken);
    case "facebook":
      return fetchFacebookUserInfo(accessToken);
    case "tiktok":
      return fetchTikTokUserInfo(accessToken);
    case "linkedin":
      return fetchLinkedInUserInfo(accessToken);
    default:
      throw new Error(`Unknown platform: ${platform}`);
  }
}




































