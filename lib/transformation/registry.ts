// Enterprise Data Transformation Engine - Transformation Function Registry

import { TransformationFunction } from "./types";

/**
 * Core transformation functions available to all transformation profiles
 */
export const transformationRegistry: Record<string, TransformationFunction> = {
  // String transformations
  trim: {
    name: "trim",
    description: "Remove leading and trailing whitespace",
    execute: (value: any) => {
      if (typeof value !== "string") return value;
      return value.trim();
    }
  },

  lowercase: {
    name: "lowercase",
    description: "Convert string to lowercase",
    execute: (value: any) => {
      if (typeof value !== "string") return value;
      return value.toLowerCase();
    }
  },

  uppercase: {
    name: "uppercase",
    description: "Convert string to uppercase",
    execute: (value: any) => {
      if (typeof value !== "string") return value;
      return value.toUpperCase();
    }
  },

  capitalize: {
    name: "capitalize",
    description: "Capitalize first letter of each word",
    execute: (value: any) => {
      if (typeof value !== "string") return value;
      return value.split(" ").map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(" ");
    }
  },

  // Phone number normalization
  normalizePhone: {
    name: "normalizePhone",
    description: "Normalize phone number to E.164 format",
    execute: (value: any) => {
      if (!value) return value;
      const cleaned = String(value).replace(/\D/g, "");
      if (cleaned.length === 10) {
        return `+1${cleaned}`;
      } else if (cleaned.length === 11 && cleaned.startsWith("1")) {
        return `+${cleaned}`;
      } else if (cleaned.startsWith("+")) {
        return cleaned;
      }
      return value; // Return original if can't normalize
    }
  },

  // Email normalization
  normalizeEmail: {
    name: "normalizeEmail",
    description: "Normalize email to lowercase and trim",
    execute: (value: any) => {
      if (typeof value !== "string") return value;
      return value.trim().toLowerCase();
    }
  },

  // Date transformations
  parseDate: {
    name: "parseDate",
    description: "Parse date string to ISO format",
    execute: (value: any, params?: { format?: string }) => {
      if (!value) return value;
      try {
        const date = new Date(value);
        if (isNaN(date.getTime())) return value;
        return date.toISOString().split("T")[0]; // YYYY-MM-DD
      } catch {
        return value;
      }
    }
  },

  formatDate: {
    name: "formatDate",
    description: "Format date to specified format",
    execute: (value: any, params?: { format: string }) => {
      if (!value) return value;
      try {
        const date = new Date(value);
        if (isNaN(date.getTime())) return value;
        const format = params?.format || "YYYY-MM-DD";
        
        if (format === "YYYY-MM-DD") {
          return date.toISOString().split("T")[0];
        } else if (format === "MM/DD/YYYY") {
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const day = String(date.getDate()).padStart(2, "0");
          const year = date.getFullYear();
          return `${month}/${day}/${year}`;
        }
        return value;
      } catch {
        return value;
      }
    }
  },

  // Number transformations
  parseNumber: {
    name: "parseNumber",
    description: "Parse string to number",
    execute: (value: any) => {
      if (typeof value === "number") return value;
      if (typeof value === "string") {
        const cleaned = value.replace(/[^0-9.-]/g, "");
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? value : parsed;
      }
      return value;
    }
  },

  round: {
    name: "round",
    description: "Round number to specified decimal places",
    execute: (value: any, params?: { decimals: number }) => {
      if (typeof value !== "number") return value;
      const decimals = params?.decimals ?? 2;
      return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
    }
  },

  // Array transformations
  join: {
    name: "join",
    description: "Join array elements with separator",
    execute: (value: any, params?: { separator: string }) => {
      if (!Array.isArray(value)) return value;
      const separator = params?.separator || ", ";
      return value.join(separator);
    }
  },

  split: {
    name: "split",
    description: "Split string into array",
    execute: (value: any, params?: { separator: string }) => {
      if (typeof value !== "string") return value;
      const separator = params?.separator || ",";
      return value.split(separator).map(s => s.trim()).filter(s => s.length > 0);
    }
  },

  // Conditional transformations
  ifThen: {
    name: "ifThen",
    description: "Apply transformation conditionally",
    execute: (value: any, params?: { condition: string; then: string; else?: string }) => {
      if (!params) return value;
      // Simple condition evaluation (can be extended)
      const condition = params.condition;
      const thenTransform = params.then;
      const elseTransform = params.else;
      
      // For now, simple truthy check
      const conditionMet = Boolean(value);
      
      if (conditionMet && thenTransform) {
        const transform = transformationRegistry[thenTransform];
        return transform ? transform.execute(value) : value;
      } else if (!conditionMet && elseTransform) {
        const transform = transformationRegistry[elseTransform];
        return transform ? transform.execute(value) : value;
      }
      return value;
    }
  },

  // Default value
  defaultValue: {
    name: "defaultValue",
    description: "Return default value if input is empty",
    execute: (value: any, params?: { default: any }) => {
      if (value === null || value === undefined || value === "") {
        return params?.default ?? null;
      }
      return value;
    }
  },

  // Remove special characters
  removeSpecialChars: {
    name: "removeSpecialChars",
    description: "Remove special characters, keep alphanumeric and spaces",
    execute: (value: any, params?: { keep?: string[] }) => {
      if (typeof value !== "string") return value;
      const keep = params?.keep || [];
      let pattern = "[^a-zA-Z0-9\\s";
      keep.forEach(char => {
        pattern += char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      });
      pattern += "]";
      return value.replace(new RegExp(pattern, "g"), "");
    }
  },

  // Extract substring
  substring: {
    name: "substring",
    description: "Extract substring",
    execute: (value: any, params?: { start: number; end?: number }) => {
      if (typeof value !== "string") return value;
      const start = params?.start ?? 0;
      const end = params?.end;
      return end !== undefined ? value.substring(start, end) : value.substring(start);
    }
  }
};

/**
 * Get transformation function by name
 */
export function getTransformation(name: string): TransformationFunction | undefined {
  return transformationRegistry[name];
}

/**
 * Register custom transformation function
 */
export function registerTransformation(transformation: TransformationFunction): void {
  transformationRegistry[transformation.name] = transformation;
}

/**
 * List all available transformations
 */
export function listTransformations(): TransformationFunction[] {
  return Object.values(transformationRegistry);
}
