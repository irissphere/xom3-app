/**
 * SMS Confirmation Tool
 * 
 * Sends SMS confirmations via OpenPhone or other providers.
 */

import {
  SMSConfirmParams,
  SMSConfirmResult,
  ClientConfig,
  MCPToolResponse,
} from "../types";
import { getClientConfig } from "../clients";

// SMS Templates
const TEMPLATES = {
  appointment_confirmation: (date: string, time: string, clientName: string) =>
    `Hi! Your appointment with ${clientName} is confirmed for ${date} at ${time}. We'll give you a call at that time. Reply STOP to opt out.`,
  
  callback_confirmation: (date: string, time: string, clientName: string) =>
    `Thanks for speaking with us! We'll call you back on ${date} around ${time}. Reply STOP to opt out.`,
};

// OpenPhone API integration
async function sendViaOpenPhone(
  to: string,
  message: string,
  fromNumber: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const webhookUrl = process.env.OPENPHONE_SMS_WEBHOOK_URL;
  
  if (!webhookUrl) {
    // Fall back to direct API if webhook not configured
    const apiKey = process.env.OPENPHONE_API_KEY;
    if (!apiKey) {
      return { success: false, error: "OpenPhone not configured" };
    }

    try {
      const response = await fetch("https://api.openphone.com/v1/messages", {
        method: "POST",
        headers: {
          "Authorization": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromNumber,
          to: [to],
          content: message,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return { success: false, error: errorData.message || "Failed to send SMS" };
      }

      const data = await response.json();
      return { success: true, messageId: data.data?.id };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Use webhook (n8n workflow)
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to,
        from: fromNumber,
        message,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      return { success: false, error: "Webhook failed" };
    }

    const data = await response.json();
    return { success: true, messageId: data.messageId || "webhook-queued" };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Twilio integration (fallback)
async function sendViaTwilio(
  to: string,
  message: string,
  fromNumber: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    return { success: false, error: "Twilio not configured" };
  }

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Authorization": `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: to,
          From: fromNumber,
          Body: message,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return { success: false, error: errorData.message || "Failed to send SMS" };
    }

    const data = await response.json();
    return { success: true, messageId: data.sid };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function sendConfirmationSMS(
  params: SMSConfirmParams,
  clientConfig?: ClientConfig
): Promise<MCPToolResponse> {
  try {
    const config = clientConfig || getClientConfig("opus1");
    if (!config) {
      return {
        success: false,
        error: "Client configuration not found",
      };
    }

    // Build message
    let message: string;

    switch (params.message_type) {
      case "appointment_confirmation":
        message = TEMPLATES.appointment_confirmation(
          params.appointment_date || "your scheduled date",
          params.appointment_time || "the scheduled time",
          config.client_name
        );
        break;
      case "callback_confirmation":
        message = TEMPLATES.callback_confirmation(
          params.appointment_date || "soon",
          params.appointment_time || "",
          config.client_name
        );
        break;
      case "custom":
        if (!params.custom_message) {
          return {
            success: false,
            error: "custom_message required for custom message type",
          };
        }
        message = params.custom_message;
        break;
      default:
        return {
          success: false,
          error: `Unknown message type: ${params.message_type}`,
        };
    }

    // Normalize phone number
    let toPhone = params.phone_number.replace(/\D/g, "");
    if (toPhone.length === 10) {
      toPhone = `+1${toPhone}`;
    } else if (toPhone.length === 11 && toPhone.startsWith("1")) {
      toPhone = `+${toPhone}`;
    }

    // Send via configured provider
    let sendResult: { success: boolean; messageId?: string; error?: string };

    const smsConfig = config.sms_config;
    if (smsConfig?.provider === "openphone") {
      sendResult = await sendViaOpenPhone(toPhone, message, smsConfig.from_number);
    } else if (smsConfig?.provider === "twilio") {
      sendResult = await sendViaTwilio(toPhone, message, smsConfig.from_number);
    } else {
      // Try OpenPhone first, then Twilio
      sendResult = await sendViaOpenPhone(toPhone, message, process.env.OPENPHONE_NUMBER || "");
      if (!sendResult.success) {
        sendResult = await sendViaTwilio(toPhone, message, process.env.TWILIO_NUMBER || "");
      }
    }

    if (!sendResult.success) {
      return {
        success: false,
        error: sendResult.error || "Failed to send SMS",
      };
    }

    const result: SMSConfirmResult = {
      sent: true,
      message_id: sendResult.messageId,
    };

    return {
      success: true,
      data: result,
      variables: {
        sms_sent: true,
        message_id: sendResult.messageId,
      },
    };
  } catch (error: any) {
    console.error("[MCP] SMS send error:", error);
    return {
      success: false,
      error: error.message || "Failed to send SMS",
    };
  }
}









