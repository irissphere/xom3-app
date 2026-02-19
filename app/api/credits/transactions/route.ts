import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRecentTransactions } from "@/lib/obols/wallet-store";

export const dynamic = "force-dynamic";

/**
 * GET /api/credits/transactions
 * 
 * Returns the user's recent wallet transactions.
 * Query params:
 * - limit: number (default 20, max 100)
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Parse limit from query
    const url = new URL(request.url);
    const limitParam = url.searchParams.get("limit");
    const limit = Math.min(Math.max(parseInt(limitParam || "20", 10) || 20, 1), 100);
    
    // Get transactions
    const transactions = await getRecentTransactions(user.id, limit);
    
    return NextResponse.json({
      ok: true,
      transactions: transactions.map(tx => ({
        id: tx.id,
        type: tx.type,
        amount: tx.amount_cents,
        amountFormatted: `${tx.amount_cents >= 0 ? '+' : ''}$${(tx.amount_cents / 100).toFixed(2)}`,
        balanceAfter: tx.balance_after_cents,
        balanceAfterFormatted: `$${(tx.balance_after_cents / 100).toFixed(2)}`,
        description: tx.description,
        category: tx.category,
        createdAt: tx.created_at,
      })),
      total: transactions.length,
    });
  } catch (error: any) {
    console.error("[Credits Transactions] Error:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Failed to get transactions" },
      { status: 500 }
    );
  }
}
