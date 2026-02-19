/**
 * Affiliate Link Tracking
 * 
 * Cookie-based attribution with 30-day window.
 * Handles click tracking and conversion attribution.
 */

export const AFFILIATE_COOKIE_NAME = 'xom3_aff';
export const AFFILIATE_COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

/**
 * Parse the affiliate cookie value
 */
export function parseAffiliateCookie(cookieValue: string | undefined): {
  code: string;
  clickedAt: number;
} | null {
  if (!cookieValue) return null;
  try {
    const [code, timestamp] = cookieValue.split(':');
    if (!code) return null;
    return {
      code,
      clickedAt: parseInt(timestamp || '0', 10),
    };
  } catch {
    return null;
  }
}

/**
 * Build the affiliate cookie value
 */
export function buildAffiliateCookie(code: string): string {
  return `${code}:${Date.now()}`;
}

/**
 * Build the Set-Cookie header for affiliate attribution
 */
export function buildAffiliateSetCookie(code: string): string {
  const value = buildAffiliateCookie(code);
  return `${AFFILIATE_COOKIE_NAME}=${value}; Path=/; Max-Age=${AFFILIATE_COOKIE_MAX_AGE}; SameSite=Lax; Secure`;
}

/**
 * Check if an affiliate cookie is still within the attribution window (30 days)
 */
export function isAttributionValid(clickedAt: number): boolean {
  const thirtyDaysMs = AFFILIATE_COOKIE_MAX_AGE * 1000;
  return Date.now() - clickedAt < thirtyDaysMs;
}
