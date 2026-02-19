/**
 * SpaceBaddie Usage Tracking
 * Pay-as-you-go credit system for video generation
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey);
}

// CREDIT PRICING
// Each credit = $0.10 base value
// Video costs based on duration and features
export const CREDIT_PRICING = {
  // Base cost per video (15 seconds)
  baseVideoCost: 5, // 5 credits = $0.50
  // Additional cost per 15 seconds
  perSecondCost: 0.2, // 0.2 credits per second over 15s
  // Premium features
  hdQuality: 2, // +2 credits for HD
  cinematicStyle: 10, // +10 credits for cinematic (LTX-2) = 15 total
  customVoice: 3, // +3 credits for premium voices
  
  // Credit packages
  packages: [
    { credits: 50, price: 4.99, label: 'Starter', bonus: 0 },
    { credits: 150, price: 12.99, label: 'Creator', bonus: 15 },
    { credits: 500, price: 39.99, label: 'Pro', bonus: 75 },
    { credits: 2000, price: 149.99, label: 'Studio', bonus: 400 },
  ],
};

// Calculate video cost
export function calculateVideoCost(options: {
  duration: number;
  hdQuality?: boolean;
  cinematicStyle?: boolean;
  customVoice?: boolean;
}): number {
  let cost = CREDIT_PRICING.baseVideoCost;
  
  // Add duration cost (beyond base 15 seconds)
  if (options.duration > 15) {
    cost += Math.ceil((options.duration - 15) * CREDIT_PRICING.perSecondCost);
  }
  
  // Add premium features
  if (options.hdQuality) cost += CREDIT_PRICING.hdQuality;
  if (options.cinematicStyle) cost += CREDIT_PRICING.cinematicStyle;
  if (options.customVoice) cost += CREDIT_PRICING.customVoice;
  
  return cost;
}

export interface UsageInfo {
  videosThisMonth: number;
  creditsBalance: number;
  canCreate: boolean;
  tier: string;
  freeVideosRemaining: number;
}

export interface SubscriptionInfo {
  tier: 'free' | 'pro' | 'enterprise';
  status: string;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  stripeCustomerId: string | null;
}

// Free users get 3 free videos to try
const FREE_VIDEO_LIMIT = 3;

/**
 * Check if user is an operator or admin (gets unlimited credits)
 */
async function isOperatorOrAdmin(userId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;

  const { data } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', userId)
    .single();

  return data?.role === 'operator' || data?.role === 'admin';
}

/**
 * Get user's credit balance
 */
export async function getCreditBalance(userId: string): Promise<number> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return 0;

  // Operators get unlimited
  const isPrivileged = await isOperatorOrAdmin(userId);
  if (isPrivileged) return 999999;

  const { data } = await supabase
    .from('user_credits')
    .select('balance')
    .eq('user_id', userId)
    .single();

  return data?.balance || 0;
}

/**
 * Deduct credits from user's balance
 */
export async function deductCredits(userId: string, amount: number, description: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;

  const isPrivileged = await isOperatorOrAdmin(userId);
  if (isPrivileged) return true; // Operators don't pay

  // Get current balance
  const balance = await getCreditBalance(userId);
  if (balance < amount) return false;

  // Deduct credits
  await supabase
    .from('user_credits')
    .upsert({
      user_id: userId,
      balance: balance - amount,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

  // Log transaction
  await supabase
    .from('credit_transactions')
    .insert({
      user_id: userId,
      amount: -amount,
      description,
      created_at: new Date().toISOString(),
    });

  return true;
}

/**
 * Add credits to user's balance
 */
export async function addCredits(userId: string, amount: number, description: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const balance = await getCreditBalance(userId);

  await supabase
    .from('user_credits')
    .upsert({
      user_id: userId,
      balance: balance + amount,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

  await supabase
    .from('credit_transactions')
    .insert({
      user_id: userId,
      amount,
      description,
      created_at: new Date().toISOString(),
    });
}

/**
 * Get user's subscription info
 */
export async function getSubscription(userId: string): Promise<SubscriptionInfo | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  // Check if user is operator/admin
  const isPrivileged = await isOperatorOrAdmin(userId);
  if (isPrivileged) {
    return {
      tier: 'enterprise',
      status: 'active',
      trialEndsAt: null,
      currentPeriodEnd: null,
      stripeCustomerId: null,
    };
  }

  const { data } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!data) {
    return {
      tier: 'free',
      status: 'active',
      trialEndsAt: null,
      currentPeriodEnd: null,
      stripeCustomerId: null,
    };
  }

  return {
    tier: data.tier || 'free',
    status: data.status || 'active',
    trialEndsAt: data.trial_ends_at,
    currentPeriodEnd: data.current_period_end,
    stripeCustomerId: data.stripe_customer_id,
  };
}

/**
 * Get user's usage info
 */
export async function getUsage(userId: string): Promise<UsageInfo> {
  const supabase = getSupabaseAdmin();
  
  // Get subscription and credits
  const subscription = await getSubscription(userId);
  const tier = subscription?.tier || 'free';
  const creditsBalance = await getCreditBalance(userId);

  // Get video count (total)
  let videosThisMonth = 0;
  let freeVideosUsed = 0;
  
  if (supabase) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count } = await supabase
      .from('spacebaddie_video_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', startOfMonth.toISOString())
      .in('status', ['completed', 'processing', 'queued']);

    videosThisMonth = count || 0;

    // Count total free videos used (lifetime)
    const { count: freeCount } = await supabase
      .from('spacebaddie_video_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_free', true);
    
    freeVideosUsed = freeCount || 0;
  }

  const freeVideosRemaining = Math.max(0, FREE_VIDEO_LIMIT - freeVideosUsed);
  const canCreate = freeVideosRemaining > 0 || creditsBalance >= CREDIT_PRICING.baseVideoCost || tier === 'enterprise';

  return {
    videosThisMonth,
    creditsBalance,
    canCreate,
    tier,
    freeVideosRemaining,
  };
}

/**
 * Check if user can create a video with given options
 */
export async function canCreateVideo(
  userId: string, 
  options?: { duration?: number; hdQuality?: boolean; cinematicStyle?: boolean; customVoice?: boolean }
): Promise<{ allowed: boolean; reason?: string; usage: UsageInfo; cost: number; willUseFreeVideo: boolean }> {
  const usage = await getUsage(userId);
  const cost = calculateVideoCost({
    duration: options?.duration || 15,
    hdQuality: options?.hdQuality,
    cinematicStyle: options?.cinematicStyle,
    customVoice: options?.customVoice,
  });

  // Enterprise/operators always allowed
  if (usage.tier === 'enterprise') {
    return { allowed: true, usage, cost: 0, willUseFreeVideo: false };
  }

  // Check if they can use a free video
  if (usage.freeVideosRemaining > 0) {
    return { allowed: true, usage, cost: 0, willUseFreeVideo: true };
  }

  // Check if they have enough credits
  if (usage.creditsBalance >= cost) {
    return { allowed: true, usage, cost, willUseFreeVideo: false };
  }

  return {
    allowed: false,
    reason: `You need ${cost} credits to create this video. You have ${usage.creditsBalance} credits.`,
    usage,
    cost,
    willUseFreeVideo: false,
  };
}

/**
 * Record a video generation for usage tracking
 */
export async function recordVideoGeneration(params: {
  userId: string;
  jobId: string;
  visitorId?: string;
  script?: string;
  creditsCost?: number;
  isFree?: boolean;
}): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  await supabase.from('spacebaddie_video_jobs').upsert({
    id: params.jobId,
    user_id: params.userId,
    tenant_id: 'spacebaddie',
    status: 'queued',
    script: params.script,
    credits_cost: params.creditsCost || 0,
    is_free: params.isFree || false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, {
    onConflict: 'id',
  });
}

/**
 * Get user's video history
 */
export async function getVideoHistory(userId: string, limit = 20) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data } = await supabase
    .from('spacebaddie_video_jobs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  return data || [];
}
