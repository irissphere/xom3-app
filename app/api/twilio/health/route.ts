/**
 * Twilio Health Check & Configuration Status
 * 
 * Returns the current configuration status of Twilio integration.
 * 
 * GET /api/twilio/health
 */

import { NextResponse } from 'next/server';

interface TwilioHealthStatus {
  configured: boolean;
  accountSid: boolean;
  authToken: boolean;
  phoneNumber: string | null;
  inboundWebhook: string;
  statusWebhook: string;
  n8nIntegration: {
    inbound: boolean;
    status: boolean;
  };
}

async function checkTwilioConnection(): Promise<{ connected: boolean; error?: string; balance?: string }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    return { connected: false, error: 'Credentials not configured' };
  }

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        },
      }
    );

    if (!response.ok) {
      return { connected: false, error: 'Invalid credentials or account issue' };
    }

    const data = await response.json();
    return { 
      connected: true, 
      balance: data.balance || 'unknown' 
    };
  } catch (error) {
    return { connected: false, error: 'Connection failed' };
  }
}

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_URL || process.env.VERCEL_URL || 'http://localhost:3000';
  
  const status: TwilioHealthStatus = {
    configured: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
    accountSid: !!process.env.TWILIO_ACCOUNT_SID,
    authToken: !!process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER || null,
    inboundWebhook: `${baseUrl}/api/twilio/inbound`,
    statusWebhook: `${baseUrl}/api/twilio/status`,
    n8nIntegration: {
      inbound: !!process.env.N8N_TWILIO_INBOUND_WEBHOOK_URL,
      status: !!process.env.N8N_TWILIO_STATUS_WEBHOOK_URL,
    },
  };

  // Check actual connection if configured
  let connectionStatus: { connected: boolean; error?: string; balance?: string } = { 
    connected: false, 
    error: 'Not configured' 
  };
  if (status.configured) {
    connectionStatus = await checkTwilioConnection();
  }

  return NextResponse.json({
    status: status.configured && connectionStatus.connected ? 'healthy' : 'degraded',
    twilio: {
      ...status,
      connection: connectionStatus,
    },
    webhooks: {
      inbound: {
        url: status.inboundWebhook,
        description: 'Configure this URL in Twilio Console > Phone Numbers > Configure > Messaging',
      },
      status: {
        url: status.statusWebhook,
        description: 'Used for delivery status callbacks',
      },
    },
    env: {
      required: [
        { key: 'TWILIO_ACCOUNT_SID', configured: status.accountSid },
        { key: 'TWILIO_AUTH_TOKEN', configured: status.authToken },
        { key: 'TWILIO_PHONE_NUMBER', configured: !!status.phoneNumber },
      ],
      optional: [
        { key: 'N8N_TWILIO_INBOUND_WEBHOOK_URL', configured: status.n8nIntegration.inbound },
        { key: 'N8N_TWILIO_STATUS_WEBHOOK_URL', configured: status.n8nIntegration.status },
      ],
    },
  });
}

