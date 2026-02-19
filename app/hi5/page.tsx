"use client";

import Link from "next/link";
import SurfaceFrame from "@/app/components/SurfaceFrame";
import { useEffect, useState } from "react";

export default function Hi5Page() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated
    const authStatus = localStorage.getItem("hi5-auth");
    if (authStatus === "authenticated") {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Simple password check - in production, use proper auth
    if (password === "hi5demo2025") {
      localStorage.setItem("hi5-auth", "authenticated");
      setIsAuthenticated(true);
    } else {
      alert("Invalid password");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("hi5-auth");
    setIsAuthenticated(false);
    setPassword("");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="xom3-panel max-w-md w-full">
          <div className="text-center mb-6">
            <div className="text-4xl mb-4">🔒</div>
            <h1 className="text-2xl font-bold text-white mb-2">HI5 Dashboard</h1>
            <p className="text-[var(--text-2)]">Enter access password</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="xom3-input w-full"
              placeholder="Access password"
              required
            />
            <button type="submit" className="xom3-btn xom3-btnPrimary w-full">
              Access Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }
  return (
    <SurfaceFrame
      title="HI5 — Telecom/IT Procurement Automation"
      description="Autonomous lead discovery, qualification, and RFQ generation for telecom and IT procurement"
      activation="active"
      links={[
        { href: "/hi5/monitor", label: "Workflow Monitor" },
      ]}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* System Status Card */}
          <div className="xom3-panel relative overflow-hidden">
            {/* Background Ambient Effect */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none -translate-y-1/2 translate-x-1/2" />

            <div className="relative z-10">
              <div className="flex items-start gap-4 mb-6">
                <div className="text-3xl">🔍</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-2 leading-tight">
                    Lead Discovery Engine
                  </h3>
                  <p className="text-[var(--text-2)] text-sm leading-relaxed">
                    Autonomous scraping across LinkedIn, Twitter, Instagram
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Link
                  href="/hi5/monitor"
                  className="xom3-btn xom3-btnSecondary"
                >
                  View Status
                </Link>
              </div>
            </div>
          </div>

          {/* RFQ Machine Card */}
          <div className="xom3-panel relative overflow-hidden">
            {/* Background Ambient Effect */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl pointer-events-none -translate-y-1/2 translate-x-1/2" />

            <div className="relative z-10">
              <div className="flex items-start gap-4 mb-6">
                <div className="text-3xl">📋</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-2 leading-tight">
                    RFQ Automation
                  </h3>
                  <p className="text-[var(--text-2)] text-sm leading-relaxed">
                    Generate, send, and track vendor RFQs automatically
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Link
                  href="/hi5/monitor"
                  className="xom3-btn xom3-btnSecondary"
                >
                  Monitor Workflows
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="xom3-panel relative overflow-hidden">
          {/* Background Ambient Effect */}
          <div className="absolute top-0 left-0 w-40 h-40 bg-cyan-500/3 rounded-full blur-3xl pointer-events-none -translate-y-1/2 -translate-x-1/2" />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">
                System Overview
              </h3>
              <span className="xom3-badge xom3-badge-success">LIVE</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-2">6</div>
                <div className="text-xs text-[var(--text-2)] uppercase tracking-wider font-semibold">
                  Active Workflows
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-2">∞</div>
                <div className="text-xs text-[var(--text-2)] uppercase tracking-wider font-semibold">
                  Lead Potential
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-2">24/7</div>
                <div className="text-xs text-[var(--text-2)] uppercase tracking-wider font-semibold">
                  Operation
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-xl p-5 hover:bg-blue-500/15 transition-all duration-200">
            <div className="text-2xl mb-3">🎯</div>
            <h4 className="text-base font-bold text-white mb-2 leading-tight">
              Smart Targeting
            </h4>
            <p className="text-sm text-[var(--text-2)] leading-relaxed">
              AI-powered lead qualification with custom ICP matching and duplicate suppression.
            </p>
          </div>

          <div className="relative bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20 rounded-xl p-5 hover:bg-green-500/15 transition-all duration-200">
            <div className="text-2xl mb-3">⚡</div>
            <h4 className="text-base font-bold text-white mb-2 leading-tight">
              Automated RFQs
            </h4>
            <p className="text-sm text-[var(--text-2)] leading-relaxed">
              Generate professional RFQs, collect responses, and create comparison summaries.
            </p>
          </div>

          <div className="relative bg-gradient-to-br from-red-500/10 to-red-500/5 border border-red-500/20 rounded-xl p-5 hover:bg-red-500/15 transition-all duration-200">
            <div className="text-2xl mb-3">🏛️</div>
            <h4 className="text-base font-bold text-white mb-2 leading-tight">
              Public Sector Focus
            </h4>
            <p className="text-sm text-[var(--text-2)] leading-relaxed">
              Specialized RFP automation for schools, districts, and government procurement.
            </p>
          </div>

          <div className="relative bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 rounded-xl p-5 hover:bg-purple-500/15 transition-all duration-200">
            <div className="text-2xl mb-3">🔗</div>
            <h4 className="text-base font-bold text-white mb-2 leading-tight">
              CRM Integration
            </h4>
            <p className="text-sm text-[var(--text-2)] leading-relaxed">
              Seamless sync with Zoho CRM for lead management and deal tracking.
            </p>
          </div>
        </div>
      </div>
    </SurfaceFrame>
  );
}






