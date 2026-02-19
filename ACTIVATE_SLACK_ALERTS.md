# Activate Slack Alerts - Quick Start

**Status:** Ready to activate (uses existing `SLACK_BOT_TOKEN`)

---

## ✅ Step 1: Verify Bot Token

Your `.env.local` should have:

```bash
SLACK_BOT_TOKEN=xoxb-your-token-here
```

**Optional:** Set default channel (defaults to `#automation-alerts`):

```bash
SLACK_ALERT_CHANNEL=#xom3-ops
```

---

## ✅ Step 2: Ensure Bot Has Permissions

Your Slack bot needs these scopes:
- `chat:write` - Send messages
- `channels:read` - List channels  
- `channels:manage` - Create channels (optional, for auto-create)

**Check/Add scopes:**
1. Go to https://api.slack.com/apps
2. Select your app
3. Go to **OAuth & Permissions**
4. Add scopes if missing
5. Reinstall app to workspace if you added scopes

---

## ✅ Step 3: Test Manual Dispatch

Run the dispatch script:

```bash
cd xom3-app
node scripts/dispatch-signals.js
```

**What happens:**
- Fetches current governance state
- Compares to last known state
- If high-severity alerts exist → sends to Slack
- If no new alerts → logs "no signals to dispatch"

**Expected output:**
```
✓ Signals dispatched: 2 alerts
  ✓ slack: Alert sent to Slack channel #automation-alerts successfully
```

OR

```
- No signals to dispatch: No state changes
```

---

## ✅ Step 4: Verify in Slack

Check your Slack channel (default: `#automation-alerts` or your `SLACK_ALERT_CHANNEL`).

You should see a message like:

```
⚠️ Automation Alert — CRITICAL

Health Score: 62 (degraded)
Active Alerts: 3 (2 high, 1 medium)

High Severity Alerts:
• Failure spike detected: 12.5% (baseline: 5.2%)
• Compliance Sync has 42.0% failure rate (18 failures)

[View Governance Dashboard] (button)
```

---

## ✅ Step 5: Set Up Auto-Dispatch (Optional)

### Option A: Vercel Cron (Recommended)

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/usha/workflows/signals/dispatch",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

### Option B: Manual Testing

Just run the script whenever you want to check:

```bash
node scripts/dispatch-signals.js
```

### Option C: System Cron

```bash
*/5 * * * * cd /path/to/xom3-app && node scripts/dispatch-signals.js
```

---

## 🧪 Test Without Real Alerts

If you want to test the Slack connection without waiting for real alerts:

1. Temporarily modify `lib/signals/evaluator.ts`:
   - Change `shouldDispatch` to always return `true` for testing
   - Or create a test alert manually

2. Or trigger the API directly:

```bash
curl -X POST http://localhost:3000/api/usha/workflows/signals/dispatch
```

---

## 🔍 Troubleshooting

### "SLACK_BOT_TOKEN not configured"
- Check `.env.local` has `SLACK_BOT_TOKEN`
- Restart dev server after adding env var

### "Slack API error: not_authed"
- Bot token is invalid or expired
- Regenerate token in Slack app settings

### "Slack API error: channel_not_found"
- Channel doesn't exist
- Bot isn't in the channel (for private channels)
- Create the channel or invite the bot

### "Slack API error: missing_scope"
- Bot needs `chat:write` scope
- Add scope and reinstall app

### No alerts being sent
- Check if there are actual high-severity alerts
- System only sends on state changes (new alerts)
- First run will send all high-severity alerts

---

## ✅ You're Live!

Once Step 3 completes successfully, Slack alerts are active.

The system will:
- Monitor automation state every 5 minutes (if scheduler is set)
- Send alerts only when new high-severity issues appear
- Include actionable links back to the cockpit
- Prevent duplicate alerts (state tracking)

**Your Slack channel is now a real-time ops feed for Usha automations.**
