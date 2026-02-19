/**
 * Slack Message Dispatcher
 * Sends messages to Slack channels
 */

export interface SlackMessage {
  text: string;
  blocks?: any[];
  channel?: string;
}

/**
 * Send a message to Slack
 * 
 * @param message - Message content and options
 */
export async function sendSlackMessage(message: SlackMessage): Promise<void> {
  try {
    const botToken = process.env.SLACK_BOT_TOKEN;
    if (!botToken) {
      console.warn("[Slack] SLACK_BOT_TOKEN not configured, skipping Slack notification");
      return;
    }

    const defaultChannel = process.env.SLACK_ALERT_CHANNEL || "#automation-alerts";
    let targetChannel = message.channel || defaultChannel;

    // Resolve channel name to ID if needed
    if (targetChannel.startsWith("#")) {
      const channelName = targetChannel.substring(1);
      const listResponse = await fetch("https://slack.com/api/conversations.list", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${botToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          types: "public_channel,private_channel",
          limit: 1000
        })
      });

      if (listResponse.ok) {
        const listData = await listResponse.json();
        if (listData.ok && listData.channels) {
          const channel = listData.channels.find((c: any) => c.name === channelName);
          if (channel) {
            targetChannel = channel.id;
          }
        }
      }
    }

    // Send message
    const response = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${botToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        channel: targetChannel,
        text: message.text,
        ...(message.blocks && { blocks: message.blocks })
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Slack API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    if (!data.ok) {
      throw new Error(`Slack API returned error: ${data.error || "Unknown error"}`);
    }

    console.log(`[Slack] Message sent to ${targetChannel}`);
  } catch (error: any) {
    console.error("[Slack] Failed to send message:", error);
    // Don't throw - allow execution to continue even if Slack fails
  }
}
