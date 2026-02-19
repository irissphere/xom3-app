"use client";

import SurfaceFrame from "@/app/components/SurfaceFrame";
import ConstellationMapPanel from "./ui/ConstellationMapPanel";

export default function SovereignsPage() {
  return (
    <SurfaceFrame
      title="Constellation Map"
      description="Living posture map of all sovereigns. Kernel truth + SSE presence."
      activation="active"
      links={[
        { href: "/timeline", label: "Timeline" },
        { href: "/rituals", label: "Rituals" },
        { href: "/uoi", label: "UOI" },
        { href: "/system/status", label: "System" },
        { href: "/broadcast/operations", label: "Broadcast" },
        { href: "/hse", label: "HSE" },
      ]}
    >
      <ConstellationMapPanel />
    </SurfaceFrame>
  );
}
