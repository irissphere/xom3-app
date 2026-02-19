# Commander Environment Configuration

Add these variables to your `.env.local` file:

```bash
# ============================================================
# XOM3 COMMANDER - Environment Configuration
# ============================================================

# ------------------------------------------------------------
# Commander Webhooks (n8n)
# ------------------------------------------------------------
COMMANDER_N8N_INTAKE_WEBHOOK_URL=https://your-n8n-instance.com/webhook/commander/intake
COMMANDER_N8N_FOLLOWUP_WEBHOOK_URL=https://your-n8n-instance.com/webhook/commander/followup

# Legacy (backwards compatibility)
HI5_N8N_LEAD_INTAKE_WEBHOOK_URL=https://your-n8n-instance.com/webhook/commander/intake

# ------------------------------------------------------------
# Airtable
# ------------------------------------------------------------
AIRTABLE_API_KEY=your_airtable_api_key
AIRTABLE_BASE_ID=your_base_id

# ------------------------------------------------------------
# Commander Features
# ------------------------------------------------------------
AUTOMATION_ENABLED=true
COMMANDER_ENABLED=true

# ------------------------------------------------------------
# SMS (Optional)
# ------------------------------------------------------------
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+1XXXXXXXXXX

# ------------------------------------------------------------
# Company Branding
# ------------------------------------------------------------
COMPANY_NAME=Xom3
NEXT_PUBLIC_SITE_URL=https://xom3.io
```

## Webhook URLs After n8n Import

Once you import `flows/commander-intake-workflow.json` into n8n:

1. Go to your n8n instance
2. Open "Xom3 Commander - Universal Intake Workflow"
3. Click on the "Commander Intake Webhook" node
4. Copy the webhook URL
5. Paste it as `COMMANDER_N8N_INTAKE_WEBHOOK_URL` in your `.env.local`

## API Endpoint

The Commander intake API is available at:

```
POST /api/commander/intake
```

### Request Body

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "5551234567",
  "vertical": "auto",  // "benefits", "health", or "auto"
  "message": "I'm interested in health insurance options",
  "source": "website",
  "smsOptIn": true
}
```

### Response

```json
{
  "success": true,
  "data": {
    "clientId": "rec...",
    "vertical": "benefits",
    "leadType": "Individual/Family",
    "classification": {
      "eligibilityCategory": "individual",
      "priority": "medium",
      "routing": "individual_specialist",
      "confidence": 0.7
    },
    "isNewClient": true
  },
  "metadata": {
    "executionId": "cmd-...",
    "duration": 245,
    "vertical": "benefits",
    "route": "benefits_agent",
    "webhookTriggered": true
  }
}
```
