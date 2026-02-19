/**
 * Referral Code Generation and Validation
 */

import { ReferralLink } from './types';

const CODE_LENGTH = 8;
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excludes confusing chars

/**
 * Generate a unique referral code
 */
export function generateReferralCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
  }
  return code;
}

/**
 * Validate referral code format
 */
export function isValidReferralCode(code: string): boolean {
  if (!code || code.length !== CODE_LENGTH) return false;
  return /^[A-Z0-9]+$/.test(code);
}

/**
 * Normalize referral code (uppercase, trim)
 */
export function normalizeReferralCode(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Create referral link from code
 */
export function createReferralLink(userId: string, code: string): ReferralLink {
  return {
    id: `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId,
    code: normalizeReferralCode(code),
    createdAt: new Date().toISOString(),
    clickCount: 0,
    signupCount: 0,
    active: true,
  };
}

/**
 * Get referral URL from code
 */
export function getReferralUrl(code: string, baseUrl?: string): string {
  const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}/intake?ref=${code}`;
}















