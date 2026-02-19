// Cockpit Error Surface Emitters
// Used by various subsystems to emit error surfaces

export type ErrorSeverity = "critical" | "elevated" | "info" | "resolved";
export type ErrorCategory = "automation" | "sync" | "billing" | "compliance" | "pipeline" | "system";

export interface ErrorSurface {
  id: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  title: string;
  description: string;
  subsystem: string;
  timestamp: string;
  resolvedAt?: string;
  metadata?: Record<string, any>;
  actionUrl?: string;
}

// In-memory error store (in production, use database)
const errorStore: ErrorSurface[] = [];
const MAX_ERRORS = 100;

function addError(error: Omit<ErrorSurface, "id" | "timestamp">) {
  const fullError: ErrorSurface = {
    ...error,
    id: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString()
  };
  
  // Remove existing error with same category/title if resolved
  const existingIndex = errorStore.findIndex(
    e => e.category === error.category && 
         e.title === error.title && 
         e.severity === "resolved"
  );
  if (existingIndex >= 0) {
    errorStore.splice(existingIndex, 1);
  }
  
  errorStore.unshift(fullError);
  if (errorStore.length > MAX_ERRORS) {
    errorStore.pop();
  }
  
  return fullError;
}

export function emitErrorSurface(
  category: ErrorCategory,
  severity: ErrorSeverity,
  title: string,
  description: string,
  subsystem: string,
  metadata?: Record<string, any>,
  actionUrl?: string
) {
  return addError({
    category,
    severity,
    title,
    description,
    subsystem,
    metadata,
    actionUrl
  });
}

// Export error store getter for route
export function getErrorSurfaces(severity?: ErrorSeverity, category?: ErrorCategory, includeResolved: boolean = false) {
  let errors = [...errorStore];

  // Filter by severity
  if (severity) {
    errors = errors.filter(e => e.severity === severity);
  }

  // Filter by category
  if (category) {
    errors = errors.filter(e => e.category === category);
  }

  // Filter resolved
  if (!includeResolved) {
    errors = errors.filter(e => e.severity !== "resolved");
  }

  // Sort by severity (critical first) then timestamp
  errors.sort((a, b) => {
    const severityOrder = { critical: 0, elevated: 1, info: 2, resolved: 3 };
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (severityDiff !== 0) return severityDiff;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  return {
    errors,
    total: errorStore.length,
    critical: errors.filter(e => e.severity === "critical").length,
    elevated: errors.filter(e => e.severity === "elevated").length
  };
}

// Export resolver function
export function resolveError(id: string) {
  const errorIndex = errorStore.findIndex(e => e.id === id);
  if (errorIndex >= 0) {
    errorStore[errorIndex] = {
      ...errorStore[errorIndex],
      severity: "resolved",
      resolvedAt: new Date().toISOString()
    };
    return true;
  }
  return false;
}
