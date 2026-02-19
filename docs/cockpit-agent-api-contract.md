# Cockpit Agent API Contract

**Status:** Active  
**Version:** 1.0  
**Date:** 2025-01-02  
**Purpose:** Defines the interface between Next.js and Cockpit Agents

---

## Overview

This document defines the complete API contract for triggering Cockpit Agents from Next.js applications. The contract ensures consistent, reliable, and observable agent execution across the XOM3 ecosystem.

---

## 1. API Endpoint

### Endpoint Structure

```
POST /api/cockpit/agent/{agentId}/trigger
```

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `agentId` | string | Yes | Unique identifier for the agent. Format: `{type}-{identifier}` (e.g., `pipeline-123`, `workflow-abc`, `command-custom`) |

### Agent ID Format

Agent IDs follow a hierarchical naming convention:

- **Pipeline Agents:** `agent-{pipelineId}` (e.g., `agent-pipeline-123`)
- **Workflow Agents:** `workflow-{workflowId}` (e.g., `workflow-abc-456`)
- **Command Agents:** `command-{commandType}` (e.g., `command-generate`, `command-optimize`)
- **Sovereign Agents:** `sovereign-{domain}` (e.g., `sovereign-healthcare`, `sovereign-commerce`)
- **Custom Agents:** `custom-{identifier}` (e.g., `custom-script-789`)

---

## 2. Request Payload

### Headers

| Header | Type | Required | Description |
|--------|------|----------|-------------|
| `Content-Type` | string | Yes | Must be `application/json` |
| `x-hostname` | string | No | Tenant hostname for multi-tenant resolution |
| `x-request-id` | string | No | Unique request identifier for tracing |
| `x-user-id` | string | No | User ID of the requester |
| `x-tenant-id` | string | No | Tenant identifier (alternative to hostname) |

### Request Body

```typescript
interface AgentTriggerRequest {
  // Core execution parameters
  action: string;                    // Required: Action to execute (e.g., "execute", "schedule", "cancel")
  mode?: CommandMode;                // Optional: Command mode ("direct" | "contextual" | "ritual" | "state_driven" | "autonomous")
  
  // Execution context
  context?: {
    view?: CockpitView;               // Optional: Cockpit view context ("system" | "operations" | "executive" | "agent" | "ritual")
    state?: string;                   // Optional: Current system state
    ritual?: string;                  // Optional: Ritual ID if ritual mode
    signal?: string;                  // Optional: Signal ID that triggered this
    tenant?: string;                  // Optional: Tenant override
  };
  
  // Agent-specific payload
  payload?: Record<string, any>;     // Optional: Agent-specific parameters
  
  // Execution options
  options?: {
    timeout?: number;                 // Optional: Execution timeout in milliseconds (default: 30000)
    priority?: "low" | "medium" | "high" | "critical";  // Optional: Execution priority (default: "medium")
    retry?: RetryConfig;              // Optional: Retry configuration (see Retry Logic section)
    async?: boolean;                   // Optional: Execute asynchronously (default: false)
    waitForCompletion?: boolean;       // Optional: Wait for completion in async mode (default: true)
  };
  
  // Metadata
  metadata?: {
    source?: string;                  // Optional: Source of the trigger (e.g., "ui", "webhook", "scheduled")
    correlationId?: string;           // Optional: Correlation ID for distributed tracing
    tags?: string[];                   // Optional: Tags for categorization
  };
}
```

### Example Request

```json
{
  "action": "execute",
  "mode": "direct",
  "context": {
    "view": "agent",
    "tenant": "usha"
  },
  "payload": {
    "pipelineId": "pipeline-123",
    "data": {
      "rows": [...]
    }
  },
  "options": {
    "timeout": 60000,
    "priority": "high",
    "async": false,
    "retry": {
      "enabled": true,
      "maxAttempts": 3,
      "backoffStrategy": "exponential",
      "initialDelay": 1000
    }
  },
  "metadata": {
    "source": "ui",
    "correlationId": "req-abc-123",
    "tags": ["pipeline", "migration"]
  }
}
```

---

## 3. Response Format

### Success Response (200 OK)

```typescript
interface AgentTriggerResponse {
  success: true;
  execution: {
    executionId: string;               // Unique execution identifier
    agentId: string;                   // Agent that was triggered
    status: "completed" | "pending" | "running" | "scheduled";
    result?: any;                      // Execution result (if completed synchronously)
    startedAt: string;                 // ISO 8601 timestamp
    completedAt?: string;              // ISO 8601 timestamp (if completed)
    duration?: number;                 // Execution duration in milliseconds
  };
  agent: {
    id: string;
    name: string;
    type: string;
    status: "idle" | "active" | "busy" | "error";
    load: number;                     // 0-100
  };
  decisions?: CockpitDecision[];       // Decisions made during execution
  message: string;                    // Human-readable message
  timestamp: string;                   // ISO 8601 timestamp
}
```

### Async Response (202 Accepted)

When `options.async === true`:

```typescript
interface AgentTriggerAsyncResponse {
  success: true;
  execution: {
    executionId: string;
    agentId: string;
    status: "pending" | "running";
    startedAt: string;
    estimatedCompletion?: string;    // ISO 8601 timestamp
    statusUrl: string;                 // URL to check execution status
  };
  agent: {
    id: string;
    name: string;
    type: string;
    status: "active" | "busy";
  };
  message: string;
  timestamp: string;
}
```

### Example Success Response

```json
{
  "success": true,
  "execution": {
    "executionId": "exec-abc-123-xyz",
    "agentId": "agent-pipeline-123",
    "status": "completed",
    "result": {
      "rowsProcessed": 100,
      "rowsImported": 95,
      "rowsFailed": 5,
      "errors": []
    },
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
  "decisions": [
    {
      "id": "decision-123",
      "type": "optimization",
      "source": "agent",
      "target": "pipeline-123",
      "action": "execute_pipeline",
      "reason": "Pipeline execution completed successfully",
      "executed": true,
      "executedAt": "2025-01-02T10:00:05.234Z"
    }
  ],
  "message": "Agent execution completed successfully",
  "timestamp": "2025-01-02T10:00:05.234Z"
}
```

---

## 4. Error Codes

### Error Response Format

```typescript
interface AgentTriggerErrorResponse {
  success: false;
  error: {
    code: string;                      // Error code (see table below)
    message: string;                   // Human-readable error message
    details?: Record<string, any>;     // Additional error details
    executionId?: string;              // Execution ID if execution was started
    retryable: boolean;                // Whether the error is retryable
    retryAfter?: number;               // Seconds to wait before retry (if retryable)
  };
  agent?: {
    id: string;
    status: string;
  };
  timestamp: string;
}
```

### Error Codes

| Code | HTTP Status | Description | Retryable | Retry After |
|------|-------------|-------------|------------|-------------|
| `AGENT_NOT_FOUND` | 404 | Agent with the specified ID does not exist | No | - |
| `AGENT_DISABLED` | 403 | Agent is disabled and cannot be triggered | No | - |
| `AGENT_BUSY` | 429 | Agent is currently busy and cannot accept new requests | Yes | 5-60 seconds |
| `INVALID_ACTION` | 400 | The specified action is not valid for this agent | No | - |
| `INVALID_PAYLOAD` | 400 | Request payload is invalid or missing required fields | No | - |
| `INVALID_CONTEXT` | 400 | Context is invalid or missing required fields | No | - |
| `TIMEOUT` | 504 | Agent execution exceeded the timeout | Yes | Immediate |
| `EXECUTION_FAILED` | 500 | Agent execution failed | Yes | 1-5 seconds |
| `RATE_LIMITED` | 429 | Too many requests to this agent | Yes | 60 seconds |
| `TENANT_MISMATCH` | 403 | Agent does not belong to the specified tenant | No | - |
| `AUTHORIZATION_FAILED` | 403 | User does not have permission to trigger this agent | No | - |
| `DEPENDENCY_UNAVAILABLE` | 503 | Required dependency is unavailable | Yes | 10-30 seconds |
| `RESOURCE_EXHAUSTED` | 503 | System resources exhausted | Yes | 30-120 seconds |
| `INTERNAL_ERROR` | 500 | Internal server error | Yes | 5-10 seconds |

### Example Error Response

```json
{
  "success": false,
  "error": {
    "code": "AGENT_BUSY",
    "message": "Agent is currently busy processing another request",
    "details": {
      "currentLoad": 95,
      "activeTasks": 3,
      "estimatedWaitTime": 30
    },
    "retryable": true,
    "retryAfter": 30
  },
  "agent": {
    "id": "agent-pipeline-123",
    "status": "busy"
  },
  "timestamp": "2025-01-02T10:00:00.000Z"
}
```

---

## 5. Retry Logic

### Retry Configuration

```typescript
interface RetryConfig {
  enabled: boolean;                    // Whether retries are enabled
  maxAttempts: number;                 // Maximum number of retry attempts (default: 3)
  backoffStrategy: "fixed" | "exponential" | "linear";  // Backoff strategy
  initialDelay: number;                 // Initial delay in milliseconds (default: 1000)
  maxDelay?: number;                    // Maximum delay in milliseconds (default: 30000)
  multiplier?: number;                 // Multiplier for exponential/linear backoff (default: 2)
  retryableErrors?: string[];          // Specific error codes to retry (default: all retryable errors)
}
```

### Retry Behavior

1. **Retryable Errors:** Only errors with `retryable: true` are retried
2. **Backoff Strategies:**
   - **Fixed:** Constant delay between retries
   - **Exponential:** Delay doubles with each retry: `delay = initialDelay * (multiplier ^ attempt)`
   - **Linear:** Delay increases linearly: `delay = initialDelay * (1 + attempt * multiplier)`
3. **Max Delay:** All delays are capped at `maxDelay`
4. **Idempotency:** Requests should be idempotent. Use `x-request-id` header for idempotency

### Retry Example

```json
{
  "enabled": true,
  "maxAttempts": 3,
  "backoffStrategy": "exponential",
  "initialDelay": 1000,
  "maxDelay": 30000,
  "multiplier": 2,
  "retryableErrors": ["AGENT_BUSY", "TIMEOUT", "EXECUTION_FAILED"]
}
```

### Retry Flow

```
Request → Error (retryable) → Wait (backoff) → Retry
  ↓
Success or Max Attempts Reached
```

---

## 6. Logging Requirements

### Log Levels

| Level | When to Use |
|-------|-------------|
| `DEBUG` | Detailed execution information, payloads, intermediate states |
| `INFO` | Normal execution flow, agent state changes, successful completions |
| `WARN` | Recoverable errors, retries, degraded performance |
| `ERROR` | Execution failures, non-retryable errors, system errors |
| `FATAL` | Critical system failures, agent crashes |

### Required Log Fields

All logs must include:

```typescript
interface AgentLogEntry {
  timestamp: string;                   // ISO 8601 timestamp
  level: "DEBUG" | "INFO" | "WARN" | "ERROR" | "FATAL";
  agentId: string;                     // Agent identifier
  executionId?: string;                // Execution identifier (if available)
  requestId?: string;                  // Request identifier from header
  correlationId?: string;              // Correlation ID from metadata
  tenant?: string;                     // Tenant identifier
  userId?: string;                     // User identifier
  message: string;                     // Log message
  context?: {
    action?: string;                   // Action being executed
    mode?: string;                     // Command mode
    status?: string;                   // Agent/execution status
    duration?: number;                 // Execution duration
    error?: {
      code?: string;                   // Error code
      message?: string;                // Error message
      stack?: string;                  // Error stack trace
    };
    metrics?: {
      load?: number;                  // Agent load
      latency?: number;                // Request latency
      throughput?: number;            // Throughput
    };
  };
  metadata?: Record<string, any>;      // Additional metadata
}
```

### Logging Points

1. **Request Received:**
   - Level: `INFO`
   - Fields: `agentId`, `requestId`, `action`, `mode`, `tenant`, `userId`

2. **Execution Started:**
   - Level: `INFO`
   - Fields: `executionId`, `agentId`, `startedAt`

3. **Execution Progress:**
   - Level: `DEBUG`
   - Fields: `executionId`, `progress`, `currentStep`

4. **Execution Completed:**
   - Level: `INFO`
   - Fields: `executionId`, `status`, `duration`, `result`

5. **Execution Failed:**
   - Level: `ERROR`
   - Fields: `executionId`, `error.code`, `error.message`, `error.stack`, `retryable`

6. **Retry Attempt:**
   - Level: `WARN`
   - Fields: `executionId`, `attempt`, `retryAfter`, `error.code`

7. **Agent State Change:**
   - Level: `INFO`
   - Fields: `agentId`, `oldStatus`, `newStatus`, `reason`

8. **Rate Limiting:**
   - Level: `WARN`
   - Fields: `agentId`, `retryAfter`, `currentRate`

### Log Example

```json
{
  "timestamp": "2025-01-02T10:00:00.000Z",
  "level": "INFO",
  "agentId": "agent-pipeline-123",
  "executionId": "exec-abc-123-xyz",
  "requestId": "req-abc-123",
  "correlationId": "corr-xyz-789",
  "tenant": "usha",
  "userId": "user-456",
  "message": "Agent execution started",
  "context": {
    "action": "execute",
    "mode": "direct",
    "status": "running",
    "metrics": {
      "load": 45,
      "latency": 120
    }
  },
  "metadata": {
    "source": "ui",
    "tags": ["pipeline", "migration"]
  }
}
```

### Log Storage

- **Structured Logs:** All logs stored in structured format (JSON)
- **Retention:** Logs retained for 30 days (configurable)
- **Search:** Logs searchable by `agentId`, `executionId`, `requestId`, `correlationId`, `tenant`, `timestamp`
- **Aggregation:** Metrics aggregated for dashboards and alerts

---

## 7. Status Endpoint

For async executions, use the status endpoint to check execution status:

```
GET /api/cockpit/agent/{agentId}/execution/{executionId}
```

### Response

```typescript
interface ExecutionStatusResponse {
  executionId: string;
  agentId: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  progress?: number;                  // 0-100
  result?: any;                       // Result if completed
  error?: {
    code: string;
    message: string;
  };
  startedAt: string;
  completedAt?: string;
  duration?: number;
  estimatedCompletion?: string;
}
```

---

## 8. Implementation Notes

### Idempotency

- Use `x-request-id` header to ensure idempotency
- Same `x-request-id` with same payload returns same result
- Idempotency window: 24 hours

### Rate Limiting

- Per-agent rate limits: 100 requests/minute (configurable)
- Per-tenant rate limits: 1000 requests/minute (configurable)
- Rate limit headers:
  - `X-RateLimit-Limit`: Total requests allowed
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Time when limit resets (Unix timestamp)

### Timeout Handling

- Default timeout: 30 seconds
- Configurable via `options.timeout`
- Maximum timeout: 5 minutes
- Timeout errors are retryable

### Security

- All requests require authentication
- Tenant isolation enforced
- Agent access controlled by role-based permissions
- Request validation on all inputs

---

## 9. Example Usage

### TypeScript Client Example

```typescript
async function triggerAgent(
  agentId: string,
  action: string,
  payload?: Record<string, any>
): Promise<AgentTriggerResponse> {
  const response = await fetch(`/api/cockpit/agent/${agentId}/trigger`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-request-id': generateRequestId(),
      'x-tenant-id': getTenantId(),
    },
    body: JSON.stringify({
      action,
      mode: 'direct',
      payload,
      options: {
        timeout: 60000,
        priority: 'high',
        retry: {
          enabled: true,
          maxAttempts: 3,
          backoffStrategy: 'exponential',
          initialDelay: 1000,
        },
      },
      metadata: {
        source: 'ui',
        correlationId: generateCorrelationId(),
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new AgentError(error.error);
  }

  return await response.json();
}
```

### Error Handling Example

```typescript
async function triggerWithRetry(
  agentId: string,
  action: string,
  payload?: Record<string, any>
): Promise<AgentTriggerResponse> {
  let lastError: AgentTriggerErrorResponse | null = null;
  let attempt = 0;
  const maxAttempts = 3;

  while (attempt < maxAttempts) {
    try {
      return await triggerAgent(agentId, action, payload);
    } catch (error) {
      lastError = error;
      
      if (!error.retryable || attempt >= maxAttempts - 1) {
        throw error;
      }

      const delay = calculateBackoff(attempt, error.retryAfter);
      await sleep(delay);
      attempt++;
    }
  }

  throw lastError;
}
```

---

## 10. Versioning

- API version: `v1`
- Version header: `X-API-Version: v1` (optional)
- Breaking changes require version increment
- Deprecated endpoints marked with `X-Deprecated: true` header

---

## 11. Testing

### Test Scenarios

1. **Happy Path:** Successful agent execution
2. **Error Handling:** All error codes tested
3. **Retry Logic:** Retry behavior verified
4. **Timeout:** Timeout handling verified
5. **Rate Limiting:** Rate limit enforcement verified
6. **Idempotency:** Idempotency verified
7. **Async Execution:** Async execution flow verified
8. **Logging:** All logging points verified

---

**Status:** Active  
**Version:** 1.0  
**Last Updated:** 2025-01-02
