/**
 * Subscription Bonus Calculator
 * 
 * Calculates 30% bonus credits for subscription plans
 * At 70-90% margins, giving 30% bonus still leaves 40-60% profit
 */

export interface SubscriptionPlan {
  id: 'starter' | 'growth' | 'pro';
  monthlyPrice: number; // in dollars
  baseCredits: number; // in cents
}

export const SUBSCRIPTION_PLANS: Record<string, SubscriptionPlan> = {
  starter: {
    id: 'starter',
    monthlyPrice: 97,
    baseCredits: 9700, // $97 in cents
  },
  growth: {
    id: 'growth',
    monthlyPrice: 197,
    baseCredits: 19700, // $197 in cents
  },
  pro: {
    id: 'pro',
    monthlyPrice: 497,
    baseCredits: 49700, // $497 in cents
  },
};

/**
 * Calculate bonus credits (30% of base)
 */
export function calculateBonusCredits(baseCredits: number): number {
  return Math.floor(baseCredits * 0.3);
}

/**
 * Get total credits including bonus for a subscription plan
 */
export function getTotalCreditsWithBonus(planId: string): {
  baseCredits: number;
  bonusCredits: number;
  totalCredits: number;
  effectiveValue: number;
} {
  const plan = SUBSCRIPTION_PLANS[planId];
  if (!plan) {
    throw new Error(`Unknown plan: ${planId}`);
  }

  const bonusCredits = calculateBonusCredits(plan.baseCredits);
  const totalCredits = plan.baseCredits + bonusCredits;
  const effectiveValue = totalCredits / 100; // in dollars

  return {
    baseCredits: plan.baseCredits,
    bonusCredits,
    totalCredits,
    effectiveValue,
  };
}

/**
 * Get subscription bonus info for display
 */
export function getSubscriptionBonusInfo(planId: string): {
  monthlyPrice: number;
  baseCredits: number;
  bonusCredits: number;
  totalCredits: number;
  bonusPercentage: number;
  effectiveValue: number;
} {
  const plan = SUBSCRIPTION_PLANS[planId];
  if (!plan) {
    throw new Error(`Unknown plan: ${planId}`);
  }

  const bonusCredits = calculateBonusCredits(plan.baseCredits);
  const totalCredits = plan.baseCredits + bonusCredits;
  const effectiveValue = totalCredits / 100;

  return {
    monthlyPrice: plan.monthlyPrice,
    baseCredits: plan.baseCredits,
    bonusCredits,
    totalCredits,
    bonusPercentage: 30,
    effectiveValue,
  };
}















