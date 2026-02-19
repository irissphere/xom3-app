# XOM3 LIBRARY CONTEXT

Core library modules for the XOM3 cockpit. All shared logic, types, and utilities live here.

---

## Directory Structure

```
lib/
  uoi/                 # Unified Operational Intelligence
  hse/                 # Health Signal Engine
  amp-ai/              # AMP AI Modules (APR, TSE, OSC, etc.)
  pipelines/           # Pipeline definitions and executors
  airtable/            # Airtable client and utilities
  domains/             # Domain-specific logic
    benefitscrm/
    healthcrm/
    broadcast/
    commerce/
```

---

## UOI (Unified Operational Intelligence)

The brain of the cockpit. Processes signals, makes decisions, routes directives.

### Key Files
| File | Purpose |
|------|---------|
| `heartbeat.ts` | Core intelligence loop |
| `signals.ts` | Signal normalization and queue |
| `governance.ts` | Rules, thresholds, constraints |
| `orchestrator.ts` | Decision engine |
| `memory.ts` | Pattern storage |
| `router.ts` | Directive routing |
| `explain.ts` | Human-readable explanations |

### Signal Pattern
```typescript
interface NormalizedSignal {
  source: string;      // "benefitscrm", "workflow", "system"
  type: string;        // "error", "completion", "threshold"
  severity: "low" | "medium" | "high" | "critical";
  payload: any;
  timestamp: number;
}
```

### Heartbeat Output
```typescript
interface HeartbeatOutput {
  decision: "NOOP" | "ACTION";
  directive: { target: string; action: string };
  explanation: string;
  metrics: { errorRate: number; driftCount: number; queuePressure: number };
  timestamp: number;
}
```

---

## HSE (Health Signal Engine)

Real-time health monitoring and posture calculation.

### Key Concepts
- **Posture**: System health state (nominal, elevated, degraded, critical)
- **Signals**: Health indicators from all sovereigns
- **Streaming**: Real-time updates to cockpit

### Usage
```typescript
import { initializeGlobalState, queryState, emitStateUpdate } from "./hse";

// Initialize
initializeGlobalState();

// Query current state
const state = queryState();

// Emit update
emitStateUpdate(["source_tag"]);
```

---

## AMP-AI Modules

Advanced automation and intelligence modules.

| Module | Purpose |
|--------|---------|
| `apr/` | Autonomous Pipeline Rewriting |
| `tse/` | Tenant-Sovereign Engine |
| `osc/` | Orchestration State Continuum |
| `ape/` | Autonomous Pipeline Execution |
| `fao/` | Field-Aware Optimization |

### Pattern
Each module exposes a main orchestrator function:
```typescript
export async function run{Module}(pipeline, data): Promise<{Module}Result>
```

---

## Pipelines

Pipeline definitions and execution.

### Types
```typescript
interface MigrationPipeline {
  id: string;
  name: string;
  domain: string;
  steps: PipelineStep[];
  status: "idle" | "running" | "completed" | "error";
}

interface PipelineStep {
  id: string;
  type: "extract" | "transform" | "load" | "validate";
  config: any;
}
```

### Execution
```typescript
import { executePipeline } from "./pipelines/executor";

const result = await executePipeline(pipeline, { dryRun: false });
```

---

## Airtable Integration

### Client Pattern
```typescript
import Airtable from "airtable";

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
  .base(process.env.AIRTABLE_BASE_ID);

// Query
const records = await base("TableName")
  .select({ maxRecords: 100 })
  .all();
```

### Field Mapping
Always maintain field mappings in domain-specific files:
```typescript
const FIELD_MAP = {
  name: "fldXXXXXXXX",
  email: "fldYYYYYYYY",
  status: "fldZZZZZZZZ",
};
```

---

## Type Patterns

### Export Structure
Each domain folder should have:
```
domains/{domain}/
  types.ts       # All types for this domain
  index.ts       # Public exports
  {feature}.ts   # Feature implementations
```

### Type Naming
- Interfaces: `{Domain}{Concept}` - `BenefitsLeadPayload`
- Enums: `{Domain}{Concept}` - `BenefitsLeadStatus`
- Types: `{Domain}{Concept}` - `BenefitsPlanType`

---

## Common Tasks

### Add New Sovereign
1. Create folder in `lib/{sovereign}/`
2. Add `types.ts` with sovereign interfaces
3. Add `contract.ts` implementing SubsystemContract
4. Add `index.ts` with public exports
5. Register in UOI federation

### Add New Signal Type
1. Define in `uoi/signals.ts`
2. Add normalization logic
3. Add governance rule if needed
4. Update explain.ts for human output

### Add New Domain Logic
1. Create folder in `lib/domains/{domain}/`
2. Add types.ts
3. Add lane handlers
4. Export from index.ts
