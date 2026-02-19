# Supervisor Agent - Vieron Cockpit

**Status:** ✅ **ACTIVE**  
**Purpose:** Monitor all agents, track workflow health, detect failures, restart failed agents, log anomalies, send Slack alerts, maintain global state, enforce governance rules

---

## Overview

The Supervisor Agent is the central monitoring and orchestration system for the Vieron Cockpit. It continuously monitors all agents and workflows, detects failures, automatically restarts failed agents, logs anomalies, sends alerts, and enforces governance rules.

---

## Architecture

### Core Components

1. **Monitoring Engine** (`monitoring.ts`)
   - Continuous monitoring loop (default: 30 seconds)
   - Agent health tracking
   - Workflow health tracking
   - Failure detection
   - Heartbeat monitoring

2. **Lane Registry** (`registry.ts`)
   - Maintains registry of all lanes
   - Maps agents to lanes
   - Maps workflows to lanes
   - Tracks lane health

3. **Restart Manager** (`restart.ts`)
   - Soft restart (reset state)
   - Hard restart (reinitialize)
   - Full restart (complete reinitialization)
   - Restart cooldown management

4. **Notification Manager** (`notifications.ts`)
   - Slack alert formatting
   - Alert storm detection
   - Alert suppression
   - Multi-channel notifications

5. **Governance Engine** (`governance.ts`)
   - Rule enforcement
   - Violation detection
   - Automatic actions
   - Compliance tracking

6. **Escalation Manager** (`escalation.ts`)
   - Failure escalation rules
   - Escalation levels: none → operator → steward → emergency
   - Time-based escalation

7. **Anomaly Detector** (`anomaly-detection.ts`)
   - Latency spike detection
   - Success rate drop detection
   - Error rate spike detection
   - Execution pattern anomalies

---

## Monitoring Loop

The Supervisor Agent runs a continuous monitoring loop that:

1. **Checks Agent Health** (every 30 seconds)
   - Verifies heartbeat (must be within 60 seconds)
   - Checks success rate (must be above 80%)
   - Checks error rate (must be below 10%)
   - Checks consecutive failures (must be below 3)

2. **Checks Workflow Health** (every 30 seconds)
   - Verifies execution frequency
   - Checks error rate
   - Checks failure rate

3. **Updates Lane Health** (every 30 seconds)
   - Aggregates agent health in lane
   - Aggregates workflow health in lane
   - Updates lane status

4. **Detects Anomalies** (every 30 seconds)
   - Latency spikes
   - Success rate drops
   - Error rate spikes
   - Execution pattern changes

5. **Checks Governance** (every 30 seconds)
   - Validates all agents against governance rules
   - Records violations
   - Triggers actions

6. **Checks Escalation** (every minute)
   - Evaluates failures for escalation
   - Escalates based on rules
   - Sends escalation alerts

---

## Failure Detection

### Failure Types

1. **Heartbeat Missed**
   - Agent hasn't sent heartbeat in 60 seconds
   - Severity: High
   - Action: Record failure, send alert

2. **Low Success Rate**
   - Success rate below 50% (with >10 executions)
   - Severity: Medium
   - Action: Record failure, send alert

3. **High Error Rate**
   - Error rate above 20% (with >10 executions)
   - Severity: Medium
   - Action: Record failure, send alert

4. **Consecutive Failures**
   - 3+ consecutive failures
   - Severity: Critical
   - Action: Record failure, trigger restart, send alert

### Failure Resolution

Failures are automatically resolved when:
- Agent sends successful heartbeat
- Agent execution succeeds
- Agent health metrics return to normal

---

## Agent Restart

### Restart Types

1. **Soft Restart**
   - Resets consecutive failures
   - Resets error rate
   - Updates heartbeat
   - Wait: 1 second

2. **Hard Restart**
   - Performs soft restart
   - Resets all metrics
   - Wait: 2 seconds

3. **Full Restart**
   - Performs hard restart
   - Resets all state
   - Wait: 3 seconds

### Restart Process

1. Check cooldown period
2. Create restart action
3. Emit restart signal
4. Perform restart based on type
5. Update agent health
6. Mark restart as completed
7. Emit success signal

### Restart Limits

- **Max Attempts:** 3 (configurable)
- **Cooldown:** 1 minute between attempts
- **Failure:** Escalates to operator after max attempts

---

## Notifications

### Alert Types

1. **Failure Alert**
   - Agent failure detected
   - Includes failure type, severity, error

2. **Anomaly Alert**
   - Anomaly detected in agent behavior
   - Includes anomaly type, metrics, threshold

3. **Governance Violation Alert**
   - Governance rule violated
   - Includes rule name, violation details

4. **Escalation Alert**
   - Failure escalated to higher level
   - Includes escalation level, failure details

5. **Restart Alert**
   - Agent restart initiated
   - Includes restart type, attempt number

6. **Health Degraded Alert**
   - Agent health degraded
   - Includes health metrics, degradation reason

### Alert Channels

- **Slack:** All alerts
- **Email:** Critical alerts and escalations
- **Webhook:** Configurable per tenant

### Alert Storm Detection

- **Threshold:** 10 alerts per minute
- **Action:** Suppress additional alerts, send storm detection signal

---

## Lane Registry

### Lane Structure

Each lane contains:
- **Lane ID:** Unique identifier
- **Lane Name:** Human-readable name
- **Agents:** Array of agent IDs
- **Workflows:** Array of workflow IDs
- **Status:** healthy | degraded | failed | offline
- **Health:** 0-100 score
- **Metadata:** Priority, dependencies, governance rules

### Default Lanes

1. **Lane 1: Social Automation**
   - Priority: 5
   - Rules: min_success_rate, max_error_rate

2. **Lane 2: CRM & Onboarding**
   - Priority: 8
   - Rules: min_success_rate, max_error_rate, max_latency

3. **Lane 3: Billing & Monetization**
   - Priority: 10 (highest)
   - Rules: min_success_rate, max_error_rate, max_latency, heartbeat_required

4. **Lane 4: Monitoring & Audit**
   - Priority: 9
   - Rules: min_success_rate, max_error_rate, heartbeat_required

5. **Lane 5: Content & Automation**
   - Priority: 6
   - Rules: min_success_rate, max_error_rate

---

## Governance Rules

### Rule 1: Minimum Success Rate
- **Condition:** Success rate < 80% (with >10 executions)
- **Severity:** High
- **Action:** Send alert

### Rule 2: Maximum Error Rate
- **Condition:** Error rate > 10% (with >10 executions)
- **Severity:** High
- **Action:** Send alert

### Rule 3: Maximum Latency
- **Condition:** Average latency > 5 seconds (with >10 executions)
- **Severity:** Medium
- **Action:** Send alert

### Rule 4: Maximum Consecutive Failures
- **Condition:** Consecutive failures > 3
- **Severity:** Critical
- **Action:** Send alert, escalate

### Rule 5: Heartbeat Required
- **Condition:** No heartbeat in 60 seconds
- **Severity:** High
- **Action:** Send alert

---

## Escalation Levels

1. **None**
   - No escalation needed
   - Handled automatically

2. **Operator**
   - Requires operator attention
   - Critical failures, high severity violations
   - Escalates after 5 minutes

3. **Steward**
   - Requires steward (Preston Chenault) attention
   - Multiple restart failures
   - Escalates after 10 minutes

4. **Emergency**
   - System-wide critical failure
   - Multiple critical failures
   - Escalates after 15 minutes

---

## Global State

The Supervisor Agent maintains global state:

```typescript
{
  timestamp: number;
  totalAgents: number;
  healthyAgents: number;
  failedAgents: number;
  degradedAgents: number;
  totalWorkflows: number;
  activeWorkflows: number;
  failedWorkflows: number;
  lanes: LaneRegistry[];
  recentFailures: AgentFailure[];
  activeAnomalies: Anomaly[];
  systemHealth: number; // 0-100
  governanceViolations: GovernanceViolation[];
}
```

---

## API Endpoints

### GET /api/cockpit/supervisor
Get supervisor status and global state

### POST /api/cockpit/supervisor
Initialize, start, or stop supervisor
```json
{
  "action": "initialize" | "start" | "stop",
  "config": { ... } // Required for initialize
}
```

### GET /api/cockpit/supervisor/agent
Get agent health (all or by agentId)

### POST /api/cockpit/supervisor/agent
Register agent, record heartbeat, or record execution
```json
{
  "action": "register" | "heartbeat" | "execution",
  "agentId": "agent-123",
  "health": { ... }, // Required for register
  "success": true,
  "latency": 100,
  "error": "error message"
}
```

### GET /api/cockpit/supervisor/workflow
Get workflow health (all or by workflowId)

### POST /api/cockpit/supervisor/workflow
Register workflow or record execution
```json
{
  "action": "register" | "execution",
  "workflowId": "workflow-123",
  "health": { ... }, // Required for register
  "success": true,
  "duration": 5000,
  "error": "error message"
}
```

### POST /api/cockpit/supervisor/restart
Restart an agent
```json
{
  "agentId": "agent-123",
  "restartType": "soft" | "hard" | "full"
}
```

---

## Usage

### Initialize Supervisor

```typescript
import { supervisorAgent, defaultSupervisorConfig } from "@/lib/cockpit/supervisor-agent";

// Initialize with default config
supervisorAgent.initialize(defaultSupervisorConfig);

// Start monitoring
supervisorAgent.start();
```

### Register Agent

```typescript
const agentHealth: AgentHealth = {
  agentId: "agent-123",
  agentName: "Social Posting Agent",
  agentType: "workflow",
  status: "healthy",
  health: 100,
  lastHeartbeat: Date.now(),
  consecutiveFailures: 0,
  totalExecutions: 0,
  successRate: 100,
  averageLatency: 0,
  errorRate: 0,
  metadata: {}
};

supervisorAgent.registerAgent(agentHealth, "lane1-social");
```

### Record Execution

```typescript
// Record successful execution
supervisorAgent.recordAgentExecution("agent-123", true, 150);

// Record failed execution
supervisorAgent.recordAgentExecution("agent-123", false, 5000, "Connection timeout");
```

### Get Global State

```typescript
const state = supervisorAgent.getGlobalState();
console.log(`System Health: ${state?.systemHealth}%`);
console.log(`Healthy Agents: ${state?.healthyAgents}/${state?.totalAgents}`);
```

---

## Configuration

### Default Configuration

```typescript
{
  monitoringInterval: 30000, // 30 seconds
  heartbeatTimeout: 60000, // 60 seconds
  failureThreshold: 3, // 3 consecutive failures
  restartCooldown: 60000, // 1 minute
  maxRestartAttempts: 3,
  anomalyDetectionEnabled: true,
  governanceEnforcementEnabled: true,
  slackAlertsEnabled: true,
  escalationEnabled: true,
  lanes: [ ... ] // 5 default lanes
}
```

### Custom Configuration

```typescript
import { createSupervisorConfig } from "@/lib/cockpit/supervisor-agent/config";

const customConfig = createSupervisorConfig({
  monitoringInterval: 15000, // 15 seconds
  maxRestartAttempts: 5,
  lanes: [
    {
      laneId: "custom-lane",
      laneName: "Custom Lane",
      agents: ["agent-1", "agent-2"],
      workflows: ["workflow-1"],
      priority: 7,
      governanceRules: ["min_success_rate"]
    }
  ]
});

supervisorAgent.initialize(customConfig);
```

---

## Integration

### With UOI Signals

The Supervisor Agent emits signals to UOI:
- `monitoring_cycle` - Monitoring cycle completed
- `agent_failure` - Agent failure detected
- `agent_restart` - Agent restart initiated
- `agent_restart_success` - Agent restart succeeded
- `agent_restart_failure` - Agent restart failed
- `governance_violation` - Governance rule violated
- `failure_escalated` - Failure escalated
- `alert_sent` - Alert sent
- `alert_failed` - Alert failed
- `global_state_update` - Global state updated

### With Notification System

The Supervisor Agent uses the notification system:
- Sends Slack alerts via `sendNotification()`
- Detects alert storms
- Suppresses duplicate alerts
- Supports multi-channel notifications

---

## Best Practices

1. **Register Agents Early**
   - Register agents when they start
   - Include all metadata

2. **Send Heartbeats Regularly**
   - Send heartbeat every 30 seconds
   - Use execution recording for heartbeats

3. **Record All Executions**
   - Record both successes and failures
   - Include latency and error details

4. **Monitor Global State**
   - Check global state regularly
   - React to system health changes

5. **Handle Escalations**
   - Respond to escalation alerts
   - Review escalated failures

---

## Troubleshooting

### Agent Not Detected
- Verify agent is registered
- Check agent ID matches
- Verify heartbeat is being sent

### False Failure Alerts
- Check heartbeat timeout configuration
- Verify execution recording
- Review failure thresholds

### Restart Not Working
- Check restart cooldown
- Verify max restart attempts
- Review restart logs

### Alerts Not Sending
- Check Slack webhook configuration
- Verify notification system
- Review alert storm detection

---

## Status

✅ **Complete and Active**

All components implemented:
- Monitoring loop
- Failure detection
- Agent restart
- Notifications
- Lane registry
- Governance enforcement
- Escalation system
- Anomaly detection
- API endpoints

---

**Sealed:** 2025-01-02  
**Steward:** Preston Chenault  
**Status:** Active
