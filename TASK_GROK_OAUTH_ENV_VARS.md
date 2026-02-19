# Social OAuth Environment Setup

To complete the Social OAuth integration, you need to configure the environment variables in `.env.local` and ensuring your Airtable Base ID is correct.

## 1. Airtable Configuration

Ensure your `AIRTABLE_BASE_ID` points to the **Xom3 Commander** base where the `ConnectedAccounts` table was created.

Base ID: `appgAjwWw2Jr2TC0K`

```bash
AIRTABLE_BASE_ID=appgAjwWw2Jr2TC0K
AIRTABLE_API_KEY=your_airtable_api_key
```

## 2. Platform Credentials

Copy the contents of `xom3-app/OAUTH_ENV_TEMPLATE.txt` to your `.env.local` file and fill in the secrets for each platform you wish to enable.

### Required Variables

#### Twitter / X
- `TWITTER_CLIENT_ID`
- `TWITTER_CLIENT_SECRET`
- Callback URL: `https://[your-domain]/api/oauth/twitter/callback`

#### Facebook / Instagram (Meta)
- `META_APP_ID`
- `META_APP_SECRET`
- Callback URL: `https://[your-domain]/api/oauth/facebook/callback`
- Callback URL: `https://[your-domain]/api/oauth/instagram/callback`

#### LinkedIn
- `LINKEDIN_CLIENT_ID`
- `LINKEDIN_CLIENT_SECRET`
- Callback URL: `https://[your-domain]/api/oauth/linkedin/callback`

#### TikTok
- `TIKTOK_CLIENT_KEY`
- `TIKTOK_CLIENT_SECRET`
- Callback URL: `https://[your-domain]/api/oauth/tiktok/callback`

#### YouTube / Google
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- Callback URL: `https://[your-domain]/api/oauth/youtube/callback`

## 3. Verify Implementation

Once variables are set:
1. Navigate to `/settings/accounts`
2. Click "Connect" on a platform
3. Verify the redirect and successful return













