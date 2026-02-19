# Enterprise Data Transformation Engine (EDTE)

**Status:** ✅ Active  
**Version:** 1.0.0  
**Purpose:** Transform, clean, validate, and migrate data across tenants, workflows, and modules

---

## Overview

The Enterprise Data Transformation Engine (EDTE) is the **data refinery** for XOM3. It transforms XOM3 from a system that *moves data* into a system that **reshapes**, **cleans**, **validates**, and **transforms** data across tenants, workflows, and modules.

### Core Capabilities

- ✅ **Schema Mapping** - Map fields from source to target schemas
- ✅ **Data Cleaning** - Normalize, sanitize, and format data
- ✅ **Validation** - Validate data against schemas and rules
- ✅ **Transformation Functions** - 20+ built-in transformation functions
- ✅ **Multi-Tenant Profiles** - Tenant-specific transformation profiles
- ✅ **Pipeline Execution** - Automated migration and sync pipelines
- ✅ **Legacy Migration** - Convert legacy systems → XOM3
- ✅ **Downstream Sync** - Sync XOM3 → downstream systems

---

## Architecture

### Core Components

```
lib/transformation/
├── types.ts          # Type definitions
├── registry.ts      # Transformation function registry
├── validator.ts     # Validation engine
├── cleaner.ts       # Data cleaning engine
├── transformer.ts   # Core transformation engine
├── pipeline.ts      # Pipeline executor
└── index.ts         # Main exports
```

### API Routes

```
app/api/transformation/
├── map/route.ts          # Field mapping
├── validate/route.ts     # Data validation
├── transform/route.ts    # Record transformation
├── pipeline/route.ts     # Pipeline management
├── schema/route.ts       # Schema mapping CRUD
└── functions/route.ts    # List transformation functions
```

---

## Usage

### 1. Schema Mapping

Create a mapping between source and target schemas:

```typescript
import { SchemaMapping } from "@/lib/transformation/types";

const mapping: SchemaMapping = {
  id: "legacy-to-xom3",
  name: "Legacy CRM → XOM3",
  sourceSchema: {
    name: "Legacy CRM",
    fields: [
      { name: "full_name", type: "string" },
      { name: "email_addr", type: "email" },
      { name: "phone_num", type: "phone" }
    ]
  },
  targetSchema: {
    name: "XOM3 Clients",
    fields: [
      { name: "name", type: "string", required: true },
      { name: "email", type: "email", required: true },
      { name: "phone", type: "phone" }
    ]
  },
  fieldMappings: [
    { sourceField: "full_name", targetField: "name", transformation: "trim" },
    { sourceField: "email_addr", targetField: "email", transformation: "normalizeEmail" },
    { sourceField: "phone_num", targetField: "phone", transformation: "normalizePhone" }
  ]
};
```

### 2. Transformation Profile

Define cleaning, validation, and transformation rules:

```typescript
import { TransformationProfile } from "@/lib/transformation/types";

const profile: TransformationProfile = {
  id: "healthcare-profile",
  name: "Healthcare Data Profile",
  schemaMappingId: "legacy-to-xom3",
  cleaningRules: [
    { field: "email", operation: "normalizeEmail" },
    { field: "phone", operation: "normalizePhone" },
    { field: "name", operation: "trim" }
  ],
  validationRules: [
    { type: "required", value: true, message: "Email is required" }
  ],
  transformationRules: [
    { field: "name", operation: "capitalize" }
  ]
};
```

### 3. Transform Records

Transform a single record or batch:

```typescript
import { transformRecord, transformBatch } from "@/lib/transformation/transformer";

// Single record
const result = transformRecord(sourceRecord, mapping, profile);

// Batch
const batchResult = transformBatch(sourceRecords, mapping, profile);
```

### 4. Pipeline Execution

Create and execute a transformation pipeline:

```typescript
import { executePipeline } from "@/lib/transformation/pipeline";

const pipeline = {
  id: "migration-pipeline",
  name: "Legacy CRM Migration",
  source: {
    type: "airtable",
    config: { baseId: "...", table: "Legacy Clients" }
  },
  target: {
    type: "airtable",
    config: { baseId: "...", table: "Clients" }
  },
  transformationProfileId: "healthcare-profile",
  active: true
};

const execution = await executePipeline(pipeline, mapping, profile);
```

---

## Transformation Functions

### String Transformations
- `trim` - Remove leading/trailing whitespace
- `lowercase` - Convert to lowercase
- `uppercase` - Convert to uppercase
- `capitalize` - Capitalize first letter of each word
- `removeSpecialChars` - Remove special characters
- `substring` - Extract substring

### Data Normalization
- `normalizePhone` - Normalize to E.164 format
- `normalizeEmail` - Normalize email (lowercase, trim)
- `normalizeDate` - Parse and format dates

### Number Transformations
- `parseNumber` - Parse string to number
- `round` - Round to decimal places

### Array Transformations
- `join` - Join array with separator
- `split` - Split string into array

### Conditional
- `ifThen` - Apply transformation conditionally
- `defaultValue` - Return default if empty

---

## Validation Rules

### Types
- `required` - Field must have a value
- `format` - Validate format (email, phone, url, date)
- `pattern` - Validate against regex pattern
- `range` - Validate number range (min/max)
- `custom` - Custom validation function

### Example

```typescript
const validationRules = [
  { type: "required", message: "Email is required" },
  { type: "format", value: "email", message: "Invalid email format" },
  { type: "pattern", value: "^[A-Z][a-z]+$", message: "Name must start with capital" }
];
```

---

## API Endpoints

### POST `/api/transformation/map`
Map fields from source to target schema.

**Request:**
```json
{
  "record": { "full_name": "John Doe", "email": "john@example.com" },
  "fieldMappings": [
    { "sourceField": "full_name", "targetField": "name" },
    { "sourceField": "email", "targetField": "email" }
  ]
}
```

### POST `/api/transformation/validate`
Validate a record against a schema.

**Request:**
```json
{
  "record": { "name": "John Doe", "email": "john@example.com" },
  "schema": [
    { "name": "name", "type": "string", "required": true },
    { "name": "email", "type": "email", "required": true }
  ]
}
```

### POST `/api/transformation/transform`
Transform a record or batch.

**Request:**
```json
{
  "records": [{ "full_name": "John Doe" }],
  "mapping": { ... },
  "profile": { ... },
  "batch": true
}
```

### POST `/api/transformation/pipeline`
Create or execute a pipeline.

**Request:**
```json
{
  "action": "create",
  "pipeline": { ... },
  "mapping": { ... },
  "profile": { ... }
}
```

### GET `/api/transformation/functions`
List all available transformation functions.

---

## Multi-Tenant Support

All transformation operations are tenant-scoped:

- Schema mappings are tenant-specific
- Transformation profiles are tenant-specific
- Pipelines are tenant-specific
- Data isolation is enforced

---

## Integration Points

### Import/Export Engines
- EDTE integrates with existing import/export engines
- Can transform data during import
- Can transform data before export

### Workflow Engine
- Pipelines can be triggered by workflows
- Transformation results can trigger workflows

### Audit Engine
- All transformations are logged
- Pipeline executions are audited
- Validation errors are tracked

---

## Future Enhancements

- [ ] Database persistence for mappings/profiles/pipelines
- [ ] Scheduled pipeline execution (cron)
- [ ] Real-time transformation monitoring
- [ ] Custom transformation function registration
- [ ] Transformation templates library
- [ ] Data quality scoring
- [ ] Transformation preview/dry-run

---

## Status

✅ **Core Engine** - Complete  
✅ **API Routes** - Complete  
✅ **UI Components** - Complete  
✅ **Integration** - Complete  
🔄 **Database Persistence** - Pending (using in-memory storage)

---

**Built with AKV ignition.** 🔥
