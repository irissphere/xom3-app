export interface OperatorCommand {
  id: string;
  label: string;
  action: () => void | Promise<void>;
}

const NAV_EVENT = "xom3:navigate";
const RECENT_SURFACES_KEY = "xom3_recent_surfaces";

export function recordRecentSurface(href: string) {
  if (typeof window === "undefined") return;
  try {
    const existingRaw = window.localStorage.getItem(RECENT_SURFACES_KEY);
    const existing: string[] = existingRaw ? (JSON.parse(existingRaw) as string[]) : [];
    const next = [href, ...existing.filter((h) => h !== href)].slice(0, 10);
    window.localStorage.setItem(RECENT_SURFACES_KEY, JSON.stringify(next));
  } catch {
    // no-op
  }
}

export function dispatchNavigateToSurface(href: string) {
  if (typeof window === "undefined") return;
  recordRecentSurface(href);
  window.dispatchEvent(new CustomEvent(NAV_EVENT, { detail: { href } }));
}

function nav(href: string) {
  if (typeof window === "undefined") return;
  dispatchNavigateToSurface(href);
}

async function triggerRitual(ritualKey: string) {
  if (typeof window === "undefined") return;
  await fetch("/api/rituals/trigger", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ritualKey }),
  });
}

export const operatorCommands: OperatorCommand[] = [
  {
    id: "open-dashboard",
    label: "Open Control (Dashboard)",
    action: () => nav("/dashboard"),
  },
  {
    id: "open-broadcast",
    label: "Jump to Broadcast",
    action: () => nav("/broadcast"),
  },
  {
    id: "open-broadcast-operations",
    label: "Open Broadcast Operations",
    action: () => nav("/broadcast/operations"),
  },
  {
    id: "open-console",
    label: "Open Diagnostics Console",
    action: () => nav("/console"),
  },
  {
    id: "open-constellation-map",
    label: "Open Constellation Map",
    action: () => nav("/sovereigns"),
  },
  {
    id: "open-timeline",
    label: "Open Timeline",
    action: () => nav("/timeline"),
  },
  {
    id: "open-rituals",
    label: "Open Rituals",
    action: () => nav("/rituals"),
  },
  {
    id: "open-benefits-crm",
    label: "Open Benefits CRM",
    action: () => nav("/benefits"),
  },
  {
    id: "open-intakecrm",
    label: "Open IntakeCRM",
    action: () => nav("/intakecrm"),
  },
  {
    id: "run-ritual-system-recovery",
    label: "Run Ritual: system.recovery",
    action: async () => triggerRitual("system.recovery"),
  },
  {
    id: "run-ritual-demo-sequence",
    label: "Run Ritual: demo.sequence",
    action: async () => triggerRitual("demo.sequence"),
  },
  {
    id: "show-predictive-signals",
    label: "Show Predictive Signals (API)",
    action: () => nav("/api/constellation/prediction"),
  },
];
