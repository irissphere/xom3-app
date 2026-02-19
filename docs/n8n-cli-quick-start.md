# n8n CLI Quick Start

## Quick Configuration

Add to `.env`:

```bash
AUTOMATION_RUNNER_TYPE=n8n-cli
N8N_CLI_PATH=n8n
N8N_CLI_TIMEOUT_MS=300000
```

## VPS Setup (One-Time)

```bash
# 1. Install n8n
npm install -g n8n

# 2. Verify
n8n --version

# 3. Import workflows
n8n import:workflow --input=workflow.json

# 4. Get workflow IDs
n8n list:workflow
```

## Testing

**Unix/Linux/WSL:**
```bash
# Manual test
n8n execute --id=YOUR_WORKFLOW_ID --input='{"test":"value"}'
```

**PowerShell (Windows):**
```powershell
# Manual test
n8n execute --id=YOUR_WORKFLOW_ID --input='{"test":"value"}'

# Or test via API (PowerShell)
$uri = "http://localhost:3000/api/usha/workflows/YOUR_WORKFLOW_ID/trigger-runner"
$body = @{ params = @{ test = "value" } } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri $uri -Headers @{ "Content-Type" = "application/json" } -Body $body
```

**From Cockpit UI:** Trigger Workflow button → Enter workflow ID

## Verification Checklist

- [ ] n8n installed on VPS (`n8n --version`)
- [ ] Workflows imported (`n8n list:workflow`)
- [ ] Environment variables set (`.env`)
- [ ] Airtable `Workflow_Executions` table exists
- [ ] Test trigger from cockpit UI
- [ ] Check execution in Airtable
- [ ] Verify Slack notification

## Common Commands

```bash
# List workflows
n8n list:workflow

# Execute workflow
n8n execute --id=WORKFLOW_ID --input='{"key":"value"}'

# Check logs
tail -f ~/.n8n/logs/n8n.log
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `n8n: command not found` | Install: `npm install -g n8n` or use `N8N_CLI_PATH=npx n8n` |
| Workflow not found | Verify ID: `n8n list:workflow` |
| Timeout | Increase `N8N_CLI_TIMEOUT_MS` |
| Permission denied | `chmod -R 755 ~/.n8n` |

## Full Documentation

See `docs/n8n-cli-vps-setup.md` for complete setup guide.
