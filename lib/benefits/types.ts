/**
 * Benefits CRM Sovereign Types
 * 
 * Core contracts for the Benefits Lane - CRM, tier management,
 * access control, and audit logging.
 */

// ============================================================
// Tier & Access Types
// ============================================================

export type AccessTier = "operator" | "founder" | "partner";

export type TierStatus = "active" | "pending" | "suspended" | "expired";

export type BenefitCategory = 
  | "aca"
  | "medicare"
  | "employer"
  | "individual"
  | "family"
  | "private";

export type BenefitStatus = 
  | "eligible"
  | "enrolled"
  | "pending"
  | "denied"
  | "expired"
  | "cancelled";

// ============================================================
// Core Entity Types
// ============================================================

export interface Benefit {
  id: string;
  category: BenefitCategory;
  name: string;
  description: string;
  status: BenefitStatus;
  carrier?: string;
  planId?: string;
  premium?: number;
  effectiveDate?: string;
  terminationDate?: string;
  enrollmentDate?: string;
  clientId?: string;
  clientName?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface TierAccess {
  id: string;
  tier: AccessTier;
  status: TierStatus;
  userId: string;
  userName: string;
  email: string;
  permissions: string[];
  grantedBy: string;
  grantedAt: string;
  expiresAt?: string;
  lastAccessAt?: string;
  accessCount: number;
  notes?: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  actor: string;
  actorTier: AccessTier;
  target: string;
  targetType: "benefit" | "tier" | "access" | "system";
  details?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  timestamp: string;
}

export interface BenefitsClient {
  id: string;
  name: string;
  company?: string;
  email: string;
  phone?: string;
  tier: AccessTier;
  status: TierStatus;
  benefits: Benefit[];
  totalEnrolled: number;
  totalPending: number;
  totalPremium: number;
  joinedAt: string;
  lastActivityAt?: string;
}

// ============================================================
// Dashboard Stats Types
// ============================================================

export interface BenefitsStats {
  totalBenefits: number;
  enrolled: number;
  pending: number;
  denied: number;
  byCategory: Record<BenefitCategory, number>;
  byStatus: Record<BenefitStatus, number>;
  totalPremium: number;
  averagePremium: number;
}

export interface TierStats {
  totalUsers: number;
  operators: number;
  founders: number;
  partners: number;
  activeUsers: number;
  pendingApprovals: number;
}

export interface AccessStats {
  totalLogs: number;
  todayLogs: number;
  uniqueActors: number;
  topActions: { action: string; count: number }[];
}

export interface BenefitsDashboardData {
  benefits: BenefitsStats;
  tiers: TierStats;
  access: AccessStats;
  recentActivity: AuditLogEntry[];
  posture: "nominal" | "degraded" | "critical";
  lastSync: string;
}

// ============================================================
// API Response Types
// ============================================================

export interface BenefitsApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface BenefitsListResponse {
  items: Benefit[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TierListResponse {
  items: TierAccess[];
  total: number;
}

export interface AuditLogResponse {
  items: AuditLogEntry[];
  total: number;
  page: number;
  pageSize: number;
}

// ============================================================
// Signal Types
// ============================================================

export type BenefitsSignalType =
  | "benefit_created"
  | "benefit_enrolled"
  | "benefit_denied"
  | "benefit_expired"
  | "tier_granted"
  | "tier_revoked"
  | "tier_upgraded"
  | "access_violation"
  | "audit_alert";

export interface BenefitsSignalPayload {
  signalType: BenefitsSignalType;
  benefitId?: string;
  userId?: string;
  tier?: AccessTier;
  category?: BenefitCategory;
  details?: string;
  timestamp: string;
}
