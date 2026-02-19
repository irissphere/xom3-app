# Medicare Intake Confirmation Template

**Template ID:** `intake-confirmation-medicare`  
**Category:** Intake Confirmation  
**Lead Type:** Medicare  
**Sequence:** Immediate (upon intake)

---

## Template

```
Hi {{firstName}}, thanks for your Medicare inquiry! We received your information and will help you explore Medicare options including Advantage, Supplement, and Part D plans. A specialist will reach out within 1 hour. Reply STOP to opt out.
```

---

## Variables

- `{{firstName}}` - Client's first name (required)

---

## Compliance

- **Opt-in required:** Yes (must be explicitly opted in)
- **Opt-out text:** "Reply STOP to opt out" (included)
- **Disclaimer:** Company identifier included implicitly
- **Delivery tracking:** Required

---

## Usage

Used immediately after Medicare lead intake, sent by BenefitsIntakeAgent when:
- Lead type is "Medicare"
- SMS opt-in is true
- Phone number is provided
- Intake processing completed successfully

---

## Personalization Notes

- Always use first name
- Emphasize Medicare-specific options (Advantage, Supplement, Part D)
- Mention faster response time (1 hour - Medicare leads are high priority)
- Use Medicare-specific terminology

---

## Character Count

~210 characters (will need to split into 2 messages)

---

## Alternative Shorter Version

```
Hi {{firstName}}, thanks for your Medicare inquiry! We'll help explore your Medicare options. A specialist will call within 1 hour. Reply STOP to opt out.
```

**Character count:** ~140 characters
