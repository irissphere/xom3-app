// HPE Phase II - Strike 3: Billing Query Service
// Query service for Billing Dashboard (foundation for Strike 5)

import Airtable from "airtable";
import { normalizeBillingRecord, linkBillingToPipeline, NormalizedBillingRecord } from "./billing-sync-engine";

/**
 * Get Airtable base instance
 */
function getAirtableBase() {
  if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_USHA_BASE_ID) {
    throw new Error("Airtable configuration missing");
  }
  return new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
    .base(process.env.AIRTABLE_USHA_BASE_ID);
}

/**
 * Get billing records for a client
 */
export async function getClientBillingRecords(
  clientId: string,
  options: {
    includeLinked?: boolean;
    limit?: number;
  } = {}
): Promise<NormalizedBillingRecord[]> {
  const { includeLinked = true, limit = 100 } = options;
  
  try {
    const base = getAirtableBase();
    const records = await base("Billing")
      .select({
        filterByFormula: `{Client} = '${clientId}'`,
        sort: [{ field: "Due Date", direction: "desc" }],
        maxRecords: limit
      })
      .all();
    
    const normalized = records.map(r => normalizeBillingRecord(r));
    
    if (includeLinked) {
      return Promise.all(normalized.map(r => linkBillingToPipeline(r)));
    }
    
    return normalized;
  } catch (error: any) {
    console.error("[Billing Query] Failed to get client billing:", error);
    return [];
  }
}

/**
 * Get billing records for an agent
 */
export async function getAgentBillingRecords(
  agentId: string,
  options: {
    includeLinked?: boolean;
    limit?: number;
  } = {}
): Promise<NormalizedBillingRecord[]> {
  const { includeLinked = true, limit = 100 } = options;
  
  try {
    // First, get all clients for this agent
    const base = getAirtableBase();
    const clients = await base("Clients")
      .select({
        filterByFormula: `OR({Agent} = '${agentId}', {Assigned To} = '${agentId}')`,
        maxRecords: 1000
      })
      .all();
    
    const clientIds = clients.map(c => c.id);
    if (clientIds.length === 0) return [];
    
    // Get billing records for these clients
    const formula = `OR(${clientIds.map(id => `{Client} = '${id}'`).join(", ")})`;
    const records = await base("Billing")
      .select({
        filterByFormula: formula,
        sort: [{ field: "Due Date", direction: "desc" }],
        maxRecords: limit
      })
      .all();
    
    const normalized = records.map(r => normalizeBillingRecord(r));
    
    if (includeLinked) {
      return Promise.all(normalized.map(r => linkBillingToPipeline(r)));
    }
    
    return normalized;
  } catch (error: any) {
    console.error("[Billing Query] Failed to get agent billing:", error);
    return [];
  }
}

/**
 * Get billing records for a stage
 */
export async function getStageBillingRecords(
  stage: string,
  options: {
    includeLinked?: boolean;
    limit?: number;
  } = {}
): Promise<NormalizedBillingRecord[]> {
  const { includeLinked = true, limit = 100 } = options;
  
  try {
    // First, get all clients in this stage
    const base = getAirtableBase();
    const clients = await base("Clients")
      .select({
        filterByFormula: `{Status} = '${stage}'`,
        maxRecords: 1000
      })
      .all();
    
    const clientIds = clients.map(c => c.id);
    if (clientIds.length === 0) return [];
    
    // Get billing records for these clients
    const formula = `OR(${clientIds.map(id => `{Client} = '${id}'`).join(", ")})`;
    const records = await base("Billing")
      .select({
        filterByFormula: formula,
        sort: [{ field: "Due Date", direction: "desc" }],
        maxRecords: limit
      })
      .all();
    
    const normalized = records.map(r => normalizeBillingRecord(r));
    
    if (includeLinked) {
      return Promise.all(normalized.map(r => linkBillingToPipeline(r)));
    }
    
    return normalized;
  } catch (error: any) {
    console.error("[Billing Query] Failed to get stage billing:", error);
    return [];
  }
}

/**
 * Get billing statistics
 */
export async function getBillingStatistics(
  filters: {
    clientId?: string;
    agentId?: string;
    stage?: string;
    startDate?: string;
    endDate?: string;
  } = {}
): Promise<{
  totalRecords: number;
  totalRevenue: number;
  totalCommissions: number;
  totalPremiums: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  byCarrier: Record<string, number>;
  overdueCount: number;
  overdueAmount: number;
  upcomingRenewals: number;
}> {
  try {
    const base = getAirtableBase();
    
    // Build filter formula
    const conditions: string[] = [];
    if (filters.clientId) {
      conditions.push(`{Client} = '${filters.clientId}'`);
    }
    if (filters.startDate) {
      conditions.push(`IS_AFTER({Due Date}, "${filters.startDate}")`);
    }
    if (filters.endDate) {
      conditions.push(`IS_BEFORE({Due Date}, "${filters.endDate}")`);
    }
    
    const records = await base("Billing")
      .select({
        view: "Grid view",
        ...(conditions.length > 0 ? { filterByFormula: `AND(${conditions.join(", ")})` } : {}),
      })
      .all();
    
    const stats = {
      totalRecords: records.length,
      totalRevenue: 0,
      totalCommissions: 0,
      totalPremiums: 0,
      byStatus: {} as Record<string, number>,
      byType: {} as Record<string, number>,
      byCarrier: {} as Record<string, number>,
      overdueCount: 0,
      overdueAmount: 0,
      upcomingRenewals: 0
    };
    
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    records.forEach(record => {
      const normalized = normalizeBillingRecord(record);
      
      // Sum amounts
      stats.totalRevenue += normalized.totalAmount;
      if (normalized.commissionAmount) {
        stats.totalCommissions += normalized.commissionAmount;
      }
      if (normalized.premiumAmount) {
        stats.totalPremiums += normalized.premiumAmount;
      }
      
      // Count by status
      stats.byStatus[normalized.billingStatus] = (stats.byStatus[normalized.billingStatus] || 0) + 1;
      
      // Count by type
      stats.byType[normalized.billingType] = (stats.byType[normalized.billingType] || 0) + 1;
      
      // Count by carrier
      if (normalized.carrier) {
        stats.byCarrier[normalized.carrier] = (stats.byCarrier[normalized.carrier] || 0) + 1;
      }
      
      // Overdue detection
      const dueDate = new Date(normalized.dueDate);
      if (dueDate < now && normalized.billingStatus !== "Paid" && normalized.billingStatus !== "Cancelled") {
        stats.overdueCount++;
        stats.overdueAmount += normalized.totalAmount;
      }
      
      // Upcoming renewals
      if (normalized.renewalDate) {
        const renewalDate = new Date(normalized.renewalDate);
        if (renewalDate > now && renewalDate <= thirtyDaysFromNow) {
          stats.upcomingRenewals++;
        }
      }
    });
    
    return stats;
  } catch (error: any) {
    console.error("[Billing Query] Failed to get statistics:", error);
    return {
      totalRecords: 0,
      totalRevenue: 0,
      totalCommissions: 0,
      totalPremiums: 0,
      byStatus: {},
      byType: {},
      byCarrier: {},
      overdueCount: 0,
      overdueAmount: 0,
      upcomingRenewals: 0
    };
  }
}

/**
 * Get revenue chart data
 */
export async function getRevenueChartData(
  filters: {
    startDate: string;
    endDate: string;
    groupBy?: "day" | "week" | "month";
  }
): Promise<Array<{
  date: string;
  revenue: number;
  commissions: number;
  premiums: number;
}>> {
  try {
    const records = await getBillingStatistics({
      startDate: filters.startDate,
      endDate: filters.endDate
    });
    
    // This is a simplified version - in production, you'd group by date
    // For now, return aggregate data
    return [{
      date: filters.startDate,
      revenue: records.totalRevenue,
      commissions: records.totalCommissions,
      premiums: records.totalPremiums
    }];
  } catch (error: any) {
    console.error("[Billing Query] Failed to get chart data:", error);
    return [];
  }
}
