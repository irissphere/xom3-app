# n8n CLI Runner - Quick Reference

## 🚀 Environment Variables

Add these to your `.env` file:

```bash
# Runner Configuration
AUTOMATION_RUNNER_TYPE=n8n-cli

# n8n CLI Command (use "n8n" for global, "npx n8n" for npx)
N8N_CMD=n8n

# Execution Timeout (milliseconds, default: 300000 = 5 minutes)
N8N_RUN_TIMEOUT_MS=300000

# Optional: Log file path for full execution logs
N8N_RUN_LOG_PATH=/var/log/cockpit/n8n_runs.log

# Optional: n8n user folder (if not using default ~/.n8n)
N8N_USER_FOLDER=/home/user/.n8n

# Optional: n8n encryption key (if using encrypted credentials)
N8N_ENCRYPTION_KEY=your-encryption-key-here
```

---

## 📋 VPS Setup Checklist

### One-Time Setup

- [ ] **Install n8n on VPS**
  ```bash
  ssh user@your-vps-ip
  npm install -g n8n
  n8n --version  # Verify installation
  ```

- [ ] **Import workflows**
  ```bash
  n8n import:workflow --input=/path/to/workflow.json
  n8n list:workflow  # Get workflow IDs
  ```

- [ ] **Set up log directory** (if using N8N_RUN_LOG_PATH)
  ```bash
  sudo mkdir -p /var/log/cockpit
  sudo chown $USER:$USER /var/log/cockpit
  ```

- [ ] **Configure process supervision** (PM2 or systemd)
  ```bash
  # PM2 example
  npm install -g pm2
  pm2 start n8n --name n8n-service
  
  # Or systemd (create service file)
  sudo systemctl enable n8n
  sudo systemctl start n8n
  ```

---

## 🧪 Testing Commands

### Manual CLI Test

**On VPS (Linux/WSL):**
```bash
# Test n8n CLI directly on VPS
n8n execute --id=YOUR_WORKFLOW_ID --input='{"leadId":"L-123","clientId":"C-456"}'

# Check exit code
echo $?  # Should be 0 for success
```

**PowerShell (Windows):**
```powershell
# Test n8n CLI (if installed on Windows)
n8n execute --id=YOUR_WORKFLOW_ID --input='{"leadId":"L-123","clientId":"C-456"}'

# Check exit code
$LASTEXITCODE  # Should be 0 for success
```

### Trigger via API

#### PowerShell (Windows - Recommended)

**Trigger Workflow:**
```powershell
$uri = "http://localhost:3000/api/usha/workflows/compliance-sync/trigger-runner"
$body = @{
    params = @{
        leadId = "L-123"
        clientId = "C-456"
        custom = @{ test = "value" }
    }
    updatedBy = "operator"
} | ConvertTo-Json -Depth 10
$headers = @{ "Content-Type" = "application/json" }

Invoke-RestMethod -Method Post -Uri $uri -Headers $headers -Body $body
```

**Retry Failed Execution:**
```powershell
$uri = "http://localhost:3000/api/usha/workflows/compliance-sync/retry-runner"
$body = @{
    executionId = "exec_1700000000000"
    updatedBy = "operator"
} | ConvertTo-Json
$headers = @{ "Content-Type" = "application/json" }

Invoke-RestMethod -Method Post -Uri $uri -Headers $headers -Body $body
```

#### Unix curl (Git Bash / WSL / Linux / macOS)

**Trigger Workflow:**
```bash
curl -X POST "http://localhost:3000/api/usha/workflows/compliance-sync/trigger-runner" \
  -H "Content-Type: application/json" \
  -d '{
    "params": {
      "leadId": "L-123",
      "clientId": "C-456",
      "custom": {"test": "value"}
    },
    "updatedBy": "operator"
  }'
```

**Retry Failed Execution:**
```bash
curl -X POST "http://localhost:3000/api/usha/workflows/compliance-sync/retry-runner" \
  -H "Content-Type: application/json" \
  -d '{
    "executionId": "exec_1700000000000",
    "updatedBy": "operator"
  }'
```

#### Windows CMD (Alternative)

**Trigger Workflow:**
```cmd
curl.exe -X POST "http://localhost:3000/api/usha/workflows/compliance-sync/trigger-runner" -H "Content-Type: application/json" -d "{\"params\":{\"leadId\":\"L-123\",\"clientId\":\"C-456\"},\"updatedBy\":\"operator\"}"
```

**Retry Failed Execution:**
```cmd
curl.exe -X POST "http://localhost:3000/api/usha/workflows/compliance-sync/retry-runner" -H "Content-Type: application/json" -d "{\"executionId\":\"exec_1700000000000\",\"updatedBy\":\"operator\"}"
```

**Note:** Use `curl.exe` (not `curl`) in CMD to avoid PowerShell alias issues.

### Expected Responses

**Success Response (Trigger):**
```json
{
  "status": "ok",
  "message": "Workflow triggered successfully",
  "workflowId": "compliance-sync",
  "workflowName": "compliance-sync",
  "executionId": "exec_1700000000000_abc123",
  "triggeredAt": "2025-01-17T12:00:00.000Z",
  "triggerType": "manual"
}
```

**Success Response (Retry):**
```json
{
  "status": "ok",
  "message": "Workflow retry triggered successfully",
  "workflowId": "compliance-sync",
  "workflowName": "compliance-sync",
  "originalExecutionId": "exec_1700000000000",
  "newExecutionId": "exec_1700000001000_xyz789",
  "triggeredAt": "2025-01-17T12:00:01.000Z",
  "triggerType": "retry"
}
```

---

## 🔍 Verification Steps

### 1. Check Server Logs

Look for these log messages:

```
[Runner] Executing: n8n execute --id=compliance-sync --input={...}
[Runner] Workflow ID: compliance-sync, Timeout: 300000ms
[Runner] Execution completed: exitCode=0, duration=2345ms, timedOut=false
[Executions] Created execution record: exec_xxx (Airtable ID: recXXX)
[Workflow Trigger] Execution completed: exec_xxx (success)
```

### 2. Verify Airtable Record

Check `Workflow_Executions` table:
- `Execution_ID` matches the returned executionId
- `Status` is "Success" or "Failed"
- `Execution_Logs` contains stdout/stderr JSON
- `Duration` is populated (in seconds)

### 3. Check Slack Notification

Look for message in `#automation-alerts`:
- ✅ Success: "Workflow Triggered: *workflow-name* — Execution ID: `exec_xxx`"
- ❌ Failure: "Workflow Failed: *workflow-name* — Execution ID: `exec_xxx`"

### 4. Inspect Log File (if configured)

```bash
# View recent executions
tail -n 100 /var/log/cockpit/n8n_runs.log

# Search for specific execution
grep "exec_1700000000000" /var/log/cockpit/n8n_runs.log
```

---

## 🛠️ Troubleshooting

| Issue | Solution |
|-------|----------|
| `n8n: command not found` | Install: `npm install -g n8n` or set `N8N_CMD=npx n8n` |
| `Workflow not found` | Verify ID: `n8n list:workflow` |
| `Permission denied` (log file) | `chmod -R 755 /var/log/cockpit` or change `N8N_RUN_LOG_PATH` |
| `Execution timeout` | Increase `N8N_RUN_TIMEOUT_MS` for long-running workflows |
| `Exit code: 1` | Check stderr in Airtable `Execution_Logs` field |
| No Airtable record | Check server logs for Airtable write errors |

---

## 📊 Operational Checklist

### After Wiring CLI Runner

- [ ] **Verify N8N_CMD resolves**
  ```bash
  # On VPS, as the user that runs Node app
  which n8n  # Should show path
  n8n --version  # Should show version
  ```

- [ ] **Run 5 low-risk triggers**
  - Use test workflows first
  - Verify `Workflow_Executions` rows update
  - Confirm Slack messages show execution IDs

- [ ] **Inspect log file**
  - Check `N8N_RUN_LOG_PATH` for full stdout/stderr
  - Verify logs are being written
  - Check disk usage

- [ ] **Monitor execution metrics**
  - Success rate should be > 80%
  - Average duration should be reasonable
  - No timeout errors for normal workflows

- [ ] **Set up alerts**
  - Alert on runner failures (exit code != 0)
  - Alert on timeouts
  - Alert on disk usage (log rotation)

---

## 🔐 Security Notes

- **Run as non-root user**: Create dedicated user for n8n execution
- **Secrets management**: Keep API keys in environment variables, not in code
- **Log rotation**: Set up logrotate to prevent disk fill
- **Firewall**: Only expose necessary ports (n8n UI if needed)
- **SSH keys**: Disable password auth, use SSH keys only

---

## 📈 Monitoring

### Key Metrics to Track

- **Execution success rate**: Should be > 95% for stable workflows
- **Average duration**: Track per workflow to detect slowdowns
- **Timeout rate**: Should be < 1% for normal workflows
- **Log file size**: Monitor disk usage, rotate logs regularly

### Alert Thresholds

- Success rate drops below 90%
- Average duration increases by > 50%
- Timeout rate > 5%
- Log file > 1GB

---

## 🚦 Migration Path

1. **Test with one workflow**: Set `AUTOMATION_RUNNER_TYPE=n8n-cli` and test
2. **Monitor for 24-48 hours**: Check success rates, latency, errors
3. **Gradually enable more workflows**: Update workflow registry
4. **Keep stub as fallback**: Stub dispatcher remains available

---

## 📚 Related Documentation

- Full setup guide: `docs/n8n-cli-vps-setup.md`
- Quick start: `docs/n8n-cli-quick-start.md`
- Runner code: `lib/automation/runner.ts`
- Execution helpers: `lib/workflows/executions.ts`
