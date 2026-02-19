"use client";

import Link from "next/link";

export type SurfaceActivation = "active" | "dormant" | "archived";

function activationStyles(state: SurfaceActivation) {
  switch (state) {
    case "active":
      return {
        bg: "rgba(34,197,94,0.14)",
        fg: "rgb(34,197,94)",
        border: "rgba(34,197,94,0.28)",
        label: "ACTIVE",
      };
    case "archived":
      return {
        bg: "rgba(148,163,184,0.10)",
        fg: "rgb(148,163,184)",
        border: "rgba(148,163,184,0.22)",
        label: "ARCHIVED",
      };
    case "dormant":
    default:
      return {
        bg: "rgba(245,158,11,0.12)",
        fg: "rgb(245,158,11)",
        border: "rgba(245,158,11,0.26)",
        label: "DORMANT",
      };
  }
}

export default function SurfaceFrame(props: {
  title: string;
  description: string;
  activation: SurfaceActivation;
  children?: React.ReactNode;
  footerNote?: string;
  links?: Array<{ href: string; label: string }>;
}) {
  const styles = activationStyles(props.activation);

  return (
    <main className="xom3-home">
      <div className="xom3-container" style={{ paddingTop: 26, paddingBottom: 28 }}>
        <header
          className="xom3-glass xom3-glassEdge"
          style={{
            padding: 20,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 14,
            flexWrap: "wrap",
          }}
        >
          <div style={{ minWidth: 240 }}>
            <div className="xom3-mono" style={{ fontSize: 12, letterSpacing: "0.08em", color: "var(--text-2)" }}>
              PAGE
            </div>
            <h1 style={{ marginTop: 10, marginBottom: 6, fontSize: 26, fontWeight: 780, letterSpacing: "-0.02em" }}>
              {props.title}
            </h1>
            <p className="xom3-subtle" style={{ margin: 0, maxWidth: 720 }}>
              {props.description}
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div
              style={{
                padding: "8px 12px",
                borderRadius: 999,
                background: styles.bg,
                border: `1px solid ${styles.border}`,
                color: styles.fg,
                fontFamily: "var(--font-mono)",
                fontSize: 12,
              }}
              aria-label={`Activation state: ${styles.label}`}
            >
              ACTIVATION: {styles.label}
            </div>

            <Link className="xom3-btn xom3-btnSecondary" href="/dashboard">
              Dashboard
            </Link>
            <Link className="xom3-btn xom3-btnPrimary" href="/leads">
              Leads
            </Link>
          </div>
        </header>

        {props.links && props.links.length > 0 ? (
          <section className="xom3-section" style={{ marginTop: 14 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {props.links.map((l) => (
                <Link key={l.href} className="xom3-btn xom3-btnSecondary" href={l.href}>
                  {l.label}
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {props.children ? (
          <section className="xom3-section" style={{ marginTop: 14 }}>
            {props.children}
          </section>
        ) : null}

        <footer style={{ marginTop: 18, color: "var(--text-2)", fontSize: 12 }}>
          {props.footerNote ? props.footerNote : "Some pages are still being improved. If anything is confusing, tell us what you expected."}
        </footer>
      </div>
    </main>
  );
}
