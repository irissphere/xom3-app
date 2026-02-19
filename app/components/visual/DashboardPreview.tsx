"use client";

import { useEffect, useState } from "react";

interface DashboardPreviewProps {
  size?: number;
  className?: string;
}

// Simulated dashboard data that updates
const MOCK_STATS = {
  leads: { value: 847, label: "Leads Today", trend: "+23%" },
  sms: { value: 1243, label: "SMS Sent", trend: "+15%" },
  calls: { value: 89, label: "Calls Made", trend: "+8%" },
  appointments: { value: 34, label: "Appointments", trend: "+12%" },
};

const MOCK_ACTIVITIES = [
  { type: "lead", text: "New lead: John D. from Google Ads", time: "Just now" },
  { type: "sms", text: "SMS sent to Maria S.", time: "2m ago" },
  { type: "call", text: "Call completed with Robert K.", time: "5m ago" },
  { type: "appointment", text: "Appointment booked: Tomorrow 2PM", time: "8m ago" },
];

export default function DashboardPreview({ size = 480, className }: DashboardPreviewProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [pulseStats, setPulseStats] = useState(false);

  // Rotate through activities
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % MOCK_ACTIVITIES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Pulse animation for stats
  useEffect(() => {
    const interval = setInterval(() => {
      setPulseStats(true);
      setTimeout(() => setPulseStats(false), 500);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const scale = size / 480;

  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: size,
        height: size * 0.75,
        perspective: "1000px",
      }}
    >
      {/* Glow effect behind */}
      <div
        style={{
          position: "absolute",
          inset: "-20%",
          background: "radial-gradient(ellipse at center, rgba(10, 132, 255, 0.15), transparent 70%)",
          filter: "blur(40px)",
          pointerEvents: "none",
        }}
      />

      {/* Main dashboard container with 3D tilt */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          transform: "rotateY(-8deg) rotateX(5deg)",
          transformStyle: "preserve-3d",
        }}
      >
        {/* Dashboard frame */}
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: 16 * scale,
            background: "linear-gradient(145deg, rgba(15, 23, 42, 0.95), rgba(10, 15, 30, 0.98))",
            border: "1px solid rgba(99, 102, 241, 0.3)",
            boxShadow: `
              0 25px 50px -12px rgba(0, 0, 0, 0.5),
              0 0 60px rgba(10, 132, 255, 0.1),
              inset 0 1px 0 rgba(255, 255, 255, 0.05)
            `,
            overflow: "hidden",
            padding: 16 * scale,
            display: "flex",
            flexDirection: "column",
            gap: 12 * scale,
          }}
        >
          {/* Header bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingBottom: 10 * scale,
              borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 * scale }}>
              <div
                style={{
                  width: 28 * scale,
                  height: 28 * scale,
                  borderRadius: 6 * scale,
                  background: "linear-gradient(135deg, #0a84ff, #6366f1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12 * scale,
                  fontWeight: 700,
                  color: "#fff",
                }}
              >
                X3
              </div>
              <span
                style={{
                  fontSize: 13 * scale,
                  fontWeight: 600,
                  color: "#fff",
                  letterSpacing: "-0.01em",
                }}
              >
                Operator Dashboard
              </span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6 * scale,
              }}
            >
              <div
                style={{
                  width: 8 * scale,
                  height: 8 * scale,
                  borderRadius: "50%",
                  background: "#22c55e",
                  boxShadow: "0 0 8px rgba(34, 197, 94, 0.5)",
                }}
              />
              <span style={{ fontSize: 10 * scale, color: "#22c55e" }}>Live</span>
            </div>
          </div>

          {/* Stats grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 8 * scale,
            }}
          >
            {Object.entries(MOCK_STATS).map(([key, stat]) => (
              <div
                key={key}
                style={{
                  padding: `${10 * scale}px ${8 * scale}px`,
                  borderRadius: 8 * scale,
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                  transition: "transform 200ms ease",
                  transform: pulseStats ? "scale(1.02)" : "scale(1)",
                }}
              >
                <div
                  style={{
                    fontSize: 18 * scale,
                    fontWeight: 700,
                    color: "#fff",
                    lineHeight: 1,
                    marginBottom: 4 * scale,
                  }}
                >
                  {stat.value.toLocaleString()}
                </div>
                <div
                  style={{
                    fontSize: 9 * scale,
                    color: "rgba(148, 163, 184, 0.8)",
                    marginBottom: 2 * scale,
                  }}
                >
                  {stat.label}
                </div>
                <div
                  style={{
                    fontSize: 9 * scale,
                    color: "#22c55e",
                    fontWeight: 500,
                  }}
                >
                  {stat.trend}
                </div>
              </div>
            ))}
          </div>

          {/* Activity feed */}
          <div
            style={{
              flex: 1,
              borderRadius: 8 * scale,
              background: "rgba(255, 255, 255, 0.02)",
              border: "1px solid rgba(255, 255, 255, 0.05)",
              padding: 10 * scale,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                fontSize: 10 * scale,
                fontWeight: 600,
                color: "#94a3b8",
                marginBottom: 8 * scale,
                letterSpacing: "0.05em",
              }}
            >
              LIVE ACTIVITY
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 * scale }}>
              {MOCK_ACTIVITIES.map((activity, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8 * scale,
                    padding: `${6 * scale}px ${8 * scale}px`,
                    borderRadius: 6 * scale,
                    background:
                      idx === activeIndex
                        ? "rgba(10, 132, 255, 0.15)"
                        : "transparent",
                    border:
                      idx === activeIndex
                        ? "1px solid rgba(10, 132, 255, 0.3)"
                        : "1px solid transparent",
                    transition: "all 300ms ease",
                  }}
                >
                  <div
                    style={{
                      width: 6 * scale,
                      height: 6 * scale,
                      borderRadius: "50%",
                      background:
                        activity.type === "lead"
                          ? "#22d3ee"
                          : activity.type === "sms"
                          ? "#a78bfa"
                          : activity.type === "call"
                          ? "#f472b6"
                          : "#22c55e",
                    }}
                  />
                  <span
                    style={{
                      flex: 1,
                      fontSize: 10 * scale,
                      color: idx === activeIndex ? "#fff" : "#94a3b8",
                    }}
                  >
                    {activity.text}
                  </span>
                  <span
                    style={{
                      fontSize: 8 * scale,
                      color: "#475569",
                    }}
                  >
                    {activity.time}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingTop: 8 * scale,
              borderTop: "1px solid rgba(255, 255, 255, 0.06)",
            }}
          >
            <div style={{ display: "flex", gap: 6 * scale }}>
              {["Leads", "SMS", "Social", "Voice"].map((tab, idx) => (
                <div
                  key={tab}
                  style={{
                    padding: `${4 * scale}px ${10 * scale}px`,
                    borderRadius: 4 * scale,
                    background: idx === 0 ? "rgba(10, 132, 255, 0.2)" : "transparent",
                    border: idx === 0 ? "1px solid rgba(10, 132, 255, 0.3)" : "1px solid transparent",
                    fontSize: 9 * scale,
                    color: idx === 0 ? "#0a84ff" : "#64748b",
                    fontWeight: 500,
                  }}
                >
                  {tab}
                </div>
              ))}
            </div>
            <div
              style={{
                fontSize: 8 * scale,
                color: "#475569",
              }}
            >
              Refreshes automatically
            </div>
          </div>
        </div>
      </div>

      {/* Floating feature badges */}
      <div
        style={{
          position: "absolute",
          top: "10%",
          right: "-8%",
          padding: `${8 * scale}px ${12 * scale}px`,
          borderRadius: 8 * scale,
          background: "rgba(34, 197, 94, 0.15)",
          border: "1px solid rgba(34, 197, 94, 0.3)",
          fontSize: 10 * scale,
          fontWeight: 600,
          color: "#22c55e",
          animation: "float 3s ease-in-out infinite",
        }}
      >
        SMS Auto-Sent ✓
      </div>

      <div
        style={{
          position: "absolute",
          bottom: "15%",
          left: "-5%",
          padding: `${8 * scale}px ${12 * scale}px`,
          borderRadius: 8 * scale,
          background: "rgba(167, 139, 250, 0.15)",
          border: "1px solid rgba(167, 139, 250, 0.3)",
          fontSize: 10 * scale,
          fontWeight: 600,
          color: "#a78bfa",
          animation: "float 3s ease-in-out infinite 1.5s",
        }}
      >
        Lead Captured ✓
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  );
}
