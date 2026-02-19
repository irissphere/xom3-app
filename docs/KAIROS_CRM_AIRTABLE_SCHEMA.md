# Kairos CRM — Airtable Schema

> **Base Name:** `Kairos CRM`  
> **Purpose:** Unified client operations, billing, interactions, and social queue management

---

## Table 1: Clients

Primary client records for onboarding, ops, and relationship tracking.

| Field Name | Field Type | Description |
|------------|------------|-------------|
| `client_id` | Autonumber | Primary key |
| `name` | Single line text | Client/company name |
| `email` | Email | Primary contact email |
| `phone` | Phone | Primary contact phone |
| `status` | Single select | `lead`, `onboarding`, `active`, `paused`, `churned` |
| `tier` | Single select | `starter`, `growth`, `enterprise`, `custom` |
| `source` | Single select | `referral`, `organic`, `paid`, `partner`, `inbound` |
| `assigned_to` | Single line text | Account owner |
| `health_score` | Number (0-100) | Computed client health |
| `mrr` | Currency | Monthly recurring revenue |
| `contract_start` | Date | Contract start date |
| `contract_end` | Date | Contract end date |
| `notes` | Long text | Internal notes |
| `tags` | Multiple select | Classification tags |
| `interactions` | Link to Interactions | Related interactions |
| `billing` | Link to Billing | Related billing records |
| `social_queue` | Link to SocialQueue | Related social posts |
| `created_at` | Created time | Record creation timestamp |
| `updated_at` | Last modified time | Last update timestamp |

---

## Table 2: Interactions

All client touchpoints: calls, emails, meetings, support tickets.

| Field Name | Field Type | Description |
|------------|------------|-------------|
| `interaction_id` | Autonumber | Primary key |
| `client` | Link to Clients | Related client |
| `type` | Single select | `call`, `email`, `meeting`, `support`, `note`, `task` |
| `direction` | Single select | `inbound`, `outbound` |
| `subject` | Single line text | Interaction subject/title |
| `summary` | Long text | Interaction summary |
| `outcome` | Single select | `positive`, `neutral`, `negative`, `pending` |
| `assigned_to` | Single line text | Team member |
| `scheduled_at` | Date | Scheduled time (for meetings/tasks) |
| `completed_at` | Date | Completion timestamp |
| `follow_up_date` | Date | Next follow-up date |
| `sentiment` | Single select | `positive`, `neutral`, `negative` |
| `priority` | Single select | `low`, `medium`, `high`, `urgent` |
| `tags` | Multiple select | Classification tags |
| `created_at` | Created time | Record creation timestamp |

---

## Table 3: Billing

Invoice and payment tracking.

| Field Name | Field Type | Description |
|------------|------------|-------------|
| `billing_id` | Autonumber | Primary key |
| `client` | Link to Clients | Related client |
| `type` | Single select | `invoice`, `payment`, `refund`, `credit`, `subscription` |
| `status` | Single select | `draft`, `sent`, `paid`, `overdue`, `cancelled`, `refunded` |
| `amount` | Currency | Transaction amount |
| `currency` | Single select | `USD`, `EUR`, `GBP` |
| `due_date` | Date | Payment due date |
| `paid_date` | Date | Actual payment date |
| `invoice_number` | Single line text | Invoice reference |
| `stripe_id` | Single line text | Stripe payment intent/invoice ID |
| `description` | Long text | Line item description |
| `period_start` | Date | Billing period start |
| `period_end` | Date | Billing period end |
| `created_at` | Created time | Record creation timestamp |

---

## Table 4: SocialQueue

Social media content queue for client promotion.

| Field Name | Field Type | Description |
|------------|------------|-------------|
| `queue_id` | Autonumber | Primary key |
| `client` | Link to Clients | Related client |
| `platform` | Single select | `twitter`, `linkedin`, `instagram`, `facebook`, `threads` |
| `status` | Single select | `draft`, `scheduled`, `posted`, `failed`, `cancelled` |
| `content` | Long text | Post content |
| `media_url` | URL | Attached media URL |
| `scheduled_for` | Date | Scheduled post time |
| `posted_at` | Date | Actual post time |
| `engagement` | Number | Engagement count (likes, shares, etc.) |
| `campaign` | Single line text | Campaign name |
| `template` | Single select | Template used |
| `approved_by` | Single line text | Approval chain |
| `notes` | Long text | Internal notes |
| `tags` | Multiple select | Classification tags |
| `created_at` | Created time | Record creation timestamp |

---

## Views (Recommended)

### Clients Table
- **All Clients** — Grid view, all records
- **Active Clients** — Filter: status = "active"
- **Onboarding Pipeline** — Filter: status = "onboarding", sorted by created_at
- **At Risk** — Filter: health_score < 50

### Interactions Table
- **All Interactions** — Grid view, all records
- **Pending Follow-ups** — Filter: follow_up_date <= TODAY(), sorted by priority
- **Recent Activity** — Sorted by created_at DESC

### Billing Table
- **All Billing** — Grid view, all records
- **Outstanding** — Filter: status IN ("sent", "overdue")
- **This Month** — Filter: created_at within current month

### SocialQueue Table
- **All Posts** — Grid view, all records
- **Scheduled** — Filter: status = "scheduled", sorted by scheduled_for
- **Drafts** — Filter: status = "draft"

---

## Setup Instructions

1. Create a new Airtable base named **Kairos CRM**
2. Create each table with the fields above
3. Set up the linked record relationships:
   - Clients ↔ Interactions (one-to-many)
   - Clients ↔ Billing (one-to-many)
   - Clients ↔ SocialQueue (one-to-many)
4. Create the recommended views
5. Copy the Base ID from the URL: `https://airtable.com/[BASE_ID]/...`
6. Add to `.env.local`:

```env
AIRTABLE_KAIROS_BASE_ID=app_your_base_id_here
```

---

## UOI Signal Integration

The Kairos CRM emits signals on:
- **Client status change** → `kairos:client:status_changed`
- **New interaction** → `kairos:interaction:created`
- **Billing event** → `kairos:billing:event`
- **Social post scheduled** → `kairos:social:scheduled`
- **Social post published** → `kairos:social:posted`
- **Health score drop** → `kairos:client:health_alert`

All signals route through the UOI bus for cockpit display and workflow triggers.
