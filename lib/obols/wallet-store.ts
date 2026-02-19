/**
 * Wallet Store - Supabase-backed credit wallet operations
 * 
 * Handles all wallet operations with atomic database transactions.
 * Uses Supabase service role for webhook operations.
 */

import { createClient } from '@supabase/supabase-js';

// Types
export interface UserWallet {
  id: string;
  user_id: string;
  balance_cents: number;
  trial_credits_cents: number;
  trial_expires_at: string | null;
  total_deposited_cents: number;
  total_spent_cents: number;
  auto_reload_enabled: boolean;
  auto_reload_threshold_cents: number;
  auto_reload_amount_cents: number;
  stripe_customer_id: string | null;
  stripe_payment_method_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface WalletTransaction {
  id: string;
  user_id: string;
  wallet_id: string;
  type: 'deposit' | 'purchase' | 'trial_credit' | 'auto_reload' | 'refund' | 'adjustment';
  amount_cents: number;
  balance_after_cents: number;
  description: string;
  category: string | null;
  stripe_payment_intent_id: string | null;
  stripe_checkout_session_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface WalletBalance {
  balance_cents: number;
  balance_formatted: string;
  trial_credits_cents: number;
  trial_active: boolean;
  trial_days_remaining: number;
  auto_reload_enabled: boolean;
  total_deposited: number;
  total_spent: number;
}

// Credit package options
export const CREDIT_PACKAGES = [
  { id: 'pack_5', amount_cents: 500, label: '$5', popular: false },
  { id: 'pack_10', amount_cents: 1000, label: '$10', popular: false },
  { id: 'pack_25', amount_cents: 2500, label: '$25', popular: true },
  { id: 'pack_50', amount_cents: 5000, label: '$50', popular: false },
  { id: 'pack_100', amount_cents: 10000, label: '$100', popular: false },
] as const;

// Get Supabase client with service role for server operations
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !serviceKey) {
    throw new Error('Missing Supabase configuration for service operations');
  }
  
  return createClient(url, serviceKey, {
    auth: { persistSession: false }
  });
}

// Get Supabase client for user operations (uses session)
function getUserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !anonKey) {
    throw new Error('Missing Supabase configuration');
  }
  
  return createClient(url, anonKey);
}

/**
 * Get wallet balance for a user
 */
export async function getWalletBalance(userId: string): Promise<WalletBalance | null> {
  const supabase = getServiceClient();
  
  const { data: wallet, error } = await supabase
    .from('user_wallets')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (error && error.code !== 'PGRST116') { // PGRST116 = not found
    console.error('[Wallet] Error fetching wallet:', error);
    throw error;
  }
  
  if (!wallet) {
    return null;
  }
  
  // Calculate trial status
  const trialActive = wallet.trial_expires_at 
    ? new Date(wallet.trial_expires_at) > new Date() 
    : false;
  
  const trialDaysRemaining = wallet.trial_expires_at
    ? Math.max(0, Math.ceil((new Date(wallet.trial_expires_at).getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
    : 0;
  
  return {
    balance_cents: wallet.balance_cents,
    balance_formatted: `$${(wallet.balance_cents / 100).toFixed(2)}`,
    trial_credits_cents: wallet.trial_credits_cents,
    trial_active: trialActive,
    trial_days_remaining: trialDaysRemaining,
    auto_reload_enabled: wallet.auto_reload_enabled,
    total_deposited: wallet.total_deposited_cents,
    total_spent: wallet.total_spent_cents,
  };
}

/**
 * Get or create wallet for a user
 */
export async function getOrCreateWallet(userId: string): Promise<UserWallet> {
  const supabase = getServiceClient();
  
  // Use the database function for atomic get-or-create
  const { data, error } = await supabase
    .rpc('get_or_create_wallet', { p_user_id: userId });
  
  if (error) {
    console.error('[Wallet] Error in get_or_create_wallet:', error);
    throw error;
  }
  
  return data as UserWallet;
}

/**
 * Add credits to wallet (used by Stripe webhook)
 */
export async function addCredits(params: {
  userId: string;
  amountCents: number;
  type: 'deposit' | 'trial_credit' | 'auto_reload' | 'refund' | 'adjustment';
  description: string;
  stripeSessionId?: string;
  metadata?: Record<string, unknown>;
}): Promise<{ wallet: UserWallet; transaction: WalletTransaction }> {
  const supabase = getServiceClient();
  
  const { data, error } = await supabase
    .rpc('add_wallet_credits', {
      p_user_id: params.userId,
      p_amount_cents: params.amountCents,
      p_type: params.type,
      p_description: params.description,
      p_stripe_session_id: params.stripeSessionId || null,
      p_metadata: params.metadata || {},
    });
  
  if (error) {
    console.error('[Wallet] Error adding credits:', error);
    throw error;
  }
  
  // The function returns a table, so data is an array
  const result = Array.isArray(data) ? data[0] : data;
  
  return {
    wallet: result.wallet,
    transaction: result.transaction,
  };
}

/**
 * Deduct credits from wallet (used when consuming services)
 */
export async function deductCredits(params: {
  userId: string;
  amountCents: number;
  description: string;
  category?: string;
  metadata?: Record<string, unknown>;
}): Promise<{
  success: boolean;
  wallet: UserWallet | null;
  transaction: WalletTransaction | null;
  error?: string;
}> {
  const supabase = getServiceClient();
  
  const { data, error } = await supabase
    .rpc('deduct_wallet_credits', {
      p_user_id: params.userId,
      p_amount_cents: params.amountCents,
      p_description: params.description,
      p_category: params.category || null,
      p_metadata: params.metadata || {},
    });
  
  if (error) {
    console.error('[Wallet] Error deducting credits:', error);
    throw error;
  }
  
  const result = Array.isArray(data) ? data[0] : data;
  
  return {
    success: result.success,
    wallet: result.wallet,
    transaction: result.transaction,
    error: result.error_message || undefined,
  };
}

/**
 * Get recent transactions for a user
 */
export async function getRecentTransactions(
  userId: string, 
  limit: number = 20
): Promise<WalletTransaction[]> {
  const supabase = getServiceClient();
  
  const { data, error } = await supabase
    .from('wallet_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error('[Wallet] Error fetching transactions:', error);
    throw error;
  }
  
  return data || [];
}

/**
 * Update Stripe customer ID for a wallet
 */
export async function updateStripeCustomer(
  userId: string, 
  stripeCustomerId: string
): Promise<void> {
  const supabase = getServiceClient();
  
  const { error } = await supabase
    .from('user_wallets')
    .update({ stripe_customer_id: stripeCustomerId })
    .eq('user_id', userId);
  
  if (error) {
    console.error('[Wallet] Error updating Stripe customer:', error);
    throw error;
  }
}

/**
 * Configure auto-reload settings
 */
export async function configureAutoReload(
  userId: string,
  settings: {
    enabled: boolean;
    threshold_cents?: number;
    amount_cents?: number;
  }
): Promise<UserWallet> {
  const supabase = getServiceClient();
  
  const updateData: Partial<UserWallet> = {
    auto_reload_enabled: settings.enabled,
  };
  
  if (settings.threshold_cents !== undefined) {
    updateData.auto_reload_threshold_cents = settings.threshold_cents;
  }
  
  if (settings.amount_cents !== undefined) {
    updateData.auto_reload_amount_cents = settings.amount_cents;
  }
  
  const { data, error } = await supabase
    .from('user_wallets')
    .update(updateData)
    .eq('user_id', userId)
    .select()
    .single();
  
  if (error) {
    console.error('[Wallet] Error configuring auto-reload:', error);
    throw error;
  }
  
  return data;
}

/**
 * Check if balance is low (for alerts)
 */
export function isBalanceLow(balance: WalletBalance, threshold: number = 500): boolean {
  return balance.balance_cents < threshold;
}

/**
 * Format cents as currency string
 */
export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
