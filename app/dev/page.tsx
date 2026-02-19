"use client";

import Link from "next/link";

export default function DevPage() {
  const services = [
    {
      name: "XOM3 Main App",
      url: "http://localhost:3000",
      status: "✅ Running",
      description: "Main application with dashboards and UI"
    },
    {
      name: "n8n Workflow Engine",
      url: "http://localhost:5678",
      status: "✅ Running",
      description: "Automation workflows and API endpoints"
    },
    {
      name: "HI5 Lead Discovery",
      url: "http://localhost:3000/hi5",
      status: "✅ Active",
      description: "Telecom/IT procurement lead discovery and RFQ automation"
    },
    {
      name: "HI5 Workflow Monitor",
      url: "http://localhost:3000/hi5/monitor",
      status: "✅ Active",
      description: "Real-time HI5 workflow monitoring and status"
    },
    {
      name: "BenefitsCRM",
      url: "http://localhost:3000/benefits",
      status: "⚠️ Needs Setup",
      description: "Medicare, ACA, and private health insurance lead intake system"
    }
  ];

  return (
    <main className="xom3-home">
      <div className="xom3-container" style={{ paddingTop: 22, paddingBottom: 24 }}>
        <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
          <div>
            <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 12, letterSpacing: "0.08em" }}>
              DEVELOPMENT
            </div>
            <h1 style={{ margin: "10px 0 6px 0", fontSize: 28, fontWeight: 860, letterSpacing: "-0.02em" }}>
              XOM3 Development Hub
            </h1>
            <p className="xom3-subtle" style={{ margin: 0, maxWidth: 720 }}>
              All your services in one place. Access everything from localhost:3000.
            </p>
          </div>
        </header>

        <section className="xom3-section" style={{ marginTop: 24 }}>
          <div className="xom3-glass xom3-glassEdge" style={{ padding: 24 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, color: "var(--text-0)" }}>
              🚀 Active Services
            </h2>
            <div style={{ marginBottom: 20, padding: 12, background: "rgba(59, 130, 246, 0.05)", border: "1px solid rgba(59, 130, 246, 0.2)", borderRadius: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-0)", marginBottom: 4 }}>🏢 Business Domains</div>
              <div style={{ fontSize: 12, color: "var(--text-2)" }}>
                <strong>HI5:</strong> Telecom/IT procurement lead discovery and RFQ automation<br/>
                <strong>BenefitsCRM:</strong> Health insurance (Medicare, ACA, private plans) lead intake<br/>
                <strong>XOM3:</strong> Master orchestration and multi-domain management
              </div>
            </div>
            <div style={{ display: "grid", gap: 16 }}>
              {services.map((service) => (
                <div key={service.name} style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: 16,
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.05)",
                  borderRadius: 12
                }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
                      <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-0)", margin: 0 }}>
                        {service.name}
                      </h3>
                      <span style={{
                        padding: "4px 8px",
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 500,
                        background: service.status.includes("✅") ? "rgba(34,197,94,0.1)" : "rgba(245,101,101,0.1)",
                        color: service.status.includes("✅") ? "#4ade80" : "#f87171"
                      }}>
                        {service.status}
                      </span>
                    </div>
                    <p style={{ margin: 0, color: "var(--text-2)", fontSize: 14 }}>
                      {service.description}
                    </p>
                  </div>
                  <a
                    href={service.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: "8px 16px",
                      background: "var(--xom3-primary)",
                      color: "white",
                      textDecoration: "none",
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 500,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6
                    }}
                  >
                    Open →
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="xom3-section" style={{ marginTop: 24 }}>
          <div className="xom3-glass xom3-glassEdge" style={{ padding: 24 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, color: "var(--text-0)" }}>
              🎯 Quick Demo Access
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 16 }}>
              <Link
                href="/hi5"
                style={{
                  display: "block",
                  padding: 20,
                  background: "linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)",
                  border: "1px solid rgba(59, 130, 246, 0.2)",
                  borderRadius: 12,
                  textDecoration: "none",
                  color: "var(--text-0)"
                }}
              >
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
                  HI5 Telecom/IT
                </h3>
                <p style={{ margin: 0, color: "var(--text-2)", fontSize: 14 }}>
                  Procurement lead discovery and RFQ automation
                </p>
              </Link>

              <Link
                href="/hi5/monitor"
                style={{
                  display: "block",
                  padding: 20,
                  background: "linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)",
                  border: "1px solid rgba(16, 185, 129, 0.2)",
                  borderRadius: 12,
                  textDecoration: "none",
                  color: "var(--text-0)"
                }}
              >
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
                  HI5 Monitor
                </h3>
                <p style={{ margin: 0, color: "var(--text-2)", fontSize: 14 }}>
                  Real-time procurement workflow monitoring
                </p>
              </Link>

              <Link
                href="/dashboard"
                style={{
                  display: "block",
                  padding: 20,
                  background: "linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%)",
                  border: "1px solid rgba(139, 92, 246, 0.2)",
                  borderRadius: 12,
                  textDecoration: "none",
                  color: "var(--text-0)"
                }}
              >
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
                  Business Dashboard
                </h3>
                <p style={{ margin: 0, color: "var(--text-2)", fontSize: 14 }}>
                  Multi-domain lead management overview
                </p>
              </Link>
            </div>

            <div style={{ marginTop: 20, padding: 16, background: "rgba(34, 197, 94, 0.05)", border: "1px solid rgba(34, 197, 94, 0.2)", borderRadius: 8 }}>
              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: "var(--text-0)" }}>
                🏥 BenefitsCRM (Health Insurance)
              </h4>
              <p style={{ margin: 0, color: "var(--text-2)", fontSize: 13 }}>
                Medicare, ACA, and private health insurance lead intake and enrollment system - currently in setup phase
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
