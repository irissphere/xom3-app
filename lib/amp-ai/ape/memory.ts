// STRIKE 2: Evolution Memory
// Stores evolution signals and patterns for learning

import Airtable from "airtable";
import { EvolutionMemory, EvolutionSignal, ColumnMappingFrequency, ErrorPattern, TenantOverride, SchemaDrift } from "./types";

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY || "MISSING_AIRTABLE_API_KEY" })
  .base(process.env.AIRTABLE_USHA_BASE_ID || "");

/**
 * Store an evolution signal
 */
export async function storeEvolutionSignal(signal: EvolutionSignal): Promise<void> {
  try {
    // Store in AMP Evolution Signals table (create if doesn't exist)
    const signalsTable = base("AMP Evolution Signals");
    
    await signalsTable.create([{
      fields: {
        Type: signal.type,
        Timestamp: signal.timestamp,
        PipelineID: signal.pipelineId,
        Tenant: signal.tenant,
        ProfileKey: signal.profileKey,
        Column: signal.column || "",
        TargetField: signal.targetField || "",
        Success: signal.success,
        Metadata: JSON.stringify(signal.metadata)
      }
    }]);
  } catch (error) {
    // If table doesn't exist, log and continue (graceful degradation)
    console.warn("[APE] Evolution Signals table not found, skipping signal storage:", error);
  }
}

/**
 * Load evolution memory for a profile
 */
export async function loadEvolutionMemory(
  profileKey: string,
  tenant: string
): Promise<EvolutionMemory> {
  const memory: EvolutionMemory = {
    profileKey,
    tenant,
    columnMappings: {},
    errorPatterns: [],
    tenantOverrides: [],
    schemaDrifts: [],
    lastUpdated: new Date().toISOString()
  };

  try {
    // Load signals from AMP Evolution Signals table
    const signalsTable = base("AMP Evolution Signals");
    const records = await signalsTable.select({
      filterByFormula: `AND({ProfileKey} = "${profileKey}", {Tenant} = "${tenant}")`,
      maxRecords: 1000,
      sort: [{ field: "Timestamp", direction: "desc" }]
    }).all();

    // Process signals to build memory
    const columnMappingCounts: Record<string, Record<string, { success: number; total: number }>> = {};
    const errorCounts: Record<string, Record<string, number>> = {};

    records.forEach(record => {
      const type = record.get("Type") as string;
      const column = record.get("Column") as string;
      const targetField = record.get("TargetField") as string;
      const success = record.get("Success") as boolean;
      const timestamp = record.get("Timestamp") as string;

      // Track column mappings
      if (type === "success" && column && targetField) {
        if (!columnMappingCounts[column]) {
          columnMappingCounts[column] = {};
        }
        if (!columnMappingCounts[column][targetField]) {
          columnMappingCounts[column][targetField] = { success: 0, total: 0 };
        }
        columnMappingCounts[column][targetField].total++;
        if (success) {
          columnMappingCounts[column][targetField].success++;
        }
      }

      // Track errors
      if (type === "error" && column) {
        const metadata = JSON.parse((record.get("Metadata") as string) || "{}");
        const errorType = metadata.errorType || "unknown";
        const errorMsg = metadata.errorMessage || "";
        
        if (!errorCounts[column]) {
          errorCounts[column] = {};
        }
        const errorKey = `${errorType}:${errorMsg}`;
        errorCounts[column][errorKey] = (errorCounts[column][errorKey] || 0) + 1;
      }
    });

    // Build column mappings with frequencies
    for (const [column, mappings] of Object.entries(columnMappingCounts)) {
      for (const [targetField, counts] of Object.entries(mappings)) {
        const confidence = counts.total > 0 ? counts.success / counts.total : 0;
        
        if (!memory.columnMappings[column]) {
          memory.columnMappings[column] = {} as any;
        }
        
        (memory.columnMappings[column] as any)[targetField] = {
          column,
          targetField,
          successCount: counts.success,
          totalCount: counts.total,
          confidence,
          lastSeen: new Date().toISOString()
        };
      }
    }

    // Build error patterns
    for (const [column, errors] of Object.entries(errorCounts)) {
      for (const [errorKey, frequency] of Object.entries(errors)) {
        const [errorType, errorMessage] = errorKey.split(":", 2);
        memory.errorPatterns.push({
          column,
          errorType,
          errorMessage,
          frequency,
          lastSeen: new Date().toISOString()
        });
      }
    }

    // Load tenant overrides (from mapping save events)
    // This would be stored separately or inferred from signals
    // For now, we'll track them in signals with type="tenant_override"

    // Load schema drifts
    const driftRecords = records.filter(r => r.get("Type") === "drift");
    driftRecords.forEach(record => {
      const metadata = JSON.parse((record.get("Metadata") as string) || "{}");
      memory.schemaDrifts.push({
        profileKey,
        tenant,
        type: metadata.driftType || "new_column",
        column: record.get("Column") as string,
        oldValue: metadata.oldValue,
        newValue: metadata.newValue,
        detectedAt: record.get("Timestamp") as string
      });
    });

  } catch (error) {
    console.warn("[APE] Failed to load evolution memory:", error);
  }

  return memory;
}

/**
 * Update column mapping frequency
 */
export async function updateColumnMapping(
  profileKey: string,
  tenant: string,
  column: string,
  targetField: string,
  success: boolean
): Promise<void> {
  await storeEvolutionSignal({
    type: "success",
    timestamp: new Date().toISOString(),
    pipelineId: "",
    tenant,
    profileKey,
    column,
    targetField,
    success,
    metadata: {}
  });
}

/**
 * Record error pattern
 */
export async function recordErrorPattern(
  profileKey: string,
  tenant: string,
  column: string,
  errorType: string,
  errorMessage: string
): Promise<void> {
  await storeEvolutionSignal({
    type: "error",
    timestamp: new Date().toISOString(),
    pipelineId: "",
    tenant,
    profileKey,
    column,
    success: false,
    metadata: {
      errorType,
      errorMessage
    }
  });
}

/**
 * Record schema drift
 */
export async function recordSchemaDrift(
  profileKey: string,
  tenant: string,
  driftType: "new_column" | "missing_column" | "type_change",
  column: string,
  oldValue?: any,
  newValue?: any
): Promise<void> {
  await storeEvolutionSignal({
    type: "drift",
    timestamp: new Date().toISOString(),
    pipelineId: "",
    tenant,
    profileKey,
    column,
    success: true,
    metadata: {
      driftType,
      oldValue,
      newValue
    }
  });
}

/**
 * Record tenant override
 */
export async function recordTenantOverride(
  profileKey: string,
  tenant: string,
  column: string,
  originalMapping: string,
  overrideMapping: string
): Promise<void> {
  await storeEvolutionSignal({
    type: "tenant_override",
    timestamp: new Date().toISOString(),
    pipelineId: "",
    tenant,
    profileKey,
    column,
    targetField: overrideMapping,
    success: true,
    metadata: {
      originalMapping,
      overrideMapping
    }
  });
}
