/**
 * SpaceBaddie Notification Service
 * 
 * Sends notifications to users based on their preferences.
 * Supports SMS (via Twilio), email, and in-app notifications.
 * 
 * AKV: SpaceBaddie Sovereign - Notification Lane
 */

import { createClient } from '@/lib/supabase/server';

export type NotificationType = 
  | 'video_generation_complete'
  | 'post_published'
  | 'weekly_summary'
  | 'tips_updates'
  | 'marketing'
  | 'trading_alert';

export interface NotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  tenant?: string;
}

export interface NotificationResult {
  success: boolean;
  channels: {
    sms?: { sent: boolean; error?: string; messageId?: string };
    email?: { sent: boolean; error?: string };
  };
  skipped?: string;
}

/**
 * Check if user should receive notification based on preferences
 */
async function shouldNotify(
  userId: string,
  type: NotificationType,
  channel: 'sms' | 'email',
  tenant: string = 'spacebaddie'
): Promise<{ shouldSend: boolean; phoneNumber?: string; email?: string }> {
  const supabase = createClient();
  
  const { data: prefs } = await supabase
    .from('user_notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .eq('tenant', tenant)
    .maybeSingle();
  
  if (!prefs) {
    // Default: only email for core notifications
    return {
      shouldSend: channel === 'email' && ['video_generation_complete', 'post_published'].includes(type),
    };
  }
  
  // Check channel enabled
  if (channel === 'sms' && !prefs.sms_enabled) {
    return { shouldSend: false };
  }
  if (channel === 'email' && !prefs.email_enabled) {
    return { shouldSend: false };
  }
  
  // Check notification type enabled
  const typeMap: Record<NotificationType, string> = {
    video_generation_complete: 'video_generation_complete',
    post_published: 'post_published',
    weekly_summary: 'weekly_summary',
    tips_updates: 'tips_updates',
    marketing: 'marketing',
  };
  
  const prefKey = typeMap[type];
  if (prefKey && !prefs[prefKey]) {
    return { shouldSend: false };
  }
  
  // Check quiet hours
  if (prefs.quiet_hours_enabled && prefs.quiet_hours_start && prefs.quiet_hours_end) {
    const tz = prefs.quiet_hours_timezone || 'America/New_York';
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const currentTime = formatter.format(now);
    const [currentHour, currentMin] = currentTime.split(':').map(Number);
    const currentMinutes = currentHour * 60 + currentMin;
    
    const [startHour, startMin] = prefs.quiet_hours_start.split(':').map(Number);
    const [endHour, endMin] = prefs.quiet_hours_end.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    // Handle overnight quiet hours
    if (startMinutes > endMinutes) {
      if (currentMinutes >= startMinutes || currentMinutes <= endMinutes) {
        return { shouldSend: false };
      }
    } else {
      if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
        return { shouldSend: false };
      }
    }
  }
  
  return {
    shouldSend: true,
    phoneNumber: channel === 'sms' ? prefs.phone_number : undefined,
    email: channel === 'email' ? prefs.email_address : undefined,
  };
}

/**
 * Send SMS via Twilio
 */
async function sendSMS(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  try {
    const res = await fetch(`${baseUrl}/api/twilio/outbound`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, message }),
    });
    
    const data = await res.json();
    
    if (data.success) {
      return { success: true, messageId: data.messageId };
    }
    return { success: false, error: data.error };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to send SMS' };
  }
}

/**
 * Send notification to user based on their preferences
 */
export async function sendNotification(payload: NotificationPayload): Promise<NotificationResult> {
  const { userId, type, title, message, tenant = 'spacebaddie' } = payload;
  
  const result: NotificationResult = {
    success: false,
    channels: {},
  };
  
  // Check SMS preferences
  const smsCheck = await shouldNotify(userId, type, 'sms', tenant);
  if (smsCheck.shouldSend && smsCheck.phoneNumber) {
    const smsMessage = `${title}\n\n${message}`;
    const smsResult = await sendSMS(smsCheck.phoneNumber, smsMessage);
    result.channels.sms = {
      sent: smsResult.success,
      error: smsResult.error,
      messageId: smsResult.messageId,
    };
  }
  
  // Check email preferences (placeholder - would integrate with email service)
  const emailCheck = await shouldNotify(userId, type, 'email', tenant);
  if (emailCheck.shouldSend) {
    // TODO: Integrate with email service (SendGrid, Resend, etc.)
    result.channels.email = {
      sent: false,
      error: 'Email notifications not yet implemented',
    };
  }
  
  // Determine overall success
  result.success = Object.values(result.channels).some(c => c.sent);
  
  // Log notification attempt
  console.log(`[SpaceBaddie Notifier] Sent ${type} to user ${userId}:`, {
    sms: result.channels.sms?.sent,
    email: result.channels.email?.sent,
  });
  
  return result;
}

/**
 * Send video generation complete notification
 */
export async function notifyVideoComplete(
  userId: string,
  videoUrl: string,
  thumbnailUrl?: string
): Promise<NotificationResult> {
  return sendNotification({
    userId,
    type: 'video_generation_complete',
    title: 'Your video is ready!',
    message: `Your SpaceBaddie video has finished rendering. View it now: ${videoUrl}`,
    data: { videoUrl, thumbnailUrl },
  });
}

/**
 * Send post published notification
 */
export async function notifyPostPublished(
  userId: string,
  platform: string,
  postUrl?: string
): Promise<NotificationResult> {
  return sendNotification({
    userId,
    type: 'post_published',
    title: 'Post published!',
    message: `Your content was successfully posted to ${platform}.${postUrl ? ` View it: ${postUrl}` : ''}`,
    data: { platform, post_published: true, postUrl },
  });
}

/**
 * Send trading signal alert
 */
export async function notifyTradingSignal(
  userId: string,
  symbol: string,
  direction: string,
  probability: number,
  advice: string
): Promise<NotificationResult> {
  return sendNotification({
    userId,
    type: 'trading_alert',
    title: `🚀 High Prob Signal: ${symbol}`,
    message: `${direction} signal detected with ${probability}% win probability. ${advice}`,
    data: { symbol, direction, probability, advice },
  });
}
