/**
 * Usage Tracker - Credit consumption with categorization
 * 
 * Tracks all credit usage by category (AI, SMS, social, etc.)
 * Provides usage summaries and triggers low balance alerts.
 */

import { deductCredits, getWalletBalance, type WalletBalance } from './wallet-store';
import {
  calculateAIObolsByTier,
  calculateMessagingObols,
  calculateSocialObols,
  calculateAutomationObols,
  type AITier,
} from './pricing';

// Usage categories for tracking
export type UsageCategory = 
  | 'ai_fast'
  | 'ai_balanced' 
  | 'ai_premium'
  | 'sms'
  | 'email'
  | 'voice'
  | 'social_text'
  | 'social_image'
  | 'social_video'
  | 'social_ai_video'
  | 'workflow'
  | 'lead_process'
  | 'scrape';

// Category to display name mapping
export const CATEGORY_LABELS: Record<UsageCategory, string> = {
  ai_fast: 'AI (Fast)',
  ai_balanced: 'AI (Balanced)',
  ai_premium: 'AI (Premium)',
  sms: 'SMS',
  email: 'Email',
  voice: 'Voice Call',
  social_text: 'Social Post (Text)',
  social_image: 'Social Post (Image)',
  social_video: 'Social Post (Video)',
  social_ai_video: 'AI Video',
  workflow: 'Automation',
  lead_process: 'Lead Processing',
  scrape: 'Web Scrape',
};

// Alert thresholds (in cents)
export const BALANCE_THRESHOLDS = {
  warning: 500,    // $5.00 - Show warning
  critical: 100,   // $1.00 - Critical alert
  empty: 0,        // $0.00 - Cannot use services
};

interface ConsumeResult {
  success: boolean;
  creditsUsed: number;
  balanceAfter: number;
  balanceFormatted: string;
  lowBalance: boolean;
  criticalBalance: boolean;
  error?: string;
}

/**
 * Consume credits for AI generation
 */
export async function consumeAICredits(
  userId: string,
  tier: AITier,
  metadata?: Record<string, unknown>
): Promise<ConsumeResult> {
  const credits = calculateAIObolsByTier(tier);
  const category: UsageCategory = `ai_${tier}` as UsageCategory;
  
  return consumeCredits(userId, credits, category, `AI generation (${tier})`, metadata);
}

/**
 * Consume credits for messaging
 */
export async function consumeMessagingCredits(
  userId: string,
  type: 'sms' | 'email' | 'voice_minute',
  metadata?: Record<string, unknown>
): Promise<ConsumeResult> {
  const credits = calculateMessagingObols(type);
  const category: UsageCategory = type === 'voice_minute' ? 'voice' : type;
  const label = type === 'voice_minute' ? 'Voice call minute' : type.toUpperCase();
  
  return consumeCredits(userId, credits, category, label, metadata);
}

/**
 * Consume credits for social media posting
 */
export async function consumeSocialCredits(
  userId: string,
  type: 'post_text' | 'post_image' | 'post_video' | 'post_ai_video',
  platform?: string,
  metadata?: Record<string, unknown>
): Promise<ConsumeResult> {
  const credits = calculateSocialObols(type);
  const categoryMap: Record<string, UsageCategory> = {
    post_text: 'social_text',
    post_image: 'social_image',
    post_video: 'social_video',
    post_ai_video: 'social_ai_video',
  };
  const category = categoryMap[type];
  const label = platform ? `Social post (${platform})` : 'Social post';
  
  return consumeCredits(userId, credits, category, label, { ...metadata, platform });
}

/**
 * Consume credits for automation
 */
export async function consumeAutomationCredits(
  userId: string,
  type: 'workflow_run' | 'lead_process',
  workflowName?: string,
  metadata?: Record<string, unknown>
): Promise<ConsumeResult> {
  const credits = calculateAutomationObols(type);
  const category: UsageCategory = type === 'workflow_run' ? 'workflow' : 'lead_process';
  const label = workflowName ? `Workflow: ${workflowName}` : (type === 'workflow_run' ? 'Workflow run' : 'Lead processing');
  
  return consumeCredits(userId, credits, category, label, { ...metadata, workflowName });
}

/**
 * Core credit consumption function
 */
async function consumeCredits(
  userId: string,
  amountCents: number,
  category: UsageCategory,
  description: string,
  metadata?: Record<string, unknown>
): Promise<ConsumeResult> {
  try {
    const result = await deductCredits({
      userId,
      amountCents,
      description,
      category,
      metadata: {
        ...metadata,
        usageCategory: category,
        timestamp: new Date().toISOString(),
      },
    });

    if (!result.success) {
      return {
        success: false,
        creditsUsed: 0,
        balanceAfter: result.wallet?.balance_cents || 0,
        balanceFormatted: result.wallet ? `$${(result.wallet.balance_cents / 100).toFixed(2)}` : '$0.00',
        lowBalance: true,
        criticalBalance: true,
        error: result.error || 'Insufficient balance',
      };
    }

    const balanceAfter = result.wallet!.balance_cents;
    const lowBalance = balanceAfter < BALANCE_THRESHOLDS.warning;
    const criticalBalance = balanceAfter < BALANCE_THRESHOLDS.critical;

    // Trigger alerts if needed (async, don't wait)
    if (criticalBalance) {
      triggerLowBalanceAlert(userId, balanceAfter, 'critical').catch(console.error);
    } else if (lowBalance) {
      triggerLowBalanceAlert(userId, balanceAfter, 'warning').catch(console.error);
    }

    return {
      success: true,
      creditsUsed: amountCents,
      balanceAfter,
      balanceFormatted: `$${(balanceAfter / 100).toFixed(2)}`,
      lowBalance,
      criticalBalance,
    };
  } catch (error: any) {
    console.error('[Usage Tracker] Error consuming credits:', error);
    return {
      success: false,
      creditsUsed: 0,
      balanceAfter: 0,
      balanceFormatted: '$0.00',
      lowBalance: true,
      criticalBalance: true,
      error: error?.message || 'Failed to consume credits',
    };
  }
}

/**
 * Check if user has sufficient balance for an action
 */
export async function checkBalance(
  userId: string,
  requiredCents: number
): Promise<{
  sufficient: boolean;
  balance: number;
  balanceFormatted: string;
  shortfall: number;
}> {
  const wallet = await getWalletBalance(userId);
  const balance = wallet?.balance_cents || 0;
  const sufficient = balance >= requiredCents;
  
  return {
    sufficient,
    balance,
    balanceFormatted: `$${(balance / 100).toFixed(2)}`,
    shortfall: sufficient ? 0 : requiredCents - balance,
  };
}

/**
 * Get usage summary for a user
 */
export interface UsageSummary {
  totalSpent: number;
  totalSpentFormatted: string;
  byCategory: Record<UsageCategory, { count: number; total: number }>;
  recentTransactions: Array<{
    id: string;
    category: string;
    amount: number;
    description: string;
    createdAt: string;
  }>;
}

/**
 * Trigger low balance alert
 * This can send email, push notification, or log to a notification system
 */
async function triggerLowBalanceAlert(
  userId: string,
  balance: number,
  level: 'warning' | 'critical'
): Promise<void> {
  console.log(`[Low Balance Alert] User ${userId}: ${level} - Balance: $${(balance / 100).toFixed(2)}`);
  
  // TODO: Integrate with notification system
  // - Send email via Resend/SendGrid
  // - Push notification
  // - Log to Airtable/Supabase alerts table
  
  // For now, we'll create an API endpoint that can be called
  // to send alerts, and this function will call it
  try {
    await fetch(`${process.env.NEXT_PUBLIC_URL || ''}/api/alerts/low-balance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        balance,
        level,
        timestamp: new Date().toISOString(),
      }),
    }).catch(() => {
      // Silent fail - alerts are non-critical
    });
  } catch {
    // Silent fail
  }
}

/**
 * Pre-check balance before expensive operations
 * Returns upgrade prompt if insufficient
 */
export async function preCheckBalance(
  userId: string,
  requiredCents: number,
  actionName: string
): Promise<{
  canProceed: boolean;
  message?: string;
  upgradeUrl?: string;
}> {
  const check = await checkBalance(userId, requiredCents);
  
  if (check.sufficient) {
    return { canProceed: true };
  }
  
  return {
    canProceed: false,
    message: `Insufficient balance for ${actionName}. You need $${(requiredCents / 100).toFixed(2)} but have ${check.balanceFormatted}. Add $${(check.shortfall / 100).toFixed(2)} to continue.`,
    upgradeUrl: '/credits',
  };
}
