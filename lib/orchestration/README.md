# Multi-Agent Sequence Orchestration

## Overview

The Multi-Agent Sequence Orchestration system defines and executes sequential agent chains (Agent A → Agent B → Agent C) with comprehensive trigger events, handoff formats, success criteria, rollback plans, and supervisor monitoring.

---

## Core Concepts

### 1. **Trigger Event**

The trigger event initiates the entire sequence. It can be:

- **Webhook**: External system calls API endpoint
- **Schedule**: Time-based trigger (cron, interval)
- **Signal**: Internal system signal (from UOI, HSE, etc.)
- **Manual**: Human-initiated execution
- **Condition**: Conditional trigger based on system state

**Example:**
```typescript
const trigger: TriggerEvent = {
  type: "webhook",
  source: "lead-intake-form",
  payload: {
    leadId: "lead_123",
    source: "instagram",
    score: 85
  },
  conditions: [
    {
      field: "score",
      operator: "greater_than",
      value: 80
    }
  ]
};
```

### 2. **Handoff Format**

The standardized format for passing data and context between agents:

```typescript
interface HandoffFormat {
  sequenceId: string;
  fromAgentId: string;
  toAgentId: string;
  step: number;
  payload: {
    data: Record<string, any>;        // Agent-specific data
    artifacts: Artifact[];             // Files, IDs, references
    metadata: {
      executionId: string;
      previousAgentResult: AgentResult;
      validationResults?: ValidationResult[];
    };
  };
  context: SequenceContext;            // Full sequence context
  timestamp: string;
  checksum?: string;                   // Integrity verification
}
```

**Key Components:**
- **Data**: Structured data produced by previous agent
- **Artifacts**: Immutable references (IDs, file paths, state snapshots)
- **Metadata**: Execution context and validation results
- **Checksum**: Ensures data integrity during handoff

### 3. **Success Criteria**

Each agent defines what constitutes success:

```typescript
interface SuccessCriteria {
  required: SuccessRequirement[];      // Must pass
  optional?: SuccessRequirement[];     // Warnings if fail
  validation?: ValidationRule[];      // Custom validators
}
```

**Requirement Types:**
- `output_field`: Specific field in agent output
- `artifact`: Required artifact produced
- `status_code`: Agent execution status
- `metric`: Performance metric (execution time, etc.)
- `custom`: Custom validation logic

**Example:**
```typescript
const successCriteria: SuccessCriteria = {
  required: [
    {
      type: "output_field",
      field: "clientId",
      operator: "exists",
      description: "Client ID must be created"
    },
    {
      type: "artifact",
      field: "clientId",
      operator: "exists",
      description: "Client ID artifact must be produced"
    }
  ],
  optional: [
    {
      type: "metric",
      field: "executionTime",
      operator: "less_than",
      value: 5000,
      description: "Execution should complete in < 5s"
    }
  ]
};
```

### 4. **Rollback Plan**

Automatic rollback when any agent fails:

**Rollback Triggers:**
- Critical agent failure
- Supervisor escalation rule triggered
- Multiple consecutive failures
- Explicit rollback request

**Rollback Process:**
1. Identify all completed agents (in reverse order)
2. Execute rollback action for each agent
3. Track rollback status per agent
4. Complete rollback sequence

**Rollback Actions:**
- `revert`: Undo agent's changes
- `cleanup`: Remove temporary resources
- `notify`: Send notification
- `compensate`: Compensating transaction

**Example:**
```typescript
const rollbackState: RollbackState = {
  triggered: true,
  triggeredAt: "2025-01-02T12:00:00Z",
  triggeredBy: "supervisor",
  reason: "Agent B failed success criteria",
  rollbackSteps: [
    {
      agentId: "agent_a",
      step: 0,
      action: "revert",
      status: "completed",
      result: { reverted: true }
    }
  ],
  completed: true,
  completedAt: "2025-01-02T12:00:05Z"
};
```

### 5. **Supervisor Agent**

Monitors the entire sequence and intervenes when needed:

**Monitoring Functions:**
- **Escalation Rules**: Automatic escalation based on conditions
- **Intervention Triggers**: Proactive intervention for stuck/degraded sequences
- **Health Checks**: Periodic sequence health evaluation

**Escalation Rule Types:**
- `timeout`: Sequence exceeds time threshold
- `failure`: Agent failure detected
- `error_rate`: Error rate exceeds threshold
- `metric_threshold`: Performance metric exceeds threshold

**Intervention Trigger Types:**
- `stuck`: Sequence appears stuck (no progress)
- `error_pattern`: Recurring error pattern detected
- `performance_degradation`: Performance degrading

**Example:**
```typescript
const supervisor: SupervisorAgent = {
  id: "supervisor_001",
  name: "Sequence Supervisor",
  monitoringInterval: 5000, // Check every 5 seconds
  escalationRules: [
    {
      condition: "timeout",
      threshold: 300000, // 5 minutes
      action: "rollback"
    },
    {
      condition: "failure",
      action: "retry"
    }
  ],
  interventionTriggers: [
    {
      condition: "stuck",
      threshold: 60000, // 1 minute
      action: "pause",
      description: "Pause if no progress for 1 minute"
    }
  ]
};
```

---

## Usage Example

### Creating a Sequence

```typescript
import { createAgentSequence, executeSequence } from "./multi-agent-sequence";

// Define agents
const agents = [
  {
    id: "agent_a",
    name: "Lead Intake Agent",
    type: "agent_a",
    role: "Intake and validation",
    handler: "/api/agents/intake",
    successCriteria: {
      required: [
        {
          type: "output_field",
          field: "leadId",
          operator: "exists",
          description: "Lead ID must be created"
        }
      ]
    },
    timeout: 10000
  },
  {
    id: "agent_b",
    name: "Enrichment Agent",
    type: "agent_b",
    role: "Data enrichment",
    handler: "/api/agents/enrich",
    dependencies: ["agent_a"],
    successCriteria: {
      required: [
        {
          type: "output_field",
          field: "enriched",
          operator: "equals",
          value: true,
          description: "Lead must be enriched"
        }
      ]
    },
    retryPolicy: {
      maxRetries: 3,
      backoffStrategy: "exponential",
      backoffMs: 1000
    }
  },
  {
    id: "agent_c",
    name: "Assignment Agent",
    type: "agent_c",
    role: "Agent assignment",
    handler: "/api/agents/assign",
    dependencies: ["agent_b"],
    successCriteria: {
      required: [
        {
          type: "output_field",
          field: "assignedAgentId",
          operator: "exists",
          description: "Agent must be assigned"
        }
      ]
    }
  }
];

// Define trigger
const trigger = {
  type: "webhook",
  source: "lead-intake",
  payload: {
    leadId: "lead_123",
    source: "instagram"
  }
};

// Define supervisor
const supervisor = {
  id: "supervisor_001",
  name: "Sequence Supervisor",
  monitoringInterval: 5000,
  escalationRules: [
    {
      condition: "failure",
      action: "rollback"
    }
  ],
  interventionTriggers: [
    {
      condition: "stuck",
      threshold: 60000,
      action: "pause",
      description: "Pause if stuck"
    }
  ]
};

// Create sequence
const sequence = createAgentSequence(
  "Lead Processing Sequence",
  agents,
  trigger,
  supervisor
);

// Execute sequence
const result = await executeSequence(sequence, {
  leadId: "lead_123",
  source: "instagram"
});

if (result.success) {
  console.log("Sequence completed successfully");
  console.log("Results:", result.results);
} else {
  console.error("Sequence failed");
  console.error("Rollback state:", result.rollbackState);
}
```

---

## Sequence Execution Flow

```
1. Trigger Event Received
   ↓
2. Initialize Sequence Context
   ↓
3. Start Supervisor Monitoring (if configured)
   ↓
4. For each agent in sequence:
   a. Check dependencies
   b. Execute agent
   c. Evaluate success criteria
   d. If failed:
      - Check retry policy
      - Check rollback trigger
      - Trigger rollback if needed
   e. If succeeded:
      - Create handoff for next agent
      - Continue to next agent
   ↓
5. All agents completed
   ↓
6. Return success result
```

---

## Error Handling

### Agent Failure

When an agent fails:

1. **Evaluate Success Criteria**: Check if failure is critical
2. **Check Retry Policy**: Determine if retry is allowed
3. **Check Rollback Trigger**: Determine if rollback is needed
4. **Execute Rollback**: If triggered, rollback all completed agents
5. **Return Failure Result**: Include rollback state in result

### Rollback Execution

Rollback executes in reverse order of completed agents:

1. **Agent C** (if completed) → Rollback
2. **Agent B** (if completed) → Rollback
3. **Agent A** (if completed) → Rollback

Each rollback step is tracked and can succeed or fail independently.

---

## Supervisor Monitoring

The supervisor agent continuously monitors the sequence:

1. **Periodic Health Checks**: Every `monitoringInterval` milliseconds
2. **Evaluate Escalation Rules**: Check if any rules should trigger
3. **Evaluate Intervention Triggers**: Check if intervention is needed
4. **Take Action**: Execute escalation/intervention actions

### Supervisor Actions

- **Retry**: Retry failed agent step
- **Skip**: Skip to next agent
- **Rollback**: Trigger full rollback
- **Escalate**: Escalate to external system or human
- **Notify**: Send notification
- **Pause**: Pause sequence execution

---

## Integration Points

### With Existing Systems

- **UOI (Unified Operational Intelligence)**: Sequences can be triggered by UOI signals
- **HSE (Health, Stability, Events)**: Supervisor can consult HSE state
- **Broadcast Engine**: Agent sequences can process broadcast leads
- **FAO (Full Autonomous Orchestration)**: Sequences can be part of FAO workflows

### API Endpoints

- `POST /api/orchestration/sequence` - Create sequence
- `POST /api/orchestration/execute` - Execute sequence
- `GET /api/orchestration/status/:sequenceId` - Get sequence status
- `POST /api/orchestration/rollback/:sequenceId` - Manual rollback

---

## Best Practices

1. **Define Clear Success Criteria**: Each agent should have unambiguous success criteria
2. **Use Artifacts for Immutable Data**: Pass IDs and references, not full data objects
3. **Implement Proper Rollback**: Each agent should have a rollback handler
4. **Configure Supervisor**: Always configure supervisor for production sequences
5. **Set Timeouts**: Prevent sequences from hanging indefinitely
6. **Use Checksums**: Verify data integrity during handoffs
7. **Log Everything**: Comprehensive logging for debugging and audit

---

## Future Enhancements

- **Parallel Agent Execution**: Support for parallel agent execution with synchronization
- **Conditional Branching**: Support for conditional agent paths
- **Dynamic Agent Selection**: Select agents dynamically based on context
- **Sequence Templates**: Pre-defined sequence templates for common patterns
- **Visual Sequence Builder**: UI for building sequences visually
