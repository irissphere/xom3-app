# Individual/Family (Private Plans) Intake Confirmation Template

**Template ID:** `intake-confirmation-individual`  
**Category:** Intake Confirmation  
**Lead Type:** Individual/Family (Private Plans - Primary Focus)  
**Sequence:** Immediate (upon intake)

---

## Template

```
Hi {{firstName}}, thanks for your private plan inquiry{{#if planName}} about {{planName}}{{/if}}! We received your information and will help you explore private health insurance options. A specialist will reach out within 2 hours. Reply STOP to opt out.
```

---

## Variables

- `{{firstName}}` - Client's first name (required)
- `{{planName}}` - Specific plan name if detected (optional, e.g., "United Premiere Advantage")

---

## Compliance

- **Opt-in required:** Yes (must be explicitly opted in)
- **Opt-out text:** "Reply STOP to opt out" (included)
- **Disclaimer:** Company identifier included implicitly
- **Delivery tracking:** Required

---

## Usage

Used immediately after Individual/Family lead intake, sent by BenefitsIntakeAgent when:
- Lead type is "Individual/Family"
- SMS opt-in is true
- Phone number is provided
- Intake processing completed successfully

---

## Personalization Notes

- Always use first name
- **Include specific plan name if detected** (e.g., "United Premiere Advantage") - this shows we understand their specific need
- Emphasize private plan options (key value prop for this lead type)
- Set expectation for 2-hour response time
- This is the PRIMARY lead type, so messaging should be polished and effective

---

## Character Count

- Without plan name: ~180 characters
- With plan name: ~200-220 characters (may need to split)

---

## Alternative Shorter Version

```
Hi {{firstName}}, thanks for your private plan inquiry! We'll help explore your health insurance options. A specialist will call within 2 hours. Reply STOP to opt out.
```

**Character count:** ~150 characters

---

## Version with Plan Name (Short)

```
Hi {{firstName}}, thanks for your {{planName}} inquiry! We'll help explore this plan and alternatives. A specialist will call within 2 hours. Reply STOP to opt out.
```

**Character count:** ~160 characters (with typical plan name)
