# OAuth Credentials Setup - RESOLUTION GUIDE

**Status:** 🔴 OAuth credentials missing from .env.local  
**Date:** January 2, 2026  
**Issue:** Social platform connections failing with "Platform not configured" error

## 🔍 Problem Identified

The verification script found:
- ❌ **All OAuth credentials are MISSING from .env.local**
- ⚠️  **12 formatting issues** (quoted values that should be unquoted)

## ✅ Solution Steps

### Step 1: Add OAuth Credentials to .env.local

**Open `xom3-app/.env.local` and add these lines at the end:**

```env
# ============================================================
# OAUTH CREDENTIALS (Required for Social Platform Connections)
# ============================================================

# Application URL (REQUIRED)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# YouTube / Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# Twitter / X OAuth
TWITTER_CLIENT_ID=your_twitter_client_id_here
TWITTER_CLIENT_SECRET=your_twitter_client_secret_here

# Meta (Instagram & Facebook) OAuth
META_APP_ID=your_meta_app_id_here
META_APP_SECRET=your_meta_app_secret_here

# TikTok OAuth (Optional)
TIKTOK_CLIENT_KEY=your_tiktok_client_key_here
TIKTOK_CLIENT_SECRET=your_tiktok_client_secret_here

# LinkedIn OAuth (Optional)
LINKEDIN_CLIENT_ID=your_linkedin_client_id_here
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret_here
```

### Step 2: Fix Formatting Issues

**Remove quotes from ALL environment variables in .env.local:**

❌ **WRONG:**
```env
STRIPE_SECRET_KEY="sk_live_abc123"
```

✅ **CORRECT:**
```env
STRIPE_SECRET_KEY=sk_live_abc123
```

### Step 3: Verify Setup

**Run the verification script:**
```bash
cd xom3-app
node scripts/verify-oauth-env.js
```

**Expected output:**
```
✅ All required variables are set!
```

### Step 4: Restart Dev Server

**After updating .env.local:**
```bash
# Stop current server (Ctrl+C)
# Then restart:
cd xom3-app
npm run dev
```

### Step 5: Test OAuth

**1. Check debug endpoint:**
```
http://localhost:3000/api/oauth/debug
```

**2. Test social connect page:**
```
http://localhost:3000/social-connect
```

**3. Try connecting a platform:**
- Click "Connect Twitter" (or any platform)
- Should redirect to platform's OAuth page
- After authorization, redirects back with success

## 📋 Where to Get OAuth Credentials

### YouTube/Google
1. Go to: https://console.cloud.google.com/apis/credentials
2. Create OAuth 2.0 Client ID
3. Add redirect URI: `http://localhost:3000/api/oauth/youtube/callback`

### Twitter/X
1. Go to: https://developer.twitter.com/en/portal/dashboard
2. Create App → Settings → User authentication settings
3. Add callback URI: `http://localhost:3000/api/oauth/twitter/callback`

### Meta (Instagram/Facebook)
1. Go to: https://developers.facebook.com/apps/
2. Create App → Business type
3. Add Facebook Login product
4. Add redirect URIs:
   - `http://localhost:3000/api/oauth/instagram/callback`
   - `http://localhost:3000/api/oauth/facebook/callback`

## 🚨 Critical Notes

1. **NO QUOTES** - Environment variables should NOT be quoted
2. **NO SPACES** - No spaces around the `=` sign
3. **RESTART REQUIRED** - Server must be restarted after .env.local changes
4. **ONE PLATFORM AT A TIME** - Start with Twitter (easiest), then add others

## ✅ Verification Checklist

- [ ] OAuth credentials added to .env.local
- [ ] All quotes removed from env vars
- [ ] NEXT_PUBLIC_APP_URL set correctly
- [ ] Verification script passes
- [ ] Dev server restarted
- [ ] Debug endpoint shows configured platforms
- [ ] Social connect page shows "Connect" buttons
- [ ] OAuth flow works for at least one platform

## 🐛 Troubleshooting

**If still not working:**

1. **Check server logs** for environment variable errors
2. **Verify .env.local is in xom3-app/** directory (not root)
3. **Check file encoding** - should be UTF-8, no BOM
4. **Clear Next.js cache:** `rm -rf .next` then restart
5. **Test with one platform** first (Twitter recommended)

## 📞 Next Steps

Once credentials are added:
1. Run verification script
2. Restart dev server
3. Test debug endpoint
4. Try connecting one platform
5. Report back with results

---

**Created:** January 2, 2026  
**Status:** Awaiting OAuth credentials in .env.local









