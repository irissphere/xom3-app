# External Signals Setup Guide

This guide explains how to configure and use the external signals system (S6.2) for real-time automation alerts via Slack or Microsoft Teams.

## Overview

The signals system monitors your workflow automation layer and sends high-severity alerts to external channels (Slack/Teams) when critical issues are detected.

**Key Features:**
- Only sends alerts on state changes (no noise)
- High-severity alerts only (critical issues)
- Supports Slack and Microsoft Teams
- State persistence prevents duplicate alerts
- Health score monitoring

## Setup Steps

### 1. Configure Slack Bot Token

Add your Slack bot token to `.env.local`:

```bash
# Slack Bot Token (get from: https://api.slack.com/apps → Your App → OAuth & Permissions)
SLACK_BOT_TOKEN=xoxb-your-bot-token-here

# Optional: Specify channel name (defaults to #automation-alerts)
SLACK_ALERT_CHANNEL=#automation-alerts

# Optional: Microsoft Teams webhook (if you also want Teams)
TEAMS_WEBHOOK_URL=https://outlook.office.com/webhook/YOUR/WEBHOOK/URL
```

**Slack Bot Setup:**
1. Go to https://api.slack.com/apps
2. Create a new app or select existing app
3. Go to **OAuth & Permissions**
4. Add Bot Token Scopes:
   - `chat:write` - Send messages
   - `channels:read` - List channels
   - `channels:manage` - Create channels (if auto-create needed)
5. Install app to workspace
6. Copy the **Bot User OAuth Token** (starts with `xoxb-`)
7. Add to `.env.local` as `SLACK_BOT_TOKEN`

### 2. Optional: Set Dispatch Token

For security, you can require an auth token:

```bash
SIGNALS_DISPATCH_TOKEN=your-secret-token-here
```

### 3. Set Up Scheduler

Choose one of these options:

#### Option A: Vercel Cron (Recommended for Vercel deployments)

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

#### Option B: Manual Script (For testing)

Run manually:

```bash
cd xom3-app
node scripts/dispatch-signals.js
```

#### Option C: System Cron

Add to crontab:

```bash
*/5 * * * * cd /path/to/xom3-app && node scripts/dispatch-signals.js
```

#### Option D: GitHub Actions

Create `.github/workflows/signals-dispatch.yml`:

```yaml
name: Dispatch Signals
on:
  schedule:
    - cron: '*/5 * * * *'
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
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
          SIGNALS_DISPATCH_TOKEN: ${{ secrets.SIGNALS_DISPATCH_TOKEN }}
```

## How It Works

1. **Scheduler calls** `/api/usha/workflows/signals/dispatch` every 5 minutes
2. **System evaluates** current governance state (alerts, health score)
3. **Compares** to previous state (stored in persistence layer)
4. **Detects changes:**
   - New high-severity alerts
   - Health score drops significantly (≥10 points or ≥15%)
   - Severity increases
5. **Dispatches** only if changes detected (prevents noise)
6. **Saves** current state for next comparison

## Alert Types

Only **high-severity** alerts are sent externally:

- Failure spike detection
- High failure rate (>10%)
- Low success rate (<85%)
- Individual workflow failure spike
- Health score critical (<50)

## Message Format

### Slack Example

```
⚠️ Automation Alert — CRITICAL

Health Score: 62 (degraded)
Active Alerts: 3 (2 high, 1 medium)

High Severity Alerts:
• Failure spike detected: 12.5% (baseline: 5.2%)
• Compliance Sync has 42.0% failure rate (18 failures)

[View Governance Dashboard] (button)
```

### Teams Example

Similar format with Teams card styling and action buttons.

## Testing

### Manual Test

1. Trigger the dispatch endpoint:
   ```bash
   curl -X POST http://localhost:3000/api/usha/workflows/signals/dispatch
   ```

2. Or use the script:
   ```bash
   node scripts/dispatch-signals.js
   ```

### Simulate Alert

To test without real alerts, you can temporarily modify the evaluator to always return `shouldDispatch: true`.

## Troubleshooting

### No alerts being sent

1. Check webhook URLs are set correctly
2. Verify scheduler is running
3. Check API logs for errors
4. Ensure there are actual high-severity alerts

### Too many alerts

- The system only sends on state changes
- If you're getting duplicates, check state persistence is working
- Verify scheduler isn't running too frequently

### Slack API errors

- Verify `SLACK_BOT_TOKEN` is correct and not expired
- Check bot has required scopes (`chat:write`, `channels:read`)
- Ensure bot is installed to your workspace
- Verify channel exists or bot can create it
- Check bot is invited to private channels (if using private channels)

## State Persistence

The system stores last known state in:
- **Postgres** (if enabled): `xom3_kv` table, key: `signals:lastState`
- **File fallback**: `data/signals-last-state.json`

This prevents duplicate alerts and tracks state changes.

## Security

- Webhook URLs are stored in environment variables
- Optional auth token for dispatch endpoint
- No sensitive data in messages
- State data contains only rule IDs and scores

## Next Steps

Once S6.2 is configured:
- Monitor alert frequency
- Adjust thresholds if needed
- Consider S6.3 for digest summaries
- Add custom alert rules if needed

---

**Status:** S6.2 Complete - External Signals Operational
