"use client";

import { useRouter } from "next/navigation";

export default function SubscriptionCancelPage() {
  const router = useRouter();

  return (
    <main className="xom3-home">
      <div className="xom3-container" style={{ paddingTop: 80, paddingBottom: 60, maxWidth: 720 }}>
        <div className="xom3-glass xom3-glassEdge" style={{ padding: 22 }}>
          <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 12, letterSpacing: "0.08em" }}>
            SUBSCRIPTION
          </div>
          <h1 style={{ margin: "10px 0 6px 0", fontSize: 26, fontWeight: 900, letterSpacing: "-0.02em" }}>
            Checkout cancelled
          </h1>
          <p className="xom3-subtle" style={{ margin: 0 }}>
            No charges were made. You can pick a plan anytime.
          </p>

          <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="xom3-btn xom3-btnPrimary" onClick={() => router.push("/pricing")}>
              View plans
            </button>
            <button className="xom3-btn xom3-btnSecondary" onClick={() => router.push("/dashboard")}>
              Back to dashboard
            </button>
            <a className="xom3-btn xom3-btnSecondary" href="/">
              Home
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
