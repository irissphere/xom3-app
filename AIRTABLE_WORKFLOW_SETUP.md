# Airtable Workflow Setup - Complete Guide

**Status:** ✅ Infrastructure Created  
**Date:** 2025-12-15

---

## ✅ What's Been Created

### 1. Webhook Endpoints (Connected to `/app/healthcare`)

All endpoints are ready and will automatically connect to your Airtable base:

- **Lead Intake:** `POST /api/usha/webhooks/lead-intake`
  - Receives lead data
  - Creates/updates client records
  - Calculates qualification scores
  - Logs interactions

- **Billing:** `POST /api/usha/webhooks/billing`
  - Handles Stripe/PayPal webhooks
  - Creates/updates billing records
  - Links to clients by email

- **Interaction Logger:** `POST /api/usha/webhooks/interaction`
  - Logs client interactions
  - Updates Last Contact date
  - Tracks channels (Slack, Email, Call, etc.)

### 2. Setup Script

`scripts/setup-airtable-workflows.js` - Verifies tables and generates setup instructions

---

## 🚀 Quick Setup

### Step 1: Create `.env.local` File

Create `xom3-app/.env.local` with:

```bash
AIRTABLE_API_KEY=your_personal_access_token_here
AIRTABLE_USHA_BASE_ID=appCkU8L3sdmqaAmI
```

**Get your API key:**
1. Visit: https://airtable.com/api
2. Click "Create new token"
3. Name it: "EXOM3 CRM"
4. Grant access to base: `app4y7GKkeUfZm8rS`
5. Copy the token and paste in `.env.local`

### Step 2: Run Setup Script

```bash
cd xom3-app
node scripts/setup-airtable-workflows.js
```

This will:
- ✅ Verify connection to Airtable
- ✅ Check which tables exist
- ✅ Generate setup instructions

### Step 3: Verify Tables in Airtable

The healthcare dashboard needs these tables in your base (`app4y7GKkeUfZm8rS`):

#### **Clients** Table
- Name (Single line text) - Required
- Email (Email) - Required, Unique
- Phone (Phone number)
- Onboarding Status (Single select: New, In Progress, Complete, On Hold)
- Subscription Tier (Single select: Free, Starter, Pro, Enterprise)
- Status (Single select: Prospect, Intake, Active, Compliance, Closed)
- Created Date (Date)
- Last Contact (Date)
- Notes (Long text)

#### **Interactions** Table
- Client (Link to Clients) - Required
- Date (Date & time) - Required
- Channel (Single select: Slack, Email, Call, Meeting, SMS)
- Type (Single select: Inquiry, Support, Sales, Follow-up)
- Notes (Long text) - Required
- Outcome (Single select: Resolved, Pending, Escalated, Closed)

#### **Billing** Table
- Invoice ID (Single line text) - Required, Unique
- Client (Link to Clients)
- Amount (Currency) - Required
- Status (Single select: Draft, Sent, Paid, Overdue, Cancelled)
- Due Date (Date) - Required
- Paid Date (Date)
- Stripe Link (URL)
- Stripe Customer ID (Single line text)
- Notes (Long text)
- Tenant (Single line text)

---

## 🔗 Connecting n8n Workflows

### Import Workflows

1. **Access n8n:** https://n8n.srv1058373.hstgr.cloud

2. **Import Lane 2 (CRM & Onboarding):**
   - Import `flows/lane2-crm-onboarding.json`
   - Update webhook URL to: `http://localhost:3000/api/usha/webhooks/lead-intake`
   - Configure Airtable credential: "Opus 1" or "Kairos CRM"
   - Set base ID: `app4y7GKkeUfZm8rS`

3. **Import Lane 3 (Billing):**
   - Import `flows/lane3-billing-monetization.json`
   - Update webhook URL to: `http://localhost:3000/api/usha/webhooks/billing`
   - Configure Airtable credential
   - Set base ID: `app4y7GKkeUfZm8rS`

### Configure Webhooks in External Services

**Stripe:**
- Go to Stripe Dashboard → Webhooks
- Add endpoint: `http://localhost:3000/api/usha/webhooks/billing`
- Select events: `invoice.paid`, `checkout.session.completed`, `payment_intent.succeeded`

**Lead Forms:**
- Point webhook to: `http://localhost:3000/api/usha/webhooks/lead-intake`
- Send JSON: `{ "name", "email", "phone", "company", "message", "source" }`

---

## 🧪 Testing

### Test Lead Intake

```bash
curl -X POST http://localhost:3000/api/usha/webhooks/lead-intake \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "555-1234",
    "company": "Acme Corp",
    "message": "Looking for healthcare services",
    "source": "Website"
  }'
```

### Test Billing Webhook

```bash
curl -X POST http://localhost:3000/api/usha/webhooks/billing \
  -H "Content-Type: application/json" \
  -d '{
    "invoice_id": "inv_test_123",
    "amount": 100.00,
    "status": "Paid",
    "email": "john@example.com"
  }'
```

### Verify in Dashboard

1. Visit: `http://localhost:3000/app/healthcare`
2. Check Pipeline Board for new clients
3. Check Analytics Dashboard for counts
4. Check Billing section for invoices

---

## 📊 How It All Connects

```
n8n Workflow → Webhook Endpoint → Airtable Base → Healthcare Dashboard
     ↓              ↓                    ↓                ↓
Lane 2: CRM    /lead-intake        Clients Table    Pipeline Board
Lane 3: Billing /billing          Billing Table    Billing Section
External       /interaction        Interactions     Interaction Logs
```

---

## 🎯 Next Steps

1. ✅ Create `.env.local` with API key
2. ✅ Run setup script to verify connection
3. ✅ Create tables in Airtable (if they don't exist)
4. ✅ Import n8n workflows
5. ✅ Configure webhook URLs
6. ✅ Test with sample data
7. ✅ Verify in healthcare dashboard

---

## 📝 Notes

- **Base ID:** `app4y7GKkeUfZm8rS` (Kairos CRM) - This is what the healthcare page uses
- **All webhooks** automatically connect to this base
- **No manual configuration** needed once tables exist
- **Dashboard updates** automatically when records are created/updated

---

*Setup complete! The infrastructure is ready - just add your API key and create the tables.*
