# ACA First Follow-Up Template

**Template ID:** `followup-1-aca`  
**Category:** Follow-Up  
**Lead Type:** ACA  
**Sequence:** 1st Follow-up  
**Timing:** 2 hours after intake

---

## Template

```
Hi {{firstName}}, this is {{agentName}} following up on your ACA inquiry. Would you like to schedule a call to discuss marketplace options and see if you qualify for subsidies? Reply YES or call {{phoneNumber}}. Reply STOP to opt out.
```

---

## Variables

- `{{firstName}}` - Client's first name (required)
- `{{agentName}}` - Assigned agent name (required)
- `{{phoneNumber}}` - Call-back phone number (required)

---

## Compliance

- **Opt-in required:** Yes (must be explicitly opted in)
- **Opt-out text:** "Reply STOP to opt out" (included)
- **Disclaimer:** Company identifier included implicitly
- **Delivery tracking:** Required

---

## Usage

Sent by BenefitsFollowupAgent as first follow-up for ACA leads:
- Lead type is "ACA"
- 2 hours have passed since intake
- SMS opt-in is true
- Follow-up task is due

---

## Personalization Notes

- Use first name
- Include agent name (builds personal connection)
- Emphasize subsidy qualification (key value prop for ACA)
- Provide clear call-to-action (YES or call number)
- Include opt-out

---

## Character Count

~210 characters (will need to split into 2 messages)

---

## Alternative Shorter Version

```
Hi {{firstName}}, {{agentName}} here. Ready to discuss ACA options and subsidies? Reply YES or call {{phoneNumber}}. Reply STOP to opt out.
```

**Character count:** ~145 characters
