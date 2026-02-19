/**
 * Email Client - Resend Integration
 * 
 * Sends transactional emails using Resend.
 * Gracefully degrades when RESEND_API_KEY is not configured.
 */

import { Resend } from 'resend';

let resendClient: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Email] RESEND_API_KEY not configured – emails will be logged only');
    return null;
  }
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

// Uses verified domain sender, falls back to Resend test address until domain is verified
const FROM_EMAIL = process.env.EMAIL_FROM || 'SpaceBaddie Shop <onboarding@resend.dev>';
const STORE_NAME = process.env.STORE_NAME || 'SpaceBaddie Shop';
const STORE_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_URL || 'https://spacebaddie.com';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  const resend = getResend();

  if (!resend) {
    console.log(`[Email] Would send to ${options.to}: ${options.subject}`);
    console.log(`[Email] Body preview: ${options.html.slice(0, 200)}...`);
    return false;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: options.to,
      subject: options.subject,
      html: options.html,
      replyTo: options.replyTo,
    });

    if (error) {
      console.error('[Email] Send failed:', error);
      return false;
    }

    console.log(`[Email] Sent successfully to ${options.to}: ${options.subject} (id: ${data?.id})`);
    return true;
  } catch (err) {
    console.error('[Email] Exception:', err);
    return false;
  }
}

export { STORE_NAME, STORE_URL };
