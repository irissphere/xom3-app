# Slack Interactive Buttons Setup Guide

## ✅ What's Already Built

Your Slack buttons are **fully implemented** in the code:
- ✅ Button handlers in `/api/slack/interactions/route.ts`
- ✅ Button definitions in `/lib/integrations/slack-blocks.ts`
- ✅ All 4 buttons: Start Proposal, Send Follow-up Email, Schedule Call, Mark Contacted

## 🔧 What Needs to Be Configured

### Step 1: Get Your Slack App Credentials

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Select your app (or create a new one)
3. Go to **Basic Information** → **App Credentials**
4. Copy:
   - **Signing Secret** → `SLACK_SIGNING_SECRET`
   - **Bot User OAuth Token** → `SLACK_BOT_TOKEN`

### Step 2: Configure Interactivity URL

1. In your Slack app, go to **Interactivity & Shortcuts**
2. Enable **Interactivity**
3. Set **Request URL** to:
   ```
   https://xom3-r4vddsycl-preston-chenaults-projects.vercel.app/api/slack/interactions
   ```
   (Or your production domain once deployed)

4. Click **Save Changes**

### Step 3: Add Environment Variables to Vercel

Go to Vercel Dashboard → Your Project → Settings → Environment Variables

Add these:

```
SLACK_SIGNING_SECRET = [your signing secret from Step 1]
SLACK_BOT_TOKEN = [your bot token from Step 1]
SLACK_WEBHOOK_URL = [your webhook URL - optional, for fallback]
```

### Step 4: Install Bot to Your Workspace

1. In Slack app settings, go to **OAuth & Permissions**
2. Add these **Bot Token Scopes**:
   - `chat:write` - Post messages
   - `chat:write.public` - Post to public channels
   - `channels:read` - Read channel info
   - `users:read` - Read user info

3. Click **Install to Workspace**
4. Authorize the app

### Step 5: Invite Bot to Channel

In your Slack workspace:
```
/invite @YourBotName #enterprise-proposals
```

## 🧪 Testing

1. Submit a test proposal via your form
2. Check `#enterprise-proposals` channel for the message
3. Click any button - it should:
   - Show immediate feedback
   - Log the action
   - Trigger the corresponding workflow

## 🔍 Troubleshooting

**Buttons don't respond:**
- Check Vercel logs: `vercel logs`
- Verify interactivity URL is set correctly
- Check `SLACK_SIGNING_SECRET` is correct
- Verify bot has `chat:write` permission

**Buttons show but don't work:**
- Check browser console for errors
- Verify `/api/slack/interactions` endpoint is accessible
- Check signature verification is passing

**Message doesn't update after click:**
- Verify `SLACK_BOT_TOKEN` is set
- Check bot has `chat:write` permission
- Verify bot is in the channel

## 📋 Quick Checklist

- [ ] Slack app created/configured
- [ ] Interactivity URL set to `/api/slack/interactions`
- [ ] `SLACK_SIGNING_SECRET` added to Vercel
- [ ] `SLACK_BOT_TOKEN` added to Vercel
- [ ] Bot installed to workspace
- [ ] Bot invited to `#enterprise-proposals` channel
- [ ] Test proposal submitted
- [ ] Buttons respond to clicks

## 🎯 Current Status

**Code:** ✅ Ready  
**Configuration:** ⏳ Needs Slack app setup  
**Buttons:** ⏳ Will work once configured

Once you complete the setup above, your buttons will be fully functional!








