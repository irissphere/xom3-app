# IrisSphere / XOM3 Custom Instructions

> Unified context for all IrisSphere apps and the XOM3 Cockpit.

---

## 1. Core Rules (All Apps)

### No Mock Data
- **Never use mock or fabricated data.** Use real data sources only: Supabase, API, env.
- If a feature is not live, label it **"Coming soon"** and describe the intended behavior briefly.
- Remove or replace mock buttons, placeholder content, or fake data that looks real.

### Tech Stack
- **Framework:** Next.js 14 (App Router)
- **App location:** `xom3-app/` (monorepo root)
- **Node:** 20 (not 18)
- **Package manager:** npm with lockfiles at root and `xom3-app/`
- **Dev server:** `npm run dev` → http://localhost:3000

### Styling
- No external CSS frameworks
- Inline styles with style objects
- Dark theme: `#0d0d0f`, `#141418`, text `#f7f8ff`, muted `#8b92a7`
- Accent: green `#22c55e`, amber `#f59e0b`, red `#ef4444`

---

## 2. IrisSphere / XOM3 Ecosystem

**IrisSphere** is the parent brand. The **XOM3 Cockpit** is the unified control surface. Apps live as tenants with domain routing.

### Tenant Registry (Domain → Route)

| Domain | Route | Product |
|--------|-------|---------|
| xom3.io | /xom3 | Primary cockpit |
| spacebaddie.com | /spacebaddie | AI video, shop, engage |
| bitbaddie.com | /bitbaddie | Trading platform |
| quantumpath.app | /quantumpath | Sacred manifestation app |
| rackbaddie.xom3.io | /rackbaddie | Wire inventory |
| flowbaddie.xom3.io | /flowbaddie | Web scraper, leads |
| bidbaddie.xom3.io | /bidbaddie | RFQ platform |
| paintbaddie.com | /paintbaddie | Paint tutorials (→ spacebaddie.com/paint) |
| irissphere.online | — | Landing (deployment/irissphere-landing) |

### Key Paths
- **Tenant config:** `xom3-app/lib/tenant/registry.ts`
- **Middleware:** `xom3-app/middleware.ts` (domain rewrites)
- **API routes:** `xom3-app/app/api/`

---

## 3. Architecture

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

### Panel Pattern

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

### Data Hook Rules

`useXom3MasterData.ts` is the **single source of truth** for cockpit data.

#### DO NOT
- Create parallel data fetching in panels
- Store fetched data in panel-level state
- Call APIs directly from panels

#### DO
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

## 4. Agent Teams (Sovereigns)

XOM3 uses **8 Sovereigns** with 35+ agents. Each sovereign has a webhook path and target agents.

| Sovereign | Color | Key Agents |
|-----------|-------|------------|
| **Social** | #00D9FF | ContentPulse, ReelCaster, YouTubeAgent, TrendScanner, EngagementOptimizer |
| **Marketing** | #F4B942 | LeadFlow, ReferralBot, CampaignAgent, ABTestAgent, AudienceSegmenter |
| **Finance** | #22c55e | TradeAgent, RiskSentinel, ROITracker, PortfolioOptimizer, MarketSentiment |
| **Revenue** | #9B7EDE | RevenueOptimizer, ChurnPredictor, CLVPredictor, PricingAgent, UpsellAgent, FirstDollarAgent |
| **Commerce** | #ef4444 | TemplateSmith, SaaSBeacon, ApparelSync, FulfillmentAgent, InventoryOptimizer |
| **Compliance** | #8b92a7 | ComplianceBridge, LegalResearch, ContractWeaver, TaxOptimizer, IPManager |
| **Infrastructure** | #0d0d0f | SelfHealer, SecurityHunter, PerformanceMonitor, CostOptimizer, Harbinger, Overwatch, Verity, Keeper |
| **Broadcast** | #6366f1 | SmokeTestRunner, SubtitleValidator, VisualQA, ReleaseGatekeeper |

### Agent Loop

`useAgentLoop.ts` runs the autonomous decision cycle.

#### Critical: Avoid Infinite Loops
- Use `useRef` for data to prevent effect re-runs
- Only depend on specific stable values in useEffect
- Never depend on entire `data` object

#### Cycle Pattern
```
Observe → Propose → Negotiate → Consensus → Execute → Refresh
```

---

## 5. API Routes

All XOM3 APIs live in `app/api/xom3/`:

| Endpoint | Purpose |
|----------|---------|
| `/api/xom3/actions` | Global actions |
| `/api/xom3/autonomous` | Autonomy state & proposals |
| `/api/xom3/autonomous/execute` | Execute consensus decisions |
| `/api/xom3/posture` | System posture |
| `/api/xom3/launch-check` | Pre-launch verification |

---

## 6. Domain-Specific Rules

### SpaceBaddie
- **Phase 1:** Fix and stabilize. No mock data. Settings and prompts must apply.
- **Phase 2:** Crew + Sandbox + scene gen → voice/avatar → composite.
- **Content quality:** 1080p min, platform guidelines, brand consistency, captions.
- **Campaign flow:** Wizard → product-video API → HeyGen/Hedra → composite (Shotstack) → post queue → scheduler.

### BitBaddie (Trading)
- **Pocket Option:** High-risk, unregulated. Keep as optional; add disclaimers.
- **Risk management:** Max 5% per position, 10% daily loss limit, stop-loss required, 1:2 min risk/reward.
- **Finance agents:** TradeAgent (execution), RiskSentinel (limits), MarketSentiment (signals).
- **Accent:** #10B981 (emerald) for BitBaddie branding.

### QuantumPath
- **Product:** $4.99/mo sacred manifestation app (quantumpath.app).
- **Features:** Sacred geometry, solfeggio frequencies, ritual composer, moon phases, goal anchors.
- **Brand:** Mystical but accessible. Invitational, not pushy.
- **Accent:** #10b981 (emerald).

### Pocket Option Bridge
- **Location:** `pocket-option-bridge/` (FastAPI, Render/Railway).
- **Purpose:** REST bridge for Pocket Option via BinaryOptionsToolsV2.
- **Env:** `PO_BRIDGE_URL`, `POCKET_OPTION_SSID`, `po_demo_mode` (default True).
- **Safety:** `po_daily_loss_limit`, `po_max_trade_amount`, `po_trade_cooldown`.

---

## 7. External Services

- **Supabase:** Auth, DB, real-time
- **Airtable:** CRM, pipelines
- **Stripe:** Subscriptions, payments
- **OpenAI:** AI features (required at build for `generate-script`)
- **Vercel:** Primary deployment for xom3-app
- **Render/Railway:** pocket-option-bridge, irissphere-landing, n8n

---

## 8. Testing

Test files use `.test.tsx` suffix and live alongside components:
```
panels/
  GlobalHealthPanel.tsx
  GlobalHealthPanel.test.tsx
```

---

## 9. Common Tasks

### Add New Tenant
1. Add to `TENANT_REGISTRY` and `tenants` in `lib/tenant/registry.ts`
2. Add middleware rewrite block in `middleware.ts` if needed
3. Configure Vercel domain

### Add New Panel (Cockpit)
1. Create `ui/panels/{Name}Panel.tsx`
2. Import in `Xom3MasterClient.tsx`
3. Add to grid layout

### Add New Agent
1. Define in `lib/agents/extended-registry.ts`
2. Add proposal logic in `useAgentLoop.ts` if autonomous
3. Handle execution in `/api/xom3/autonomous/execute`

### Add New Data Source
1. Add fetch in `useXom3MasterData.ts` `refreshAll()`
2. Add type to `Xom3MasterData`
3. Parse and merge in `setData()`

### Add New Agent Behavior
1. Add proposal logic in `useAgentLoop.ts`
2. Add negotiation rules in `autonomy/negotiation.ts`
3. Handle execution in `/api/xom3/autonomous/execute`

---

## 10. File Reference

| Area | Path |
|------|------|
| CLAUDE.md | Root (project instructions) |
| Tenant registry | xom3-app/lib/tenant/registry.ts |
| Agent registry | xom3-app/lib/agents/extended-registry.ts |
| Master data hook | xom3-app/app/xom3/useXom3MasterData.ts |
| Middleware | xom3-app/middleware.ts |
| SpaceBaddie trading | xom3-app/app/spacebaddie/trading/page.tsx |
| BitBaddie trading | xom3-app/app/bitbaddie/trading/page.tsx |
| Pocket Option bridge | pocket-option-bridge/main.py |
| QuantumPath | xom3-app/app/quantumpath/ |

---

## 11. IrisSphere Product Audit & Fix Workflow

When asked to **audit all IrisSphere products/apps and fix issues**, run this workflow:

### Step 1: Audit Each Product

Products to audit (from Tenant Registry + standalone services):

- **xom3.io** → `xom3-app/app/xom3/`
- **spacebaddie.com** → `xom3-app/app/spacebaddie/`
- **bitbaddie.com** → `xom3-app/app/bitbaddie/`
- **quantumpath.app** → `xom3-app/app/quantumpath/`
- **rackbaddie.xom3.io** → `xom3-app/app/rackbaddie/`
- **flowbaddie.xom3.io** → `xom3-app/app/flowbaddie/`
- **bidbaddie.xom3.io** → `xom3-app/app/bidbaddie/`
- **paintbaddie.com** → redirect; check `xom3-app/middleware.ts`
- **irissphere.online** → `deployment/irissphere-landing/`
- **pocket-option-bridge** → `pocket-option-bridge/`

For each product, check:

| Product | Path | Audit Checklist |
|---------|------|----------------|
| **XOM3 Cockpit** | /xom3 | Data hook usage, panel health, API connectivity |
| **SpaceBaddie** | /spacebaddie | No mock data, settings apply, campaign flow, content quality |
| **BitBaddie** | /bitbaddie | Real signals (no SAMPLE_SIGNALS), trading disclaimers, risk limits |
| **QuantumPath** | /quantumpath | Subscription flow, auth redirects, pricing CTA |
| **RackBaddie** | /rackbaddie | Inventory accuracy, part matching |
| **FlowBaddie** | /flowbaddie | Scraper config, lead dedup, data privacy |
| **BidBaddie** | /bidbaddie | RFQ flow, vendor submission |
| **PaintBaddie** | /paintbaddie | Paint tutorials, redirect to spacebaddie.com/paint |
| **Irissphere Landing** | deployment/irissphere-landing | Forms, SMS consent, Twilio |
| **Pocket Option Bridge** | pocket-option-bridge | Env vars, safety settings, Render/Railway deploy |

### Step 2: Common Issues to Fix

- **Mock data:** Replace with real API calls or "Coming soon" labels
- **Broken links:** Fix hrefs, API routes, env references
- **Auth dead ends:** Add `?next=/` redirect for unauthenticated users
- **Stale config:** Update PO_BRIDGE_URL, Railway/Render URLs in docs
- **Lint/TypeScript errors:** Fix before committing
- **Missing env vars:** Document in ENV_LOCAL.template or .env.example

### Step 3: Fix and Report

1. Fix issues one product at a time
2. Prioritize: auth → data → UX → polish
3. Report: "Audited X products. Fixed: [list]. Remaining: [list]."

### Step 4: Prompt to Trigger

Say: *"Run an audit of all IrisSphere products/apps. Fix any issues you find. Report what was fixed."*
