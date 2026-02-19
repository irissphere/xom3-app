/**
 * Twilio Outbound SMS API
 * 
 * Sends SMS messages via Twilio. Supports single and batch messaging.
 * 
 * POST /api/twilio/outbound
 */

import { NextRequest, NextResponse } from 'next/server';

interface OutboundSMSRequest {
  to: string;
  message: string;
  from?: string; // Optional - uses default if not provided
  statusCallback?: string;
  metadata?: Record<string, unknown>;
}

interface BatchSMSRequest {
  messages: OutboundSMSRequest[];
}

interface TwilioMessageResponse {
  sid: string;
  status: string;
  to: string;
  from: string;
  dateCreated: string;
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return phone;
}

async function sendTwilioSMS(
  to: string,
  body: string,
  from: string,
  statusCallback?: string
): Promise<{ success: boolean; data?: TwilioMessageResponse; error?: string }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    return { success: false, error: 'Twilio credentials not configured' };
  }

  try {
    const params = new URLSearchParams({
      To: normalizePhone(to),
      From: from,
      Body: body,
    });

    if (statusCallback) {
      params.append('StatusCallback', statusCallback);
    }

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.message || 'Failed to send SMS' };
    }

    return {
      success: true,
      data: {
        sid: data.sid,
        status: data.status,
        to: data.to,
        from: data.from,
        dateCreated: data.date_created,
      },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const defaultFrom = process.env.TWILIO_PHONE_NUMBER;

    if (!defaultFrom) {
      return NextResponse.json(
        { success: false, error: 'Twilio phone number not configured' },
        { status: 500 }
      );
    }

    // Check if batch request
    if ('messages' in body && Array.isArray(body.messages)) {
      const batchRequest = body as BatchSMSRequest;
      const results = await Promise.all(
        batchRequest.messages.map((msg) =>
          sendTwilioSMS(msg.to, msg.message, msg.from || defaultFrom, msg.statusCallback)
        )
      );

      const successful = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success).length;

      return NextResponse.json({
        success: failed === 0,
        batch: true,
        total: results.length,
        successful,
        failed,
        results,
      });
    }

    // Single message request
    const singleRequest = body as OutboundSMSRequest;

    if (!singleRequest.to || !singleRequest.message) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: to, message' },
        { status: 400 }
      );
    }

    const result = await sendTwilioSMS(
      singleRequest.to,
      singleRequest.message,
      singleRequest.from || defaultFrom,
      singleRequest.statusCallback
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: result.data?.sid,
      status: result.data?.status,
      to: result.data?.to,
      from: result.data?.from,
    });
  } catch (error) {
    console.error('[Twilio] Outbound error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'twilio-outbound',
    version: '1.0',
    configured: !!process.env.TWILIO_ACCOUNT_SID && !!process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER ? '***configured***' : 'not configured',
  });
}
















