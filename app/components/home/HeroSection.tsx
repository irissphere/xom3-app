'use client';

import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

// Dynamic import to prevent SSR issues with the animated components
const DashboardPreview = dynamic(() => import('../visual/DashboardPreview'), { ssr: false });
const GeometryField = dynamic(() => import('../visual/GeometryField'), { ssr: false });

export function HeroSection() {
  const router = useRouter();

  return (
    <section className="hero-section">
      {/* Sacred Geometry Background */}
      <GeometryField intensity="medium" />
      
      {/* Beam effects */}
      <div className="beam-wrapper">
        <div className="beam-core" />
        <div className="beam-arc" />
      </div>

      {/* Content */}
      <div className="hero-content">
        {/* Left: Copy */}
        <div className="hero-inner">
          <div className="hero-eyebrow">
            X.O.M3 — The Xtension of Me
          </div>
          
          <h1 className="hero-title">
            Your Business,<br />
            <span className="hero-title-gradient">
              Automated.
            </span>
          </h1>
          
          <p className="hero-description">
            A modern lead engine with auto-socials, instant follow-ups, and a CRM 
            that quietly runs your business in the background. 24/7 automation. 
            Zero manual work.
          </p>

          {/* CTA Buttons */}
          <div className="hero-cta">
            <button
              onClick={() => router.push('/pricing')}
              className="hero-btn-primary animate-neon-pulse"
            >
              Start Free Trial
            </button>
            
            <button
              onClick={() => router.push('/how-it-works')}
              className="hero-btn-secondary"
            >
              See How It Works
            </button>
          </div>

          {/* Trust signals */}
          <div className="hero-trust">
            <span>✓ No contracts</span>
            <span>✓ Cancel anytime</span>
            <span>✓ 30-day free trial</span>
          </div>
        </div>

        {/* Right: Dashboard Preview */}
        <div className="hero-preview">
          <DashboardPreview size={520} />
        </div>
      </div>

      {/* Styles are in globals.css for proper mobile responsiveness */}
    </section>
  );
}
