import SurfaceFrame from "@/app/components/SurfaceFrame";

export default function HealthcareLanePage() {
  return (
    <SurfaceFrame
      title="Healthcare — CRM & Pipelines"
      description="Healthcare lane surfaces, pipeline boards, and compliance posture. Mounted for continuity; the healthcare sovereign is currently dormant in this cockpit branch."
      activation="dormant"
      links={[
        { href: "/benefits", label: "Benefits CRM" },
        { href: "/uoi", label: "UOI Observatory" },
      ]}
    />
  );
}
