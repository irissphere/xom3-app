# Slack Activation Checklist (Bot Token Path)

**Status:** ✅ Code Ready | ⚠️ Verify Environment

---

## ✅ **1. Confirm Environment Variables**

In `.env.local` or your deployment environment:

```bash
SLACK_BOT_TOKEN=xoxb-...
SLACK_ALERT_CHANNEL=#automation-alerts
```

**Verification:**
- ✅ Code checks for `SLACK_BOT_TOKEN`
- ✅ Defaults to `#automation-alerts` if `SLACK_ALERT_CHANNEL` not set
- ⚠️ **Action:** Verify token is in `.env.local` (you mentioned it's already there)

---

## ✅ **2. Confirm Bot Permissions**

In Slack:
1. Go to: **https://api.slack.com/apps**
2. Select your app
3. Go to **OAuth & Permissions**
4. **Required scopes:**
   - ✅ `chat:write` - Post messages
   - ✅ `channels:read` - List channels
   - ✅ `channels:manage` - Create channels (optional, for auto-create)

**If you add scopes:**
- Click **"Reinstall App"** to workspace
- This ensures the bot can find channels and post messages

---

## ✅ **3. Trigger the First Dispatch**

From your project root:

```bash
cd xom3-app
node scripts/dispatch-signals.js
```

**What happens:**
1. ✅ Loads last known state (or creates initial state)
2. ✅ Fetches current governance alerts
3. ✅ Detects state changes (new alerts, health score drops)
4. ✅ Formats Slack message with blocks and buttons
5. ✅ Sends using bot token via Slack Web API
6. ✅ Persists new state for next run

**Expected output:**

**If alerts exist:**
```
✓ Signals dispatched: 2 alerts
  ✓ slack: Alert sent to Slack channel #automation-alerts successfully
```

**If no new alerts:**
```
- No signals to dispatch: No state changes
```

**If error:**
```
✗ slack: SLACK_BOT_TOKEN not configured
```
or
```
✗ slack: Slack API error: [error details]
```

---

## ✅ **4. Check Slack**

Go to:
- `#automation-alerts` (default)
- Or your configured `SLACK_ALERT_CHANNEL`

**You should see:**

```
⚠️ Automation Alert — CRITICAL

Health Score: 62 (degraded)
Active Alerts: 3 (2 high, 1 medium)

High Severity Alerts:
• Failure spike detected: 12.5% (baseline: 5.2%)
• Compliance Sync has 42.0% failure rate (18 failures)

[View Governance Dashboard] (button)
```

**If there are no high-severity alerts:**
- Script runs silently
- No message sent (system is healthy)
- This is correct behavior

---

## ✅ **5. Optional: Auto-Dispatch Every 5 Minutes**

### **Option A — Vercel Cron (Recommended)**

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

### **Option B — GitHub Actions**

Create `.github/workflows/slack-signals.yml`:

```yaml
name: Dispatch Slack Signals
on:
  schedule:
    - cron: "*/5 * * * *"
  workflow_dispatch:

jobs:
  dispatch:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: |
          cd xom3-app
          npm install
          node scripts/dispatch-signals.js
        env:
          NEXT_PUBLIC_BASE_URL: ${{ secrets.NEXT_PUBLIC_BASE_URL }}
          SLACK_BOT_TOKEN: ${{ secrets.SLACK_BOT_TOKEN }}
          SLACK_ALERT_CHANNEL: ${{ secrets.SLACK_ALERT_CHANNEL }}
          SIGNALS_DISPATCH_TOKEN: ${{ secrets.SIGNALS_DISPATCH_TOKEN }}
```

### **Option C — System Cron**

```bash
*/5 * * * * cd /path/to/xom3-app && node scripts/dispatch-signals.js
```

---

## 🔍 **Troubleshooting**

### **"SLACK_BOT_TOKEN not configured"**
- ✅ Check `.env.local` has the token
- ✅ Restart dev server after adding env var
- ✅ Verify token format: `xoxb-...`

### **"Slack API error: not_authed"**
- ✅ Token is invalid or expired
- ✅ Regenerate in Slack app settings
- ✅ Reinstall app to workspace

### **"Slack API error: channel_not_found"**
- ✅ Channel doesn't exist
- ✅ Bot isn't in the channel (for private channels)
- ✅ Create channel or invite bot
- ✅ System will auto-create if `channels:manage` scope is set

### **"Slack API error: missing_scope"**
- ✅ Bot needs `chat:write` scope
- ✅ Add scope in OAuth & Permissions
- ✅ Reinstall app to workspace

### **No alerts being sent**
- ✅ Check if there are actual high-severity alerts
- ✅ System only sends on state changes (new alerts)
- ✅ First run will send all high-severity alerts
- ✅ Subsequent runs only send new/changed alerts

---

## ✅ **You're Live!**

Once Step 3 completes successfully, Slack alerts are **active**.

**The system will:**
- ✅ Monitor automation state (every 5 min if scheduler is set)
- ✅ Send alerts only when new high-severity issues appear
- ✅ Include actionable links back to the cockpit
- ✅ Prevent duplicate alerts (state tracking)
- ✅ Use your existing bot token (no webhook needed)

**Your Slack channel is now a real-time ops feed for Usha automations.**

---

**Next:** Run `node scripts/dispatch-signals.js` to activate!
