// HPE Phase II - Strike 2: Compliance Ledger Service
// Query service for Compliance Ledger UI (foundation for Strike 5)

import { queryComplianceEvents, getComplianceStatistics, ComplianceQueryFilters } from "./compliance-memory-engine";

/**
 * Get compliance ledger entries with filtering
 */
export async function getComplianceLedger(filters: ComplianceQueryFilters = {}) {
  return queryComplianceEvents(filters);
}

/**
 * Get compliance ledger statistics
 */
export async function getComplianceLedgerStats(filters: Omit<ComplianceQueryFilters, "limit" | "offset"> = {}) {
  return getComplianceStatistics(filters);
}

/**
 * Get compliance ledger for a specific client
 */
export async function getClientComplianceLedger(clientId: string, limit: number = 100) {
  return queryComplianceEvents({
    clientId,
    limit
  });
}

/**
 * Get compliance ledger for a specific agent
 */
export async function getAgentComplianceLedger(agentId: string, limit: number = 100) {
  return queryComplianceEvents({
    agentId,
    limit
  });
}

/**
 * Get compliance ledger for a specific stage
 */
export async function getStageComplianceLedger(stage: string, limit: number = 100) {
  return queryComplianceEvents({
    stage,
    limit
  });
}

/**
 * Get compliance ledger by category
 */
export async function getCategoryComplianceLedger(
  category: "pipeline" | "task" | "document" | "billing" | "interaction" | "system" | "automation" | "error",
  limit: number = 100
) {
  return queryComplianceEvents({
    category,
    limit
  });
}

/**
 * Get compliance ledger for date range
 */
export async function getDateRangeComplianceLedger(
  startDate: string,
  endDate: string,
  limit: number = 100
) {
  return queryComplianceEvents({
    startDate,
    endDate,
    limit
  });
}
