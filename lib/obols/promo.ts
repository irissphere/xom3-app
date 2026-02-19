import { loadJson, saveJson } from "@/lib/system/persistence";

export type PromoConfig = {
  promoId: string;
  startedAtIso: string;
  endsAtIso: string; // startedAt + 14 days
  maxEnrollments: number; // 100 for grand opening
  enrolledCount: number;
  reservedCount: number; // count of active reservations
  reservations: Array<{
    userId: string;
    reservedUntilIso: string; // reservedAt + 2 hours
  }>;
};

const GRAND_OPENING_PROMO_ID = "grand_opening_v1";
const PROMO_DURATION_DAYS = 14;
const MAX_ENROLLMENTS = 100;
const RESERVATION_WINDOW_HOURS = 2;

function promoKey(): string {
  return `obols_promo:${GRAND_OPENING_PROMO_ID}`;
}

function promoFileName(): string {
  return `obols_promo__${GRAND_OPENING_PROMO_ID}.json`;
}

async function loadPromoConfig(): Promise<PromoConfig | null> {
  return await loadJson<PromoConfig | null>({
    key: promoKey(),
    fileName: promoFileName(),
    fallback: null,
  });
}

async function savePromoConfig(config: PromoConfig): Promise<void> {
  await saveJson({
    key: promoKey(),
    fileName: promoFileName(),
    value: config,
  });
}

async function ensurePromoConfig(): Promise<PromoConfig> {
  const existing = await loadPromoConfig();
  if (existing) return existing;

  const now = new Date();
  const endsAt = new Date(now.getTime() + PROMO_DURATION_DAYS * 24 * 60 * 60 * 1000);

  const config: PromoConfig = {
    promoId: GRAND_OPENING_PROMO_ID,
    startedAtIso: now.toISOString(),
    endsAtIso: endsAt.toISOString(),
    maxEnrollments: MAX_ENROLLMENTS,
    enrolledCount: 0,
    reservedCount: 0,
    reservations: [],
  };

  await savePromoConfig(config);
  return config;
}

function isPromoActive(config: PromoConfig): boolean {
  const now = new Date();
  const endsAt = Date.parse(config.endsAtIso);
  return now.getTime() < endsAt;
}

function cleanupExpiredReservations(config: PromoConfig): PromoConfig {
  const now = new Date();
  const active = config.reservations.filter((r) => {
    const expires = Date.parse(r.reservedUntilIso);
    return now.getTime() < expires;
  });

  return {
    ...config,
    reservations: active,
    reservedCount: active.length,
  };
}

export async function checkPromoEligibility(userId: string): Promise<{
  eligible: boolean;
  promoId: string | null;
  slotsRemaining: number;
  reason?: string;
}> {
  const config = await ensurePromoConfig();
  const cleaned = cleanupExpiredReservations(config);
  if (cleaned !== config) {
    await savePromoConfig(cleaned);
  }

  if (!isPromoActive(cleaned)) {
    return {
      eligible: false,
      promoId: null,
      slotsRemaining: 0,
      reason: "Promo period ended",
    };
  }

  const totalUsed = cleaned.enrolledCount + cleaned.reservedCount;
  const slotsRemaining = Math.max(0, cleaned.maxEnrollments - totalUsed);

  if (slotsRemaining <= 0) {
    return {
      eligible: false,
      promoId: null,
      slotsRemaining: 0,
      reason: "Promo slots exhausted",
    };
  }

  // Check if user already has a reservation
  const existingReservation = cleaned.reservations.find((r) => r.userId === userId);
  if (existingReservation) {
    const expires = Date.parse(existingReservation.reservedUntilIso);
    if (new Date().getTime() < expires) {
      return {
        eligible: true,
        promoId: cleaned.promoId,
        slotsRemaining,
      };
    }
  }

  return {
    eligible: true,
    promoId: cleaned.promoId,
    slotsRemaining,
  };
}

export async function reservePromoSlot(
  userId: string,
  promoId: string
): Promise<{ success: boolean; reason?: string }> {
  if (promoId !== GRAND_OPENING_PROMO_ID) {
    return { success: false, reason: "Invalid promo ID" };
  }

  const config = await ensurePromoConfig();
  const cleaned = cleanupExpiredReservations(config);

  if (!isPromoActive(cleaned)) {
    return { success: false, reason: "Promo period ended" };
  }

  const totalUsed = cleaned.enrolledCount + cleaned.reservedCount;
  if (totalUsed >= cleaned.maxEnrollments) {
    return { success: false, reason: "Promo slots exhausted" };
  }

  // Check if user already has an active reservation
  const existingIndex = cleaned.reservations.findIndex((r) => r.userId === userId);
  if (existingIndex >= 0) {
    const existing = cleaned.reservations[existingIndex];
    const expires = Date.parse(existing.reservedUntilIso);
    if (new Date().getTime() < expires) {
      return { success: true }; // Already reserved
    }
    // Remove expired reservation
    cleaned.reservations.splice(existingIndex, 1);
  }

  // Create new reservation
  const now = new Date();
  const reservedUntil = new Date(now.getTime() + RESERVATION_WINDOW_HOURS * 60 * 60 * 1000);

  cleaned.reservations.push({
    userId,
    reservedUntilIso: reservedUntil.toISOString(),
  });

  cleaned.reservedCount = cleaned.reservations.length;

  await savePromoConfig(cleaned);
  return { success: true };
}

export async function confirmPromoEnrollment(userId: string, promoId: string): Promise<{ success: boolean }> {
  if (promoId !== GRAND_OPENING_PROMO_ID) {
    return { success: false };
  }

  const config = await ensurePromoConfig();
  const cleaned = cleanupExpiredReservations(config);

  // Remove reservation if exists
  const reservationIndex = cleaned.reservations.findIndex((r) => r.userId === userId);
  if (reservationIndex >= 0) {
    cleaned.reservations.splice(reservationIndex, 1);
  }

  // Increment enrollment count
  cleaned.enrolledCount += 1;
  cleaned.reservedCount = cleaned.reservations.length;

  await savePromoConfig(cleaned);
  return { success: true };
}

export async function getPromoStatus(): Promise<{
  promoId: string;
  active: boolean;
  startedAtIso: string;
  endsAtIso: string;
  enrolledCount: number;
  reservedCount: number;
  slotsRemaining: number;
}> {
  const config = await ensurePromoConfig();
  const cleaned = cleanupExpiredReservations(config);
  if (cleaned !== config) {
    await savePromoConfig(cleaned);
  }

  const totalUsed = cleaned.enrolledCount + cleaned.reservedCount;
  const slotsRemaining = Math.max(0, cleaned.maxEnrollments - totalUsed);

  return {
    promoId: cleaned.promoId,
    active: isPromoActive(cleaned),
    startedAtIso: cleaned.startedAtIso,
    endsAtIso: cleaned.endsAtIso,
    enrolledCount: cleaned.enrolledCount,
    reservedCount: cleaned.reservedCount,
    slotsRemaining,
  };
}
