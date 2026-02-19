# Health CRM Agents

Core agents for Health CRM minimal deployment.

## Agents

### 1. HealthIntakeAgent

**Lane:** Health Intake & Triage  
**Purpose:** Accept new health leads/intakes, normalize data, dedupe, classify, and route.

**Triggers:**
- `POST /api/cockpit/agent/health-intake/trigger`
- n8n webhook (form submissions / external sources)

**Capabilities:**
- Normalize lead data from various sources
- Deduplicate against existing clients (by email, phone, or name+phone)
- Classify leads by category, priority, and routing
- Create or update client records in Airtable
- Log interactions automatically

**Usage:**

```typescript
import { HealthIntakeAgent } from "@/modules/healthcare/agents";

const agent = new HealthIntakeAgent();
const result = await agent.execute({
  email: "patient@example.com",
  firstName: "John",
  lastName: "Doe",
  phone: "972-555-1234",
  source: "web_form",
  reasonForContact: "Schedule appointment",
  insurance: "Blue Cross",
});
```

**API Example:**

```bash
POST /api/cockpit/agent/health-intake/trigger
Content-Type: application/json

{
  "action": "process_intake",
  "payload": {
    "email": "patient@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "972-555-1234",
    "source": "web_form",
    "reasonForContact": "Schedule appointment",
    "insurance": "Blue Cross"
  }
}
```

### 2. HealthFollowupAgent

**Lane:** Follow-Ups & Tasks  
**Purpose:** Generate, schedule, and update follow-up tasks in the CRM. Handle "due now", "overdue", and "completed" state transitions.

**Triggers:**
- Scheduler (e.g., every 5 minutes)
- `POST /api/cockpit/agent/health-followup/trigger` for on-demand runs

**Capabilities:**
- Generate follow-up tasks for clients who need them
- Schedule follow-ups based on client status and last contact
- Update task states (pending → due_now → overdue → completed)
- Auto-complete very old overdue tasks

**Usage:**

```typescript
import { HealthFollowupAgent } from "@/modules/healthcare/agents";

const agent = new HealthFollowupAgent();
const result = await agent.execute({
  generateTasks: true,
  updateStates: true,
  clientId: "optional-client-id", // optional filter
});
```

**API Example:**

```bash
POST /api/cockpit/agent/health-followup/trigger
Content-Type: application/json

{
  "action": "trigger",
  "payload": {
    "generateTasks": true,
    "updateStates": true
  }
}
```

## Integration with n8n

### Health Intake Webhook

Create an n8n webhook that calls the intake agent:

```json
{
  "nodes": [
    {
      "parameters": {
        "path": "health-intake",
        "httpMethod": "POST"
      },
      "type": "n8n-nodes-base.webhook",
      "name": "Health Intake Webhook"
    },
    {
      "parameters": {
        "url": "https://your-domain.com/api/cockpit/agent/health-intake/trigger",
        "method": "POST",
        "jsonParameters": true,
        "options": {
          "headers": {
            "Content-Type": "application/json"
          }
        },
        "bodyParametersJson": "={{ JSON.stringify({ action: 'process_intake', payload: $json }) }}"
      },
      "type": "n8n-nodes-base.httpRequest",
      "name": "Trigger Intake Agent"
    }
  ]
}
```

### Follow-up Scheduler

Create an n8n schedule workflow that runs every 5 minutes:

```json
{
  "nodes": [
    {
      "parameters": {
        "rule": {
          "interval": [
            {
              "field": "minutes",
              "minutesInterval": 5
            }
          ]
        }
      },
      "type": "n8n-nodes-base.scheduleTrigger",
      "name": "Every 5 Minutes"
    },
    {
      "parameters": {
        "url": "https://your-domain.com/api/cockpit/agent/health-followup/trigger",
        "method": "POST",
        "jsonParameters": true,
        "bodyParametersJson": "={{ JSON.stringify({ action: 'trigger', payload: { generateTasks: true, updateStates: true } }) }}"
      },
      "type": "n8n-nodes-base.httpRequest",
      "name": "Trigger Follow-up Agent"
    }
  ]
}
```

## Data Flow

### Health Intake Flow

```
Lead Source (Web Form/Referral/Call)
  ↓
HealthIntakeAgent.execute()
  ↓
1. Normalize Data
  ↓
2. Deduplicate (check existing clients)
  ↓
3. Classify (category, priority, routing)
  ↓
4. Create/Update Client Record (Airtable)
  ↓
5. Log Interaction (Airtable)
  ↓
Result: Client ID + Classification
```

### Follow-up Flow

```
Scheduler (every 5 min) or Manual Trigger
  ↓
HealthFollowupAgent.execute()
  ↓
1. Generate Follow-up Tasks
   - Check clients needing follow-ups
   - Create tasks based on criteria
  ↓
2. Update Task States
   - Mark "due now" (within 1 day)
   - Mark "overdue" (past due date)
   - Auto-complete very old tasks (30+ days)
  ↓
Result: Tasks Generated + Updated
```

## Airtable Schema Requirements

### Clients Table

Required fields:
- `Name` (Single line text)
- `Email` (Email) - used for deduplication
- `Phone` (Phone number) - used for deduplication
- `Onboarding Status` (Single select: New, In Progress, Complete, On Hold)
- `Subscription Tier` (Single select)

Optional fields:
- `Date of Birth` (Date)
- `Insurance` (Single line text)
- `Primary Care Provider` (Single line text)
- `Category` (Single select)
- `Priority` (Single select: low, medium, high, urgent)
- `Source` (Single line text)
- `Notes` (Long text)
- `Last Contact` (Date)
- `Created Date` (Date)

### Tasks Table

Required fields:
- `Title` (Single line text)
- `Client` (Link to Clients)
- `Due Date` (Date)
- `Status` (Single select: pending, due_now, overdue, Done, Completed)
- `Priority` (Single select: low, medium, high, urgent)
- `Type` (Single select: Follow-up, etc.)

Optional fields:
- `Description` (Long text)
- `Completed At` (Date)

### Interactions Table

Required fields:
- `Client` (Link to Clients)
- `Date` (Date)
- `Channel` (Single select: Slack, Email, Call, Meeting, SMS, Web)
- `Type` (Single select: Inquiry, Support, Sales, Follow-up)
- `Notes` (Long text)
- `Outcome` (Single select: Resolved, Pending, Escalated, Closed)

## Error Handling

Both agents return `AgentExecutionResult` with:
- `success: boolean`
- `data?: any` - Result data on success
- `errors?: Array<{ field: string; message: string }>` - Validation/execution errors
- `warnings?: string[]` - Non-fatal warnings
- `metadata` - Execution metadata (executionId, duration, counts)

## Configuration

Agents use the Airtable base configured via `AIRTABLE_USHA_BASE_ID` environment variable.

They operate on the lanes:
- `healthcrm-intake-triage` (HealthIntakeAgent)
- `healthcrm-followups-tasks` (HealthFollowupAgent)
