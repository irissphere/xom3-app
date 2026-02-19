"use client";

import Link from "next/link";

export default function PortalHomePage() {
  return (
    <main className="xom3-home">
      <div className="xom3-container" style={{ paddingTop: 22, paddingBottom: 24 }}>
        <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
          <div>
            <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 12, letterSpacing: "0.08em" }}>
              CLIENT PORTAL
            </div>
            <h1 style={{ margin: "10px 0 6px 0", fontSize: 28, fontWeight: 860, letterSpacing: "-0.02em" }}>
              Welcome back
            </h1>
            <p className="xom3-subtle" style={{ margin: 0, maxWidth: 820 }}>
              View your plan, documents, and payments in one place.
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link className="xom3-btn xom3-btnSecondary" href="/dashboard">
              Business dashboard
            </Link>
            <Link className="xom3-btn xom3-btnPrimary" href="/login">
              Sign in
            </Link>
          </div>
        </header>

        <section className="xom3-section" style={{ marginTop: 14 }}>
          <div className="xom3-grid xom3-grid2">
            <div className="xom3-glass xom3-glassEdge" style={{ padding: 18 }}>
              <div className="xom3-panel-title">My plan</div>
              <div className="xom3-panel-subtitle">Coverage summary, members, and benefits.</div>
              <div style={{ marginTop: 12 }}>
                <Link className="xom3-btn xom3-btnPrimary" href="/portal/plan">
                  View plan
                </Link>
              </div>
            </div>

            <div className="xom3-glass xom3-glassEdge" style={{ padding: 18 }}>
              <div className="xom3-panel-title">Billing</div>
              <div className="xom3-panel-subtitle">Payment methods and history.</div>
              <div style={{ marginTop: 12 }}>
                <Link className="xom3-btn xom3-btnPrimary" href="/portal/billing">
                  View billing
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="xom3-section" style={{ marginTop: 14 }}>
          <div className="xom3-glass xom3-glassEdge" style={{ padding: 18 }}>
            <div style={{ fontWeight: 850 }}>Messages & support</div>
            <div className="xom3-subtle" style={{ marginTop: 6, lineHeight: 1.45 }}>
              Secure messaging and support are next. This portal will stay plain-language and mobile-first.
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

















