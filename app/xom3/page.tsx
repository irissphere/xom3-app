import SurfaceFrame from "@/app/components/SurfaceFrame";

export default function Xom3EntryPage() {
  return (
    <SurfaceFrame
      title="XOM3 — Master Cockpit"
      description="Unified orchestration surface for tenants, lanes, and sovereign posture. This entry surface is mounted for navigation integrity."
      activation="active"
      links={[
        { href: "/operator/dashboard", label: "Operator Dashboard" },
        { href: "/xom3/master", label: "Master (Archived Surface)" },
        { href: "/uoi", label: "UOI Observatory" },
        { href: "/benefits", label: "Benefits CRM" },
      ]}
    />
  );
}
