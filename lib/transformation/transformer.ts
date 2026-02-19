// Enterprise Data Transformation Engine - Core Transformation Engine

import { 
  SchemaMapping, 
  FieldMapping, 
  TransformationProfile,
  TransformationRule,
  TransformationResult,
  TransformationError
} from "./types";
import { getTransformation } from "./registry";
import { cleanRecord } from "./cleaner";
import { validateRecord } from "./validator";

/**
 * Transform a single record using a schema mapping and transformation profile
 */
export function transformRecord(
  sourceRecord: Record<string, any>,
  mapping: SchemaMapping,
  profile: TransformationProfile,
  recordIndex: number = 0
): { record: Record<string, any>; errors: TransformationError[] } {
  const errors: TransformationError[] = [];
  const targetRecord: Record<string, any> = {};

  // Step 1: Clean the source record
  let cleanedRecord = cleanRecord(sourceRecord, profile.cleaningRules);

  // Step 2: Map fields from source to target
  for (const fieldMapping of mapping.fieldMappings) {
    try {
      let value = cleanedRecord[fieldMapping.sourceField];

      // Apply transformation if specified
      if (fieldMapping.transformation) {
        const transform = getTransformation(fieldMapping.transformation);
        if (transform) {
          value = transform.execute(value);
        }
      }

      // Apply transformation rules from profile
      const profileRules = profile.transformationRules.filter(
        r => r.field === fieldMapping.targetField
      );
      
      for (const rule of profileRules) {
        const transform = getTransformation(rule.operation);
        if (transform) {
          value = transform.execute(value, rule.params);
        }
      }

      // Use default value if empty
      if ((value === null || value === undefined || value === "") && fieldMapping.defaultValue !== undefined) {
        value = fieldMapping.defaultValue;
      }

      // Check required fields
      if (fieldMapping.required && (value === null || value === undefined || value === "")) {
        errors.push({
          recordIndex,
          field: fieldMapping.targetField,
          message: `${fieldMapping.targetField} is required but source field ${fieldMapping.sourceField} is empty`,
          value: null
        });
        continue;
      }

      targetRecord[fieldMapping.targetField] = value;
    } catch (error: any) {
      errors.push({
        recordIndex,
        field: fieldMapping.targetField,
        message: `Transformation error: ${error.message}`,
        value: cleanedRecord[fieldMapping.sourceField]
      });
    }
  }

  // Step 3: Validate the transformed record
  const validation = validateRecord(targetRecord, mapping.targetSchema.fields);
  if (!validation.valid) {
    validation.errors.forEach(error => {
      errors.push({
        recordIndex,
        message: error
      });
    });
  }

  return {
    record: targetRecord,
    errors
  };
}

/**
 * Transform multiple records in batch
 */
export function transformBatch(
  sourceRecords: Record<string, any>[],
  mapping: SchemaMapping,
  profile: TransformationProfile
): TransformationResult {
  const startTime = Date.now();
  const errors: TransformationError[] = [];
  const warnings: string[] = [];
  let recordsTransformed = 0;
  let recordsFailed = 0;

  const transformedRecords: Record<string, any>[] = [];

  for (let i = 0; i < sourceRecords.length; i++) {
    const result = transformRecord(sourceRecords[i], mapping, profile, i);
    
    if (result.errors.length === 0) {
      transformedRecords.push(result.record);
      recordsTransformed++;
    } else {
      recordsFailed++;
      for (const error of result.errors) errors.push(error);
    }
  }

  const executionTime = Date.now() - startTime;

  return {
    success: recordsFailed === 0,
    recordsProcessed: sourceRecords.length,
    recordsTransformed,
    recordsFailed,
    errors,
    warnings,
    executionTime
  };
}

/**
 * Map fields from source to target schema (without transformation)
 */
export function mapFields(
  sourceRecord: Record<string, any>,
  fieldMappings: FieldMapping[]
): Record<string, any> {
  const targetRecord: Record<string, any> = {};

  for (const mapping of fieldMappings) {
    let value = sourceRecord[mapping.sourceField];

    if (value === undefined || value === null) {
      if (mapping.defaultValue !== undefined) {
        value = mapping.defaultValue;
      } else {
        continue; // Skip if no value and no default
      }
    }

    targetRecord[mapping.targetField] = value;
  }

  return targetRecord;
}
