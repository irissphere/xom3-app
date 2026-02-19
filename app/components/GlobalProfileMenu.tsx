"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { supabase, getCurrentUser, signOut } from "@/lib/supabase/client";

const MENU_STYLE = {
  button: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 14px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
    color: "var(--text-1)",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    transition: "background 150ms ease, border-color 150ms ease",
  } as React.CSSProperties,
  dropdown: {
    position: "absolute" as const,
    right: 0,
    top: "100%",
    marginTop: 6,
    minWidth: 200,
    background: "rgba(12, 14, 22, 0.98)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 12,
    boxShadow: "0 12px 40px rgba(0,0,0,0.4)",
    padding: "6px 0",
    zIndex: 1000,
  } as React.CSSProperties,
  item: {
    display: "block",
    width: "100%",
    padding: "10px 16px",
    textAlign: "left" as const,
    background: "transparent",
    border: "none",
    color: "var(--text-1)",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    textDecoration: "none",
    transition: "background 100ms ease",
  } as React.CSSProperties,
};

export default function GlobalProfileMenu() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ email?: string; profile?: { display_name?: string | null } } | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getCurrentUser().then((u) => {
      setUser(u);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      getCurrentUser().then(setUser);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
    router.push("/");
  };

  const label = user?.profile?.display_name || user?.email?.split("@")[0] || "Account";
  const initial = (user?.profile?.display_name?.[0] || user?.email?.[0] || "A").toUpperCase();

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        aria-expanded={open ? "true" : "false"}
        aria-haspopup="true"
        aria-label="Profile menu"
        onClick={() => setOpen(!open)}
        style={{
          ...MENU_STYLE.button,
          ...(open ? { background: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.18)" } : {}),
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: "linear-gradient(135deg, rgba(10,132,255,0.35), rgba(139,92,246,0.25))",
            border: "1px solid rgba(255,255,255,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 700,
            color: "#e2e8f0",
          }}
        >
          {loading ? "…" : initial}
        </div>
        <span style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {loading ? "…" : label}
        </span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, opacity: 0.7 }}>
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div style={MENU_STYLE.dropdown} role="menu">
          {user ? (
            <>
              <Link
                href="/dashboard"
                style={MENU_STYLE.item}
                role="menuitem"
                onClick={() => setOpen(false)}
                onMouseOver={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                onMouseOut={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                Dashboard
              </Link>
              <Link
                href="/settings"
                style={MENU_STYLE.item}
                role="menuitem"
                onClick={() => setOpen(false)}
                onMouseOver={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                onMouseOut={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                Settings
              </Link>
            </>
          ) : null}
          <Link
            href="/shop"
            style={MENU_STYLE.item}
            role="menuitem"
            onClick={() => setOpen(false)}
            onMouseOver={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
            onMouseOut={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            View store
          </Link>
          <Link
            href="/commerce"
            style={MENU_STYLE.item}
            role="menuitem"
            onClick={() => setOpen(false)}
            onMouseOver={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
            onMouseOut={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            Commerce hub
          </Link>
          <a
            href="https://xom3.io/how-it-works"
            target="_blank"
            rel="noopener noreferrer"
            style={MENU_STYLE.item}
            role="menuitem"
            onClick={() => setOpen(false)}
            onMouseOver={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
            onMouseOut={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            Help
          </a>
          {user ? (
            <>
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", margin: "4px 0" }} />
              <button
                type="button"
                style={MENU_STYLE.item}
                role="menuitem"
                onClick={handleSignOut}
                onMouseOver={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.12)"; e.currentTarget.style.color = "#f87171"; }}
                onMouseOut={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-1)"; }}
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", margin: "4px 0" }} />
              <Link
                href="/login"
                style={MENU_STYLE.item}
                role="menuitem"
                onClick={() => setOpen(false)}
                onMouseOver={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                onMouseOut={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                Log in
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
