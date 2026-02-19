# MCP Tools for Retell AI - Complete Setup

## Overview

This document describes the MCP (Model Context Protocol) tools system for Retell AI voice agents. The system is **multi-tenant** - a single deployment can serve multiple clients with different Airtable bases, SMS providers, and transfer configurations.

## Architecture

```
Retell AI Agent ─────► XOM3 MCP Server ─────► Airtable (CRM)
                         │                    OpenPhone (SMS)
                         │                    Calendar (Appointments)
                         └──────────────────► Human Agents (Transfer)
```

## MCP Server Endpoint

**URL:** `https://xom3.io/api/mcp` (or your deployed domain)

### GET /api/mcp
Returns server info and available tools (for Retell to discover capabilities).

### POST /api/mcp
Executes a tool call. Accepts both direct tool calls and Retell's format.

---

## Available Tools

### 1. `lookup_lead`
Look up a lead's information by phone number.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| phone_number | string | Yes | The phone number to look up |

**Response Variables:**
- `lead_found` (boolean)
- `first_name` (string)
- `last_name` (string)
- `lead_status` (string)
- `has_appointment` (boolean)
- `appointment_date` (string)
- `age` (string)

---

### 2. `update_status`
Update a lead's status after qualifying conversation.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| phone_number | string | Yes | Lead's phone number |
| new_status | string | Yes | New status to set |
| notes | string | No | Notes about the status change |
| qualified | boolean | No | Whether lead is qualified |

**Status Options:**
- `New Lead`
- `Contacted`
- `Interested`
- `Not Interested`
- `Callback`
- `Appointment Scheduled`
- `Qualified`
- `Dead Lead`

**Response Variables:**
- `status_updated` (boolean)
- `previous_status` (string)

---

### 3. `check_availability`
Check available appointment slots for the next few days.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| days_ahead | number | No | How many days ahead to check (default: 3) |

**Response Variables:**
- `next_available` (string)
- `slots_count` (number)

---

### 4. `book_appointment`
Book an appointment for the lead. Also sends confirmation SMS.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| phone_number | string | Yes | Lead's phone number |
| preferred_date | string | Yes | Date (YYYY-MM-DD or natural: "tomorrow", "next Monday") |
| preferred_time | string | Yes | Time (e.g., "2pm", "morning", "afternoon") |
| notes | string | No | Notes about the appointment |

**Response Variables:**
- `appointment_booked` (boolean)
- `appointment_date` (string)
- `appointment_time` (string)
- `confirmation_sent` (boolean)

---

### 5. `send_confirmation_sms`
Send a confirmation SMS to the lead.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| phone_number | string | Yes | Phone number to send to |
| message_type | string | Yes | Type: `appointment_confirmation`, `callback_confirmation`, `custom` |
| custom_message | string | No | Custom message (required if type is `custom`) |

**Response Variables:**
- `sms_sent` (boolean)

---

### 6. `transfer_to_human`
Transfer the call to a human agent.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| reason | string | Yes | Reason for transfer |
| agent_name | string | No | Specific agent to transfer to |
| priority | string | No | Priority: `normal`, `high`, `urgent` |
| transfer_notes | string | No | Notes for receiving agent |

**Response Variables:**
- `transfer_initiated` (boolean)
- `transfer_to` (string) - The phone number to transfer to
- `agent_name` (string)

---

## Retell Configuration

### Step 1: Add MCP Server in Retell Dashboard

1. Go to your agent (e.g., Charlette - PulseVera Qualifier)
2. Click **MCP** in the sidebar
3. Add MCP Server:
   - **Name:** XOM3 MCP Server
   - **URL:** `https://xom3.io/api/mcp`
   - **Authentication:** None (or add API key if configured)

### Step 2: Enable Tools

After adding the MCP server, Retell will auto-discover the tools. Enable the ones you want:

- ✅ lookup_lead
- ✅ update_status
- ✅ check_availability
- ✅ book_appointment
- ✅ send_confirmation_sms
- ✅ transfer_to_human

### Step 3: Update Agent Prompt

Add tool instructions to your agent's prompt:

```
## Available Tools

You have access to the following tools:

1. **lookup_lead** - Use at the start of the call to check if we have the caller's information
2. **update_status** - Update the lead's status based on the conversation
3. **check_availability** - Check available appointment times before offering slots
4. **book_appointment** - Book an appointment when the caller is ready
5. **send_confirmation_sms** - Send a confirmation text after booking
6. **transfer_to_human** - Transfer to a human agent when:
   - The caller is qualified and ready to proceed
   - The caller requests to speak with someone
   - There's a complex question you can't answer

## Call Flow

1. Greet the caller
2. Use lookup_lead to check their information
3. Qualify the caller based on conversation
4. If interested, use check_availability then book_appointment
5. If qualified and wants to talk now, use transfer_to_human
6. Always update_status before ending the call
```

---

## Multi-Tenant Configuration

### Adding a New Client

1. Edit `xom3-app/lib/mcp/clients.ts`
2. Add a new entry to the `CLIENTS` object:

```typescript
"newclient": {
  client_id: "newclient",
  client_name: "New Client Name",
  airtable_base_id: "appXXXXXXXXXXXXXX",
  leads_table_id: "tblXXXXXXXXXXXXXX",
  calendar_integration: {
    type: "google",
    calendar_id: process.env.NEWCLIENT_GOOGLE_CALENDAR_ID,
  },
  sms_config: {
    provider: "openphone",
    from_number: process.env.NEWCLIENT_OPENPHONE_NUMBER,
  },
  transfer_config: {
    default_number: process.env.NEWCLIENT_TRANSFER_NUMBER,
    agents: [
      {
        name: "Agent Name",
        phone: process.env.NEWCLIENT_AGENT_PHONE,
        specialties: ["Topic1", "Topic2"],
      },
    ],
  },
  timezone: "America/Chicago",
  business_hours: {
    start: 9,
    end: 17,
  },
},
```

3. Add field mappings in `FIELD_MAPPINGS` if different from default

4. Map the Retell agent ID in `getClientByAgentId`:

```typescript
const agentMapping: Record<string, string> = {
  "agent_c13e46201ac73f3f3b9097201f": "opus1",
  "agent_XXXXXXXXXXXXXXXXXXXXXXXXXX": "newclient", // New agent
};
```

---

## Environment Variables

Add these to your `.env.local`:

```env
# Airtable
AIRTABLE_API_KEY=patXXXXXXXXXXXXXX

# OpenPhone
OPENPHONE_API_KEY=XXXXXXXX
OPENPHONE_SMS_WEBHOOK_URL=https://n8n.xom3.io/webhook/openphone/sms

# Client-specific
OPUS1_OPENPHONE_NUMBER=+1XXXXXXXXXX
OPUS1_TRANSFER_NUMBER=+1XXXXXXXXXX
OPUS1_PRESTON_PHONE=+1XXXXXXXXXX
OPUS1_JAY_PHONE=+1XXXXXXXXXX
OPUS1_GOOGLE_CALENDAR_ID=your-calendar-id@gmail.com
```

---

## Testing

### Test via cURL

```bash
# Get server info
curl https://xom3.io/api/mcp

# Lookup lead
curl -X POST https://xom3.io/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"tool_name": "lookup_lead", "arguments": {"phone_number": "+15551234567"}}'

# Book appointment
curl -X POST https://xom3.io/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"tool_name": "book_appointment", "arguments": {"phone_number": "+15551234567", "preferred_date": "tomorrow", "preferred_time": "2pm"}}'
```

### Test via API Endpoint

Visit: `https://xom3.io/api/mcp` (GET) to see available tools.

---

## File Structure

```
xom3-app/
├── app/
│   └── api/
│       └── mcp/
│           └── route.ts          # MCP server endpoint
└── lib/
    └── mcp/
        ├── index.ts              # Module exports
        ├── types.ts              # Type definitions
        ├── clients.ts            # Client configurations
        └── tools/
            ├── index.ts          # Tool definitions
            ├── lookup-lead.ts    # Lead lookup
            ├── update-status.ts  # Status update
            ├── appointment.ts    # Booking & availability
            ├── sms-confirm.ts    # SMS confirmations
            └── transfer.ts       # Human transfer
```

---

## Current Clients

| Client ID | Name | Retell Agent | Airtable Base |
|-----------|------|--------------|---------------|
| opus1 | Opus1 Healthcare | Charlette - PulseVera Qualifier | appCkU8L3sdmqaAmI |
| xom3 | XOM3 Commander | (To be configured) | app4y7GKkeUfZm8rS |

---

## Next Steps

1. ✅ MCP Server built and deployed
2. ⬜ Configure Retell agent with MCP server URL
3. ⬜ Add environment variables for SMS/transfer numbers
4. ⬜ Test each tool individually
5. ⬜ Update agent prompt with tool instructions




































