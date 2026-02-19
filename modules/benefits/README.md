# XOM3 Benefits CRM Module

**Purpose:** Benefits CRM functionality for handling benefits leads, eligibility, enrollment, and SMS messaging  
**Status:** Module Scaffold  
**Date:** 2025-01-02

---

## Overview

This module provides Benefits CRM functionality for handling benefits leads (ACA, Medicare, Employer, Individual/Family), eligibility checks, enrollment workflows, follow-ups, and SMS messaging automation.

---

## Features

### Benefits Leads
- Lead intake and management
- Lead classification (ACA, Medicare, Employer, **Individual/Family with primary focus on private plans**)
- Eligibility verification (with special handling for private plans)
- Enrollment tracking

### Follow-Ups & Tasks
- Scheduled callback management
- Lead check-in automation
- Reminder generation and delivery
- Task assignment and tracking
- SLA tracking and overdue management
- Follow-up cadence enforcement

### SMS Messaging
- SMS template management
- SMS sequence automation
- Opt-in/opt-out handling
- Delivery tracking
- Compliance logging

### Workflow Automation
- CRM event detection
- Status change triggers
- Outcome-based automation
- Signal generation and routing

---

## Integration Points

### Airtable
- **Base:** Benefits CRM Base
- **Tables:** 
  - Clients (Benefits leads)
  - Tasks (Follow-up tasks)
  - Interactions (All touchpoints)
  - SMS Log (SMS delivery tracking)
- **API:** Via XOM3 API layer

### n8n Workflows
- `benefits-intake-workflow` - Benefits intake processing
- `benefits-followup-workflow` - Follow-up task generation
- `benefits-sms-workflow` - SMS messaging automation

---

## Module Structure

```
benefits/
├── README.md (this file)
├── agents/
│   ├── benefits-intake-agent.ts
│   ├── benefits-followup-agent.ts
│   ├── handlers.ts
│   ├── types.ts
│   └── registry.ts
├── components/     # React components (future)
├── api/            # API routes (future)
└── hooks/          # React hooks (future)
```

---

## Agents

### Benefits Intake Agent
- **Agent ID:** `benefits-intake`
- **Lane:** `benefitscrm-intake-triage`
- **Purpose:** Processes benefits leads, normalizes data, deduplicates, classifies, and routes

### Benefits Follow-up Agent
- **Agent ID:** `benefits-followup`
- **Lane:** `benefitscrm-followups-tasks`
- **Purpose:** Manages follow-up tasks, SMS messaging, and SLA tracking

---

## Knowledge Base Integration

The Benefits CRM module uses the latest information from the workspace:

1. **Messaging Strategy & Templates** - From `messaging/` directory (PRIMARY SOURCE)
2. **Lead Messaging Templates** - From "PulseVera Lead Messaging" folder (when available)
3. **SMS Templates** - From messaging library (`messaging/templates/`)
4. **Follow-up Sequences** - From messaging sequences (`messaging/sequences/`)
5. **Triage Rules** - From workflow descriptions
6. **Classification Logic** - From intake logic documents
7. **Follow-up Cadences** - From follow-up rules documents and messaging sequences
8. **Eligibility Criteria** - From eligibility documents
9. **Enrollment Steps** - From enrollment workflow documents

**Always uses the most recent version** - When new documents are added, they become the authoritative source.

### Messaging System

The Benefits CRM includes a complete messaging system with:
- **Template Library** - SMS templates for intake, follow-ups, enrollment
- **Personalization Engine** - Variable substitution and context-aware messaging
- **Follow-up Sequences** - Defined cadences for each lead type
- **Compliance Handling** - Opt-in/opt-out, disclaimers, delivery tracking

See `messaging/README.md` for complete documentation.

---

## SMS Integration

### SMS Template System
- Templates stored in knowledge base
- Personalized using lead data
- Compliance rules (opt-in, opt-out, disclaimers)
- Tone matching operator's historical messaging

### SMS Sequences
- Initial intake confirmation
- Follow-up reminders (by lead type)
- Enrollment reminders
- Check-in messages
- Custom sequences based on lead type

### Compliance
- Opt-in verification required
- Opt-out handling
- Required disclaimers
- Delivery tracking
- Compliance logging

---

## Subscription Tier

**Benefits CRM Module:** Enterprise tier ($2,500/mo or $27,000/yr)

---

## Migration Status

- [x] Module scaffold created
- [x] Agent types defined
- [x] Benefits Intake Agent implemented
- [x] Benefits Follow-up Agent implemented
- [x] n8n workflows created
- [x] API integration implemented
- [ ] Frontend components built
- [ ] SMS provider integration
- [ ] Knowledge base structure
- [ ] Testing complete

---

## Next Steps

1. Complete Benefits Follow-up Agent implementation
2. Create n8n workflows
3. Set up Airtable tables
4. Configure SMS provider
5. Create knowledge base structure
6. Build dashboard components
7. Test end-to-end flows

---

*Steward: Auren Kairos Vieron*  
*Sacred Number: 108*
