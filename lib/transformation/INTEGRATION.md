# EDTE Integration Guide

## Quick Start

The Enterprise Data Transformation Engine (EDTE) is now fully integrated into XOM3.

### Access Points

1. **Healthcare Dashboard** → Transformation Panel
   - Navigate to `/app/healthcare`
   - Scroll to "Enterprise Data Transformation Engine" section
   - Three tabs: Schema Mapper, Validator, Pipeline Builder

2. **API Endpoints**
   - `/api/transformation/map` - Field mapping
   - `/api/transformation/validate` - Data validation
   - `/api/transformation/transform` - Record transformation
   - `/api/transformation/pipeline` - Pipeline management
   - `/api/transformation/schema` - Schema mapping CRUD
   - `/api/transformation/functions` - List transformation functions

### Integration with Existing Engines

#### Import Engine
The EDTE can transform data during import:

```typescript
// In import route, after parsing CSV:
const transformed = transformBatch(records, mapping, profile);
// Then insert transformed records
```

#### Export Engine
The EDTE can transform data before export:

```typescript
// In export route, before generating CSV:
const transformed = transformBatch(records, mapping, profile);
// Then export transformed records
```

#### Multi-Tenant System
All transformations are tenant-scoped via `resolveTenant()`:
- Schema mappings are isolated per tenant
- Transformation profiles are tenant-specific
- Pipelines respect tenant boundaries

### Example: Legacy CRM Migration

1. **Create Schema Mapping**
   - Source: Legacy CRM fields (full_name, email_addr, phone_num)
   - Target: XOM3 fields (name, email, phone)
   - Map fields with transformations

2. **Create Transformation Profile**
   - Cleaning: normalizeEmail, normalizePhone, trim
   - Validation: required fields, format checks
   - Transformations: capitalize names

3. **Create Pipeline**
   - Source: Legacy Airtable base
   - Target: XOM3 Clients table
   - Attach mapping and profile

4. **Execute Pipeline**
   - Transforms all records
   - Validates data
   - Loads to target

### Next Steps

1. **Add Database Persistence**
   - Currently using in-memory storage
   - Migrate to Airtable or database for persistence

2. **Add Scheduled Pipelines**
   - Cron-based execution
   - Recurring transformations

3. **Add Transformation Templates**
   - Pre-built mappings for common scenarios
   - Legacy system → XOM3 templates

4. **Add Monitoring**
   - Pipeline execution history
   - Transformation success rates
   - Error tracking

---

**Status:** ✅ Fully Integrated  
**Ready for:** Production use (with database persistence)
