# Automation Engine Setup Guide

The cockpit now has a **sovereign automation dispatcher** that can route workflow triggers to various engines (n8n, VPS, custom runners).

## ✅ Architecture

### Automation Dispatcher
Central interface (`lib/automation/dispatcher.ts`) that routes workflow triggers to:
- **Stub** (default) - Simulates execution for testing
- **n8n REST** - Triggers via n8n webhook API
- **n8n CLI** - Triggers via n8n command-line interface
- **VPS** - Triggers via custom VPS runner endpoint

### Workflow Registry
Catalog of available workflows (`lib/automation/registry.ts`):
- Defines workflows even if not yet implemented
- Stores in Airtable `Automation_Registry` table (or file-based fallback)
- Includes runner type, endpoints, parameters, control state

## ✅ Configuration

### Environment Variables

Add to `.env.local`:

```bash
# Automation Runner Type
AUTOMATION_RUNNER_TYPE=stub  # Options: stub, n8n-rest, n8n-cli, vps

# n8n REST API (if using n8n-rest)
N8N_BASE_URL=http://localhost:5678

# n8n CLI (if using n8n-cli)
N8N_CLI_PATH=n8n

# VPS Runner (if using vps)
VPS_AUTOMATION_ENDPOINT=https://your-vps.com/api/automation
```

### Runner Types

#### 1. Stub (Default)
Simulates workflow execution with 80% success rate. Perfect for:
- Testing the cockpit UI
- Development without real automation
- Demonstrating the orchestration layer

**No configuration needed** - works out of the box.

#### 2. n8n REST API
Triggers workflows via n8n webhook endpoints.

**Setup:**
1. Ensure n8n is running and accessible
2. Create webhook workflows in n8n
3. Set `AUTOMATION_RUNNER_TYPE=n8n-rest`
4. Set `N8N_BASE_URL` to your n8n instance

**Workflow naming:**
- Workflow ID in cockpit should match n8n webhook path
- Example: `compliance-sync` → `POST /webhook/compliance-sync`

#### 3. n8n CLI
Triggers workflows via n8n command-line interface.

**Setup:**
1. Install n8n CLI globally or provide path
2. Set `AUTOMATION_RUNNER_TYPE=n8n-cli`
3. Set `N8N_CLI_PATH` if n8n is not in PATH

**Note:** This requires n8n CLI to be installed and configured.

#### 4. VPS Custom Runner
Triggers workflows via custom VPS endpoint.

**Setup:**
1. Deploy your VPS automation runner
2. Set `AUTOMATION_RUNNER_TYPE=vps`
3. Set `VPS_AUTOMATION_ENDPOINT` to your runner URL

**Expected endpoint format:**
```
POST {VPS_AUTOMATION_ENDPOINT}/trigger/{workflowId}
Body: { parameters }
Response: { status, executionId, duration, ... }
```

## ✅ Workflow Registry

### Default Workflows

The cockpit comes with three default workflows:

1. **compliance-sync** - Sync client compliance data
2. **data-import** - Pull external data into cockpit
3. **report-generator** - Generate compliance reports (paused by default)

### Adding Workflows

#### Option A: Airtable Table

Create `Automation_Registry` table with fields:
- `workflowId` (text)
- `name` (text)
- `description` (text)
- `controlState` (single select: Active, Paused, Disabled)
- `runnerType` (single select: stub, n8n-rest, n8n-cli, vps, custom)
- `endpointOrCommand` (text, optional)
- `status` (single select: live, stub, paused)
- `parameters` (JSON, optional)
- `createdAt` (date)
- `updatedAt` (date)

#### Option B: File-Based

Edit `data/workflow-registry.json`:

```json
[
  {
    "workflowId": "my-workflow",
    "name": "My Workflow",
    "description": "Does something useful",
    "controlState": "active",
    "runnerType": "stub",
    "status": "stub",
    "parameters": {
      "leadId": true,
      "clientId": true
    },
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  }
]
```

## ✅ Testing

### Test Stub Runner

1. Ensure `AUTOMATION_RUNNER_TYPE=stub` (or leave unset)
2. Visit `/app/healthcare/workflows/[executionId]`
3. Click "Run Now" button
4. Execution will be simulated (80% success rate)

### Test n8n Integration

1. Set `AUTOMATION_RUNNER_TYPE=n8n-rest`
2. Set `N8N_BASE_URL` to your n8n instance
3. Create a webhook workflow in n8n
4. Trigger from cockpit - should call n8n webhook

### Test VPS Integration

1. Set `AUTOMATION_RUNNER_TYPE=vps`
2. Set `VPS_AUTOMATION_ENDPOINT` to your runner
3. Ensure your VPS endpoint accepts `POST /trigger/{workflowId}`
4. Trigger from cockpit - should call VPS endpoint

## ✅ Execution Logging

All executions are logged to `Workflow_Executions` table with:
- `Execution_ID` - Unique execution identifier
- `Workflow_Name` - Workflow that ran
- `Status` - Success, Failed, or Running
- `Triggered_At` - When execution started
- `Completed_At` - When execution finished
- `Duration` - Execution time in seconds
- `Run_Type` - Manual, Retry, or Auto
- `Trigger_Type` - manual, retry, or auto
- `Automation_Source` - Cockpit
- `Inputs` - Parameters passed to workflow
- `Error_Message` - Error details if failed

## ✅ Next Steps

Once automation dispatcher is working:

1. **Build real workflows** in n8n or VPS
2. **Update workflow registry** with real endpoints
3. **Switch runner type** from `stub` to `n8n-rest` or `vps`
4. **Test end-to-end** - cockpit → dispatcher → workflow → execution log

The cockpit is now a **sovereign automation command center** ready to orchestrate real workflows.
