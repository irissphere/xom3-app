"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/client";
import GlobalProfileMenu from "./GlobalProfileMenu";

/**
 * Minimal top bar shown on pages that don't use AppNavigation (commerce, shop, pricing, home, etc.).
 * Shows visible Log in / Sign up buttons for guests, profile dropdown for authenticated users.
 * Hidden on SpaceBaddie domains — they have their own headers.
 */
export default function GlobalTopBar() {
  const pathname = usePathname();
  const isSpaceBaddie = pathname?.startsWith("/spacebaddie");
  const isShop = pathname?.startsWith("/shop");
  const [user, setUser] = useState<unknown>(undefined); // undefined = loading

  // Check hostname to handle domain-based routing (middleware rewrites don't change client pathname)
  const isSpaceBaddieDomain =
    typeof window !== "undefined" &&
    (window.location.hostname.includes("spacebaddie.com"));

  useEffect(() => {
    getCurrentUser().then((u) => setUser(u ?? null));
  }, []);

  // Shop and SpaceBaddie pages have their own headers with auth buttons
  if (isSpaceBaddie || isShop || isSpaceBaddieDomain) return null;

  const isLoggedIn = user !== undefined && user !== null;
  const isLoading = user === undefined;

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 90,
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "linear-gradient(180deg, rgba(7, 11, 20, 0.92), rgba(5, 8, 16, 0.84))",
        backdropFilter: "blur(14px)",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 14,
        }}
      >
        <Link
          href={isLoggedIn ? "/dashboard" : "/"}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
            color: "var(--text-1)",
          }}
        >
          <div
            aria-hidden="true"
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "linear-gradient(135deg, rgba(10,132,255,0.25), rgba(99,102,241,0.18))",
              border: "1px solid rgba(10,132,255,0.25)",
            }}
          />
          <span style={{ fontWeight: 800, letterSpacing: "-0.02em", fontSize: 16 }}>XOM3</span>
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {isLoading ? null : isLoggedIn ? (
            <GlobalProfileMenu />
          ) : (
            <>
              <Link
                href="/login"
                style={{
                  padding: "8px 18px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.04)",
                  color: "#e2e8f0",
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: "none",
                  transition: "background 150ms ease, border-color 150ms ease",
                }}
              >
                Log in
              </Link>
              <Link
                href="/spacebaddie/login"
                style={{
                  padding: "8px 18px",
                  borderRadius: 10,
                  border: "none",
                  background: "linear-gradient(135deg, #0a84ff, #6366f1)",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 700,
                  textDecoration: "none",
                  transition: "opacity 150ms ease",
                }}
              >
                Sign up free
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
