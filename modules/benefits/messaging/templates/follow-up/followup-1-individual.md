# Individual/Family (Private Plans) First Follow-Up Template

**Template ID:** `followup-1-individual`  
**Category:** Follow-Up  
**Lead Type:** Individual/Family (Private Plans - Primary Focus)  
**Sequence:** 1st Follow-up  
**Timing:** 2 hours after intake

---

## Template

```
Hi {{firstName}}, this is {{agentName}} following up on your private plan inquiry{{#if planName}} about {{planName}}{{/if}}. Ready to explore your options? Reply YES or call {{phoneNumber}}. Reply STOP to opt out.
```

---

## Variables

- `{{firstName}}` - Client's first name (required)
- `{{agentName}}` - Assigned agent name (required)
- `{{phoneNumber}}` - Call-back phone number (required)
- `{{planName}}` - Specific plan name if detected (optional)

---

## Compliance

- **Opt-in required:** Yes (must be explicitly opted in)
- **Opt-out text:** "Reply STOP to opt out" (included)
- **Disclaimer:** Company identifier included implicitly
- **Delivery tracking:** Required

---

## Usage

Sent by BenefitsFollowupAgent as first follow-up for Individual/Family leads:
- Lead type is "Individual/Family"
- 2 hours have passed since intake
- SMS opt-in is true
- Follow-up task is due

---

## Personalization Notes

- Use first name
- Include agent name (builds personal connection)
- **Include specific plan name if detected** (shows we remember their specific interest)
- Emphasize exploring options (private plans offer flexibility)
- Provide clear call-to-action (YES or call number)
- This is the PRIMARY lead type, so messaging should be polished

---

## Character Count

- Without plan name: ~175 characters
- With plan name: ~195-215 characters (may need to split)

---

## Alternative Shorter Version

```
Hi {{firstName}}, {{agentName}} here. Ready to explore your private plan options? Reply YES or call {{phoneNumber}}. Reply STOP to opt out.
```

**Character count:** ~135 characters
