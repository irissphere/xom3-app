# Benefits CRM Messaging System

**Status:** Active  
**Purpose:** Unified messaging system for Benefits CRM SMS templates, sequences, and personalization

---

## Overview

The Benefits CRM messaging system provides a centralized library of SMS templates, follow-up sequences, and personalization logic for all Benefits CRM communications. The system is designed to:

- Maintain consistent tone and voice across all messages
- Support personalization with lead data
- Ensure compliance (opt-in, opt-out, disclaimers)
- Track message performance
- Integrate seamlessly with agents and workflows

---

## Structure

```
messaging/
├── README.md (this file)
├── MESSAGING_STRATEGY.md - Complete messaging strategy documentation
├── template-loader.ts - Template loading and personalization engine
├── templates/
│   ├── intake/
│   │   ├── intake-confirmation-aca.md
│   │   ├── intake-confirmation-medicare.md
│   │   ├── intake-confirmation-employer.md
│   │   └── intake-confirmation-individual.md
│   └── follow-up/
│       ├── followup-1-aca.md
│       ├── followup-1-individual.md
│       └── [additional templates]
└── sequences/
    ├── aca-sequence.md
    ├── medicare-sequence.md
    ├── employer-sequence.md
    └── individual-sequence.md
```

---

## Quick Start

### Using Templates in Agents

```typescript
import { templateLoader } from "../messaging/template-loader";

// Get intake confirmation message
const message = templateLoader.getIntakeConfirmationMessage(
  "Individual/Family",
  {
    firstName: "John",
    planName: "United Premiere Advantage",
    companyName: "Benefits Specialist",
  }
);

// Personalize and send
if (message) {
  const parts = templateLoader.splitMessage(message, 160);
  // Send via SMS provider
}
```

### Using Templates in Workflows

Templates are accessible via the template loader and can be used in:
- BenefitsIntakeAgent (intake confirmations)
- BenefitsFollowupAgent (follow-up sequences)
- n8n workflows (via API calls)

---

## Template Variables

All templates support these variables:

- `{{firstName}}` - Client's first name (required)
- `{{lastName}}` - Client's last name (optional)
- `{{leadType}}` - ACA, Medicare, Employer, Individual/Family
- `{{planName}}` - Specific plan name if detected
- `{{agentName}}` - Assigned agent name
- `{{companyName}}` - Company name
- `{{phoneNumber}}` - Call-back phone number
- `{{enrollmentDeadline}}` - Enrollment deadline date
- `{{daysSinceIntake}}` - Days since initial intake
- `{{nextStep}}` - Next action item
- `{{employerName}}` - Employer name (for employer leads)

---

## Follow-Up Sequences

### ACA Sequence
- Intake confirmation (immediate)
- 1st follow-up (2 hours)
- 2nd follow-up (24 hours)
- 3rd follow-up (3 days)
- Check-in (7 days)
- Enrollment reminder (1 day before deadline)

### Medicare Sequence
- Intake confirmation (immediate)
- 1st follow-up (1 hour)
- 2nd follow-up (4 hours)
- 3rd follow-up (24 hours)
- Check-in (5 days)
- Enrollment reminder (3 days before deadline)

### Employer Sequence
- Intake confirmation (immediate)
- 1st follow-up (4 hours)
- 2nd follow-up (24 hours)
- 3rd follow-up (3 days)
- Check-in (7 days)
- Enrollment reminder (5 days before deadline)

### Individual/Family Sequence (PRIMARY FOCUS)
- Intake confirmation (immediate)
- 1st follow-up (2 hours)
- 2nd follow-up (24 hours)
- 3rd follow-up (3 days)
- Check-in (7 days)
- Enrollment reminder (2 days before deadline)

---

## Compliance

### Opt-In Requirements
- Explicit opt-in required before sending SMS
- Opt-in must be logged with timestamp
- Double opt-in recommended

### Opt-Out Handling
- Every SMS includes opt-out instructions
- Standard text: "Reply STOP to opt out"
- Opt-out processed immediately
- Opt-out logged and sequence stopped

### Disclaimers
- Company identifier included
- Opt-out instructions included
- HIPAA compliance (when applicable)
- TCPA compliance

---

## Personalization Guidelines

### Name Usage
- Always use first name in greeting
- Use full name only when formality required
- Handle missing names gracefully

### Context Awareness
- Reference specific plan mentioned (especially for Individual/Family leads)
- Reference previous interactions
- Reference enrollment deadlines
- Reference urgent needs

### Lead Type Specificity
- **ACA:** Emphasize subsidy eligibility, enrollment period
- **Medicare:** Emphasize age-eligibility, plan options
- **Employer:** Emphasize group benefits, enrollment window
- **Individual/Family:** Emphasize private plan options, flexibility, **include plan name when detected**

---

## Integration

### Agent Integration

**BenefitsIntakeAgent:**
- Sends intake confirmation SMS using `getIntakeConfirmationMessage()`
- Personalizes with lead data (name, plan name, lead type)
- Logs SMS send to interactions table

**BenefitsFollowupAgent:**
- Sends follow-up SMS using `getFollowUpMessage()`
- Selects template based on lead type and sequence number
- Personalizes with agent name, phone number, etc.

### Workflow Integration

n8n workflows can trigger SMS sends via:
- API endpoints that use template loader
- Direct agent calls
- Workflow nodes configured with templates

---

## Adding New Templates

1. Create template file in appropriate directory (`templates/intake/` or `templates/follow-up/`)
2. Follow existing template format (see examples)
3. Add template content to `template-loader.ts` TEMPLATE_STORAGE object
4. Update sequence documentation if needed
5. Test personalization with sample data

---

## Performance Targets

- **Delivery Rate:** >98%
- **Response Rate:** >15%
- **Opt-Out Rate:** <5%
- **Conversion Rate:** Varies by lead type and sequence

---

## Source of Truth

The messaging system treats the following as authoritative sources:
- Latest template files in `templates/` directory
- Messaging strategy in `MESSAGING_STRATEGY.md`
- Sequence definitions in `sequences/` directory
- Agent specifications (for cadence and timing)

**Always use the most recent version** - When new templates or updates are added, they become the authoritative source.

---

## Future Enhancements

- [ ] A/B testing framework
- [ ] Template versioning
- [ ] Multi-language support
- [ ] Rich media SMS (images, links)
- [ ] Template analytics dashboard
- [ ] Dynamic template selection based on engagement
- [ ] AI-powered message optimization

---

**Built the AKV way: clean, modular, scalable, unstoppable.**
