# n8n CLI on VPS Setup Guide

This guide walks you through setting up n8n CLI execution on your VPS for production workflow automation.

## Overview

The n8n CLI dispatcher allows you to execute workflows directly on your VPS using the n8n command-line interface. This provides:

- **Operational Control**: Full process control, logs, and retries
- **Security**: Secrets stay on your VPS, not exposed via webhooks
- **Reliability**: Local execution avoids network timeouts
- **Observability**: Capture stdout/stderr for execution logs

---

## Prerequisites

- VPS with Node.js 18+ installed
- n8n installed globally or via npx
- SSH access to VPS
- Airtable base with `Workflow_Executions` table

---

## Step 1: Install n8n on VPS

### Option A: Global Installation

```bash
# SSH into your VPS
ssh user@your-vps-ip

# Install n8n globally
npm install -g n8n

# Verify installation
n8n --version
```

### Option B: Use npx (No Global Install)

If you prefer not to install globally, the dispatcher can use `npx n8n` instead.

---

## Step 2: Configure n8n

### Set n8n User Folder

```bash
# Create n8n data directory
mkdir -p ~/.n8n

# Set environment variable (add to ~/.bashrc or ~/.zshrc)
export N8N_USER_FOLDER=~/.n8n
```

### Import Workflows

```bash
# Import workflows from your cockpit
n8n import:workflow --input=/path/to/workflow.json

# Or use n8n UI to import workflows
# Then note the workflow IDs for use in triggers
```

### Get Workflow IDs

```bash
# List all workflows
n8n list:workflow

# Or check in n8n UI: Workflow Settings → Workflow ID
```

---

## Step 3: Configure Environment Variables

Add these to your `.env` file in `xom3-app/`:

```bash
# Automation Runner Configuration
AUTOMATION_RUNNER_TYPE=n8n-cli

# n8n CLI Path (use "n8n" for global, "npx n8n" for npx)
N8N_CLI_PATH=n8n

# Optional: Custom working directory
N8N_WORKING_DIRECTORY=/home/user/n8n-workflows

# Optional: Execution timeout (milliseconds, default: 300000 = 5 minutes)
N8N_CLI_TIMEOUT_MS=300000

# Optional: n8n user folder (if not using default ~/.n8n)
N8N_USER_FOLDER=/home/user/.n8n

# Optional: n8n encryption key (if using encrypted credentials)
N8N_ENCRYPTION_KEY=your-encryption-key-here
```

---

## Step 4: Update Airtable Schema

Ensure your `Workflow_Executions` table has these fields:

| Field Name | Type | Description |
|------------|------|-------------|
| `Execution_ID` | Single line text | Unique execution identifier |
| `Workflow_Name` | Single line text | Workflow name |
| `Status` | Single select | Success / Failed / Running |
| `Triggered_At` | Date | When execution started |
| `Completed_At` | Date | When execution finished |
| `Duration` | Number | Execution duration in seconds |
| `Run_Type` | Single select | Manual / Scheduled / Retry |
| `Automation_Source` | Single line text | Cockpit / API / etc. |
| `Trigger_Type` | Single line text | manual / scheduled / retry |
| `Error_Message` | Long text | Error details if failed |
| `Inputs` | Long text | JSON string of input parameters |
| `Execution_Logs` | Long text | JSON string with stdout/stderr (optional) |
| `Updated_By` | Single line text | Operator identifier |

---

## Step 5: Test the Setup

### Test 1: Verify n8n CLI Works

```bash
# SSH into VPS
ssh user@your-vps-ip

# Test n8n CLI
n8n --version

# List workflows
n8n list:workflow
```

### Test 2: Manual CLI Execution

```bash
# Execute a workflow manually
n8n execute --id=YOUR_WORKFLOW_ID --input='{"test":"value"}'
```

### Test 3: Trigger from Cockpit

1. Open your cockpit UI
2. Navigate to Workflows panel
3. Click "Trigger Workflow"
4. Enter workflow ID and parameters
5. Click "Trigger Workflow"
6. Check:
   - Server logs for execution details
   - Airtable `Workflow_Executions` table for new record
   - Slack notification (if configured)

---

## Step 6: Monitoring and Logs

### Server Logs

Check your Next.js server logs for:

```
[N8nCliDispatcher] Executing workflow: compliance-sync (Execution ID: exec_xxx)
[N8nCliDispatcher] Command: n8n execute --id=compliance-sync --input={...}
[N8nCliDispatcher] Execution completed: success (exit code: 0, duration: 2345ms)
```

### Execution Logs in Airtable

The `Execution_Logs` field contains:

```json
{
  "stdout": "Workflow execution output...",
  "stderr": "Any error messages...",
  "exitCode": 0,
  "command": "n8n execute --id=workflow-id --input={...}",
  "runnerType": "n8n-cli"
}
```

### Common Issues

**Issue: "n8n: command not found"**
- Solution: Install n8n globally or set `N8N_CLI_PATH=npx n8n`

**Issue: "Workflow not found"**
- Solution: Verify workflow ID exists with `n8n list:workflow`

**Issue: "Permission denied"**
- Solution: Ensure n8n user folder is writable: `chmod -R 755 ~/.n8n`

**Issue: "Execution timeout"**
- Solution: Increase `N8N_CLI_TIMEOUT_MS` for long-running workflows

---

## Step 7: Production Hardening

### Process Management

Run n8n under a process manager for auto-restart:

```bash
# Install PM2
npm install -g pm2

# Start n8n (if running as service)
pm2 start n8n --name n8n-service

# Or use systemd (create service file)
sudo systemctl enable n8n
sudo systemctl start n8n
```

### Security

1. **Run as non-root user**:
   ```bash
   sudo useradd -m -s /bin/bash n8n-runner
   sudo su - n8n-runner
   ```

2. **Firewall rules** (if n8n UI is exposed):
   ```bash
   sudo ufw allow 5678/tcp  # n8n UI port
   sudo ufw enable
   ```

3. **SSH key-only access**:
   ```bash
   # Disable password auth in /etc/ssh/sshd_config
   PasswordAuthentication no
   ```

### Log Rotation

Set up log rotation for execution logs:

```bash
# Create logrotate config
sudo nano /etc/logrotate.d/n8n-executions

# Add:
/home/user/.n8n/logs/*.log {
    daily
    rotate 7
    compress
    missingok
    notifempty
}
```

---

## Migration from Stub to n8n CLI

### Gradual Rollout

1. **Start with test workflows**: Set `AUTOMATION_RUNNER_TYPE=n8n-cli` for non-critical workflows
2. **Monitor for 24-48 hours**: Check success rates, latency, errors
3. **Gradually enable more workflows**: Update workflow registry to use n8n-cli
4. **Keep stub as fallback**: Stub dispatcher remains available if needed

### Fallback Strategy

The dispatcher supports fallback:

```typescript
// In your workflow registry, mark workflows that should use n8n CLI
const workflowConfig = {
  "compliance-sync": {
    runner: "n8n-cli",
    fallback: "stub" // Use stub if n8n CLI fails
  }
};
```

---

## Troubleshooting

### Check Execution Status

Use the debug endpoint:

```bash
curl "http://localhost:3000/api/usha/workflows/debug/execution?executionId=exec_xxx"
```

### View n8n Logs

```bash
# n8n execution logs
tail -f ~/.n8n/logs/n8n.log

# Or if using PM2
pm2 logs n8n
```

### Test Workflow Execution

```bash
# Direct CLI test
n8n execute --id=YOUR_WORKFLOW_ID --input='{"leadId":"L-123"}'

# Check exit code
echo $?  # Should be 0 for success
```

---

## Next Steps

- [ ] Set up process monitoring (PM2/systemd)
- [ ] Configure log rotation
- [ ] Add alerting for execution failures
- [ ] Set up retry policies
- [ ] Implement rate limiting for manual triggers
- [ ] Add operator identity tracking

---

## Support

For issues or questions:
1. Check server logs for `[N8nCliDispatcher]` messages
2. Verify n8n CLI works manually on VPS
3. Check Airtable `Workflow_Executions` table for execution records
4. Use debug endpoint to verify execution status
