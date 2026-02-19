export const tenantNotifications: Record<string, any> = {
  "default": {
    slackWebhook: process.env.SLACK_WEBHOOK_URL || null,
    email: process.env.NOTIFICATION_EMAIL || null,
    webhook: process.env.NOTIFICATION_WEBHOOK || null
  },
  "pulseverabenefits": {
    slackWebhook: process.env.PULSEVERA_SLACK_WEBHOOK || "https://hooks.slack.com/services/XXXX",
    email: process.env.PULSEVERA_EMAIL || "alerts@pulseverabenefits.com",
    webhook: process.env.PULSEVERA_WEBHOOK || "https://pulseverabenefits.com/xom3-webhook"
  }
};
