// Slack Integration Logic

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

export async function sendSlackNotification(message: string, type: 'info' | 'alert' | 'success' = 'info') {
  if (!SLACK_WEBHOOK_URL) {
    console.warn('[SLACK] No webhook URL configured. Skipping notification:', message);
    return false;
  }

  const emoji = type === 'alert' ? '🚨' : type === 'success' ? '✅' : 'ℹ️';
  const payload = {
    text: `${emoji} ${message}`
  };

  try {
    const response = await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.error('[SLACK] Failed to send notification:', response.statusText);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('[SLACK] Error sending notification:', error);
    return false;
  }
}
