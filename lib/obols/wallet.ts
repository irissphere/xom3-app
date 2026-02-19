/**
 * Wallet System - Prepaid Credits
 * 
 * Users prepay for credits, which are deducted per action.
 * Trial: $10 free credits + 30 days
 * Auto-reload available for seamless experience
 */

export interface WalletBalance {
  userId: string;
  balance: number; // in cents (100 = $1.00)
  trialCredits: number; // remaining trial credits in cents
  trialExpiresAt: string | null;
  autoReload: {
    enabled: boolean;
    threshold: number; // reload when balance drops below this (cents)
    amount: number; // amount to reload (cents)
  };
  createdAt: string;
  updatedAt: string;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  type: 'credit' | 'debit' | 'trial_credit' | 'auto_reload';
  amount: number; // positive for credits, negative for debits
  description: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// Trial configuration
export const TRIAL_CONFIG = {
  FREE_CREDITS_CENTS: 1000, // $10.00 in free credits
  DURATION_DAYS: 30,
};

// Auto-reload defaults
export const AUTO_RELOAD_DEFAULTS = {
  threshold: 1000, // $10.00
  amount: 2500, // $25.00
};

/**
 * Initialize a new wallet with trial credits
 */
export function createTrialWallet(userId: string): WalletBalance {
  const now = new Date();
  const trialExpires = new Date(now.getTime() + TRIAL_CONFIG.DURATION_DAYS * 24 * 60 * 60 * 1000);
  
  return {
    userId,
    balance: TRIAL_CONFIG.FREE_CREDITS_CENTS,
    trialCredits: TRIAL_CONFIG.FREE_CREDITS_CENTS,
    trialExpiresAt: trialExpires.toISOString(),
    autoReload: {
      enabled: false,
      threshold: AUTO_RELOAD_DEFAULTS.threshold,
      amount: AUTO_RELOAD_DEFAULTS.amount,
    },
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

/**
 * Check if wallet has sufficient balance for a transaction
 */
export function hasBalance(wallet: WalletBalance, amountCents: number): boolean {
  return wallet.balance >= amountCents;
}

/**
 * Check if trial is still active
 */
export function isTrialActive(wallet: WalletBalance): boolean {
  if (!wallet.trialExpiresAt) return false;
  return new Date(wallet.trialExpiresAt) > new Date();
}

/**
 * Get days remaining in trial
 */
export function getTrialDaysRemaining(wallet: WalletBalance): number {
  if (!wallet.trialExpiresAt) return 0;
  const now = new Date();
  const expires = new Date(wallet.trialExpiresAt);
  const diff = expires.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
}

/**
 * Format cents as dollars
 */
export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Deduct from wallet balance
 */
export function deductBalance(
  wallet: WalletBalance, 
  amountCents: number,
  description: string
): { wallet: WalletBalance; transaction: WalletTransaction } {
  if (!hasBalance(wallet, amountCents)) {
    throw new Error('Insufficient balance');
  }

  const now = new Date().toISOString();
  const newBalance = wallet.balance - amountCents;
  
  // Determine if this comes from trial credits
  const fromTrial = wallet.trialCredits > 0 && isTrialActive(wallet);
  const trialDeduction = fromTrial ? Math.min(amountCents, wallet.trialCredits) : 0;

  const updatedWallet: WalletBalance = {
    ...wallet,
    balance: newBalance,
    trialCredits: wallet.trialCredits - trialDeduction,
    updatedAt: now,
  };

  const transaction: WalletTransaction = {
    id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId: wallet.userId,
    type: 'debit',
    amount: -amountCents,
    description,
    metadata: fromTrial ? { fromTrialCredits: trialDeduction } : undefined,
    createdAt: now,
  };

  return { wallet: updatedWallet, transaction };
}

/**
 * Add funds to wallet
 */
export function addFunds(
  wallet: WalletBalance,
  amountCents: number,
  type: 'credit' | 'auto_reload' = 'credit'
): { wallet: WalletBalance; transaction: WalletTransaction } {
  const now = new Date().toISOString();

  const updatedWallet: WalletBalance = {
    ...wallet,
    balance: wallet.balance + amountCents,
    updatedAt: now,
  };

  const transaction: WalletTransaction = {
    id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId: wallet.userId,
    type,
    amount: amountCents,
    description: type === 'auto_reload' 
      ? `Auto-reload: ${formatCents(amountCents)}`
      : `Added funds: ${formatCents(amountCents)}`,
    createdAt: now,
  };

  return { wallet: updatedWallet, transaction };
}

/**
 * Check if auto-reload should trigger
 */
export function shouldAutoReload(wallet: WalletBalance): boolean {
  return wallet.autoReload.enabled && wallet.balance < wallet.autoReload.threshold;
}

/**
 * Configure auto-reload settings
 */
export function configureAutoReload(
  wallet: WalletBalance,
  settings: Partial<WalletBalance['autoReload']>
): WalletBalance {
  return {
    ...wallet,
    autoReload: {
      ...wallet.autoReload,
      ...settings,
    },
    updatedAt: new Date().toISOString(),
  };
}
