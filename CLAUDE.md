# XOM3 COCKPIT CONTEXT

This is the **XOM3 Master Cockpit** - the unified control surface for all operations.

---

## Architecture

### Master Client Structure
```
app/xom3/
  page.tsx                    # Entry point
  Xom3PageContent.tsx         # Content wrapper
  useXom3MasterData.ts        # Central data hook (CRITICAL)
  ui/
    Xom3MasterClient.tsx      # Main client component
    Xom3UiStateProvider.tsx   # UI state context
    panels/                   # All cockpit panels
    omnibar/                  # Command interface (Ctrl+K)
  agents/
    useAgentLoop.ts           # Autonomous agent loop
    consensus.ts              # Multi-agent voting
    weights.ts                # Agent influence weights
    retraining.ts             # Learning adjustments
  autonomy/
    thresholds.ts             # Adaptive thresholds
    patterns.ts               # Pattern detection
    negotiation.ts            # Agent negotiation
    metaLearning.ts           # Meta-level adjustments
  orchestration/
    graph.ts                  # Dependency graph
    influence.ts              # Influence matrix
    tenantOptimization.ts     # Tenant-level optimization
    intent.ts                 # Intent resolution
```

---

## Panel Pattern

All panels follow this structure:

```typescript
import PanelFrame from "./PanelFrame";
import type { Xom3MasterData } from "../useXom3MasterData";

export default function {Name}Panel({ data }: { data: Xom3MasterData }) {
  return (
    <PanelFrame title="{Panel Title}">
      {/* Panel content */}
    </PanelFrame>
  );
}
```

**Naming:** Always use `{Name}Panel.tsx` format.

---

## Data Hook Rules

`useXom3MasterData.ts` is the **single source of truth** for cockpit data.

### DO NOT
- Create parallel data fetching in panels
- Store fetched data in panel-level state
- Call APIs directly from panels

### DO
- Access all data through `data` prop
- Use `data.actions.refreshAll()` to trigger updates
- Add new endpoints to the central hook

### Data Shape
```typescript
type Xom3MasterData = {
  health: Xom3Health;
  tenants: Xom3TenantSummary[];
  sovereigns: Xom3SovereignUnit[];
  agents: Xom3Agent[];
  hi5?: { pipelineRecent: GoldenRecord[] };
  sovereignIntel?: Record<string, SovereignIntel>;
  autonomy?: AutonomyState;
  controls: ControlState;
  billing?: { credits: CreditsStatus | null };
  meta?: { loading: boolean; errors: Record<string, string>; sources: Record<string, SourceStatus> };
  actions?: ActionMethods;
};
```

---

## Agent Loop

`useAgentLoop.ts` runs the autonomous decision cycle.

### Critical: Avoid Infinite Loops
- Use `useRef` for data to prevent effect re-runs
- Only depend on specific stable values in useEffect
- Never depend on entire `data` object

### Cycle Pattern
```
Observe → Propose → Negotiate → Consensus → Execute → Refresh
```

---

## API Routes

All XOM3 APIs live in `app/api/xom3/`:

| Endpoint | Purpose |
|----------|---------|
| `/api/xom3/actions` | Global actions |
| `/api/xom3/autonomous` | Autonomy state & proposals |
| `/api/xom3/autonomous/execute` | Execute consensus decisions |
| `/api/xom3/posture` | System posture |
| `/api/xom3/launch-check` | Pre-launch verification |

---

## Styling

- No external CSS frameworks
- Inline styles with style objects
- Dark theme: backgrounds `#0d0d0f`, text `#f7f8ff`, muted `#8b92a7`
- Accent colors: green `#22c55e`, amber `#f59e0b`, red `#ef4444`

---

## Testing

Test files use `.test.tsx` suffix and live alongside components:
```
panels/
  GlobalHealthPanel.tsx
  GlobalHealthPanel.test.tsx
```

---

## Common Tasks

### Add New Panel
1. Create `ui/panels/{Name}Panel.tsx`
2. Import in `Xom3MasterClient.tsx`
3. Add to grid layout

### Add New Data Source
1. Add fetch call in `useXom3MasterData.ts` `refreshAll()`
2. Add type to `Xom3MasterData`
3. Parse and merge in `setData()`

### Add New Agent Behavior
1. Add proposal logic in `useAgentLoop.ts`
2. Add negotiation rules in `autonomy/negotiation.ts`
3. Handle execution in `/api/xom3/autonomous/execute`
