import { loadJson, saveJson } from "@/lib/system/persistence";
import { confirmPromoEnrollment } from "./promo";

export type TrialWallet = {
  userId: string;
  promoId: string;
  enrolledAtIso: string;
  endsAtIso: string; // enrolledAt + 30 days
  limitObols: number; // 1000
  usedObols: number;
  graceEndsAtIso: string | null; // set when usedObols >= limitObols, expires after 48h
  trialActive: boolean; // true if not expired and not over budget
  inGrace: boolean; // true if over budget but within 48h grace
};

export type LedgerEntry = {
  eventId: string;
  userId: string;
  timestampIso: string;
  obolsConsumed: number;
  costCenter: "ai" | "scraping" | "messaging";
  moduleKey?: string;
  metadata?: Record<string, any>;
};

const TRIAL_DURATION_DAYS = 30;
const TRIAL_BUDGET_OBOLS = 1000;
const GRACE_PERIOD_HOURS = 48;

function walletKey(userId: string): string {
  return `obols_wallet:${userId}`;
}

function walletFileName(userId: string): string {
  const safe = userId.replace(/[^a-zA-Z0-9:_-]/g, "").slice(0, 128) || "unknown";
  return `obols_wallet__${safe}.json`;
}

function ledgerKey(userId: string): string {
  return `obols_ledger:${userId}`;
}

function ledgerFileName(userId: string): string {
  const safe = userId.replace(/[^a-zA-Z0-9:_-]/g, "").slice(0, 128) || "unknown";
  return `obols_ledger__${safe}.json`;
}

async function loadTrialWallet(userId: string): Promise<TrialWallet | null> {
  return await loadJson<TrialWallet | null>({
    key: walletKey(userId),
    fileName: walletFileName(userId),
    fallback: null,
  });
}

async function saveTrialWallet(wallet: TrialWallet): Promise<void> {
  await saveJson({
    key: walletKey(wallet.userId),
    fileName: walletFileName(wallet.userId),
    value: wallet,
  });
}

async function loadLedger(userId: string): Promise<LedgerEntry[]> {
  return await loadJson<LedgerEntry[]>({
    key: ledgerKey(userId),
    fileName: ledgerFileName(userId),
    fallback: [],
  });
}

async function appendLedgerEntry(userId: string, entry: LedgerEntry): Promise<void> {
  const ledger = await loadLedger(userId);
  ledger.push(entry);
  await saveJson({
    key: ledgerKey(userId),
    fileName: ledgerFileName(userId),
    value: ledger,
  });
}

function computeTrialStatus(wallet: TrialWallet): { trialActive: boolean; inGrace: boolean } {
  const now = new Date();
  const endsAt = Date.parse(wallet.endsAtIso);
  const expired = now.getTime() >= endsAt;

  if (expired) {
    return { trialActive: false, inGrace: false };
  }

  const overBudget = wallet.usedObols >= wallet.limitObols;

  if (!overBudget) {
    return { trialActive: true, inGrace: false };
  }

  // Over budget - check grace period
  if (wallet.graceEndsAtIso) {
    const graceEnds = Date.parse(wallet.graceEndsAtIso);
    const inGrace = now.getTime() < graceEnds;
    return { trialActive: inGrace, inGrace };
  }

  // Budget just hit - start grace period
  return { trialActive: true, inGrace: true };
}

export async function enrollTrialWallet(userId: string, promoId: string): Promise<TrialWallet> {
  const existing = await loadTrialWallet(userId);
  if (existing) {
    return existing; // Already enrolled
  }

  const now = new Date();
  const endsAt = new Date(now.getTime() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000);

  const wallet: TrialWallet = {
    userId,
    promoId,
    enrolledAtIso: now.toISOString(),
    endsAtIso: endsAt.toISOString(),
    limitObols: TRIAL_BUDGET_OBOLS,
    usedObols: 0,
    graceEndsAtIso: null,
    trialActive: true,
    inGrace: false,
  };

  await saveTrialWallet(wallet);

  // Confirm enrollment in promo system
  await confirmPromoEnrollment(userId, promoId).catch((err) => {
    console.error("Failed to confirm promo enrollment:", err);
  });

  return wallet;
}

export async function consumeObols(
  userId: string,
  obols: number,
  costCenter: "ai" | "scraping" | "messaging",
  moduleKey?: string,
  metadata?: Record<string, any>
): Promise<{
  allowed: boolean;
  remainingObols: number | null;
  inGrace: boolean;
  trialActive: boolean;
}> {
  if (obols <= 0) {
    return { allowed: true, remainingObols: null, inGrace: false, trialActive: false };
  }

  const wallet = await loadTrialWallet(userId);
  if (!wallet) {
    // No trial wallet - check if they have paid subscription
    // For now, if no wallet, allow (paid subscribers don't have wallet)
    return { allowed: true, remainingObols: null, inGrace: false, trialActive: false };
  }

  // Update wallet state
  const now = new Date();
  const endsAt = Date.parse(wallet.endsAtIso);
  const expired = now.getTime() >= endsAt;

  if (expired) {
    wallet.trialActive = false;
    wallet.inGrace = false;
    await saveTrialWallet(wallet);
    return { allowed: false, remainingObols: 0, inGrace: false, trialActive: false };
  }

  // Append ledger entry
  const eventId = `${userId}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  await appendLedgerEntry(userId, {
    eventId,
    userId,
    timestampIso: now.toISOString(),
    obolsConsumed: obols,
    costCenter,
    moduleKey,
    metadata,
  });

  // Update usage
  const newUsed = wallet.usedObols + obols;
  wallet.usedObols = newUsed;

  // Check if budget exceeded and grace period needs to start
  if (newUsed >= wallet.limitObols && !wallet.graceEndsAtIso) {
    const graceEnds = new Date(now.getTime() + GRACE_PERIOD_HOURS * 60 * 60 * 1000);
    wallet.graceEndsAtIso = graceEnds.toISOString();
  }

  // Compute current status
  const status = computeTrialStatus(wallet);
  wallet.trialActive = status.trialActive;
  wallet.inGrace = status.inGrace;

  await saveTrialWallet(wallet);

  const remaining = Math.max(0, wallet.limitObols - newUsed);

  return {
    allowed: status.trialActive, // Allow if trial active (includes grace period)
    remainingObols: remaining,
    inGrace: status.inGrace,
    trialActive: status.trialActive,
  };
}

export async function getTrialWalletStatus(userId: string): Promise<TrialWallet | null> {
  const wallet = await loadTrialWallet(userId);
  if (!wallet) return null;

  // Refresh status
  const status = computeTrialStatus(wallet);
  if (wallet.trialActive !== status.trialActive || wallet.inGrace !== status.inGrace) {
    wallet.trialActive = status.trialActive;
    wallet.inGrace = status.inGrace;
    await saveTrialWallet(wallet);
  }

  return wallet;
}
