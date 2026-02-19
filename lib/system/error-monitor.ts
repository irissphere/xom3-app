// Error & Exception Monitor - Self-Healing Layer
// Tracks all system failures for awareness and self-healing

export type ErrorSeverity = "critical" | "warning" | "info" | "debug";

export type ErrorSubsystem = 
  | "api"
  | "database"
  | "workflow"
  | "automation"
  | "webhook"
  | "integration"
  | "auth"
  | "notification"
  | "compliance"
  | "transformation";

export interface SystemError {
  id: string;
  timestamp: string;
  severity: ErrorSeverity;
  subsystem: ErrorSubsystem;
  message: string;
  errorType: string;
  stack?: string;
  payload?: Record<string, any>;
  context?: {
    userId?: string;
    clientId?: string;
    agentId?: string;
    workflowId?: string;
    requestId?: string;
    [key: string]: any;
  };
  resolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
  resolution?: string;
}

/**
 * Log a system error
 */
export function logError(
  severity: ErrorSeverity,
  subsystem: ErrorSubsystem,
  message: string,
  error: Error | unknown,
  context?: SystemError["context"]
): SystemError {
  const errorObj = error instanceof Error ? error : new Error(String(error));
  
  const systemError: SystemError = {
    id: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    severity,
    subsystem,
    message,
    errorType: errorObj.name || "UnknownError",
    stack: errorObj.stack,
    payload: errorObj instanceof Error ? { message: errorObj.message } : { error: String(error) },
    context,
    resolved: false,
  };

  // Store error (would use database in production)
  storeError(systemError);

  // Emit to monitoring systems
  emitErrorSignal(systemError);

  return systemError;
}

/**
 * Store error in persistent storage
 */
function storeError(error: SystemError): void {
  try {
    // In-memory store (would use database in production)
    const errors = getStoredErrors();
    errors.push(error);
    
    // Keep only last 1000 errors
    if (errors.length > 1000) {
      errors.shift();
    }
    
    // Store in localStorage for persistence (client-side)
    if (typeof window !== "undefined") {
      localStorage.setItem("system_errors", JSON.stringify(errors));
    }
  } catch (err) {
    console.error("[Error Monitor] Failed to store error:", err);
  }
}

/**
 * Get stored errors
 */
export function getStoredErrors(): SystemError[] {
  try {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("system_errors");
      if (stored) {
        return JSON.parse(stored);
      }
    }
  } catch (err) {
    console.error("[Error Monitor] Failed to retrieve errors:", err);
  }
  return [];
}

/**
 * Get errors with filters
 */
export function getErrors(filters?: {
  severity?: ErrorSeverity;
  subsystem?: ErrorSubsystem;
  resolved?: boolean;
  startDate?: string;
  endDate?: string;
}): SystemError[] {
  let errors = getStoredErrors();

  if (filters) {
    if (filters.severity) {
      errors = errors.filter(e => e.severity === filters.severity);
    }
    if (filters.subsystem) {
      errors = errors.filter(e => e.subsystem === filters.subsystem);
    }
    if (filters.resolved !== undefined) {
      errors = errors.filter(e => e.resolved === filters.resolved);
    }
    if (filters.startDate) {
      errors = errors.filter(e => e.timestamp >= filters.startDate!);
    }
    if (filters.endDate) {
      errors = errors.filter(e => e.timestamp <= filters.endDate!);
    }
  }

  // Sort by timestamp (newest first)
  return errors.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

/**
 * Resolve an error
 */
export function resolveError(
  errorId: string,
  resolvedBy: string,
  resolution?: string
): SystemError | null {
  const errors = getStoredErrors();
  const error = errors.find(e => e.id === errorId);
  
  if (!error) {
    return null;
  }

  error.resolved = true;
  error.resolvedAt = new Date().toISOString();
  error.resolvedBy = resolvedBy;
  error.resolution = resolution;

  // Update storage
  if (typeof window !== "undefined") {
    localStorage.setItem("system_errors", JSON.stringify(errors));
  }

  return error;
}

/**
 * Get error statistics
 */
export function getErrorStats(): {
  total: number;
  bySeverity: Record<ErrorSeverity, number>;
  bySubsystem: Record<ErrorSubsystem, number>;
  unresolved: number;
  critical: number;
  last24Hours: number;
} {
  const errors = getStoredErrors();
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const stats = {
    total: errors.length,
    bySeverity: {
      critical: 0,
      warning: 0,
      info: 0,
      debug: 0,
    } as Record<ErrorSeverity, number>,
    bySubsystem: {} as Record<ErrorSubsystem, number>,
    unresolved: 0,
    critical: 0,
    last24Hours: 0,
  };

  for (const error of errors) {
    stats.bySeverity[error.severity]++;
    stats.bySubsystem[error.subsystem] = (stats.bySubsystem[error.subsystem] || 0) + 1;
    
    if (!error.resolved) {
      stats.unresolved++;
    }
    
    if (error.severity === "critical") {
      stats.critical++;
    }
    
    if (new Date(error.timestamp) >= yesterday) {
      stats.last24Hours++;
    }
  }

  return stats;
}

/**
 * Emit error signal to monitoring systems
 */
function emitErrorSignal(error: SystemError): void {
  // Emit to UOI if available
  try {
    if (typeof window !== "undefined") {
      // Client-side: could emit to UOI heartbeat
      window.dispatchEvent(new CustomEvent("system-error", { detail: error }));
    }
  } catch (err) {
    // Silently fail if UOI not available
  }

  // Log to console based on severity
  const logMethod = error.severity === "critical" ? console.error :
                    error.severity === "warning" ? console.warn :
                    console.info;
  
  logMethod(`[${error.subsystem}] ${error.message}`, error);
}
