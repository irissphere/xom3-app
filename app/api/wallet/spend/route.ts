import { NextRequest, NextResponse } from 'next/server';
import { 
  createTrialWallet,
  deductBalance,
  hasBalance,
  shouldAutoReload,
  addFunds,
  formatCents
} from '@/lib/obols/wallet';

// In-memory store for demo - replace with database in production
const walletStore = new Map<string, ReturnType<typeof createTrialWallet>>();
const transactionStore = new Map<string, Array<{ id: string; type: string; amount: number; description: string; createdAt: string }>>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId = 'demo-user', amount, description, action } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid amount' },
        { status: 400 }
      );
    }

    // Get or create wallet
    let wallet = walletStore.get(userId);
    if (!wallet) {
      wallet = createTrialWallet(userId);
      walletStore.set(userId, wallet);
    }

    // Check balance
    if (!hasBalance(wallet, amount)) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient balance',
        balance: wallet.balance,
        balanceFormatted: formatCents(wallet.balance),
        required: amount,
        requiredFormatted: formatCents(amount),
      }, { status: 402 }); // Payment Required
    }

    // Deduct balance
    const { wallet: updatedWallet, transaction } = deductBalance(
      wallet,
      amount,
      description || `${action || 'Action'}: ${formatCents(amount)}`
    );

    // Update store
    walletStore.set(userId, updatedWallet);
    
    const transactions = transactionStore.get(userId) || [];
    transactions.push(transaction);
    transactionStore.set(userId, transactions);

    // Check if auto-reload should trigger
    let autoReloadTriggered = false;
    if (shouldAutoReload(updatedWallet)) {
      // In production, this would trigger a Stripe charge
      const { wallet: reloadedWallet, transaction: reloadTxn } = addFunds(
        updatedWallet,
        updatedWallet.autoReload.amount,
        'auto_reload'
      );
      walletStore.set(userId, reloadedWallet);
      transactions.push(reloadTxn);
      autoReloadTriggered = true;
    }

    const finalWallet = walletStore.get(userId)!;

    return NextResponse.json({
      success: true,
      spent: amount,
      spentFormatted: formatCents(amount),
      newBalance: finalWallet.balance,
      newBalanceFormatted: formatCents(finalWallet.balance),
      autoReloadTriggered,
      transaction: {
        id: transaction.id,
        amount: transaction.amount,
        description: transaction.description,
      },
    });
  } catch (error) {
    console.error('Error spending from wallet:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to process spend' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
