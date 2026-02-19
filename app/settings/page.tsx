"use client";

import Link from "next/link";

const settingsSections = [
  {
    id: "notifications",
    title: "Notifications",
    description: "Configure alerts and test notification channels",
    href: "/settings/notifications",
    icon: "🔔",
    color: "#06b6d4",
  },
  {
    id: "accounts",
    title: "Connected Accounts",
    description: "Connect social platforms and manage permissions",
    href: "/social-connect",
    icon: "🔗",
    color: "#6366f1",
  },
  {
    id: "billing",
    title: "Billing",
    description: "View plan and manage subscription",
    href: "/settings/billing",
    icon: "💳",
    color: "#22c55e",
  },
  {
    id: "team",
    title: "Team Members",
    description: "Invite team members and manage access",
    href: "/settings/team",
    icon: "👥",
    color: "#3b82f6",
    disabled: true,
  },
  {
    id: "api",
    title: "API Keys",
    description: "Generate and manage API keys for integrations",
    href: "/settings/api",
    icon: "🔑",
    color: "#ec4899",
    disabled: true,
  },
  {
    id: "preferences",
    title: "Preferences",
    description: "Customize your experience",
    href: "/settings/preferences",
    icon: "⚙️",
    color: "#94a3b8",
    disabled: true,
  },
];

export default function SettingsPage() {
  return (
    <main className="xom3-home">
      <div className="xom3-container" style={{ paddingTop: 22, paddingBottom: 24 }}>
        <header>
          <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 12, letterSpacing: "0.08em" }}>
            SETTINGS
          </div>
          <h1 style={{ margin: "10px 0 6px 0", fontSize: 28, fontWeight: 860, letterSpacing: "-0.02em" }}>
            Settings
          </h1>
          <p className="xom3-subtle" style={{ margin: 0, maxWidth: 820 }}>
            Manage connections, billing, and preferences.
          </p>
        </header>

        <section className="xom3-section" style={{ marginTop: 14 }}>
          <div className="xom3-grid xom3-grid3">
            {settingsSections.map((section) => (
              <SettingsCard key={section.id} {...section} />
            ))}
          </div>
        </section>

        <section className="xom3-section" style={{ marginTop: 14 }}>
          <div className="xom3-glass xom3-glassEdge" style={{ padding: 18 }}>
            <div style={{ fontWeight: 850 }}>Need help?</div>
            <div className="xom3-subtle" style={{ marginTop: 6 }}>
              If something feels confusing or clunky, tell us what you expected and we’ll tighten it up.
            </div>
            <div style={{ marginTop: 12 }}>
              <Link className="xom3-btn xom3-btnSecondary" href="/dashboard">
                Back to dashboard
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function SettingsCard({
  title,
  description,
  href,
  icon,
  color,
  disabled,
}: {
  title: string;
  description: string;
  href: string;
  icon: string;
  color: string;
  disabled?: boolean;
}) {
  const content = (
    <div
      style={{
        padding: 18,
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "linear-gradient(180deg, rgba(10, 14, 26, 0.88), rgba(12, 18, 34, 0.72))",
        boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
        opacity: disabled ? 0.55 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        position: "relative",
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 46,
          height: 46,
          borderRadius: 14,
          backgroundColor: color + "1f",
          border: "1px solid rgba(255,255,255,0.10)",
          fontSize: 22,
          marginBottom: 12,
        }}
      >
        {icon}
      </span>
      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 850 }}>{title}</h3>
      <p className="xom3-subtle" style={{ margin: "8px 0 0 0", lineHeight: 1.45 }}>
        {description}
      </p>
      {disabled && (
        <span
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            padding: "4px 10px",
            borderRadius: 999,
            backgroundColor: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.10)",
            color: "var(--text-2)",
            fontSize: 11,
            fontWeight: 800,
          }}
        >
          Coming soon
        </span>
      )}
      {!disabled ? <span style={{ position: "absolute", bottom: 14, right: 14, color: "var(--text-2)", fontWeight: 900 }}>→</span> : null}
    </div>
  );

  if (disabled) {
    return content;
  }

  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      {content}
    </Link>
  );
}





















