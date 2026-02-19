"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import Xom3Mark from "./brand/Xom3Mark";

type Activation = "active" | "emerging" | "dormant" | "archived" | "sealed" | "experimental";
type NavGroupId = "core" | "crm" | "commerce" | "system" | "legacy";
const NAV_EVENT = "xom3:navigate";
const COMMAND_EVENT = "xom3:command-palette";

function activationChip(state: Activation) {
  if (state === "active") return { bg: "rgba(34,197,94,0.12)", fg: "#4ade80", border: "rgba(34,197,94,0.25)", label: "ACTIVE" };
  if (state === "emerging") return { bg: "rgba(59,130,246,0.12)", fg: "#60a5fa", border: "rgba(59,130,246,0.25)", label: "EMERGING" };
  if (state === "experimental") return { bg: "rgba(168,85,247,0.12)", fg: "#c084fc", border: "rgba(168,85,247,0.25)", label: "BETA" };
  if (state === "sealed") return { bg: "rgba(100,116,139,0.10)", fg: "#94a3b8", border: "rgba(148,163,184,0.20)", label: "SEALED" };
  if (state === "archived") return { bg: "rgba(148,163,184,0.08)", fg: "#64748b", border: "rgba(148,163,184,0.18)", label: "ARCHIVED" };
  return { bg: "rgba(245,158,11,0.10)", fg: "#fbbf24", border: "rgba(245,158,11,0.22)", label: "DORMANT" };
}

type NavItem = {
  href: string;
  label: string;
  description: string;
  activation: Activation;
  group: NavGroupId;
  icon?: React.ReactNode;
};

function iconFor(href: string) {
  const common = { width: 16, height: 16, stroke: "currentColor", strokeWidth: 1.6, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  
  if (href === "/dashboard") {
    return (
      <svg {...common} viewBox="0 0 24 24">
        <rect x="3" y="3" width="7" height="9" rx="1" />
        <rect x="14" y="3" width="7" height="5" rx="1" />
        <rect x="14" y="12" width="7" height="9" rx="1" />
        <rect x="3" y="16" width="7" height="5" rx="1" />
      </svg>
    );
  }
  if (href === "/console") {
    return (
      <svg {...common} viewBox="0 0 24 24">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M6 9l3 2-3 2" />
        <path d="M11 13h5" />
        <path d="M8 21h8" />
        <path d="M12 17v4" />
      </svg>
    );
  }
  if (href === "/broadcast") {
    return (
      <svg {...common} viewBox="0 0 24 24">
        <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" />
        <path d="M7.8 16.2a5 5 0 010-8.4" />
        <circle cx="12" cy="12" r="2" />
        <path d="M16.2 7.8a5 5 0 010 8.4" />
        <path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1" />
      </svg>
    );
  }
  if (href === "/social") {
    return (
      <svg {...common} viewBox="0 0 24 24">
        <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
      </svg>
    );
  }
  if (href === "/timeline") {
    return (
      <svg {...common} viewBox="0 0 24 24">
        <path d="M12 3v18" />
        <circle cx="12" cy="6" r="2" />
        <circle cx="12" cy="12" r="2" />
        <circle cx="12" cy="18" r="2" />
        <path d="M14 6h6" />
        <path d="M4 12h6" />
        <path d="M14 18h6" />
      </svg>
    );
  }
  if (href === "/sovereigns") {
    return (
      <svg {...common} viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="3" />
        <circle cx="19" cy="5" r="2" />
        <circle cx="5" cy="5" r="2" />
        <circle cx="5" cy="19" r="2" />
        <circle cx="19" cy="19" r="2" />
        <path d="M12 9V7" />
        <path d="M12 17v-2" />
        <path d="M9 12H7" />
        <path d="M17 12h-2" />
      </svg>
    );
  }
  if (href === "/rituals") {
    return (
      <svg {...common} viewBox="0 0 24 24">
        <path d="M12 3L3 9l9 6 9-6-9-6z" />
        <path d="M3 15l9 6 9-6" />
        <path d="M3 9v6" />
        <path d="M21 9v6" />
      </svg>
    );
  }
  if (href === "/intakecrm" || href === "/benefits") {
    return (
      <svg {...common} viewBox="0 0 24 24">
        <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    );
  }
  if (href === "/uoi") {
    return (
      <svg {...common} viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4" />
        <path d="M12 8h.01" />
      </svg>
    );
  }
  return null;
}

function isHiddenBySovereignOnly(activation: Activation) {
  return activation === "dormant" || activation === "archived" || activation === "sealed";
}

function heartbeatDot(posture: string | null) {
  if (!posture) return { bg: "rgba(148,163,184,0.55)", glow: "rgba(148,163,184,0.15)", pulse: false };
  if (posture === "running" || posture === "nominal") return { bg: "#22c55e", glow: "rgba(34,197,94,0.35)", pulse: true };
  if (posture === "draining" || posture === "degraded") return { bg: "#f59e0b", glow: "rgba(245,158,11,0.35)", pulse: true };
  if (posture === "error" || posture === "critical") return { bg: "#ef4444", glow: "rgba(239,68,68,0.40)", pulse: true };
  return { bg: "rgba(148,163,184,0.55)", glow: "rgba(148,163,184,0.15)", pulse: false };
}

export default function CockpitNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [smallScreen, setSmallScreen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sovereignOnly, setSovereignOnly] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [heartbeatPosture, setHeartbeatPosture] = useState<string | null>(null);
  const railRef = useRef<HTMLDivElement | null>(null);

  const navItems = useMemo<NavItem[]>(() => {
    const items: NavItem[] = [
      // Core Surfaces
      { href: "/dashboard", label: "Control", description: "Control Center", activation: "active", group: "core" },
      { href: "/console", label: "Diagnostics", description: "Operator Console", activation: "active", group: "core" },
      { href: "/broadcast", label: "Broadcast", description: "Social Publishing", activation: "active", group: "core" },
      { href: "/social", label: "Social", description: "Social Posting Lane", activation: "active", group: "core" },
      { href: "/timeline", label: "Timeline", description: "Unified Event Stream", activation: "active", group: "core" },
      { href: "/sovereigns", label: "Sovereigns", description: "Constellation Map", activation: "active", group: "core" },

      // CRM Surfaces
      { href: "/intakecrm", label: "IntakeCRM", description: "Lane 1+2 CRM", activation: "active", group: "crm" },
      { href: "/benefits", label: "Benefits", description: "Benefits CRM", activation: "active", group: "crm" },

      // System Surfaces
      { href: "/uoi", label: "UOI", description: "Unified Intelligence", activation: "active", group: "system" },
      { href: "/rituals", label: "Rituals", description: "Ceremonies", activation: "active", group: "system" },
    ];

    return items.map((i) => ({ ...i, icon: iconFor(i.href) }));
  }, []);

  const filtered = useMemo(() => {
    if (!sovereignOnly) return navItems;
    return navItems.filter((i) => !isHiddenBySovereignOnly(i.activation));
  }, [navItems, sovereignOnly]);

  const groups = useMemo(() => {
    const order: NavGroupId[] = ["core", "crm", "system"];
    const by = new Map<NavGroupId, NavItem[]>();
    for (const i of filtered) {
      const arr = by.get(i.group) || [];
      arr.push(i);
      by.set(i.group, arr);
    }
    return order.map((id) => ({ id, items: by.get(id) || [] })).filter((g) => g.items.length > 0);
  }, [filtered]);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 860px)");
    const onChange = () => setSmallScreen(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!pathname) return;
    try {
      const key = "xom3_recent_surfaces";
      const prevRaw = window.localStorage.getItem(key);
      const prev: string[] = prevRaw ? (JSON.parse(prevRaw) as string[]) : [];
      const next = [pathname, ...prev.filter((p) => p !== pathname)].slice(0, 6);
      window.localStorage.setItem(key, JSON.stringify(next));
      setRecent(next.slice(0, 3));
    } catch {
      setRecent([]);
    }
  }, [pathname]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("xom3_recent_surfaces");
      const prev: string[] = raw ? (JSON.parse(raw) as string[]) : [];
      setRecent(prev.slice(0, 3));
    } catch {
      setRecent([]);
    }
  }, []);

  useEffect(() => {
    let stopped = false;
    const fetchHeartbeat = async () => {
      try {
        const res = await fetch("/api/system/status", { cache: "no-store" });
        const json = await res.json();
        if (stopped) return;
        if (json?.ok) setHeartbeatPosture(String(json?.posture || json?.eventLoopStatus?.running ? "running" : json?.posture || "idle"));
      } catch {
        if (stopped) return;
        setHeartbeatPosture(null);
      }
    };

    fetchHeartbeat().catch(() => {});
    const interval = setInterval(() => fetchHeartbeat().catch(() => {}), 7000);
    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!railRef.current) return;
      const within = railRef.current.contains(document.activeElement);
      if (!within) return;

      if (e.key === "Escape") {
        setMobileOpen(false);
        return;
      }

      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();

      const anchors = Array.from(railRef.current.querySelectorAll<HTMLAnchorElement>("a[data-xom3-nav-item]"));
      if (anchors.length === 0) return;
      const idx = anchors.findIndex((a) => a === document.activeElement);
      const nextIdx = e.key === "ArrowRight" ? (idx + 1 + anchors.length) % anchors.length : (idx - 1 + anchors.length) % anchors.length;
      anchors[nextIdx]?.focus();
      anchors[nextIdx]?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const onNavigate = (event: Event) => {
      const href = (event as CustomEvent<{ href: string }>).detail?.href;
      if (!href) return;
      router.push(href);
      setMobileOpen(false);
    };
    window.addEventListener(NAV_EVENT, onNavigate as EventListener);
    return () => window.removeEventListener(NAV_EVENT, onNavigate as EventListener);
  }, [router]);

  useEffect(() => {
    if (!smallScreen) setMobileOpen(false);
  }, [smallScreen]);

  const dot = heartbeatDot(heartbeatPosture);

  return (
    <nav
      className="xom3-cockpitNav"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 90,
        background: "linear-gradient(180deg, rgba(8, 12, 21, 0.95) 0%, rgba(8, 12, 21, 0.88) 100%)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
        backdropFilter: "blur(20px) saturate(180%)",
        padding: "0 20px",
        height: 56,
        display: "flex",
        gap: "16px",
        alignItems: "center",
      }}
      aria-label="Cockpit Navigation"
    >
      {/* Logo & Brand */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, flex: "0 0 auto" }}>
        <Link href="/xom3" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }} aria-label="Go to XOM3 entry">
          <Xom3Mark />
          <span style={{ 
            fontSize: 13, 
            fontWeight: 600, 
            color: "var(--text-1)",
            letterSpacing: "-0.02em",
          }}>
            Xtension of Me
          </span>
        </Link>

        {/* Separator */}
        <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.08)" }} />

        {/* Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 10px",
              borderRadius: 6,
              border: "1px solid rgba(255,255,255,0.08)",
              background: sovereignOnly ? "rgba(99,102,241,0.12)" : "transparent",
              color: sovereignOnly ? "#a5b4fc" : "var(--text-2)",
              fontSize: 11,
              fontWeight: 500,
              whiteSpace: "nowrap",
              cursor: "pointer",
              userSelect: "none",
              transition: "all 150ms ease",
            }}
            title="Hide dormant surfaces"
          >
            <input 
              type="checkbox" 
              checked={sovereignOnly} 
              onChange={(e) => setSovereignOnly(e.target.checked)}
              style={{ display: "none" }}
            />
            <span style={{ 
              width: 14, 
              height: 14, 
              borderRadius: 4, 
              border: sovereignOnly ? "none" : "1px solid rgba(255,255,255,0.2)",
              background: sovereignOnly ? "#6366f1" : "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              {sovereignOnly && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </span>
            Sovereign only
          </label>

          {recent.length > 1 && (
            <details className="xom3-recent" style={{ position: "relative" }}>
              <summary
                style={{ 
                  padding: "5px 10px", 
                  listStyle: "none", 
                  cursor: "pointer",
                  borderRadius: 6,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "transparent",
                  color: "var(--text-2)",
                  fontSize: 11,
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
                aria-label="Open recent surfaces"
              >
                Recent
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </summary>
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: "calc(100% + 6px)",
                  minWidth: 200,
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(15, 20, 30, 0.98)",
                  backdropFilter: "blur(20px)",
                  boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
                  padding: 6,
                  zIndex: 200,
                }}
              >
                {recent
                  .filter((p) => p !== pathname)
                  .slice(0, 3)
                  .map((p) => (
                    <Link
                      key={p}
                      href={p}
                      className="xom3-recentItem"
                      onClick={() => setMobileOpen(false)}
                      style={{
                        display: "block",
                        padding: "8px 10px",
                        borderRadius: 6,
                        textDecoration: "none",
                        color: "var(--text-1)",
                        fontSize: 12,
                        fontWeight: 500,
                      }}
                    >
                      {p}
                    </Link>
                  ))}
              </div>
            </details>
          )}

          <button
            style={{ 
              padding: "5px 10px", 
              borderRadius: 6,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "transparent",
              color: "var(--text-2)",
              fontSize: 11,
              fontWeight: 500,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
            aria-label="Open command palette"
            onClick={() => window.dispatchEvent(new CustomEvent(COMMAND_EVENT))}
          >
            Commands
            <span style={{ 
              padding: "1px 4px", 
              borderRadius: 4, 
              background: "rgba(255,255,255,0.06)",
              fontSize: 10,
              color: "var(--text-2)",
            }}>
              ⌘K
            </span>
          </button>

          {/* Heartbeat */}
          <div 
            style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: 6,
              padding: "5px 10px",
              borderRadius: 6,
              background: dot.pulse ? "rgba(34,197,94,0.08)" : "transparent",
            }}
            title={heartbeatPosture ? `System: ${heartbeatPosture}` : "System: unknown"}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: dot.bg,
                boxShadow: dot.pulse ? `0 0 0 3px ${dot.glow}, 0 0 12px ${dot.glow}` : `0 0 0 2px ${dot.glow}`,
                animation: dot.pulse ? "pulse 2s ease-in-out infinite" : "none",
              }}
            />
          </div>
        </div>
      </div>

      {/* Navigation Rail */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0, overflow: "hidden" }}>
        <div
          ref={railRef}
          className="xom3-navRail"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            flex: 1,
            minWidth: 0,
            overflowX: "auto",
            padding: "4px 0",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
          aria-label="Surfaces"
        >
          {groups.map((g, gi) => (
            <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 4, flex: "0 0 auto" }}>
              {gi > 0 && <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.06)", margin: "0 8px" }} />}
              {g.items.map((item) => {
                const isActive = pathname?.startsWith(item.href);
                const chip = activationChip(item.activation);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    data-xom3-nav-item
                    onClick={() => setMobileOpen(false)}
                    aria-current={isActive ? "page" : undefined}
                    className="xom3-navItem"
                    style={{
                      flex: "0 0 auto",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 12px",
                      borderRadius: 8,
                      textDecoration: "none",
                      border: isActive ? "1px solid rgba(255,255,255,0.12)" : "1px solid transparent",
                      background: isActive ? "rgba(255,255,255,0.06)" : "transparent",
                      color: isActive ? "var(--text-0)" : "var(--text-2)",
                      transition: "all 150ms ease",
                    }}
                  >
                    {item.icon && (
                      <span style={{ opacity: isActive ? 1 : 0.7, display: "flex" }}>
                        {item.icon}
                      </span>
                    )}
                    <span style={{ fontSize: 13, fontWeight: isActive ? 600 : 500 }}>
                      {item.label}
                    </span>
                    <span
                      style={{
                        padding: "2px 6px",
                        borderRadius: 4,
                        background: chip.bg,
                        border: `1px solid ${chip.border}`,
                        color: chip.fg,
                        fontSize: 9,
                        fontWeight: 600,
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                      }}
                    >
                      {chip.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {smallScreen && (
        <button
          style={{ 
            padding: "6px 12px", 
            borderRadius: 6,
            border: "1px solid rgba(255,255,255,0.1)",
            background: "transparent",
            color: "var(--text-1)",
            fontSize: 12,
            fontWeight: 500,
            cursor: "pointer",
          }}
          aria-label="Open surfaces list"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((v) => !v)}
        >
          Menu
        </button>
      )}

      {smallScreen && mobileOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Surfaces"
          onClick={() => setMobileOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(6, 8, 12, 0.80)",
            backdropFilter: "blur(12px)",
            zIndex: 300,
            display: "grid",
            placeItems: "center",
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(420px, 94vw)",
              maxHeight: "80vh",
              overflow: "auto",
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(15, 20, 30, 0.98)",
              boxShadow: "0 30px 100px rgba(0,0,0,0.6)",
              padding: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-0)" }}>Surfaces</div>
              <button 
                onClick={() => setMobileOpen(false)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 6,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "transparent",
                  color: "var(--text-1)",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {groups.map((g) => (
                <div key={g.id}>
                  <div style={{ display: "grid", gap: 6 }}>
                    {g.items.map((item) => {
                      const chip = activationChip(item.activation);
                      const isActive = pathname?.startsWith(item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileOpen(false)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 10,
                            textDecoration: "none",
                            padding: "12px 14px",
                            borderRadius: 10,
                            border: isActive ? "1px solid rgba(99,102,241,0.3)" : "1px solid rgba(255,255,255,0.06)",
                            background: isActive ? "rgba(99,102,241,0.1)" : "rgba(255,255,255,0.02)",
                            color: "var(--text-0)",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            {item.icon && <span style={{ opacity: 0.7 }}>{item.icon}</span>}
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 600 }}>{item.label}</div>
                              <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 2 }}>{item.description}</div>
                            </div>
                          </div>
                          <span
                            style={{
                              padding: "3px 8px",
                              borderRadius: 4,
                              background: chip.bg,
                              border: `1px solid ${chip.border}`,
                              color: chip.fg,
                              fontSize: 9,
                              fontWeight: 600,
                              letterSpacing: "0.04em",
                              textTransform: "uppercase",
                            }}
                          >
                            {chip.label}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .xom3-navRail::-webkit-scrollbar {
          display: none;
        }
        .xom3-navItem:hover {
          background: rgba(255, 255, 255, 0.04) !important;
          border-color: rgba(255, 255, 255, 0.08) !important;
        }
        details.xom3-recent > summary::-webkit-details-marker {
          display: none;
        }
        details.xom3-recent[open] > summary {
          background: rgba(255, 255, 255, 0.04);
        }
        .xom3-recentItem:hover {
          background: rgba(255, 255, 255, 0.06);
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </nav>
  );
}
