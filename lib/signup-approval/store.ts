/**
 * Signup Approval Store
 * Tracks pending and approved signups
 */

export interface SignupApproval {
  signupId: string;
  email: string;
  name: string;
  phone?: string;
  businessName?: string;
  status: "pending" | "approved" | "denied";
  tier?: "starter" | "pro" | "enterprise";
  approvedBy?: string;
  approvedAt?: string;
  deniedBy?: string;
  deniedAt?: string;
  createdAt: string;
}

// In-memory store (in production, use Airtable or database)
const signupStore = new Map<string, SignupApproval>();

/**
 * Store a new signup request
 */
export function storeSignupRequest(data: {
  signupId: string;
  email: string;
  name: string;
  phone?: string;
  businessName?: string;
}): void {
  signupStore.set(data.signupId, {
    ...data,
    status: "pending",
    createdAt: new Date().toISOString(),
  });
}

/**
 * Approve a signup
 */
export function approveSignup(
  signupId: string,
  tier: "starter" | "pro" | "enterprise",
  approvedBy: string
): SignupApproval | null {
  const signup = signupStore.get(signupId);
  if (!signup) return null;

  signup.status = "approved";
  signup.tier = tier;
  signup.approvedBy = approvedBy;
  signup.approvedAt = new Date().toISOString();

  signupStore.set(signupId, signup);
  return signup;
}

/**
 * Deny a signup
 */
export function denySignup(signupId: string, deniedBy: string): SignupApproval | null {
  const signup = signupStore.get(signupId);
  if (!signup) return null;

  signup.status = "denied";
  signup.deniedBy = deniedBy;
  signup.deniedAt = new Date().toISOString();

  signupStore.set(signupId, signup);
  return signup;
}

/**
 * Get signup by ID
 */
export function getSignup(signupId: string): SignupApproval | null {
  return signupStore.get(signupId) || null;
}

/**
 * Get signup by email
 */
export function getSignupByEmail(email: string): SignupApproval | null {
  const values = Array.from(signupStore.values());
  for (const signup of values) {
    if (signup.email.toLowerCase() === email.toLowerCase()) {
      return signup;
    }
  }
  return null;
}

/**
 * Check if email is approved
 */
export function isEmailApproved(email: string): boolean {
  const signup = getSignupByEmail(email);
  return signup?.status === "approved";
}

/**
 * Get all pending signups
 */
export function getPendingSignups(): SignupApproval[] {
  return Array.from(signupStore.values()).filter(s => s.status === "pending");
}

