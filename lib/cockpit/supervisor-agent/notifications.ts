// Supervisor Agent - Notification System
// Sends Slack alerts and other notifications

import { AlertPayload, FailureSeverity, EscalationLevel } from "./types";
import { sendNotification } from "@/lib/notifications/send";
import { emitSignal } from "@/lib/uoi/signals";

class NotificationManager {
  private alertHistory: Array<{ timestamp: number; type: string; agentId?: string }> = [];
  private readonly MAX_HISTORY = 1000;
  private readonly ALERT_STORM_THRESHOLD = 10; // alerts per minute
  private suppressedAlerts: Set<string> = new Set();

  /**
   * Send alert notification
   */
  async sendAlert(payload: AlertPayload): Promise<void> {
    // Check for alert storm
    if (this.detectAlertStorm()) {
      emitSignal({
        source: "supervisor",
        type: "alert_storm_detected",
        priority: "high",
        payload: {
          count: this.alertHistory.length,
          window: 60000
        }
      });
      return;
    }

    // Check for suppression
    const suppressionKey = this.getSuppressionKey(payload);
    if (this.suppressedAlerts.has(suppressionKey)) {
      return; // Suppress duplicate
    }

    // Format message
    const message = this.formatAlertMessage(payload);

    // Determine channels based on severity
    const channels = this.getChannelsForSeverity(payload.severity, payload.escalationLevel);

    try {
      // Send notification
      await sendNotification(
        "default",
        {
          message,
          title: payload.title,
          type: payload.type,
          severity: payload.severity,
          details: payload.details,
          timestamp: new Date(payload.timestamp).toISOString()
        },
        channels
      );

      // Record alert
      this.recordAlert(payload);

      // Mark as sent
      this.suppressedAlerts.add(suppressionKey);
      setTimeout(() => this.suppressedAlerts.delete(suppressionKey), 300000); // 5 minutes

      // Emit notification signal
      emitSignal({
        source: "supervisor",
        type: "alert_sent",
        priority: "low",
        payload: {
          type: payload.type,
          severity: payload.severity,
          agentId: payload.agentId
        }
      });
    } catch (error: any) {
      console.error("[Supervisor] Failed to send alert:", error);
      emitSignal({
        source: "supervisor",
        type: "alert_failed",
        priority: "high",
        payload: {
          type: payload.type,
          error: error.message
        }
      });
    }
  }

  /**
   * Format alert message
   */
  private formatAlertMessage(payload: AlertPayload): string {
    const emoji = this.getEmojiForType(payload.type);
    const severityEmoji = this.getEmojiForSeverity(payload.severity);
    
    let message = `${emoji} ${severityEmoji} *${payload.title}*\n\n`;
    message += `${payload.message}\n\n`;

    if (payload.agentId) {
      message += `*Agent:* ${payload.agentName || payload.agentId}\n`;
    }

    if (payload.laneId) {
      message += `*Lane:* ${payload.laneName || payload.laneId}\n`;
    }

    if (payload.escalationLevel && payload.escalationLevel !== "none") {
      message += `*Escalation:* ${payload.escalationLevel.toUpperCase()}\n`;
    }

    message += `*Time:* ${new Date(payload.timestamp).toISOString()}\n`;

    if (Object.keys(payload.details).length > 0) {
      message += `\n*Details:*\n`;
      for (const [key, value] of Object.entries(payload.details)) {
        message += `  • ${key}: ${JSON.stringify(value)}\n`;
      }
    }

    return message;
  }

  /**
   * Get emoji for alert type
   */
  private getEmojiForType(type: AlertPayload["type"]): string {
    const emojis: Record<AlertPayload["type"], string> = {
      failure: "❌",
      anomaly: "⚠️",
      governance_violation: "🚫",
      escalation: "🚨",
      restart: "🔄",
      health_degraded: "📉"
    };
    return emojis[type] || "📢";
  }

  /**
   * Get emoji for severity
   */
  private getEmojiForSeverity(severity: FailureSeverity): string {
    const emojis: Record<FailureSeverity, string> = {
      low: "🔵",
      medium: "🟡",
      high: "🟠",
      critical: "🔴"
    };
    return emojis[severity] || "⚪";
  }

  /**
   * Get channels for severity
   */
  private getChannelsForSeverity(severity: FailureSeverity, escalationLevel?: EscalationLevel): string[] {
    const channels: string[] = ["slack"];

    // Always send to Slack
    if (severity === "critical" || escalationLevel === "emergency") {
      // Critical alerts go to all channels
      channels.push("email");
    }

    return channels;
  }

  /**
   * Detect alert storm
   */
  private detectAlertStorm(): boolean {
    const now = Date.now();
    const windowMs = 60000; // 1 minute

    // Clean old entries
    while (this.alertHistory.length > 0 && this.alertHistory[0].timestamp < now - windowMs) {
      this.alertHistory.shift();
    }

    return this.alertHistory.length > this.ALERT_STORM_THRESHOLD;
  }

  /**
   * Record alert
   */
  private recordAlert(payload: AlertPayload): void {
    this.alertHistory.push({
      timestamp: Date.now(),
      type: payload.type,
      agentId: payload.agentId
    });

    // Trim history
    if (this.alertHistory.length > this.MAX_HISTORY) {
      this.alertHistory.shift();
    }
  }

  /**
   * Get suppression key
   */
  private getSuppressionKey(payload: AlertPayload): string {
    return `${payload.type}:${payload.agentId || "system"}:${payload.severity}`;
  }
}

export const notificationManager = new NotificationManager();
