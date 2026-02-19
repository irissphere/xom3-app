import { NextRequest, NextResponse } from 'next/server';
import { 
  createTrialWallet, 
  isTrialActive, 
  getTrialDaysRemaining,
  formatCents,
  TRIAL_CONFIG 
} from '@/lib/obols/wallet';

// In-memory store for demo - replace with database in production
const walletStore = new Map<string, ReturnType<typeof createTrialWallet>>();
const transactionStore = new Map<string, Array<{ id: string; type: string; amount: number; description: string; createdAt: string }>>();

export async function GET(request: NextRequest) {
  try {
    // Get user ID from header or query param (in production, use auth)
    const userId = request.headers.get('x-user-id') || 
                   request.nextUrl.searchParams.get('userId') || 
                   'demo-user';

    // Get or create wallet
    let wallet = walletStore.get(userId);
    if (!wallet) {
      wallet = createTrialWallet(userId);
      walletStore.set(userId, wallet);
      
      // Record trial credit transaction
      const transactions = transactionStore.get(userId) || [];
      transactions.push({
        id: `txn_trial_${Date.now()}`,
        type: 'trial_credit',
        amount: TRIAL_CONFIG.FREE_CREDITS_CENTS,
        description: `Trial started: ${formatCents(TRIAL_CONFIG.FREE_CREDITS_CENTS)} free credits for ${TRIAL_CONFIG.DURATION_DAYS} days`,
        createdAt: new Date().toISOString(),
      });
      transactionStore.set(userId, transactions);
    }

    const transactions = transactionStore.get(userId) || [];

    return NextResponse.json({
      success: true,
      wallet: {
        balance: wallet.balance,
        balanceFormatted: formatCents(wallet.balance),
        trialActive: isTrialActive(wallet),
        trialDaysRemaining: getTrialDaysRemaining(wallet),
        trialExpiresAt: wallet.trialExpiresAt,
        autoReload: wallet.autoReload,
      },
      trial: {
        freeCredits: formatCents(TRIAL_CONFIG.FREE_CREDITS_CENTS),
        durationDays: TRIAL_CONFIG.DURATION_DAYS,
      },
      recentTransactions: transactions.slice(-10).reverse(),
    });
  } catch (error) {
    console.error('Error getting wallet status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get wallet status' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
