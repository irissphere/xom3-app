"use client";

import SocialBroadcastPanel from "@/components/xom3/ui/panels/SocialBroadcastPanel";
import { FeatureGate } from "@/app/components/FeatureGate";

export default function SocialPage() {
  return (
    <FeatureGate feature="social">
      <main className="social-lane">
        {/* Orbital Background Layer */}
        <div className="orbital-bg-layer">
          <div className="orbital-orb orbital-orb-primary animate-orb-drift"
               style={{ width: 600, height: 600, top: '-10%', left: '-5%' }} />
          <div className="orbital-orb orbital-orb-secondary animate-orb-drift-alt"
               style={{ width: 400, height: 400, bottom: '10%', right: '-8%' }} />
          <div className="orbital-grid animate-grid-rotate" />
        </div>

        {/* Beam Geometry */}
        <div className="beam-wrapper">
          <div className="beam-core" />
          <div className="beam-arc" />
        </div>

        {/* Main Content */}
        <div className="social-lane-inner">
          <SocialBroadcastPanel />
        </div>
      </main>
    </FeatureGate>
  );
}
