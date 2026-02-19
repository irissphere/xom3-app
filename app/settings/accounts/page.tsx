"use client";

// Settings > Accounts Page - Social Media Account Management
// AKV: Clean, sovereign, zero-drift

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import ConnectAccountsPanel from "@/app/components/ConnectAccountsPanel";

function AccountsContent() {
  const searchParams = useSearchParams();
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    const platform = searchParams.get("platform");
    const status = searchParams.get("status");
    const message = searchParams.get("message");

    if (platform && status) {
      setToast({
        type: status === "success" ? "success" : "error",
        message: status === "success"
          ? `Successfully connected ${platform}${message ? `: ${message}` : ""}`
          : `Failed to connect ${platform}: ${message || "Unknown error"}`,
      });

      // Auto-dismiss after 5 seconds
      const timer = setTimeout(() => setToast(null), 5000);

      // Clear URL params
      window.history.replaceState({}, "", "/settings/accounts");

      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  return (
    <>
      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            padding: "16px 24px",
            borderRadius: 12,
            backgroundColor: toast.type === "success" ? "rgba(34,197,94,0.95)" : "rgba(239,68,68,0.95)",
            color: "#fff",
            fontSize: 14,
            fontWeight: 500,
            boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            gap: 12,
            maxWidth: 400,
            animation: "slideIn 0.3s ease-out",
          }}
        >
          <span style={{ fontSize: 18 }}>{toast.type === "success" ? "✓" : "✕"}</span>
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            style={{
              marginLeft: 8,
              padding: "4px 8px",
              borderRadius: 4,
              border: "1px solid rgba(255,255,255,0.3)",
              backgroundColor: "transparent",
              color: "#fff",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      <ConnectAccountsPanel />
    </>
  );
}

export default function AccountsPage() {
  return (
    <div style={styles.page}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.breadcrumb}>
          <a href="/dashboard" style={styles.breadcrumbLink}>Dashboard</a>
          <span style={styles.breadcrumbSep}>/</span>
          <a href="/settings" style={styles.breadcrumbLink}>Settings</a>
          <span style={styles.breadcrumbSep}>/</span>
          <span style={styles.breadcrumbCurrent}>Connected Accounts</span>
        </div>
        <h1 style={styles.pageTitle}>Social Media Accounts</h1>
        <p style={styles.pageDesc}>
          Connect your social media accounts to enable XOM3 to post content on your behalf.
          Your credentials are securely stored and never shared.
        </p>
      </header>

      {/* Main Content */}
      <main style={styles.main}>
        <Suspense fallback={<LoadingState />}>
          <AccountsContent />
        </Suspense>
      </main>

      {/* Setup Guide */}
      <section style={styles.guide}>
        <h3 style={styles.guideTitle}>📋 Setup Guide</h3>
        <div style={styles.guideGrid}>
          <GuideStep
            number={1}
            title="Connect Your Accounts"
            description="Click the connect button for each platform you want to use. You'll be redirected to authorize XOM3."
          />
          <GuideStep
            number={2}
            title="Authorize Access"
            description="Grant XOM3 permission to post on your behalf. We only request the minimum permissions needed."
          />
          <GuideStep
            number={3}
            title="Start Posting"
            description="Once connected, you can schedule and automate posts from the Broadcast control center."
          />
        </div>
      </section>

      {/* Security Notice */}
      <footer style={styles.security}>
        <span style={styles.securityIcon}>🔒</span>
        <div>
          <strong>Your accounts are secure</strong>
          <p style={styles.securityText}>
            XOM3 uses OAuth 2.0 authentication. We never see or store your passwords.
            You can revoke access at any time from your platform&apos;s settings or here.
          </p>
        </div>
      </footer>

      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

function LoadingState() {
  return (
    <div style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      padding: 60,
      color: "#94a3b8",
    }}>
      <div style={{
        width: 32,
        height: 32,
        border: "3px solid rgba(148,163,184,0.2)",
        borderTopColor: "#6366f1",
        borderRadius: "50%",
        animation: "spin 1s linear infinite",
      }} />
    </div>
  );
}

function GuideStep({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div style={styles.guideStep}>
      <span style={styles.guideNumber}>{number}</span>
      <h4 style={styles.guideStepTitle}>{title}</h4>
      <p style={styles.guideStepDesc}>{description}</p>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#0f172a",
    color: "#f1f5f9",
    padding: "32px 24px",
  },
  header: {
    maxWidth: 900,
    margin: "0 auto 32px",
  },
  breadcrumb: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
    fontSize: 13,
  },
  breadcrumbLink: {
    color: "#64748b",
    textDecoration: "none",
  },
  breadcrumbSep: {
    color: "#475569",
  },
  breadcrumbCurrent: {
    color: "#94a3b8",
  },
  pageTitle: {
    margin: 0,
    fontSize: 28,
    fontWeight: 700,
    fontFamily: "'JetBrains Mono', monospace",
    background: "linear-gradient(135deg, #f1f5f9, #94a3b8)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  pageDesc: {
    margin: "8px 0 0",
    fontSize: 15,
    color: "#94a3b8",
    maxWidth: 600,
    lineHeight: 1.6,
  },
  main: {
    maxWidth: 900,
    margin: "0 auto 40px",
  },
  guide: {
    maxWidth: 900,
    margin: "0 auto 32px",
    padding: 24,
    backgroundColor: "rgba(30,41,59,0.5)",
    borderRadius: 16,
    border: "1px solid rgba(148,163,184,0.1)",
  },
  guideTitle: {
    margin: "0 0 20px",
    fontSize: 16,
    fontWeight: 600,
    color: "#f1f5f9",
  },
  guideGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 20,
  },
  guideStep: {
    padding: 16,
    backgroundColor: "rgba(15,23,42,0.5)",
    borderRadius: 10,
  },
  guideNumber: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    height: 28,
    borderRadius: "50%",
    backgroundColor: "rgba(99,102,241,0.2)",
    color: "#818cf8",
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 12,
  },
  guideStepTitle: {
    margin: "0 0 6px",
    fontSize: 14,
    fontWeight: 600,
    color: "#f1f5f9",
  },
  guideStepDesc: {
    margin: 0,
    fontSize: 13,
    color: "#94a3b8",
    lineHeight: 1.5,
  },
  security: {
    maxWidth: 900,
    margin: "0 auto",
    padding: 20,
    backgroundColor: "rgba(34,197,94,0.08)",
    borderRadius: 12,
    border: "1px solid rgba(34,197,94,0.2)",
    display: "flex",
    gap: 16,
    alignItems: "flex-start",
  },
  securityIcon: {
    fontSize: 24,
    flexShrink: 0,
  },
  securityText: {
    margin: "4px 0 0",
    fontSize: 13,
    color: "#94a3b8",
    lineHeight: 1.5,
  },
};




































