"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { operatorCommands, dispatchNavigateToSurface } from "@/lib/operator";
import { OperatorIntent } from "@/lib/operator";

type Activation = "active" | "emerging" | "dormant" | "archived" | "sealed" | "experimental";

type PaletteItem = {
  id: string;
  label: string;
  description?: string;
  activation?: Activation;
  kind: "surface" | "command" | "recent";
  href?: string;
  action: () => void | Promise<void>;
  badge?: string;
};

const RECENT_SURFACES_KEY = "xom3_recent_surfaces";
const COMMAND_EVENT = "xom3:command-palette";

function normalize(s: string) {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function score(item: PaletteItem, q: string) {
  if (!q) return 100;
  const base = normalize(item.label);
  const desc = normalize(item.description || "");
  const query = normalize(q);
  const termHits = query.split(" ").filter((p) => p && (base.includes(p) || desc.includes(p))).length;
  const direct = base.includes(query) || desc.includes(query) ? 10 : 0;
  return direct * 2 + termHits;
}

function activationChip(state?: Activation) {
  if (!state || state === "active") return { bg: "rgba(34,197,94,0.16)", fg: "rgb(34,197,94)", border: "rgba(34,197,94,0.32)" };
  if (state === "emerging") return { bg: "rgba(59,130,246,0.14)", fg: "rgb(59,130,246)", border: "rgba(59,130,246,0.28)" };
  if (state === "experimental") return { bg: "rgba(168,85,247,0.14)", fg: "rgb(168,85,247)", border: "rgba(168,85,247,0.28)" };
  if (state === "sealed") return { bg: "rgba(100,116,139,0.14)", fg: "rgb(148,163,184)", border: "rgba(148,163,184,0.28)" };
  if (state === "archived") return { bg: "rgba(148,163,184,0.10)", fg: "rgb(148,163,184)", border: "rgba(148,163,184,0.22)" };
  return { bg: "rgba(245,158,11,0.12)", fg: "rgb(245,158,11)", border: "rgba(245,158,11,0.26)" };
}

export default function OperatorCommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [recent, setRecent] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const surfaces: PaletteItem[] = useMemo(
    () => [
      { id: "surface-dashboard", label: "Control (Dashboard)", description: "Command center", activation: "active", kind: "surface", href: "/dashboard", action: () => dispatchNavigateToSurface("/dashboard") },
      { id: "surface-console", label: "Diagnostics Console", description: "Operator console", activation: "active", kind: "surface", href: "/console", action: () => dispatchNavigateToSurface("/console") },
      { id: "surface-broadcast", label: "Broadcast Control", description: "Jump to Broadcast", activation: "active", kind: "surface", href: "/broadcast", action: () => dispatchNavigateToSurface("/broadcast") },
      { id: "surface-timeline", label: "Timeline", description: "Unified event stream", activation: "active", kind: "surface", href: "/timeline", action: () => dispatchNavigateToSurface("/timeline") },
      { id: "surface-sovereigns", label: "Constellation Map", description: "Sovereigns view", activation: "active", kind: "surface", href: "/sovereigns", action: () => dispatchNavigateToSurface("/sovereigns") },
      { id: "surface-rituals", label: "Rituals", description: "Book of ceremonies", activation: "active", kind: "surface", href: "/rituals", action: () => dispatchNavigateToSurface("/rituals") },
      { id: "surface-benefits", label: "Benefits CRM", description: "Benefits sovereign lane", activation: "active", kind: "surface", href: "/benefits", action: () => dispatchNavigateToSurface("/benefits") },
      { id: "surface-impact", label: "Impact Rewards", description: "Referral program & earnings", activation: "active", kind: "surface", href: "/impact", action: () => dispatchNavigateToSurface("/impact") },
      { id: "surface-intake", label: "IntakeCRM", description: "Lane 1+2 CRM", activation: "active", kind: "surface", href: "/intakecrm", action: () => dispatchNavigateToSurface("/intakecrm") },
      { id: "surface-system", label: "System Status", description: "System heartbeat", activation: "dormant", kind: "surface", href: "/system/status", action: () => dispatchNavigateToSurface("/system/status") },
    ],
    []
  );

  const commandItems: PaletteItem[] = useMemo(
    () =>
      operatorCommands.map((cmd) => ({
        id: cmd.id,
        label: cmd.label,
        description: cmd.id.startsWith("run-ritual") ? "Ritual" : "Command",
        kind: "command",
        action: cmd.action,
        badge: cmd.id.startsWith("run-ritual") ? "ritual" : cmd.id.startsWith("open-") ? "nav" : "cmd",
      })),
    []
  );

  const recentItems: PaletteItem[] = useMemo(
    () =>
      recent.map((href) => ({
        id: `recent-${href}`,
        label: href,
        description: "Recent surface",
        kind: "recent",
        activation: "active",
        href,
        action: () => dispatchNavigateToSurface(href),
        badge: "recent",
      })),
    [recent]
  );

  const items = useMemo(() => [...recentItems, ...surfaces, ...commandItems], [commandItems, recentItems, surfaces]);

  const results = useMemo(() => {
    const scored = items
      .map((c) => ({ c, s: score(c, query) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s || a.c.label.localeCompare(b.c.label))
      .map((x) => x.c);
    return scored.slice(0, 14);
  }, [items, query]);

  useEffect(() => {
    if (!open) return;
    try {
      const raw = window.localStorage.getItem(RECENT_SURFACES_KEY);
      const parsed: string[] = raw ? (JSON.parse(raw) as string[]) : [];
      setRecent(parsed.slice(0, 5));
    } catch {
      setRecent([]);
    }
  }, [open]);

  useEffect(() => {
    const onCommand = () => {
      setOpen(true);
      setQuery("");
      setActive(0);
    };
    window.addEventListener(COMMAND_EVENT, onCommand);
    return () => window.removeEventListener(COMMAND_EVENT, onCommand);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isCmdK = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k";
      if (isCmdK) {
        e.preventDefault();
        setOpen((v) => !v);
        setQuery("");
        setActive(0);
        return;
      }

      if (!open) return;
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((i) => Math.min(i + 1, Math.max(0, results.length - 1)));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const cmd = results[active];
        if (!cmd) return;
        handleSelect(cmd);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, results, active]);

  useEffect(() => {
    if (!open) return;
    const focusable = () => {
      if (!containerRef.current) return [];
      const nodes = containerRef.current.querySelectorAll<HTMLElement>('button, input, [tabindex]:not([tabindex="-1"])');
      return Array.from(nodes).filter((n) => !n.hasAttribute("disabled"));
    };
    const trap = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const nodes = focusable();
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", trap);
    return () => document.removeEventListener("keydown", trap);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => inputRef.current?.focus(), 10);
    return () => window.clearTimeout(id);
  }, [open]);

  const handleSelect = (item: PaletteItem) => {
    Promise.resolve(item.action()).catch(() => {});
    if (item.kind === "command" && item.id.startsWith("run-ritual")) {
      OperatorIntent.updateOperatorIntent(OperatorIntent.IntentSignals.ritual(4, "palette"));
    } else if (item.kind === "command" || item.kind === "surface" || item.kind === "recent") {
      OperatorIntent.updateOperatorIntent(OperatorIntent.IntentSignals.navigation(2, "palette"));
    }
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 110,
        background: "rgba(6, 8, 12, 0.70)",
        backdropFilter: "blur(10px)",
      }}
      onClick={() => setOpen(false)}
      aria-label="Operator Command Palette"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        ref={containerRef}
        className="xom3-glass xom3-glassEdge"
        style={{
          width: "min(720px, calc(100vw - 40px))",
          margin: "80px auto",
          padding: 16,
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "linear-gradient(145deg, rgba(12,16,26,0.92), rgba(14,18,32,0.88))",
          boxShadow: "0 24px 90px rgba(0,0,0,0.55), 0 0 0 1px rgba(59,130,246,0.12)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ width: 10, height: 10, borderRadius: 999, background: "rgba(59,130,246,0.7)", boxShadow: "0 0 0 6px rgba(59,130,246,0.16)" }} aria-hidden />
            <div style={{ fontWeight: 850, color: "var(--text-0)", letterSpacing: "0.01em" }}>Command Palette</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-2)", fontFamily: "var(--font-mono)", fontSize: 11 }}>
            <span>Esc</span>
            <span style={{ opacity: 0.6 }}>·</span>
            <span>⌘K / Ctrl+K</span>
          </div>
        </div>

        <div
          style={{
            marginTop: 12,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 12px",
            borderRadius: 12,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            placeholder="Jump anywhere or run a ritual…"
            style={{
              width: "100%",
              padding: "4px 2px",
              border: "none",
              background: "transparent",
              color: "var(--text-0)",
              outline: "none",
              fontSize: 15,
            }}
            aria-label="Search commands"
          />
          <div style={{ color: "var(--text-2)", fontFamily: "var(--font-mono)", fontSize: 11, whiteSpace: "nowrap" }}>↵ to launch</div>
        </div>

        {recent.length > 0 ? (
          <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }} aria-label="Recent surfaces">
            {recent.map((href) => (
              <button
                key={href}
                onClick={() => handleSelect({ id: `recent-${href}`, label: href, href, kind: "recent", action: () => dispatchNavigateToSurface(href) })}
                style={{
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(255,255,255,0.03)",
                  color: "var(--text-1)",
                  padding: "6px 10px",
                  borderRadius: 10,
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                {href}
              </button>
            ))}
          </div>
        ) : null}

        <div style={{ marginTop: 12, display: "grid", gap: 8, maxHeight: "48vh", overflow: "auto", paddingRight: 2 }} role="listbox" aria-label="Command results">
          {results.map((item, idx) => {
            const chip = activationChip(item.activation);
            const isActive = idx === active;
            return (
              <button
                key={item.id}
                role="option"
                aria-selected={isActive}
                onMouseEnter={() => setActive(idx)}
                onClick={() => handleSelect(item)}
                style={{
                  textAlign: "left",
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: `1px solid ${isActive ? "rgba(59,130,246,0.32)" : "rgba(255,255,255,0.08)"}`,
                  background: isActive ? "linear-gradient(120deg, rgba(59,130,246,0.16), rgba(255,255,255,0.04))" : "rgba(255,255,255,0.03)",
                  color: "var(--text-0)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  boxShadow: isActive ? "0 0 0 1px rgba(59,130,246,0.18), 0 14px 44px rgba(0,0,0,0.38)" : "none",
                  transition: "background 120ms ease, border-color 120ms ease, box-shadow 120ms ease",
                }}
              >
                <div style={{ display: "grid", gap: 4 }}>
                  <div style={{ fontWeight: 750, display: "flex", alignItems: "center", gap: 8 }}>
                    <span>{item.label}</span>
                    {item.badge ? (
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: 999,
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          background: "rgba(255,255,255,0.06)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          color: "var(--text-2)",
                        }}
                      >
                        {item.badge}
                      </span>
                    ) : null}
                  </div>
                  {item.description ? <div style={{ fontSize: 12, color: "var(--text-2)" }}>{item.description}</div> : null}
                </div>
                {item.activation ? (
                  <span
                    style={{
                      padding: "4px 10px",
                      borderRadius: 999,
                      background: chip.bg,
                      border: `1px solid ${chip.border}`,
                      color: chip.fg,
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.activation}
                  </span>
                ) : null}
              </button>
            );
          })}
          {results.length === 0 ? (
            <div style={{ padding: "12px 8px", color: "var(--text-2)", fontFamily: "var(--font-mono)", fontSize: 12 }}>No matches</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
