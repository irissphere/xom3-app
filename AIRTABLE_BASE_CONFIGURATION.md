# Airtable Base Configuration

## Overview

XOM3 uses two separate Airtable bases for different purposes:

1. **Healthcare CRM** - Patient/client management, follow-ups, tasks, billing
2. **Kairos CRM (XOM3 Cockpit)** - Business pipelines, workflows, automation

## Environment Variables

Add these to your `.env.local` file:

```bash
# Airtable API Key (shared)
AIRTABLE_API_KEY=pat...

# Healthcare CRM Base (for /app/healthcare)
AIRTABLE_USHA_BASE_ID=appCkU8L3sdmqaAmI

# Xom3 Commander Base (primary cockpit base)
AIRTABLE_BASE_ID=appgAjwWw2Jr2TC0K
```

## Base Assignments

### Healthcare CRM (`AIRTABLE_USHA_BASE_ID`)
- **Base ID:** `appCkU8L3sdmqaAmI`
- **Used by:**
  - `/app/healthcare` - Healthcare CRM dashboard
  - `/api/usha/*` - All USHA/Healthcare API endpoints
  - Follow-ups panel
  - Client detail pages
  - Pipeline board (Healthcare)
  - Tasks and interactions

### Xom3 Commander (`AIRTABLE_BASE_ID`)
- **Base ID:** `appgAjwWw2Jr2TC0K`
- **Used by:**
  - XOM3 Master Cockpit pipelines
  - Business automation workflows
  - Broadcast/social features
  - HPE integration
  - General business CRM features

## Verification

To verify your configuration:

```bash
# Check environment variables
cd xom3-app
node -e "require('dotenv').config({ path: '.env.local' }); console.log('Healthcare:', process.env.AIRTABLE_USHA_BASE_ID); console.log('Kairos:', process.env.AIRTABLE_BASE_ID);"
```

## API Endpoints

### Healthcare CRM Endpoints (use `AIRTABLE_USHA_BASE_ID`)
- `GET /api/usha/pipeline` - Fetch healthcare pipeline
- `GET /api/usha/analytics` - Healthcare analytics
- `GET /api/usha/tasks` - Tasks and interactions
- `GET /api/usha/followups/activity` - Follow-up activities
- `GET /api/usha/clients/[id]` - Client details

### XOM3 Cockpit Endpoints (use `AIRTABLE_BASE_ID`)
- `GET /api/hpe/*` - HPE automation endpoints
- `GET /api/broadcast/*` - Broadcast/social endpoints
- General business pipeline endpoints
