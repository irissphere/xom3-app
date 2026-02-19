// Enterprise Data Transformation Engine - Validation Engine

import { ValidationRule, FieldDefinition } from "./types";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate a value against validation rules
 */
export function validateValue(
  value: any,
  rules: ValidationRule[],
  fieldName?: string
): ValidationResult {
  const errors: string[] = [];

  for (const rule of rules) {
    const result = validateRule(value, rule, fieldName);
    if (!result.valid) {
      errors.push(...result.errors);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate a single rule
 */
function validateRule(
  value: any,
  rule: ValidationRule,
  fieldName?: string
): ValidationResult {
  const errors: string[] = [];
  const field = fieldName || "field";

  switch (rule.type) {
    case "required":
      if (value === null || value === undefined || value === "") {
        errors.push(rule.message || `${field} is required`);
      }
      break;

    case "format":
      if (value === null || value === undefined || value === "") {
        break; // Empty values handled by required rule
      }
      
      if (rule.value === "email") {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(String(value))) {
          errors.push(rule.message || `${field} must be a valid email address`);
        }
      } else if (rule.value === "phone") {
        const phoneRegex = /^\+?[1-9]\d{1,14}$/;
        const cleaned = String(value).replace(/\D/g, "");
        if (cleaned.length < 10) {
          errors.push(rule.message || `${field} must be a valid phone number`);
        }
      } else if (rule.value === "url") {
        try {
          new URL(String(value));
        } catch {
          errors.push(rule.message || `${field} must be a valid URL`);
        }
      } else if (rule.value === "date") {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          errors.push(rule.message || `${field} must be a valid date`);
        }
      }
      break;

    case "pattern":
      if (value === null || value === undefined || value === "") {
        break;
      }
      const regex = new RegExp(rule.value);
      if (!regex.test(String(value))) {
        errors.push(rule.message || `${field} does not match required pattern`);
      }
      break;

    case "range":
      if (value === null || value === undefined || value === "") {
        break;
      }
      const num = Number(value);
      if (isNaN(num)) {
        errors.push(rule.message || `${field} must be a number`);
        break;
      }
      if (rule.value?.min !== undefined && num < rule.value.min) {
        errors.push(rule.message || `${field} must be at least ${rule.value.min}`);
      }
      if (rule.value?.max !== undefined && num > rule.value.max) {
        errors.push(rule.message || `${field} must be at most ${rule.value.max}`);
      }
      break;

    case "custom":
      // Custom validators would be registered and called here
      // For now, we'll skip custom validation
      break;
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate a record against a schema definition
 */
export function validateRecord(
  record: Record<string, any>,
  schema: FieldDefinition[]
): ValidationResult {
  const errors: string[] = [];

  for (const field of schema) {
    const value = record[field.name];
    
    // Check required fields
    if (field.required && (value === null || value === undefined || value === "")) {
      errors.push(`${field.name} is required`);
      continue;
    }

    // Skip validation if field is empty and not required
    if (value === null || value === undefined || value === "") {
      continue;
    }

    // Type validation
    const typeError = validateType(value, field.type, field.name);
    if (typeError) {
      errors.push(typeError);
      continue;
    }

    // Custom validation rules
    if (field.validation && field.validation.length > 0) {
      const result = validateValue(value, field.validation, field.name);
      if (!result.valid) {
        errors.push(...result.errors);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate value type
 */
function validateType(value: any, type: string, fieldName: string): string | null {
  switch (type) {
    case "string":
      if (typeof value !== "string") {
        return `${fieldName} must be a string`;
      }
      break;

    case "number":
      if (typeof value !== "number" && isNaN(Number(value))) {
        return `${fieldName} must be a number`;
      }
      break;

    case "boolean":
      if (typeof value !== "boolean" && value !== "true" && value !== "false" && value !== 1 && value !== 0) {
        return `${fieldName} must be a boolean`;
      }
      break;

    case "date":
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        return `${fieldName} must be a valid date`;
      }
      break;

    case "email":
      if (typeof value !== "string") {
        return `${fieldName} must be a string`;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return `${fieldName} must be a valid email address`;
      }
      break;

    case "phone":
      if (typeof value !== "string") {
        return `${fieldName} must be a string`;
      }
      const cleaned = value.replace(/\D/g, "");
      if (cleaned.length < 10) {
        return `${fieldName} must be a valid phone number`;
      }
      break;

    case "url":
      if (typeof value !== "string") {
        return `${fieldName} must be a string`;
      }
      try {
        new URL(value);
      } catch {
        return `${fieldName} must be a valid URL`;
      }
      break;

    case "array":
      if (!Array.isArray(value)) {
        return `${fieldName} must be an array`;
      }
      break;

    case "object":
      if (typeof value !== "object" || Array.isArray(value) || value === null) {
        return `${fieldName} must be an object`;
      }
      break;
  }

  return null;
}
