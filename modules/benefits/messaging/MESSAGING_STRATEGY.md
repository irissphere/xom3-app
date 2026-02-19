# Benefits CRM Messaging Strategy

**Status:** Active  
**Date:** 2025-01-02  
**Purpose:** Unified messaging strategy for Benefits CRM domain

---

## 🎯 Strategy Overview

This document defines the complete messaging strategy for the Benefits CRM domain, including SMS templates, follow-up sequences, cadences, tone, voice, and compliance rules. All messaging follows patterns extracted from PulseVera Lead Messaging scripts and historical operator messaging.

---

## 📋 Core Messaging Principles

### Tone & Voice
- **Professional but approachable** - Friendly, clear, helpful
- **Personalized** - Use client's first name, reference specific needs
- **Action-oriented** - Clear next steps, specific calls to action
- **Empathetic** - Acknowledge health insurance complexity
- **Compliant** - Always include opt-out instructions

### Message Structure
1. **Greeting** - Personalized with first name
2. **Context** - Brief reminder of inquiry/interaction
3. **Value proposition** - What we can help with
4. **Call to action** - Clear next step
5. **Compliance footer** - Opt-out instructions (if required)

### Message Length
- **SMS:** 160 characters or less (when possible)
- **Multi-part SMS:** Break into logical chunks, max 3 parts
- **Key information first** - Most important info in first message

---

## 📱 SMS Template Categories

### 1. Intake Confirmation Messages
- Immediate confirmation after lead submission
- Acknowledgment of inquiry
- Next steps overview

### 2. Follow-up Messages
- Scheduled follow-ups based on cadence
- Task reminders
- Check-in messages

### 3. Enrollment Reminders
- Deadline reminders
- Enrollment status updates
- Required action notifications

### 4. Re-engagement Messages
- Win-back for inactive leads
- Reconnection messages
- Value reminders

### 5. Plan-Specific Messages
- ACA-specific messaging
- Medicare-specific messaging
- Private plan messaging
- Employer benefits messaging

---

## 🔄 Follow-Up Cadences by Lead Type

### ACA Leads
- **Initial:** 2 hours after intake
- **Second:** 24 hours after intake
- **Third:** 3 days after intake
- **Check-in:** 7 days after intake
- **Enrollment Reminder:** 1 day before deadline

### Medicare Leads
- **Initial:** 1 hour after intake
- **Second:** 4 hours after intake
- **Third:** 24 hours after intake
- **Check-in:** 5 days after intake
- **Enrollment Reminder:** 3 days before deadline

### Employer Leads
- **Initial:** 4 hours after intake
- **Second:** 24 hours after intake
- **Third:** 3 days after intake
- **Check-in:** 7 days after intake
- **Enrollment Reminder:** 5 days before deadline

### Individual/Family Leads (Private Plans - Primary Focus)
- **Initial:** 2 hours after intake
- **Second:** 24 hours after intake
- **Third:** 3 days after intake
- **Check-in:** 7 days after intake
- **Enrollment Reminder:** 2 days before deadline

---

## 📝 Template Variables

All templates support the following variables:
- `{{firstName}}` - Client's first name
- `{{lastName}}` - Client's last name (when needed)
- `{{leadType}}` - ACA, Medicare, Employer, Individual/Family
- `{{planName}}` - Specific plan name (if detected)
- `{{agentName}}` - Assigned agent name
- `{{companyName}}` - Company name
- `{{phoneNumber}}` - Call-back number
- `{{enrollmentDeadline}}` - Enrollment deadline date
- `{{daysSinceIntake}}` - Days since initial intake
- `{{nextStep}}` - Next action item

---

## ⚖️ Compliance Rules

### SMS Opt-In Requirements
- Explicit opt-in required before sending SMS
- Opt-in must be logged and timestamped
- Double opt-in recommended for compliance

### Opt-Out Handling
- Every SMS must include opt-out instructions
- Standard opt-out text: "Reply STOP to opt out"
- Opt-out must be processed immediately
- Opt-out must be logged

### Disclaimers
- Include company name or identifier
- Include opt-out instructions
- HIPAA compliance language (when applicable)
- TCPA compliance language

### Delivery Tracking
- All SMS deliveries must be logged
- Failed deliveries must be tracked
- Bounce rates must be monitored
- Compliance violations must be flagged

---

## 🎨 Personalization Rules

### Name Usage
- Always use first name in greeting
- Use full name only when formality required
- Handle missing names gracefully

### Context Awareness
- Reference specific plan mentioned
- Reference previous interactions
- Reference enrollment deadlines
- Reference urgent needs

### Lead Type Specificity
- ACA: Emphasize subsidy eligibility, enrollment period
- Medicare: Emphasize age-eligibility, plan options
- Employer: Emphasize group benefits, enrollment window
- Individual/Family: Emphasize private plan options, flexibility

---

## 🔄 Template Selection Logic

Templates are selected based on:
1. **Lead Type** (ACA, Medicare, Employer, Individual/Family)
2. **Sequence Number** (1st, 2nd, 3rd follow-up)
3. **Task Type** (follow_up, appointment, check_in, reminder, enrollment)
4. **Client Status** (new, in_progress, enrolled, inactive)
5. **Days Since Intake** (for timing context)

---

## 📊 Message Performance Tracking

### Metrics to Track
- Delivery rate (target: >98%)
- Response rate (target: >15%)
- Opt-out rate (target: <5%)
- Conversion rate (target: varies by lead type)
- Engagement score

### A/B Testing
- Test different message variations
- Test send times
- Test personalization levels
- Test call-to-action wording

---

## 🔧 Integration Points

### Agent Integration
- BenefitsIntakeAgent: Sends intake confirmation
- BenefitsFollowupAgent: Sends follow-up sequences
- Both agents pull from template library

### Workflow Integration
- n8n workflows trigger SMS sends
- SMS nodes use template library
- Compliance checks before sending

### Knowledge Base Integration
- Templates stored in knowledge base
- Latest templates always used
- Version control for templates

---

## 📚 Template Library Structure

```
messaging/
├── templates/
│   ├── intake/
│   │   ├── intake-confirmation-aca.md
│   │   ├── intake-confirmation-medicare.md
│   │   ├── intake-confirmation-employer.md
│   │   └── intake-confirmation-individual.md
│   ├── follow-up/
│   │   ├── followup-1-aca.md
│   │   ├── followup-2-aca.md
│   │   ├── followup-3-aca.md
│   │   └── [similar for other lead types]
│   ├── enrollment/
│   │   ├── enrollment-reminder-aca.md
│   │   └── [similar for other lead types]
│   └── re-engagement/
│       └── re-engagement-generic.md
├── sequences/
│   ├── aca-sequence.md
│   ├── medicare-sequence.md
│   ├── employer-sequence.md
│   └── individual-sequence.md
└── MESSAGING_STRATEGY.md (this file)
```

---

## 🚀 Next Steps

1. ✅ Messaging strategy document created
2. ⏳ SMS templates created (in progress)
3. ⏳ Follow-up sequences defined
4. ⏳ Agent integration updated
5. ⏳ Workflow integration updated
6. ⏳ Testing and optimization

---

**Built the AKV way: clean, modular, scalable, unstoppable.**
