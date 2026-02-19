"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { href: string; label: string; icon: React.ReactNode };

function icon(kind: "dashboard" | "leads" | "social" | "automation" | "settings") {
  const common = { width: 22, height: 22, stroke: "currentColor", strokeWidth: 1.8, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (kind === "dashboard") {
    return (
      <svg {...common} viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="3" width="7" height="9" rx="2" />
        <rect x="14" y="3" width="7" height="5" rx="2" />
        <rect x="14" y="12" width="7" height="9" rx="2" />
        <rect x="3" y="16" width="7" height="5" rx="2" />
      </svg>
    );
  }
  if (kind === "leads") {
    return (
      <svg {...common} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    );
  }
  if (kind === "social") {
    return (
      <svg {...common} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 12a8 8 0 0 1 16 0" />
        <path d="M4 12a8 8 0 0 0 16 0" />
        <path d="M12 4v16" />
      </svg>
    );
  }
  if (kind === "automation") {
    return (
      <svg {...common} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 6v6l4 2" />
        <circle cx="12" cy="12" r="9" />
      </svg>
    );
  }
  return (
    <svg {...common} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
      <path d="M19.4 15a7.97 7.97 0 0 0 .1-6l2-1.1-2-3.5-2.3.7a8.3 8.3 0 0 0-5.2-3l-.4-2.4h-4l-.4 2.4a8.3 8.3 0 0 0-5.2 3l-2.3-.7-2 3.5 2 1.1a7.97 7.97 0 0 0 .1 6l-2 1.1 2 3.5 2.3-.7a8.3 8.3 0 0 0 5.2 3l.4 2.4h4l.4-2.4a8.3 8.3 0 0 0 5.2-3l2.3.7 2-3.5-2-1.1Z" />
    </svg>
  );
}

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: icon("dashboard") },
  { href: "/leads", label: "Leads", icon: icon("leads") },
  { href: "/social-connect", label: "Social", icon: icon("social") },
  { href: "/automation", label: "Automate", icon: icon("automation") },
  { href: "/settings", label: "Settings", icon: icon("settings") },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Mobile"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 90,
        padding: "10px 12px env(safe-area-inset-bottom)",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        background: "linear-gradient(180deg, rgba(7, 11, 20, 0.25), rgba(7, 11, 20, 0.92))",
        backdropFilter: "blur(16px)",
      }}
      className="xom3-mobileNav"
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, maxWidth: 640, margin: "0 auto" }}>
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                textDecoration: "none",
                display: "grid",
                justifyItems: "center",
                gap: 4,
                padding: "8px 6px",
                borderRadius: 14,
                color: active ? "var(--text-0)" : "var(--text-2)",
                background: active ? "rgba(255,255,255,0.06)" : "transparent",
                border: active ? "1px solid rgba(255,255,255,0.10)" : "1px solid transparent",
              }}
            >
              <span style={{ display: "flex" }}>{item.icon}</span>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "-0.01em" }}>{item.label}</span>
            </Link>
          );
        })}
      </div>
      <style jsx>{`
        @media (min-width: 861px) {
          .xom3-mobileNav {
            display: none !important;
          }
        }
      `}</style>
    </nav>
  );
}

















