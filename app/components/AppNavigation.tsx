"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import GlobalProfileMenu from "./GlobalProfileMenu";

type NavItem = { href: string; label: string };

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/products", label: "Products" },
  { href: "/leads", label: "Leads" },
  { href: "/social-connect", label: "Social Connect" },
  { href: "/automation", label: "Automation" },
  { href: "/analytics", label: "Analytics" },
  { href: "/settings", label: "Settings" },
];

export default function AppNavigation() {
  const pathname = usePathname();

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 80,
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "linear-gradient(180deg, rgba(7, 11, 20, 0.92), rgba(5, 8, 16, 0.84))",
        backdropFilter: "blur(14px)",
      }}
    >
      <div className="xom3-container" style={{ height: 60, display: "flex", alignItems: "center", gap: 14 }}>
        <Link href="/dashboard" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
          <div
            aria-hidden="true"
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: "linear-gradient(135deg, rgba(10,132,255,0.25), rgba(99,102,241,0.18))",
              border: "1px solid rgba(10,132,255,0.25)",
              boxShadow: "0 12px 40px rgba(10,132,255,0.15)",
            }}
          />
          <div style={{ display: "grid", lineHeight: 1.1 }}>
            <div style={{ fontWeight: 800, letterSpacing: "-0.02em" }}>XOM3</div>
            <div style={{ fontSize: 12, color: "var(--text-2)" }}>Business Dashboard</div>
          </div>
        </Link>

        <div style={{ flex: 1 }} />

        <nav aria-label="Primary" className="xom3-appNavDesktop" style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  textDecoration: "none",
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: active ? "1px solid rgba(255,255,255,0.14)" : "1px solid transparent",
                  background: active ? "rgba(255,255,255,0.06)" : "transparent",
                  color: active ? "var(--text-0)" : "var(--text-1)",
                  fontSize: 13,
                  fontWeight: 600,
                  transition: "background 150ms ease, border-color 150ms ease, color 150ms ease",
                  whiteSpace: "nowrap",
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <Link
          href="/portal"
          style={{
            textDecoration: "none",
            padding: "8px 12px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(255,255,255,0.03)",
            color: "var(--text-1)",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Client Portal
        </Link>
        <GlobalProfileMenu />
      </div>
      <style jsx>{`
        @media (max-width: 860px) {
          .xom3-appNavDesktop {
            display: none !important;
          }
        }
      `}</style>
    </header>
  );
}



