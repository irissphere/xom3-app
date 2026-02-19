# OAuth Account Connection System

**Status:** ✅ BUILT  
**Date:** December 27, 2025  
**Purpose:** Enable tenants to connect their own social media accounts

---

## Overview

The OAuth Account Connection System allows tenants to securely connect their social media accounts (YouTube, Twitter/X, Instagram, Facebook, TikTok, LinkedIn) for automated posting through XOM3.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                  OAUTH ACCOUNT CONNECTION FLOW                    │
└──────────────────────────────────────────────────────────────────┘

    ┌─────────────────────┐
    │  Settings Panel     │
    │  /settings/accounts │
    └──────────┬──────────┘
               │
               ▼
    ┌─────────────────────┐
    │  "Connect YouTube"  │──────────────────────────────┐
    │  "Connect Twitter"  │                              │
    │  "Connect Instagram"│                              ▼
    └──────────┬──────────┘              ┌───────────────────────┐
               │                          │  OAuth Authorization  │
               ▼                          │  (Platform's Server)  │
    ┌─────────────────────┐              └───────────┬───────────┘
    │ /api/oauth/[plat]/  │                          │
    │    authorize        │◄─────────────────────────┘
    └──────────┬──────────┘              
               │ (redirect to platform)
               ▼
    ┌─────────────────────┐
    │  User Authorizes    │
    │  on Platform        │
    └──────────┬──────────┘
               │ (redirect back with code)
               ▼
    ┌─────────────────────┐
    │ /api/oauth/[plat]/  │
    │    callback         │
    └──────────┬──────────┘
               │
               ├──► Exchange code for tokens
               │
               ├──► Fetch user info from platform
               │
               ├──► Store tokens (encrypted)
               │
               └──► Redirect to settings with success
```

---

## Environment Variables Required

Add these to your `.env.local` or Vercel environment:

### Google (YouTube)
```env
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
```

### Twitter/X
```env
TWITTER_CLIENT_ID=your_client_id
TWITTER_CLIENT_SECRET=your_client_secret
```

### Meta (Instagram & Facebook)
```env
META_APP_ID=your_app_id
META_APP_SECRET=your_app_secret
```

### TikTok
```env
TIKTOK_CLIENT_KEY=your_client_key
TIKTOK_CLIENT_SECRET=your_client_secret
```

### LinkedIn
```env
LINKEDIN_CLIENT_ID=your_client_id
LINKEDIN_CLIENT_SECRET=your_client_secret
```

### Application URL
```env
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

---

## OAuth App Setup Instructions

### YouTube (Google)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **YouTube Data API v3**
4. Go to **Credentials** → **Create Credentials** → **OAuth Client ID**
5. Configure consent screen (External for production)
6. Set **Application type**: Web application
7. Add **Authorized redirect URI**: `https://your-domain.com/api/oauth/youtube/callback`
8. Copy Client ID and Client Secret

### Twitter/X

1. Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal)
2. Create a new App or Project
3. Set up **User authentication settings**:
   - Type: **Web App, Automated App or Bot**
   - App permissions: **Read and write**
   - Callback URI: `https://your-domain.com/api/oauth/twitter/callback`
4. Copy Client ID and Client Secret

### Meta (Instagram/Facebook)

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Create a new App (type: **Business**)
3. Add products: **Facebook Login**, **Instagram Graph API**
4. Configure Facebook Login:
   - Valid OAuth Redirect URIs: 
     - `https://your-domain.com/api/oauth/instagram/callback`
     - `https://your-domain.com/api/oauth/facebook/callback`
5. Request permissions:
   - `instagram_basic`
   - `instagram_content_publish`
   - `pages_manage_posts`
   - `pages_read_engagement`
6. Copy App ID and App Secret

### TikTok

1. Go to [TikTok for Developers](https://developers.tiktok.com/)
2. Create an App
3. Configure **Login Kit** and **Content Posting API**
4. Add redirect URI: `https://your-domain.com/api/oauth/tiktok/callback`
5. Copy Client Key and Client Secret

### LinkedIn

1. Go to [LinkedIn Developers](https://www.linkedin.com/developers/)
2. Create an App
3. Request products: **Share on LinkedIn**, **Sign In with LinkedIn**
4. Set OAuth 2.0 redirect URL: `https://your-domain.com/api/oauth/linkedin/callback`
5. Copy Client ID and Client Secret

---

## API Routes

### GET `/api/oauth/[platform]/authorize`
Initiates OAuth flow by redirecting to platform's authorization page.

**Query Parameters:**
- `tenant` - Tenant ID (optional, defaults to "default")

### GET `/api/oauth/[platform]/callback`
Handles OAuth callback, exchanges code for tokens, stores credentials.

### GET `/api/oauth/connections`
Returns all platform connection statuses for tenant.

**Response:**
```json
{
  "ok": true,
  "tenantId": "default",
  "platforms": [
    {
      "platform": "youtube",
      "name": "YouTube",
      "status": "connected",
      "platformUsername": "MyChannel",
      "connectedAt": "2025-01-01T00:00:00Z"
    }
  ],
  "summary": {
    "total": 6,
    "connected": 1,
    "configured": 3
  }
}
```

### DELETE `/api/oauth/[platform]/disconnect`
Removes account connection for tenant.

---

## UI Components

### Connect Accounts Panel
Located at: `/app/components/ConnectAccountsPanel.tsx`

Features:
- Shows all platforms with connection status
- Connect/Disconnect buttons
- Profile info display (name, image, username)
- Token refresh for expired connections
- Error handling and retry

### Settings Pages
- `/settings` - Main settings hub
- `/settings/accounts` - Account connection management

---

## Token Storage

Tokens are stored:
1. **In-memory** (development/session)
2. **Airtable** (production persistence)

### Airtable Table: `ConnectedAccounts`

| Field | Type | Description |
|-------|------|-------------|
| TenantID | Text | Tenant identifier |
| Platform | Single Select | youtube, twitter, instagram, etc. |
| AccessToken | Text | Encrypted access token |
| RefreshToken | Text | Encrypted refresh token |
| ExpiresAt | DateTime | Token expiration |
| PlatformUserID | Text | Platform user ID |
| PlatformUsername | Text | Platform username |
| PlatformDisplayName | Text | Display name |
| PlatformProfileImage | URL | Profile image URL |
| ConnectedAt | DateTime | Connection timestamp |
| Status | Single Select | connected, expired, error |

---

## Security

- **OAuth 2.0** with PKCE (for Twitter)
- **State parameter** for CSRF protection
- **Tokens encrypted** at rest
- **Refresh token rotation** supported
- **Never stores passwords** - only OAuth tokens
- **Revocable** - users can disconnect anytime

---

## Files Created

```
lib/oauth/
├── index.ts                    # Main exports
├── types.ts                    # Type definitions
├── platform-configs.ts         # Platform OAuth configs
├── token-storage.ts           # Token management
└── user-info-fetchers.ts      # Platform user info fetchers

app/api/oauth/
├── [platform]/
│   ├── authorize/route.ts     # Initiate OAuth
│   ├── callback/route.ts      # Handle callback
│   └── disconnect/route.ts    # Remove connection
└── connections/route.ts       # List all connections

app/components/
└── ConnectAccountsPanel.tsx   # UI component

app/settings/
├── page.tsx                   # Settings hub
└── accounts/page.tsx          # Account management page
```

---

## Usage from Broadcast Engine

To post using tenant credentials:

```typescript
import { getAccessToken, markTokenUsed } from "@/lib/oauth";

async function postToYouTube(tenantId: string, content: any) {
  const accessToken = await getAccessToken(tenantId, "youtube");
  
  if (!accessToken) {
    throw new Error("YouTube not connected");
  }
  
  // Use token for API call
  const response = await fetch("https://www.googleapis.com/youtube/v3/videos", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    // ...
  });
  
  // Mark token as used (for tracking)
  await markTokenUsed(tenantId, "youtube");
  
  return response.json();
}
```

---

## Created: December 27, 2025
## Status: Complete ✅




































