# OAuth Platform Setup Walkthrough

**Follow this guide step-by-step to configure OAuth for each platform.**

---

## 🎬 Platform 1: YouTube (Google)

### Step 1: Create Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click the **project dropdown** (top left, next to "Google Cloud")
3. Click **"New Project"**
4. **Project name:** `XOM3-OAuth`
5. Click **"Create"**
6. Wait for project creation (notification bell will show when ready)
7. Select your new project from the dropdown

### Step 2: Enable YouTube Data API
1. In Google Cloud Console, click the **Navigation Menu** (☰ hamburger icon)
2. Go to **"APIs & Services"** → **"Library"**
3. Search for **"YouTube Data API v3"**
4. Click on it, then click **"Enable"**

### Step 3: Configure OAuth Consent Screen
1. Go to **"APIs & Services"** → **"OAuth consent screen"**
2. Select **"External"** (for production) or **"Internal"** (if you have Workspace)
3. Click **"Create"**
4. Fill in:
   - **App name:** `XOM3 Social`
   - **User support email:** Your email
   - **App logo:** (optional)
   - **App domain:** `xom3.io` (or your domain)
   - **Developer contact email:** Your email
5. Click **"Save and Continue"**

### Step 4: Add Scopes
1. Click **"Add or Remove Scopes"**
2. Search and select:
   - `https://www.googleapis.com/auth/youtube.upload`
   - `https://www.googleapis.com/auth/youtube.force-ssl`
   - `https://www.googleapis.com/auth/youtube.readonly`
   - `https://www.googleapis.com/auth/userinfo.profile`
3. Click **"Update"**
4. Click **"Save and Continue"**

### Step 5: Add Test Users (if External)
1. Click **"Add Users"**
2. Add your email and any test users
3. Click **"Save and Continue"**

### Step 6: Create OAuth Credentials
1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"+ Create Credentials"** → **"OAuth client ID"**
3. **Application type:** Web application
4. **Name:** `XOM3 Web Client`
5. **Authorized JavaScript origins:**
   ```
   https://your-domain.com
   http://localhost:3000
   ```
6. **Authorized redirect URIs:**
   ```
   https://your-domain.com/api/oauth/youtube/callback
   http://localhost:3000/api/oauth/youtube/callback
   ```
7. Click **"Create"**

### Step 7: Copy Credentials
1. A popup shows your **Client ID** and **Client Secret**
2. Copy these to your `.env.local`:
   ```env
   GOOGLE_CLIENT_ID=123456789-abcdef.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-your-secret-here
   ```

✅ **YouTube OAuth Complete!**

---

## 🐦 Platform 2: Twitter / X

### Step 1: Access Developer Portal
1. Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Sign in with your Twitter account
3. If new, complete the developer account application

### Step 2: Create a Project
1. Click **"+ Add Project"** (or create if no projects exist)
2. **Project name:** `XOM3 Social`
3. **Use case:** Select appropriate option
4. **Project description:** "Social media automation for XOM3 platform"
5. Click **"Next"**

### Step 3: Create an App
1. **App name:** `XOM3 Posting`
2. Click **"Next"**
3. Save your **API Key** and **API Secret** (these are for API v1.1, we need OAuth 2.0)

### Step 4: Configure User Authentication
1. In your app, go to **"Settings"** → **"User authentication settings"**
2. Click **"Set up"**
3. **App permissions:** Read and write
4. **Type of App:** Web App, Automated App or Bot
5. **App info:**
   - **Callback URI / Redirect URL:**
     ```
     https://your-domain.com/api/oauth/twitter/callback
     http://localhost:3000/api/oauth/twitter/callback
     ```
   - **Website URL:** `https://your-domain.com`
6. Click **"Save"**

### Step 5: Get OAuth 2.0 Credentials
1. Go to **"Keys and tokens"** tab
2. Under **"OAuth 2.0 Client ID and Client Secret"**
3. Click **"Regenerate"** if needed
4. Copy to `.env.local`:
   ```env
   TWITTER_CLIENT_ID=your-client-id
   TWITTER_CLIENT_SECRET=your-client-secret
   ```

✅ **Twitter OAuth Complete!**

---

## 📸 Platform 3: Instagram (via Meta)

### Step 1: Access Meta for Developers
1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Click **"My Apps"** → **"Create App"**

### Step 2: Create App
1. Select **"Business"** as app type (required for Instagram)
2. **App name:** `XOM3 Social`
3. **App contact email:** Your email
4. **Business Account:** Select or create one
5. Click **"Create App"**

### Step 3: Add Instagram Product
1. In your app dashboard, find **"Add a Product"**
2. Click **"Set up"** on **"Instagram Graph API"**
3. Also add **"Facebook Login"**

### Step 4: Configure Facebook Login
1. Go to **"Facebook Login"** → **"Settings"**
2. **Valid OAuth Redirect URIs:**
   ```
   https://your-domain.com/api/oauth/instagram/callback
   https://your-domain.com/api/oauth/facebook/callback
   http://localhost:3000/api/oauth/instagram/callback
   http://localhost:3000/api/oauth/facebook/callback
   ```
3. Save Changes

### Step 5: Request Permissions
1. Go to **"App Review"** → **"Permissions and Features"**
2. Request these permissions:
   - `instagram_basic`
   - `instagram_content_publish`
   - `instagram_manage_comments`
   - `instagram_manage_insights`
   - `pages_show_list`
   - `pages_read_engagement`
   - `pages_manage_posts`
   - `business_management`
3. Note: Some require verification/review

### Step 6: Get App Credentials
1. Go to **"Settings"** → **"Basic"**
2. Copy **App ID** and **App Secret**
3. Add to `.env.local`:
   ```env
   META_APP_ID=your-app-id
   META_APP_SECRET=your-app-secret
   ```

### Important: Instagram Requirements
- Instagram account must be a **Business** or **Creator** account
- Must be connected to a **Facebook Page**
- Some features require **App Review** approval

✅ **Instagram OAuth Complete!**

---

## 📘 Platform 4: Facebook

Uses the **same Meta app** as Instagram!

1. Facebook Login is already configured from Instagram setup
2. Same `META_APP_ID` and `META_APP_SECRET` work for both

✅ **Facebook OAuth Complete!**

---

## 🎵 Platform 5: TikTok

### Step 1: Access TikTok for Developers
1. Go to [TikTok for Developers](https://developers.tiktok.com/)
2. Click **"Manage apps"** (or create account first)

### Step 2: Create App
1. Click **"Create app"**
2. **App name:** `XOM3 Social`
3. **Description:** "Social media automation platform"
4. **Category:** Content & Publishing
5. Submit for review

### Step 3: Configure Login Kit
1. In your app, go to **"Products"**
2. Add **"Login Kit"**
3. Configure:
   - **Redirect URI:**
     ```
     https://your-domain.com/api/oauth/tiktok/callback
     ```

### Step 4: Add Content Posting API
1. Add **"Content Posting API"** product
2. This requires business verification

### Step 5: Get Credentials
1. Go to **"Configuration"**
2. Copy **Client Key** and **Client Secret**
3. Add to `.env.local`:
   ```env
   TIKTOK_CLIENT_KEY=your-client-key
   TIKTOK_CLIENT_SECRET=your-client-secret
   ```

### TikTok Notes
- Requires business verification for Content Posting
- May take time for approval
- Sandbox mode available for testing

✅ **TikTok OAuth Complete!**

---

## 💼 Platform 6: LinkedIn

### Step 1: Access LinkedIn Developers
1. Go to [LinkedIn Developers](https://www.linkedin.com/developers/)
2. Click **"Create App"**

### Step 2: Create App
1. **App name:** `XOM3 Social`
2. **LinkedIn Page:** Select your company page (required)
3. **App logo:** Upload one
4. **Legal agreement:** Accept
5. Click **"Create app"**

### Step 3: Request Products
1. Go to **"Products"** tab
2. Request access to:
   - **Share on LinkedIn**
   - **Sign In with LinkedIn using OpenID Connect**
3. These typically auto-approve

### Step 4: Configure Auth
1. Go to **"Auth"** tab
2. Under **"OAuth 2.0 settings"**
3. **Authorized redirect URLs:**
   ```
   https://your-domain.com/api/oauth/linkedin/callback
   http://localhost:3000/api/oauth/linkedin/callback
   ```
4. Click **"Update"**

### Step 5: Get Credentials
1. In **"Auth"** tab, find:
   - **Client ID**
   - **Client Secret** (click "Show" to reveal)
2. Add to `.env.local`:
   ```env
   LINKEDIN_CLIENT_ID=your-client-id
   LINKEDIN_CLIENT_SECRET=your-client-secret
   ```

✅ **LinkedIn OAuth Complete!**

---

## 🔧 Final `.env.local` Template

```env
# Application URL (REQUIRED)
NEXT_PUBLIC_APP_URL=https://your-domain.com

# YouTube / Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-secret

# Twitter / X OAuth
TWITTER_CLIENT_ID=your-twitter-client-id
TWITTER_CLIENT_SECRET=your-twitter-client-secret

# Meta (Instagram & Facebook) OAuth
META_APP_ID=your-meta-app-id
META_APP_SECRET=your-meta-app-secret

# TikTok OAuth
TIKTOK_CLIENT_KEY=your-tiktok-client-key
TIKTOK_CLIENT_SECRET=your-tiktok-client-secret

# LinkedIn OAuth
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret

# Existing credentials...
AIRTABLE_API_KEY=...
AIRTABLE_BASE_ID=...
```

---

## 🚀 Test Your Setup

After adding credentials:

1. Start your dev server: `npm run dev`
2. Go to `http://localhost:3000/settings/accounts`
3. Click **"Connect YouTube"** (or any configured platform)
4. Complete OAuth authorization
5. Verify account shows as connected

---

## ⚠️ Common Issues

### "OAuth client not found"
- Check Client ID is correct
- Verify project is selected in Google Cloud

### "Redirect URI mismatch"
- Make sure redirect URI in `.env` matches exactly what's in platform settings
- Include `http://localhost:3000` for local dev

### "App not verified" (Google)
- For testing: Add test users in OAuth consent screen
- For production: Submit for verification

### "Insufficient permissions" (Meta)
- Request all needed permissions in App Review
- Some require verification

### "Token expired"
- Click "Reconnect" on the account
- Tokens are automatically refreshed when possible

---

## 📞 Platform-Specific Support

- **Google:** [OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- **Twitter:** [OAuth 2.0 Docs](https://developer.twitter.com/en/docs/authentication/oauth-2-0)
- **Meta:** [Instagram Graph API](https://developers.facebook.com/docs/instagram-api/)
- **TikTok:** [Login Kit](https://developers.tiktok.com/doc/login-kit-web)
- **LinkedIn:** [OAuth Guide](https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow)

---

**Created:** December 27, 2025  
**Author:** Claude (AKV Cockpit)




































