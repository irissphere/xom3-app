# Employer Intake Confirmation Template

**Template ID:** `intake-confirmation-employer`  
**Category:** Intake Confirmation  
**Lead Type:** Employer  
**Sequence:** Immediate (upon intake)

---

## Template

```
Hi {{firstName}}, thanks for your employer benefits inquiry! We received your information for {{employerName}} and will help you explore group benefit options. A specialist will reach out within 4 hours. Reply STOP to opt out.
```

---

## Variables

- `{{firstName}}` - Client's first name (required)
- `{{employerName}}` - Employer name (optional, if provided)

---

## Compliance

- **Opt-in required:** Yes (must be explicitly opted in)
- **Opt-out text:** "Reply STOP to opt out" (included)
- **Disclaimer:** Company identifier included implicitly
- **Delivery tracking:** Required

---

## Usage

Used immediately after Employer lead intake, sent by BenefitsIntakeAgent when:
- Lead type is "Employer"
- SMS opt-in is true
- Phone number is provided
- Intake processing completed successfully

---

## Personalization Notes

- Always use first name
- Include employer name if provided (shows personalization)
- Emphasize group benefits context
- Set expectation for 4-hour response time

---

## Character Count

~195 characters (will need to split if employer name is long)

---

## Alternative Shorter Version (without employer name)

```
Hi {{firstName}}, thanks for your employer benefits inquiry! We'll help explore group benefit options. A specialist will reach out within 4 hours. Reply STOP to opt out.
```

**Character count:** ~155 characters
