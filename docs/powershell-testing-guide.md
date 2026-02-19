# PowerShell Testing Guide for n8n CLI Runner

> **Why PowerShell?** On Windows, `curl` is an alias for `Invoke-WebRequest`, which doesn't support `-H` flags. Use PowerShell native commands instead.

---

## Quick PowerShell Commands

### Trigger Workflow

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

### Retry Failed Execution

```powershell
$uri = "http://localhost:3000/api/usha/workflows/compliance-sync/retry-runner"
$body = @{
    executionId = "exec_1700000000000"
    updatedBy = "operator"
} | ConvertTo-Json

$headers = @{ "Content-Type" = "application/json" }

Invoke-RestMethod -Method Post -Uri $uri -Headers $headers -Body $body
```

---

## One-Liner Versions

### Trigger (One Line)

```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/usha/workflows/compliance-sync/trigger-runner" -Headers @{"Content-Type"="application/json"} -Body (@{params=@{leadId="L-123";clientId="C-456"};updatedBy="operator"} | ConvertTo-Json)
```

### Retry (One Line)

```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/usha/workflows/compliance-sync/retry-runner" -Headers @{"Content-Type"="application/json"} -Body (@{executionId="exec_1700000000000";updatedBy="operator"} | ConvertTo-Json)
```

---

## Alternative: Use curl.exe

If you prefer Unix-style `curl`, use `curl.exe` (not `curl`):

```powershell
# Trigger
curl.exe -X POST "http://localhost:3000/api/usha/workflows/compliance-sync/trigger-runner" -H "Content-Type: application/json" -d "{\"params\":{\"leadId\":\"L-123\",\"clientId\":\"C-456\"},\"updatedBy\":\"operator\"}"

# Retry
curl.exe -X POST "http://localhost:3000/api/usha/workflows/compliance-sync/retry-runner" -H "Content-Type: application/json" -d "{\"executionId\":\"exec_1700000000000\",\"updatedBy\":\"operator\"}"
```

**Note:** You must escape quotes in JSON when using `curl.exe`.

---

## Viewing Responses

### Pretty Print JSON

```powershell
$response = Invoke-RestMethod -Method Post -Uri $uri -Headers $headers -Body $body
$response | ConvertTo-Json -Depth 10
```

### Check Status Code

```powershell
$response = Invoke-WebRequest -Method Post -Uri $uri -Headers $headers -Body $body
$response.StatusCode  # Should be 200
$response.Content     # Raw JSON string
```

---

## Common Issues

| Issue | Solution |
|-------|----------|
| `'-H' is not recognized` | Use `Invoke-RestMethod` or `curl.exe` instead of `curl` |
| `ConvertTo-Json` depth too shallow | Add `-Depth 10` to handle nested objects |
| JSON parsing errors | Use `ConvertTo-Json` with proper depth, or escape quotes for `curl.exe` |
| Connection refused | Check if server is running: `http://localhost:3000` |

---

## Testing Workflow

Save this as `test-trigger.ps1`:

```powershell
param(
    [string]$WorkflowId = "compliance-sync",
    [string]$LeadId = "L-123",
    [string]$ClientId = "C-456"
)

$uri = "http://localhost:3000/api/usha/workflows/$WorkflowId/trigger-runner"
$body = @{
    params = @{
        leadId = $LeadId
        clientId = $ClientId
    }
    updatedBy = "operator"
} | ConvertTo-Json -Depth 10

$headers = @{ "Content-Type" = "application/json" }

try {
    $response = Invoke-RestMethod -Method Post -Uri $uri -Headers $headers -Body $body
    Write-Host "✅ Success!" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    $_.Exception.Response | Format-List
}
```

**Usage:**
```powershell
.\test-trigger.ps1 -WorkflowId "compliance-sync" -LeadId "L-999" -ClientId "C-888"
```

---

## See Also

- Full documentation: `docs/n8n-cli-runner-reference.md`
- Setup guide: `docs/n8n-cli-vps-setup.md`
- Quick start: `docs/n8n-cli-quick-start.md`
