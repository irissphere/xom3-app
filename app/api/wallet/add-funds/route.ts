import { NextRequest, NextResponse } from 'next/server';
import { 
  createTrialWallet,
  addFunds,
  configureAutoReload,
  formatCents
} from '@/lib/obols/wallet';

// In-memory store for demo - replace with database in production
const walletStore = new Map<string, ReturnType<typeof createTrialWallet>>();
const transactionStore = new Map<string, Array<{ id: string; type: string; amount: number; description: string; createdAt: string }>>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      userId = 'demo-user', 
      amount, 
      autoReload 
    } = body;

    // Get or create wallet
    let wallet = walletStore.get(userId);
    if (!wallet) {
      wallet = createTrialWallet(userId);
      walletStore.set(userId, wallet);
    }

    // Handle auto-reload configuration
    if (autoReload !== undefined) {
      wallet = configureAutoReload(wallet, autoReload);
      walletStore.set(userId, wallet);
      
      if (!amount) {
        return NextResponse.json({
          success: true,
          message: 'Auto-reload settings updated',
          autoReload: wallet.autoReload,
        });
      }
    }

    // Add funds if amount provided
    if (amount && amount > 0) {
      // In production, this would process a Stripe payment first
      const { wallet: updatedWallet, transaction } = addFunds(wallet, amount);
      
      walletStore.set(userId, updatedWallet);
      
      const transactions = transactionStore.get(userId) || [];
      transactions.push(transaction);
      transactionStore.set(userId, transactions);

      return NextResponse.json({
        success: true,
        added: amount,
        addedFormatted: formatCents(amount),
        newBalance: updatedWallet.balance,
        newBalanceFormatted: formatCents(updatedWallet.balance),
        transaction: {
          id: transaction.id,
          amount: transaction.amount,
          description: transaction.description,
        },
      });
    }

    return NextResponse.json({
      success: true,
      balance: wallet.balance,
      balanceFormatted: formatCents(wallet.balance),
      autoReload: wallet.autoReload,
    });
  } catch (error) {
    console.error('Error adding funds:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add funds' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
