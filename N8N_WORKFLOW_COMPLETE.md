# XOM3 n8n Workflow Integration Complete

## Summary

All critical n8n workflows have been created and wired to the XOM3 application.

**n8n Server:** `http://31.220.108.45:5678`

---

## Workflow Registry

| Workflow Key | Name | Webhook Path | Status |
|-------------|------|--------------|--------|
| `xom3-intake` | XOM3 Intake Lead | `/webhook/xom3/intake` | ✅ Active |
| `xom3-custom-build` | XOM3 Custom Build Request | `/webhook/xom3/custom-build` | ✅ Active |
| `xom3-trial` | XOM3 Trial Signup | `/webhook/xom3/trial` | ✅ Active |
| `xom3-contact` | XOM3 Contact Form Submission | `/webhook/xom3/contact` | ⚠️ Inactive |
| `xom3-stripe-events` | XOM3 Stripe Subscription Events | `/webhook/xom3/stripe-events` | ⚠️ Inactive |
| `benefitscrm-intake` | XOM3 BenefitsCRM Lead Intake | `/webhook/xom3/benefitscrm/intake` | ⚠️ Inactive |
| `broadcast-dispatch` | XOM3 Broadcast Content Dispatch | `/webhook/xom3/broadcast/dispatch` | ⚠️ Inactive |
| `hse-alert` | XOM3 HSE Health Alert | `/webhook/xom3/hse/alert` | ⚠️ Inactive |
| `ritual-trigger` | XOM3 Ritual Automation Trigger | `/webhook/xom3/ritual/trigger` | ⚠️ Inactive |
| `daily-digest` | XOM3 Daily Digest Report | Cron @ 8AM daily | ⚠️ Inactive |

---

## Workflow Details

### Core Lead Flows

#### 1. XOM3 Intake Lead (`X9YEIkp1yBcgaQ41`)
- **Trigger:** Webhook POST `/webhook/xom3/intake`
- **Actions:**
  - Sends email notification to preston.chenault@xom3.io
  - Saves lead to Airtable (HI5 Base / Pipeline table)
- **Wired to:** `/api/intake` route

#### 2. XOM3 Custom Build Request (`7J9sCTat6znPUiWA`)
- **Trigger:** Webhook POST `/webhook/xom3/custom-build`
- **Actions:**
  - Sends high-priority email notification
  - Saves request to Airtable
- **Wired to:** `/api/custom-build` route

#### 3. XOM3 Trial Signup (`IsIbg78lEUhWb8Pu`)
- **Trigger:** Webhook POST `/webhook/xom3/trial`
- **Actions:**
  - Sends trial confirmation email
  - Saves trial record to Airtable
- **Wired to:** `/api/subscription/start-trial` route

### Revenue Flows

#### 4. XOM3 Stripe Subscription Events (`oIGzdscvNXBlH2Su`)
- **Trigger:** Webhook POST `/webhook/xom3/stripe-events`
- **Actions:**
  - Sends notification for all Stripe events
  - Logs to revenue tracker in Airtable
- **Note:** Activate in n8n before use

### BenefitsCRM Flows

#### 5. XOM3 BenefitsCRM Lead Intake (`J4ppylxsOdu4zA1A`)
- **Trigger:** Webhook POST `/webhook/xom3/benefitscrm/intake`
- **Actions:**
  - Sends benefits team notification
  - Saves to Benefits Pipeline
- **Note:** Activate in n8n before use

### Broadcast Flows

#### 6. XOM3 Broadcast Content Dispatch (`MLxYErTzGkXEyr5y`)
- **Trigger:** Webhook POST `/webhook/xom3/broadcast/dispatch`
- **Actions:**
  - Sends dispatch notification
  - Logs content activity

### System Health Flows

#### 7. XOM3 HSE Health Alert (`U0MqinLSkxhkOSXZ`)
- **Trigger:** Webhook POST `/webhook/xom3/hse/alert`
- **Actions:**
  - Sends health alert notification
  - Logs health event to Airtable

#### 8. XOM3 Daily Digest Report (`CMyU5O5QVLOnHbO4`)
- **Trigger:** Cron schedule at 8:00 AM daily
- **Actions:**
  - Fetches recent leads from API
  - Fetches system health status
  - Sends daily summary email

### Automation Flows

#### 9. XOM3 Ritual Automation Trigger (`tPYhewsmcTj0H7ks`)
- **Trigger:** Webhook POST `/webhook/xom3/ritual/trigger`
- **Actions:**
  - Sends ritual execution notification
  - Logs ritual execution to Airtable

#### 10. XOM3 Contact Form Submission (`AIrohzqOgAErSoqT`)
- **Trigger:** Webhook POST `/webhook/xom3/contact`
- **Actions:**
  - Sends contact form notification
  - Saves contact to Airtable

---

## API Endpoints

### Check Workflow Status
```
GET /api/n8n/status
```
Returns status of all registered workflows.

### Test a Workflow
```
POST /api/n8n/test
{
  "workflowKey": "xom3-intake",
  "payload": { ... }  // Optional custom payload
}
```
Triggers a workflow with test data.

---

## Activation Instructions

To activate inactive workflows in n8n:

1. Go to `http://31.220.108.45:5678`
2. Open each workflow
3. Toggle the "Active" switch in the top right
4. Verify webhook is registered

Workflows must be active for webhooks to accept requests.

---

## Code Integration

### Workflow Registry
```typescript
// xom3-app/lib/n8n/workflow-registry.ts
import { WORKFLOW_REGISTRY, getWebhookUrl } from "@/lib/n8n/workflow-registry";
```

### Trigger Utilities
```typescript
// xom3-app/lib/n8n/trigger.ts
import { 
  triggerWorkflow,
  triggerIntakeLead,
  triggerCustomBuild,
  triggerTrialSignup,
  triggerBenefitscrmIntake,
  triggerHseAlert,
  triggerBroadcastDispatch,
  triggerRitualAutomation,
} from "@/lib/n8n/trigger";
```

---

## Credentials

All workflows use these credentials (configured in n8n):

- **SMTP:** `DTMLN6IGfyAGTHSl` - Email notifications
- **Airtable:** `WybuWCE4daWFbiXN` - CRM storage

### Airtable Base: Kairos CRM (`app4y7GKkeUfZm8rS`)

| Table | ID | Purpose |
|-------|-----|---------|
| **Clients** | `tblLSfMSyhoj253NM` | Lead/client records |
| **Billing** | `tblKO42qVWZ7bwi2m` | Stripe/payment events |
| **Audit Logs** | `tblUzMOWkgysIBSMS` | System events |
| **Social Queue** | `tblOpdmbSCEgYaR1A` | Broadcast content |
| **Interactions** | `tbleVnWeN3UBi62sO` | Client touchpoints |
| **Tasks** | `tbltxaymco7M2HQ0u` | Task management |

⚠️ **Note:** HI5 (`apputp1gW6oaAzc6G`) is a **separate client** - NOT part of XOM3!

---

## Environment Variables

Add to `.env.local`:
```
N8N_WEBHOOK_BASE_URL=http://31.220.108.45:5678
```

---

## Created: December 27, 2025
## Status: Complete ✅

