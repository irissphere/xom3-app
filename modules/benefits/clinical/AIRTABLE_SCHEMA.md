# Clinical Layer — Airtable Schema Guide

## Required Fields on `Clients` Table

Add these fields to your existing **Clients** table:

| Field Name | Type | Description |
|------------|------|-------------|
| `Has Clinical Data` | Checkbox | Indicates clinical info exists |
| `Clinical Summary` | Long text | Clinical notes, conditions |
| `Linked Provider ID` | Single line text | Provider reference |

---

## Optional: `Clinical Profiles` Table

| Field Name | Type | Description |
|------------|------|-------------|
| `Profile ID` | Autonumber | Unique identifier |
| `Client` | Link to Clients | Links to Clients table |
| `Provider Name` | Single line text | Provider name |
| `Provider NPI` | Single line text | NPI number |
| `Provider Specialty` | Single select | Specialty |
| `Diagnosis Codes` | Long text | ICD-10 codes |
| `Clinical Notes` | Long text | Detailed notes |
| `Last Visit Date` | Date | Last visit |
| `Next Appointment` | Date | Next scheduled |
| `Medications` | Long text | Current meds |
| `Allergies` | Long text | Allergies |
| `Flags` | Multi-select | `High Risk`, `Pre-Auth Required`, `Special Needs`, `Priority` |
| `Plan Recommendations` | Long text | Coverage recommendations |

---

## Quick Setup

1. Open Airtable Clients table
2. Add: `Has Clinical Data` (Checkbox)
3. Add: `Clinical Summary` (Long text)
4. Add: `Linked Provider ID` (Single line text)
5. Save and refresh Benefits CRM

---

## Testing

1. Pick any client in Airtable
2. Check `Has Clinical Data` ✅
3. Add a `Clinical Summary`
4. Add a `Linked Provider ID`
5. Refresh Benefits CRM
6. Clinical button should glow teal
7. Click to open drawer with tabs
