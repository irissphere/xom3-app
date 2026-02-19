"use client";

import Link from "next/link";

export default function PortalBillingPage() {
  return (
    <main className="xom3-home">
      <div className="xom3-container" style={{ paddingTop: 22, paddingBottom: 24 }}>
        <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
          <div>
            <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 12, letterSpacing: "0.08em" }}>
              CLIENT PORTAL
            </div>
            <h1 style={{ margin: "10px 0 6px 0", fontSize: 28, fontWeight: 860, letterSpacing: "-0.02em" }}>
              Billing
            </h1>
            <p className="xom3-subtle" style={{ margin: 0, maxWidth: 820 }}>
              Payments and billing history.
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link className="xom3-btn xom3-btnSecondary" href="/portal">
              Back
            </Link>
          </div>
        </header>

        <section className="xom3-section" style={{ marginTop: 14 }}>
          <div className="xom3-glass xom3-glassEdge" style={{ padding: 18 }}>
            <div className="xom3-panel-title">Payments</div>
            <div className="xom3-panel-subtitle">Client billing is next. This page will show invoices and payment methods.</div>
            <div style={{ marginTop: 14 }} className="xom3-grid xom3-grid2">
              <Info label="Current balance" value="—" />
              <Info label="Next payment" value="—" />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Info(props: { label: string; value: string }) {
  return (
    <div style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}>
      <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 12 }}>
        {props.label.toUpperCase()}
      </div>
      <div style={{ marginTop: 6, fontWeight: 850 }}>{props.value}</div>
    </div>
  );
}

















