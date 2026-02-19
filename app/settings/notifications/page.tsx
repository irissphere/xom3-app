"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type NotificationSettings = {
  slack?: string;
  email?: string;
  webhook?: string;
};

type NotificationTest = {
  channel: string;
  success: boolean;
  error?: string;
  timestamp: number;
};

export default function NotificationsSettingsPage() {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [testResults, setTestResults] = useState<NotificationTest[]>([]);
  const [testingChannel, setTestingChannel] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings/notifications")
      .then((r) => r.json())
      .then((s) => setSettings(s))
      .catch(() => setSettings({}));
  }, []);

  const testNotification = async (channel: string) => {
    setTestingChannel(channel);
    try {
      const response = await fetch("/api/notifications/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel,
          message: `Test notification from ${channel} channel - ${new Date().toLocaleString()}`
        }),
      });
      const result = await response.json();

      setTestResults(prev => [...prev.filter(t => t.channel !== channel), {
        channel,
        success: result.success,
        error: result.error,
        timestamp: Date.now(),
      }]);
    } catch (error) {
      setTestResults(prev => [...prev.filter(t => t.channel !== channel), {
        channel,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: Date.now(),
      }]);
    }
    setTestingChannel(null);
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await fetch("/api/settings/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      // Refresh settings
      const response = await fetch("/api/settings/notifications");
      const updated = await response.json();
      setSettings(updated);
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
    setSaving(false);
  };

  const updateSetting = (channel: string, value: string) => {
    setSettings(prev => prev ? { ...prev, [channel]: value } : { [channel]: value });
  };

  const getTestResult = (channel: string) => {
    return testResults.find(t => t.channel === channel);
  };

  return (
    <main className="xom3-home">
      <div className="xom3-container" style={{ paddingTop: 22, paddingBottom: 24 }}>
        <header style={{ marginBottom: 32 }}>
          <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 12, letterSpacing: "0.08em" }}>
            <Link href="/settings" style={{ textDecoration: "none", color: "var(--text-2)" }}>
              SETTINGS
            </Link>{" "}
            / NOTIFICATIONS
          </div>
          <h1 style={{ margin: "10px 0 6px 0", fontSize: 28, fontWeight: 860, letterSpacing: "-0.02em" }}>
            Notification Settings
          </h1>
          <p className="xom3-subtle" style={{ margin: 0, maxWidth: 720 }}>
            Configure where you receive alerts and test notification channels.
          </p>
        </header>

        <div className="xom3-grid xom3-grid2">
          <div className="xom3-glass xom3-glassEdge" style={{ padding: 20 }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: 18, fontWeight: 800 }}>Notification Channels</h3>
            <p className="xom3-subtle" style={{ margin: "0 0 20px 0" }}>
              Configure your notification preferences and test each channel.
            </p>

            <div style={{ display: "grid", gap: 20 }}>
              <NotificationChannelConfig
                name="Slack"
                description="Send notifications to Slack channels"
                placeholder="https://hooks.slack.com/services/..."
                value={settings?.slack || ""}
                onChange={(value) => updateSetting("slack", value)}
                testing={testingChannel === "slack"}
                testResult={getTestResult("slack")}
                onTest={() => testNotification("slack")}
              />

              <NotificationChannelConfig
                name="Email"
                description="Send email notifications"
                placeholder="alerts@yourcompany.com"
                value={settings?.email || ""}
                onChange={(value) => updateSetting("email", value)}
                testing={testingChannel === "email"}
                testResult={getTestResult("email")}
                onTest={() => testNotification("email")}
              />

              <NotificationChannelConfig
                name="Webhook"
                description="Send notifications to custom endpoints"
                placeholder="https://your-app.com/webhook"
                value={settings?.webhook || ""}
                onChange={(value) => updateSetting("webhook", value)}
                testing={testingChannel === "webhook"}
                testResult={getTestResult("webhook")}
                onTest={() => testNotification("webhook")}
              />
            </div>

            <div style={{ marginTop: 24 }}>
              <button
                onClick={saveSettings}
                disabled={saving}
                style={{
                  padding: "10px 20px",
                  borderRadius: 10,
                  border: "1px solid rgba(6, 182, 212, 0.3)",
                  background: "rgba(6, 182, 212, 0.1)",
                  color: "rgb(6, 182, 212)",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: saving ? "not-allowed" : "pointer",
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </div>

          <div className="xom3-glass xom3-glassEdge" style={{ padding: 20 }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: 18, fontWeight: 800 }}>Channel Overview</h3>
            <p className="xom3-subtle" style={{ margin: "0 0 20px 0" }}>
              What each business channel does in plain English.
            </p>

            <div style={{ display: "grid", gap: 16 }}>
              <ChannelExplanation
                name="Benefits CRM"
                lanes={["Lead Intake", "Follow-ups", "Eligibility", "Automation"]}
                description="Manages health insurance leads, Medicare applications, and employer benefits enrollment"
                href="/benefits"
              />

              <ChannelExplanation
                name="Health CRM"
                lanes={["Patient Intake", "Medical Records", "Compliance", "Billing"]}
                description="Handles healthcare patient data, HIPAA compliance, and medical billing"
                href="/intakecrm"
              />

              <ChannelExplanation
                name="Broadcast"
                lanes={["Content Creation", "Social Posting", "Trend Analysis", "Scheduling"]}
                description="Creates and posts content across social media platforms"
                href="/broadcast/operations"
              />

              <ChannelExplanation
                name="Commerce"
                lanes={["Product Management", "Orders", "Fulfillment", "Advertising"]}
                description="Manages online store, product inventory, and customer orders"
                href="/commerce"
              />

              <ChannelExplanation
                name="System Health"
                lanes={["Monitoring", "Performance", "Security", "Maintenance"]}
                description="Monitors overall system health and infrastructure status"
                href="/hse"
              />
            </div>
          </div>
        </div>

        <section className="xom3-section" style={{ marginTop: 24 }}>
          <div className="xom3-glass xom3-glassEdge" style={{ padding: 18 }}>
            <div style={{ fontWeight: 850 }}>Need help?</div>
            <div className="xom3-subtle" style={{ marginTop: 6 }}>
              Notifications help you stay on top of leads, system issues, and business opportunities.
              Test each channel to make sure alerts reach you when they matter most.
            </div>
            <div style={{ marginTop: 12 }}>
              <Link className="xom3-btn xom3-btnSecondary" href="/settings">
                Back to settings
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function NotificationChannelConfig({
  name,
  description,
  placeholder,
  value,
  onChange,
  testing,
  testResult,
  onTest
}: {
  name: string;
  description: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  testing: boolean;
  testResult?: NotificationTest;
  onTest: () => void;
}) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div>
          <div style={{ fontWeight: 600 }}>{name}</div>
          <div style={{ fontSize: 13, color: "var(--text-2)" }}>{description}</div>
        </div>
        <button
          onClick={onTest}
          disabled={testing || !value.trim()}
          style={{
            padding: "6px 12px",
            borderRadius: 6,
            border: "1px solid rgba(6, 182, 212, 0.3)",
            background: "rgba(6, 182, 212, 0.1)",
            color: "rgb(6, 182, 212)",
            fontSize: 12,
            fontWeight: 600,
            cursor: (testing || !value.trim()) ? "not-allowed" : "pointer",
            opacity: (testing || !value.trim()) ? 0.6 : 1,
          }}
        >
          {testing ? "Testing..." : "Test"}
        </button>
      </div>

      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "10px 12px",
          borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(255,255,255,0.03)",
          color: "var(--text-0)",
          fontSize: 14,
          outline: "none",
        }}
      />

      {testResult && (
        <div style={{
          fontSize: 12,
          marginTop: 6,
          color: testResult.success ? "rgb(34,197,94)" : "rgb(239,68,68)"
        }}>
          {testResult.success ? "✓ Test successful" : `✗ Test failed: ${testResult.error}`}
        </div>
      )}
    </div>
  );
}

function ChannelExplanation({
  name,
  lanes,
  description,
  href
}: {
  name: string;
  lanes: string[];
  description: string;
  href: string;
}) {
  return (
    <Link href={href} style={{ textDecoration: "none", color: "inherit" }}>
      <div style={{
        padding: 12,
        borderRadius: 8,
        border: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(255,255,255,0.02)",
        cursor: "pointer",
        transition: "border-color 150ms ease"
      }}
      onMouseEnter={(e) => e.currentTarget.style.borderColor = "rgba(6, 182, 212, 0.3)"}
      onMouseLeave={(e) => e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"}
      >
        <div style={{ fontWeight: 600, marginBottom: 4 }}>{name}</div>
        <div style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 6 }}>{description}</div>
        <div style={{ fontSize: 12, color: "var(--text-3)" }}>
          Lanes: {lanes.join(" · ")}
        </div>
      </div>
    </Link>
  );
}








