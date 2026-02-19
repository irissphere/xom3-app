"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type SubscriptionStatus = {
  ok: boolean;
  effectiveTier?: string;
  trial?: { isActive: boolean; daysRemaining: number; expired: boolean };
};

export default function BillingSettingsPage() {
  const [data, setData] = useState<SubscriptionStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/subscription/status", { cache: "no-store" });
        const json = await res.json();
        if (cancelled) return;
        setData(json?.ok ? json : null);
      } catch {
        if (cancelled) return;
        setData(null);
      }
    };
    load().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="xom3-home">
      <div className="xom3-container" style={{ paddingTop: 22, paddingBottom: 24 }}>
        <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
          <div>
            <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 12, letterSpacing: "0.08em" }}>
              SETTINGS
            </div>
            <h1 style={{ margin: "10px 0 6px 0", fontSize: 28, fontWeight: 860, letterSpacing: "-0.02em" }}>
              Billing
            </h1>
            <p className="xom3-subtle" style={{ margin: 0, maxWidth: 820 }}>
              View your plan and upgrade when you’re ready.
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link className="xom3-btn xom3-btnSecondary" href="/settings">
              Back
            </Link>
            <Link className="xom3-btn xom3-btnPrimary" href="/pricing">
              View plans
            </Link>
          </div>
        </header>

        <section className="xom3-section" style={{ marginTop: 14 }}>
          <div className="xom3-glass xom3-glassEdge" style={{ padding: 18 }}>
            <div className="xom3-grid xom3-grid3">
              <Info label="Current plan" value={data?.effectiveTier ? String(data.effectiveTier) : "—"} />
              <Info
                label="Trial"
                value={
                  data?.trial?.isActive ? `${data.trial.daysRemaining} days left` : data?.trial?.expired ? "Expired" : "—"
                }
              />
              <Info label="Billing" value="Managed on the Pricing page" />
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

















