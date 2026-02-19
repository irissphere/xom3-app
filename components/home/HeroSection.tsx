'use client';

import { useRouter } from 'next/navigation';
import TechEyeball from '@/app/components/visual/TechEyeball';

export function HeroSection() {
  const router = useRouter();

  return (
    <section className="xom3-home-hero" aria-labelledby="xom3-home-hero-title">
      {/* Beam + orbital system (behind content) */}
      <div className="beam-wrapper" aria-hidden="true">
        <div className="beam-core" />
        <div className="beam-arc" />
        <div className="orbital-bg-layer">
          <div className="orbital-grid animate-grid-rotate" />
          <div className="orbital-orb orbital-orb-primary animate-orb-drift" style={{ top: "12%", left: "18%", width: 520, height: 520 }} />
          <div className="orbital-orb orbital-orb-secondary animate-orb-drift-alt" style={{ top: "38%", left: "62%", width: 420, height: 420 }} />
          <div className="orbital-orb orbital-orb-accent animate-orb-drift" style={{ top: "62%", left: "28%", width: 360, height: 360 }} />
        </div>
      </div>

      <div className="xom3-container hero-inner">
        <div className="hero-grid">
          <div className="xom3-home-heroCopy">
        <h1 id="xom3-home-hero-title" className="xom3-home-heroTitle">
          The Xtension of You.<br />
          <span className="xom3-home-heroSub">Your business, automated.</span>
        </h1>
        <p className="xom3-home-heroBody">
          A modern lead engine with auto-socials, instant follow-ups, and a CRM that quietly runs your business in the background.
        </p>
        <div className="xom3-home-ctaRow" role="group" aria-label="Primary actions">
          <button 
            onClick={() => router.push('/intake')}
            className="xom3-btn xom3-btnPrimary"
          >
            Start Generating Leads
          </button>
          <button 
            onClick={() => router.push('/how-it-works')}
            className="xom3-btn xom3-btnSecondary"
          >
            See How X.O.M3 Works
          </button>
        </div>
          </div>

          <div className="hero-eyeball" aria-hidden="true">
            <TechEyeball className="xom3-home-eyeball animate-breathe animate-float" intensity="medium" />
          </div>
        </div>
      </div>
    </section>
  );
}
