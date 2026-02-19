"use client";

import SurfaceFrame from "@/app/components/SurfaceFrame";
import Hi5MonitorPanel from "@/app/xom3/ui/panels/Hi5MonitorPanel";
import { useEffect, useState } from "react";

export default function Hi5MonitorPage() {
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
            <h1 className="text-2xl font-bold text-white mb-2">HI5 Monitor</h1>
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
              Access Monitor
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <SurfaceFrame
      title="HI5 — Procurement Workflow Monitor"
      description="Real-time monitoring and control of telecom/IT procurement lead discovery and RFQ automation workflows"
      activation="active"
      links={[
        { href: "/hi5", label: "HI5 Entry" },
      ]}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <Hi5MonitorPanel />
      </div>
    </SurfaceFrame>
  );
}






