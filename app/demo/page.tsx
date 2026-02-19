import Link from "next/link";

export default function DemoPage() {
  return (
    <main className="xom3-home">
      <div className="xom3-container" style={{ paddingTop: 64, paddingBottom: 56, maxWidth: 960 }}>
        <div className="xom3-glass xom3-glassEdge" style={{ padding: 22 }}>
          <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 12, letterSpacing: "0.08em" }}>
            DEMO
          </div>
          <h1 style={{ margin: "10px 0 6px 0", fontSize: 26, fontWeight: 900, letterSpacing: "-0.02em" }}>
            XOM3 demo
          </h1>
          <p className="xom3-subtle" style={{ margin: 0, maxWidth: 760 }}>
            This is a curated walkthrough page for sharing with potential customers. It’s intentionally not shown in the main navigation.
          </p>

          <div className="xom3-divider" />

          <div className="xom3-grid xom3-grid3">
            <DemoCard title="Dashboard" desc="High-level view: leads, follow-ups, connected accounts." href="/dashboard" />
            <DemoCard title="Leads" desc="Lead list + fast detail panel (notes, tasks)." href="/leads" />
            <DemoCard title="Social Connect" desc="Connect platforms with clear status and controls." href="/social-connect" />
          </div>

          <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link className="xom3-btn xom3-btnPrimary" href="/pricing">
              Pricing
            </Link>
            <Link className="xom3-btn xom3-btnSecondary" href="/">
              Home
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

function DemoCard(props: { title: string; desc: string; href: string }) {
  return (
    <Link
      href={props.href}
      className="xom3-glass xom3-glassEdge"
      style={{ textDecoration: "none", padding: 18, display: "grid", gap: 8 }}
    >
      <div style={{ fontWeight: 900 }}>{props.title}</div>
      <div className="xom3-subtle" style={{ lineHeight: 1.45 }}>
        {props.desc}
      </div>
      <div className="xom3-muted" style={{ fontWeight: 900 }}>
        Open →
      </div>
    </Link>
  );
}

















