# Testing Slack Buttons

## ✅ Current Setup Status

**What you have:**
- ✅ Bot added with full permissions
- ✅ Webhook URL configured in Slack
- ✅ `SLACK_BOT_TOKEN` set in Vercel
- ✅ Endpoint code ready at `/api/slack/interactions`

## 🔍 Verify Webhook URL

**In Slack App Settings → Interactivity & Shortcuts:**

Your Request URL should be:
```
https://xom3-r4vddsycl-preston-chenaults-projects.vercel.app/api/slack/interactions
```

**OR if you have a custom domain:**
```
https://xom3.io/api/slack/interactions
```

## 🧪 Test the Buttons

1. **Submit a test proposal** via your form
2. **Check Slack** - you should see the message in `#enterprise-proposals`
3. **Click any button:**
   - 🚀 Start Proposal
   - 📧 Send Follow-up Email  
   - 📅 Schedule Call
   - ✅ Mark Contacted

**Expected behavior:**
- Button should respond immediately (no error)
- Message should update with action taken
- Action should be logged in your system

## 🔐 Security (Recommended)

Add `SLACK_SIGNING_SECRET` to Vercel for signature verification:

1. Go to Slack App → **Basic Information** → **App Credentials**
2. Copy **Signing Secret**
3. Add to Vercel: `SLACK_SIGNING_SECRET = [your secret]`
4. Redeploy: `vercel --prod`

**Note:** Buttons will work without this, but it's less secure.

## 🐛 Troubleshooting

**Buttons don't respond:**
- Check Vercel logs: `vercel logs`
- Verify webhook URL matches exactly
- Check if endpoint is accessible: `curl https://your-domain.com/api/slack/interactions`

**Signature verification fails:**
- Make sure `SLACK_SIGNING_SECRET` matches Slack app settings
- Check timestamp is within 5 minutes
- Verify raw body is being sent correctly

**Message doesn't update:**
- Verify `SLACK_BOT_TOKEN` is correct
- Check bot has `chat:write` permission
- Ensure bot is in the channel

## ✅ Quick Test

Try clicking a button now - it should work! If you see any errors, check the Vercel function logs.








