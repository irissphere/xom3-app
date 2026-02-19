import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWalletBalance, getOrCreateWallet } from "@/lib/obols/wallet-store";

export const dynamic = "force-dynamic";

/**
 * GET /api/credits/balance
 * 
 * Returns the current user's wallet balance and status.
 * Creates a wallet if one doesn't exist.
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
    
    // Get wallet balance
    let balance = await getWalletBalance(user.id);
    
    // Create wallet if doesn't exist
    if (!balance) {
      await getOrCreateWallet(user.id);
      balance = await getWalletBalance(user.id);
    }
    
    if (!balance) {
      return NextResponse.json(
        { ok: false, error: "Failed to retrieve wallet" },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      ok: true,
      balance: balance.balance_cents,
      balanceFormatted: balance.balance_formatted,
      trialCredits: balance.trial_credits_cents,
      trialActive: balance.trial_active,
      trialDaysRemaining: balance.trial_days_remaining,
      autoReloadEnabled: balance.auto_reload_enabled,
      totalDeposited: balance.total_deposited,
      totalSpent: balance.total_spent,
      // Computed fields for UI
      lowBalance: balance.balance_cents < 500, // Under $5
      criticalBalance: balance.balance_cents < 100, // Under $1
    });
  } catch (error: any) {
    console.error("[Credits Balance] Error:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Failed to get balance" },
      { status: 500 }
    );
  }
}
