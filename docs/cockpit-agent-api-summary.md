# Cockpit Agent API - Quick Reference

**Status:** Active  
**Version:** 1.0  
**Date:** 2025-01-02

---

## Quick Start

### Endpoint

```
POST /api/cockpit/agent/{agentId}/trigger
```

### Minimal Request

```json
{
  "action": "execute"
}
```

### Minimal Response

```json
{
  "success": true,
  "execution": {
    "executionId": "exec-abc-123",
    "agentId": "agent-pipeline-123",
    "status": "completed",
    "startedAt": "2025-01-02T10:00:00.000Z",
    "completedAt": "2025-01-02T10:00:05.234Z",
    "duration": 5234
  },
  "agent": {
    "id": "agent-pipeline-123",
    "name": "Pipeline Agent 123",
    "type": "pipeline",
    "status": "active",
    "load": 45
  },
  "message": "Agent execution completed successfully",
  "timestamp": "2025-01-02T10:00:05.234Z"
}
```

---

## Agent ID Format

- **Pipeline Agents:** `agent-{pipelineId}`
- **Workflow Agents:** `workflow-{workflowId}`
- **Command Agents:** `command-{commandType}`
- **Sovereign Agents:** `sovereign-{domain}`
- **Custom Agents:** `custom-{identifier}`

---

## Common Error Codes

| Code | HTTP | Retryable | Description |
|------|------|-----------|-------------|
| `AGENT_NOT_FOUND` | 404 | No | Agent doesn't exist |
| `AGENT_BUSY` | 429 | Yes | Agent is busy (retry after 30s) |
| `EXECUTION_FAILED` | 500 | Yes | Execution failed (retry after 5s) |
| `TIMEOUT` | 504 | Yes | Execution timeout (retry immediately) |
| `RATE_LIMITED` | 429 | Yes | Too many requests (retry after 60s) |

---

## Retry Configuration

```json
{
  "options": {
    "retry": {
      "enabled": true,
      "maxAttempts": 3,
      "backoffStrategy": "exponential",
      "initialDelay": 1000
    }
  }
}
```

**Backoff Strategies:**
- `fixed`: Constant delay
- `exponential`: Delay doubles each retry
- `linear`: Delay increases linearly

---

## TypeScript Usage

```typescript
import { agentAPIClient } from "@/lib/cockpit/agent-api-client";

// Simple trigger
const response = await agentAPIClient.triggerAgent("agent-pipeline-123", {
  action: "execute",
  payload: { data: [...] }
});

// With retry
const response = await agentAPIClient.triggerAgentWithRetry(
  "agent-pipeline-123",
  {
    action: "execute",
    options: {
      retry: {
        enabled: true,
        maxAttempts: 3,
        backoffStrategy: "exponential"
      }
    }
  }
);

// Async execution
const asyncResponse = await agentAPIClient.triggerAgent(
  "agent-pipeline-123",
  {
    action: "execute",
    options: { async: true }
  }
);

// Check status
const status = await agentAPIClient.getExecutionStatus(
  "agent-pipeline-123",
  asyncResponse.execution.executionId
);
```

---

## Required Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Content-Type` | Yes | Must be `application/json` |
| `x-request-id` | No | Request ID for idempotency |
| `x-hostname` | No | Tenant hostname |
| `x-tenant-id` | No | Tenant ID |

---

## Status Endpoint

```
GET /api/cockpit/agent/{agentId}/execution/{executionId}
```

Returns execution status for async operations.

---

## Full Documentation

See [cockpit-agent-api-contract.md](./cockpit-agent-api-contract.md) for complete specification.

---

**Last Updated:** 2025-01-02
