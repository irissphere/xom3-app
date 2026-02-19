/**
 * Twilio Status Callback Handler
 * 
 * Receives delivery status updates from Twilio for sent messages.
 * 
 * Webhook URL: /api/twilio/status
 */

import { NextRequest, NextResponse } from 'next/server';

interface TwilioStatusCallback {
  MessageSid: string;
  MessageStatus: 'queued' | 'sending' | 'sent' | 'delivered' | 'undelivered' | 'failed';
  To: string;
  From: string;
  ErrorCode?: string;
  ErrorMessage?: string;
}

interface StatusEvent {
  timestamp: string;
  messageId: string;
  status: string;
  to: string;
  from: string;
  errorCode?: string;
  errorMessage?: string;
}

async function routeStatusToN8n(event: StatusEvent): Promise<void> {
  const webhookUrl = process.env.N8N_TWILIO_STATUS_WEBHOOK_URL;
  if (!webhookUrl) {
    console.log('[Twilio] No status webhook configured');
    return;
  }

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
    console.log(`[Twilio] Status update sent to n8n: ${event.messageId} -> ${event.status}`);
  } catch (error) {
    console.error('[Twilio] Failed to route status to n8n:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const data: TwilioStatusCallback = {
      MessageSid: formData.get('MessageSid') as string,
      MessageStatus: formData.get('MessageStatus') as TwilioStatusCallback['MessageStatus'],
      To: formData.get('To') as string,
      From: formData.get('From') as string,
      ErrorCode: formData.get('ErrorCode') as string | undefined,
      ErrorMessage: formData.get('ErrorMessage') as string | undefined,
    };

    if (!data.MessageSid || !data.MessageStatus) {
      return new NextResponse('Bad Request', { status: 400 });
    }

    console.log(`[Twilio] Status update: ${data.MessageSid} -> ${data.MessageStatus}`);

    const event: StatusEvent = {
      timestamp: new Date().toISOString(),
      messageId: data.MessageSid,
      status: data.MessageStatus,
      to: data.To,
      from: data.From,
    };

    if (data.ErrorCode) {
      event.errorCode = data.ErrorCode;
      event.errorMessage = data.ErrorMessage;
      console.error(`[Twilio] Delivery error: ${data.ErrorCode} - ${data.ErrorMessage}`);
    }

    // Route to n8n for further processing (update CRM, trigger alerts, etc.)
    await routeStatusToN8n(event);

    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    console.error('[Twilio] Status handler error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'twilio-status-callback',
    version: '1.0',
  });
}
















