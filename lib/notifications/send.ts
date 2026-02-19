import { tenantNotifications } from "./registry";
import { emitNotificationSignal } from "@/lib/uoi/notification-signal";

// Track notification history for alert storm detection
const notificationHistory: Array<{ timestamp: number; channel: string }> = [];
const MAX_HISTORY = 1000;

// Alert storm detection: more than 10 notifications in 60 seconds
function detectAlertStorm(): boolean {
  const now = Date.now();
  const windowMs = 60000; // 60 seconds
  const threshold = 10;

  // Clean old entries
  while (notificationHistory.length > 0 && notificationHistory[0].timestamp < now - windowMs) {
    notificationHistory.shift();
  }

  return notificationHistory.length > threshold;
}

// Suppression tracking
const suppressedNotifications = new Set<string>();

export async function sendNotification(
  tenant: string,
  payload: any,
  channels: string[] = ["slack"],
  templateId?: string,
  retryCount: number = 0
) {
  const config = tenantNotifications[tenant] || tenantNotifications["default"];

  // UOI: Emit retry signal if retrying
  if (retryCount > 0) {
    emitNotificationSignal("retry", 4, {
      channel: channels.join(","),
      recipient: tenant,
      attempt: retryCount
    });
  }

  // UOI: Check for alert storm
  if (detectAlertStorm()) {
    emitNotificationSignal("alert_storm", 8, {
      count: notificationHistory.length,
      windowMs: 60000
    });
  }

  // UOI: Check for suppression (simplified - in production would check actual suppression rules)
  const suppressionKey = `${tenant}:${payload.message?.substring(0, 50)}`;
  if (suppressedNotifications.has(suppressionKey)) {
    emitNotificationSignal("suppressed", 3, {
      channel: channels.join(","),
      reason: "duplicate_suppression"
    });
    return; // Suppress duplicate notifications
  }

  const startTime = Date.now();
  const errors: string[] = [];

  try {
    // Slack
    if (config.slackWebhook && channels.includes("slack")) {
      try {
        const response = await fetch(config.slackWebhook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: payload.message })
        });

        if (!response.ok) {
          errors.push(`Slack: ${response.statusText}`);
          throw new Error(`Slack notification failed: ${response.statusText}`);
        }

        // Record successful notification
        notificationHistory.push({ timestamp: Date.now(), channel: "slack" });
        if (notificationHistory.length > MAX_HISTORY) {
          notificationHistory.shift();
        }

        emitNotificationSignal("sent", 1, {
          channel: "slack",
          recipient: tenant,
          templateId: templateId || "default"
        });
      } catch (error: any) {
        errors.push(`Slack: ${error.message}`);
        emitNotificationSignal("failed", 7, {
          channel: "slack",
          recipient: tenant,
          error: error.message
        });

        // Retry logic: retry up to 2 times with exponential backoff
        if (retryCount < 2) {
          const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s
          await new Promise(resolve => setTimeout(resolve, delay));
          return sendNotification(tenant, payload, channels, templateId, retryCount + 1);
        }
      }
    }

    // Email - send actual email via webhook or service
    if (config.email && channels.includes("email")) {
      try {
        // For now, we'll use a simple email service webhook
        // You can replace this with SendGrid, Mailgun, etc.
        const emailWebhookUrl = process.env.EMAIL_WEBHOOK_URL;

        if (emailWebhookUrl) {
          await fetch(emailWebhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: config.email,
              subject: "XOM3 Notification",
              text: payload.message,
              html: `<pre>${payload.message}</pre>`
            }),
          });
        }

        console.log("Email sent to:", config.email, payload.message);
        emitNotificationSignal("sent", 1, {
          channel: "email",
          recipient: config.email,
          templateId: templateId || "default"
        });
      } catch (error: any) {
        errors.push(`Email: ${error.message}`);
        emitNotificationSignal("failed", 7, {
          channel: "email",
          recipient: config.email,
          error: error.message
        });
      }
    }

    // Webhook
    if (config.webhook && channels.includes("webhook")) {
      try {
        const response = await fetch(config.webhook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          errors.push(`Webhook: ${response.statusText}`);
          throw new Error(`Webhook notification failed: ${response.statusText}`);
        }

        emitNotificationSignal("sent", 1, {
          channel: "webhook",
          recipient: config.webhook,
          templateId: templateId || "default"
        });
      } catch (error: any) {
        errors.push(`Webhook: ${error.message}`);
        emitNotificationSignal("failed", 7, {
          channel: "webhook",
          recipient: config.webhook,
          error: error.message
        });
      }
    }

    // If all channels failed, escalate
    if (errors.length > 0 && errors.length === channels.length) {
      emitNotificationSignal("escalated", 9, {
        channel: channels.join(","),
        recipient: tenant,
        reason: "all_channels_failed",
        errors
      });
    }

    // Mark as sent to prevent duplicates
    suppressedNotifications.add(suppressionKey);
    setTimeout(() => suppressedNotifications.delete(suppressionKey), 60000); // Clear after 60s

  } catch (error: any) {
    emitNotificationSignal("failed", 7, {
      channel: channels.join(","),
      recipient: tenant,
      error: error.message || "Notification failed"
    });
    throw error;
  }
}
