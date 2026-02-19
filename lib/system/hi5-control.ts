import { setHi5AutomationEnabled } from "./hi5-settings-store";
import { isHi5Enabled } from "./tenant";

export async function toggleHi5Automation(
  enabled: boolean
): Promise<{
  success: boolean;
  message: string;
  persistence: {
    source: "airtable" | "none";
    stored: boolean;
    updatedAt: string | null;
    status: number | null;
    error: string | null;
  };
  webhook: {
    configured: boolean;
    triggered: boolean;
    status: number | null;
  };
}> {
  if (!isHi5Enabled()) {
    return {
      success: false,
      message: "HI5 is disabled (set ENABLE_HI5=true to re-enable).",
      persistence: {
        source: "none",
        stored: false,
        updatedAt: null,
        status: 0,
        error: "hi5_disabled",
      },
      webhook: {
        configured: false,
        triggered: false,
        status: null,
      },
    };
  }

  // Strike 4: Airtable is the source of truth. Webhook is optional.
  const persisted = await setHi5AutomationEnabled(enabled);
  const stored = Boolean(persisted.settings);

  const url = process.env.HI5_ARM_DISARM_WEBHOOK_URL;
  const webhookConfigured = Boolean(url);
  let webhookTriggered = false;
  let webhookStatus: number | null = null;

  if (url) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
        cache: "no-store",
      });
      webhookStatus = res.status;
      webhookTriggered = res.ok;
    } catch {
      webhookStatus = 0;
      webhookTriggered = false;
    }
  }

  const success = stored || webhookTriggered;

  const baseMsg = `Hi5 automation ${enabled ? "enabled" : "disabled"}.`;
  const persistenceMsg =
    persisted.source === "none"
      ? " Persistence not configured (set AIRTABLE_API_KEY, AIRTABLE_BASE_ID, AIRTABLE_CONTROL_TABLE)."
      : stored
        ? ""
        : persisted.write?.error
          ? ` Persistence write failed (${persisted.write.status || 0}: ${persisted.write.error}).`
          : " Persistence write failed.";
  const webhookMsg =
    webhookConfigured ? (webhookTriggered ? "" : " Webhook trigger failed.") : "";

  return {
    success,
    message: `${baseMsg}${persistenceMsg}${webhookMsg}`.trim(),
    persistence: {
      source: persisted.source,
      stored,
      updatedAt: persisted.settings?.updatedAt ?? null,
      status: persisted.write?.status ?? null,
      error: persisted.write?.error ?? null,
    },
    webhook: {
      configured: webhookConfigured,
      triggered: webhookTriggered,
      status: webhookStatus,
    },
  };
}
