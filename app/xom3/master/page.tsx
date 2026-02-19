import Link from "next/link";
import SurfaceFrame from "@/app/components/SurfaceFrame";

export default function Xom3MasterPage() {
  return (
    <SurfaceFrame
      title="XOM3 — Master (Archived)"
      description="This master surface is intentionally marked archived in this cockpit branch. It exists to preserve route truth and prevent demo dead-ends."
      activation="archived"
      links={[
        { href: "/_archive_xom3/master", label: "View Archived Master UI" },
        { href: "/xom3", label: "XOM3 Entry" },
      ]}
      footerNote="Some surfaces are dormant and will activate as their sovereigns come online. Archived surfaces remain accessible for continuity but are not the current control plane."
    >
      <div className="xom3-glass xom3-glassEdge" style={{ padding: 18 }}>
        <div className="xom3-mono" style={{ fontSize: 12, color: "var(--text-2)", letterSpacing: "0.08em" }}>
          ARCHIVE NOTICE
        </div>
        <p className="xom3-subtle" style={{ marginTop: 10, marginBottom: 0 }}>
          If you need the legacy master UI for reference, you can open it here:
        </p>
        <div style={{ marginTop: 12 }}>
          <Link className="xom3-btn xom3-btnSecondary" href="/_archive_xom3/master">
            Open Archived Master
          </Link>
        </div>
      </div>
    </SurfaceFrame>
  );
}
