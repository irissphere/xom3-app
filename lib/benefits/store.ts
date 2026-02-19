/**
 * Benefits Lane In-Memory Store
 * 
 * Stores benefits, tier access, and audit logs.
 * In production, backed by Airtable or PostgreSQL.
 */

import type {
  Benefit,
  TierAccess,
  AuditLogEntry,
  BenefitsStats,
  TierStats,
  AccessStats,
  BenefitsDashboardData,
  BenefitCategory,
  BenefitStatus,
  AccessTier,
} from "./types";

// ============================================================
// In-Memory Data Store
// ============================================================

let benefits: Benefit[] = [];
let tierAccess: TierAccess[] = [];
let auditLogs: AuditLogEntry[] = [];

// ============================================================
// Demo Data Seeding
// ============================================================

function seedDemoData(): void {
  const now = new Date();

  benefits = [
    {
      id: "ben-001",
      category: "private",
      name: "Gold PPO Plan",
      description: "Premium private health coverage with nationwide network access",
      status: "enrolled",
      carrier: "Blue Cross Blue Shield",
      planId: "BCBS-GOLD-2024",
      premium: 485.00,
      effectiveDate: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      enrollmentDate: new Date(now.getTime() - 95 * 24 * 60 * 60 * 1000).toISOString(),
      clientId: "client-001",
      clientName: "Apex Solutions",
      createdAt: new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "ben-002",
      category: "medicare",
      name: "Medicare Advantage Plus",
      description: "Enhanced Medicare coverage with prescription drug benefits",
      status: "enrolled",
      carrier: "UnitedHealthcare",
      planId: "UHC-MA-PLUS",
      premium: 125.00,
      effectiveDate: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      enrollmentDate: new Date(now.getTime() - 65 * 24 * 60 * 60 * 1000).toISOString(),
      clientId: "client-002",
      clientName: "BenefitsPro Group",
      createdAt: new Date(now.getTime() - 70 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "ben-003",
      category: "aca",
      name: "ACA Silver Enhanced",
      description: "Marketplace plan with cost-sharing reductions",
      status: "pending",
      carrier: "Ambetter",
      planId: "AMB-SILVER-ENH",
      premium: 320.00,
      clientId: "client-003",
      clientName: "MediCare Connect",
      createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "ben-004",
      category: "employer",
      name: "Group Health Premium",
      description: "Employer-sponsored comprehensive health plan",
      status: "enrolled",
      carrier: "Cigna",
      planId: "CIG-GROUP-PREM",
      premium: 0,
      effectiveDate: new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000).toISOString(),
      enrollmentDate: new Date(now.getTime() - 185 * 24 * 60 * 60 * 1000).toISOString(),
      clientId: "client-004",
      clientName: "TechVentures Inc",
      createdAt: new Date(now.getTime() - 200 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "ben-005",
      category: "family",
      name: "Family Protection Plan",
      description: "Full family coverage including dependents up to age 26",
      status: "eligible",
      carrier: "Aetna",
      planId: "AET-FAM-PROT",
      premium: 890.00,
      clientId: "client-005",
      clientName: "Johnson Family Trust",
      createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "ben-006",
      category: "individual",
      name: "Individual Flex Plan",
      description: "Flexible individual coverage with HSA eligibility",
      status: "denied",
      carrier: "Humana",
      planId: "HUM-IND-FLEX",
      clientId: "client-006",
      clientName: "Marcus Chen",
      createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  tierAccess = [
    {
      id: "tier-001",
      tier: "operator",
      status: "active",
      userId: "user-001",
      userName: "Preston Chenault",
      email: "preston@xom3.io",
      permissions: ["full_access", "admin", "audit", "tier_management"],
      grantedBy: "system",
      grantedAt: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString(),
      lastAccessAt: new Date().toISOString(),
      accessCount: 1247,
    },
    {
      id: "tier-002",
      tier: "founder",
      status: "active",
      userId: "user-002",
      userName: "Sarah Mitchell",
      email: "sarah@apexsolutions.com",
      permissions: ["dashboard_access", "benefit_view", "report_generation"],
      grantedBy: "Preston Chenault",
      grantedAt: new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000).toISOString(),
      lastAccessAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      accessCount: 89,
      notes: "Early investor - Gold tier benefits",
    },
    {
      id: "tier-003",
      tier: "partner",
      status: "active",
      userId: "user-003",
      userName: "David Park",
      email: "david@benefitspro.group",
      permissions: ["dashboard_access", "benefit_view", "client_management"],
      grantedBy: "Preston Chenault",
      grantedAt: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      lastAccessAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      accessCount: 45,
      notes: "Strategic channel partner",
    },
    {
      id: "tier-004",
      tier: "partner",
      status: "pending",
      userId: "user-004",
      userName: "Emily Rodriguez",
      email: "emily@medicare-connect.com",
      permissions: ["dashboard_access", "benefit_view"],
      grantedBy: "Sarah Mitchell",
      grantedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      accessCount: 0,
      notes: "Awaiting approval for partner tier",
    },
    {
      id: "tier-005",
      tier: "founder",
      status: "expired",
      userId: "user-005",
      userName: "Michael Torres",
      email: "michael@oldpartner.io",
      permissions: ["dashboard_access"],
      grantedBy: "Preston Chenault",
      grantedAt: new Date(now.getTime() - 400 * 24 * 60 * 60 * 1000).toISOString(),
      expiresAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      lastAccessAt: new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000).toISOString(),
      accessCount: 23,
    },
  ];

  auditLogs = [
    {
      id: "log-001",
      action: "TIER_GRANT",
      actor: "Preston Chenault",
      actorTier: "operator",
      target: "Emily Rodriguez",
      targetType: "tier",
      details: "Partner tier access granted pending approval",
      timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "log-002",
      action: "BENEFIT_ENROLLED",
      actor: "System",
      actorTier: "operator",
      target: "ben-001",
      targetType: "benefit",
      details: "Gold PPO Plan enrollment completed for Apex Solutions",
      timestamp: new Date(now.getTime() - 95 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "log-003",
      action: "DASHBOARD_ACCESS",
      actor: "Sarah Mitchell",
      actorTier: "founder",
      target: "benefits_dashboard",
      targetType: "system",
      details: "Founder accessed benefits dashboard",
      timestamp: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "log-004",
      action: "BENEFIT_DENIED",
      actor: "System",
      actorTier: "operator",
      target: "ben-006",
      targetType: "benefit",
      details: "Individual Flex Plan denied - eligibility requirements not met",
      timestamp: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "log-005",
      action: "REPORT_GENERATED",
      actor: "David Park",
      actorTier: "partner",
      target: "monthly_report",
      targetType: "system",
      details: "Partner generated Q4 benefits summary report",
      timestamp: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "log-006",
      action: "TIER_EXPIRED",
      actor: "System",
      actorTier: "operator",
      target: "Michael Torres",
      targetType: "tier",
      details: "Founder tier access expired - renewal required",
      timestamp: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];
}

// Initialize demo data
seedDemoData();

// ============================================================
// Benefits CRUD Operations
// ============================================================

export function getBenefits(): Benefit[] {
  return [...benefits].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getBenefitById(id: string): Benefit | undefined {
  return benefits.find((b) => b.id === id);
}

export function getBenefitsByStatus(status: BenefitStatus): Benefit[] {
  return benefits.filter((b) => b.status === status);
}

export function getBenefitsByCategory(category: BenefitCategory): Benefit[] {
  return benefits.filter((b) => b.category === category);
}

export function createBenefit(benefit: Omit<Benefit, "id" | "createdAt">): Benefit {
  const newBenefit: Benefit = {
    ...benefit,
    id: `ben-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
  };
  benefits.push(newBenefit);
  
  addAuditLog({
    action: "BENEFIT_CREATED",
    actor: "System",
    actorTier: "operator",
    target: newBenefit.id,
    targetType: "benefit",
    details: `Created benefit: ${newBenefit.name}`,
  });
  
  return newBenefit;
}

export function updateBenefit(id: string, updates: Partial<Benefit>): Benefit | null {
  const index = benefits.findIndex((b) => b.id === id);
  if (index === -1) return null;

  benefits[index] = {
    ...benefits[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  
  addAuditLog({
    action: "BENEFIT_UPDATED",
    actor: "System",
    actorTier: "operator",
    target: id,
    targetType: "benefit",
    details: `Updated benefit: ${benefits[index].name}`,
  });
  
  return benefits[index];
}

// ============================================================
// Tier Access Operations
// ============================================================

export function getTierAccess(): TierAccess[] {
  return [...tierAccess].sort(
    (a, b) => new Date(b.grantedAt).getTime() - new Date(a.grantedAt).getTime()
  );
}

export function getTierAccessById(id: string): TierAccess | undefined {
  return tierAccess.find((t) => t.id === id);
}

export function getTierAccessByTier(tier: AccessTier): TierAccess[] {
  return tierAccess.filter((t) => t.tier === tier);
}

export function grantTierAccess(
  access: Omit<TierAccess, "id" | "grantedAt" | "accessCount">
): TierAccess {
  const newAccess: TierAccess = {
    ...access,
    id: `tier-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    grantedAt: new Date().toISOString(),
    accessCount: 0,
  };
  tierAccess.push(newAccess);
  
  addAuditLog({
    action: "TIER_GRANT",
    actor: access.grantedBy,
    actorTier: "operator",
    target: access.userName,
    targetType: "tier",
    details: `Granted ${access.tier} tier access`,
  });
  
  return newAccess;
}

export function updateTierAccess(
  id: string,
  updates: Partial<TierAccess>
): TierAccess | null {
  const index = tierAccess.findIndex((t) => t.id === id);
  if (index === -1) return null;

  tierAccess[index] = {
    ...tierAccess[index],
    ...updates,
  };
  return tierAccess[index];
}

export function revokeTierAccess(id: string, revokedBy: string): boolean {
  const access = getTierAccessById(id);
  if (!access) return false;
  
  updateTierAccess(id, { status: "suspended" });
  
  addAuditLog({
    action: "TIER_REVOKED",
    actor: revokedBy,
    actorTier: "operator",
    target: access.userName,
    targetType: "tier",
    details: `Revoked ${access.tier} tier access`,
  });
  
  return true;
}

// ============================================================
// Audit Log Operations
// ============================================================

export function getAuditLogs(): AuditLogEntry[] {
  return [...auditLogs].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export function getAuditLogsByActor(actor: string): AuditLogEntry[] {
  return auditLogs.filter((l) => l.actor === actor);
}

export function addAuditLog(
  log: Omit<AuditLogEntry, "id" | "timestamp">
): AuditLogEntry {
  const newLog: AuditLogEntry = {
    ...log,
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
  };
  auditLogs.push(newLog);
  return newLog;
}

// ============================================================
// Stats & Analytics
// ============================================================

export function getBenefitsStats(): BenefitsStats {
  const byCategory: Record<BenefitCategory, number> = {
    aca: 0,
    medicare: 0,
    employer: 0,
    individual: 0,
    family: 0,
    private: 0,
  };

  const byStatus: Record<BenefitStatus, number> = {
    eligible: 0,
    enrolled: 0,
    pending: 0,
    denied: 0,
    expired: 0,
    cancelled: 0,
  };

  let totalPremium = 0;
  let premiumCount = 0;

  benefits.forEach((b) => {
    byCategory[b.category]++;
    byStatus[b.status]++;
    if (b.premium && b.status === "enrolled") {
      totalPremium += b.premium;
      premiumCount++;
    }
  });

  return {
    totalBenefits: benefits.length,
    enrolled: byStatus.enrolled,
    pending: byStatus.pending,
    denied: byStatus.denied,
    byCategory,
    byStatus,
    totalPremium,
    averagePremium: premiumCount > 0 ? Math.round(totalPremium / premiumCount) : 0,
  };
}

export function getTierStats(): TierStats {
  const activeUsers = tierAccess.filter((t) => t.status === "active").length;
  const pendingApprovals = tierAccess.filter((t) => t.status === "pending").length;

  return {
    totalUsers: tierAccess.length,
    operators: tierAccess.filter((t) => t.tier === "operator").length,
    founders: tierAccess.filter((t) => t.tier === "founder").length,
    partners: tierAccess.filter((t) => t.tier === "partner").length,
    activeUsers,
    pendingApprovals,
  };
}

export function getAccessStats(): AccessStats {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayLogs = auditLogs.filter(
    (l) => new Date(l.timestamp).getTime() >= today.getTime()
  ).length;

  const actorCounts = new Map<string, number>();
  const actionCounts = new Map<string, number>();

  auditLogs.forEach((l) => {
    actorCounts.set(l.actor, (actorCounts.get(l.actor) || 0) + 1);
    actionCounts.set(l.action, (actionCounts.get(l.action) || 0) + 1);
  });

  const topActions = Array.from(actionCounts.entries())
    .map(([action, count]) => ({ action, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalLogs: auditLogs.length,
    todayLogs,
    uniqueActors: actorCounts.size,
    topActions,
  };
}

export function getDashboardData(): BenefitsDashboardData {
  const benefitsStats = getBenefitsStats();
  const tierStats = getTierStats();
  const accessStats = getAccessStats();
  const recentActivity = getAuditLogs().slice(0, 10);

  // Determine posture based on stats
  let posture: "nominal" | "degraded" | "critical" = "nominal";
  if (benefitsStats.denied > benefitsStats.enrolled * 0.3) {
    posture = "degraded";
  }
  if (tierStats.pendingApprovals > 5) {
    posture = "degraded";
  }

  return {
    benefits: benefitsStats,
    tiers: tierStats,
    access: accessStats,
    recentActivity,
    posture,
    lastSync: new Date().toISOString(),
  };
}

// ============================================================
// Demo Data Reset
// ============================================================

export function resetDemoData(): void {
  seedDemoData();
}
