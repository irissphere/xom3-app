# Quick Environment Setup

## Airtable Base Configuration

Update your `xom3-app/.env.local` file with these values:

```bash
# Primary cockpit tenant key (avoid implicit "hi5")
TENANT_KEY=xom3

# Airtable API Key (get from https://airtable.com/create/tokens)
AIRTABLE_API_KEY=pat...

# Healthcare CRM Base (for /app/healthcare dashboard)
AIRTABLE_USHA_BASE_ID=appCkU8L3sdmqaAmI

# Kairos CRM Base (for XOM3 Cockpit / Business Pipelines)
AIRTABLE_BASE_ID=appgAjwWw2Jr2TC0K

# Control table name (must exist in the base you expect to read/write)
AIRTABLE_CONTROL_TABLE=Xom3 Control

# HI5 is OFF by default (set true only if you still use HI5 surfaces)
ENABLE_HI5=false
```

## What Each Base Is Used For

### Healthcare CRM (`AIRTABLE_USHA_BASE_ID`)
- **Base:** `appCkU8L3sdmqaAmI`
- **Routes:**
  - `/app/healthcare` - Main Healthcare CRM dashboard
  - `/api/usha/*` - All healthcare API endpoints
- **Features:**
  - Client pipeline board
  - Follow-ups panel
  - Tasks and interactions
  - Client detail pages
  - Analytics dashboard

### Kairos CRM (`AIRTABLE_BASE_ID`)
- **Base:** `app4y7GKkeUfZm8rS`
- **Routes:**
  - `/xom3` - XOM3 Master Cockpit
  - `/api/hpe/*` - HPE automation
  - `/api/broadcast/*` - Broadcast/social
- **Features:**
  - Business pipelines
  - Workflow automation
  - Social media management
  - General business CRM

## Verify Setup

After updating `.env.local`, restart your dev server:

```bash
cd xom3-app
npm run dev
```

Then test:
- Healthcare: http://localhost:3000/app/healthcare
- XOM3 Cockpit: http://localhost:3000/xom3
