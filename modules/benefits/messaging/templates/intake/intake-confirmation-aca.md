# ACA Intake Confirmation Template

**Template ID:** `intake-confirmation-aca`  
**Category:** Intake Confirmation  
**Lead Type:** ACA  
**Sequence:** Immediate (upon intake)

---

## Template

```
Hi {{firstName}}, thanks for your ACA inquiry! We received your information and will help you explore marketplace options and subsidy eligibility. One of our specialists will reach out within 2 hours. Reply STOP to opt out.
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

Used immediately after ACA lead intake, sent by BenefitsIntakeAgent when:
- Lead type is "ACA"
- SMS opt-in is true
- Phone number is provided
- Intake processing completed successfully

---

## Personalization Notes

- Always use first name
- Emphasize ACA/marketplace context
- Mention subsidy eligibility (key value prop for ACA)
- Set expectation for 2-hour response time

---

## Character Count

~175 characters (may need to split for strict 160-char limit)

---

## Alternative Shorter Version

```
Hi {{firstName}}, thanks for your ACA inquiry! We'll help you explore marketplace options and subsidies. A specialist will reach out within 2 hours. Reply STOP to opt out.
```

**Character count:** ~155 characters
