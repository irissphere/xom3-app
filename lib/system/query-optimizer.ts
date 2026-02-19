// Query Optimizer - Task 46
// Analyze slow database queries and suggest indexes

export interface QueryExecution {
  id: string;
  query: string;
  table: string;
  filters?: Record<string, any>;
  sort?: Array<{ field: string; direction: "asc" | "desc" }>;
  executionTime: number; // milliseconds
  rowsReturned: number;
  timestamp: string;
  userId?: string;
}

export interface QueryAnalysis {
  queryId: string;
  query: string;
  table: string;
  averageExecutionTime: number;
  executionCount: number;
  slowQuery: boolean; // > 1000ms
  suggestedIndexes: IndexSuggestion[];
  optimizationSuggestions: string[];
}

export interface IndexSuggestion {
  fields: string[];
  reason: string;
  expectedImprovement: "high" | "medium" | "low";
  confidence: number; // 0-1
}

/**
 * Query Optimizer
 */
export class QueryOptimizer {
  private queryHistory: QueryExecution[] = [];
  private readonly SLOW_QUERY_THRESHOLD = 1000; // 1 second
  private readonly MAX_HISTORY = 10000;

  /**
   * Record query execution
   */
  recordQuery(execution: QueryExecution): void {
    this.queryHistory.push(execution);
    
    // Keep only recent history
    if (this.queryHistory.length > this.MAX_HISTORY) {
      this.queryHistory.shift();
    }
  }

  /**
   * Analyze queries for a table
   */
  analyzeTableQueries(table: string, timeWindowMinutes: number = 60): QueryAnalysis[] {
    const now = Date.now();
    const windowStart = now - timeWindowMinutes * 60 * 1000;

    const tableQueries = this.queryHistory.filter(
      q => q.table === table && new Date(q.timestamp).getTime() >= windowStart
    );

    // Group by query signature (simplified - would need better query fingerprinting)
    const queryGroups = new Map<string, QueryExecution[]>();
    
    for (const query of tableQueries) {
      const signature = this.getQuerySignature(query);
      if (!queryGroups.has(signature)) {
        queryGroups.set(signature, []);
      }
      queryGroups.get(signature)!.push(query);
    }

    const analyses: QueryAnalysis[] = [];

    for (const [signature, queries] of Array.from(queryGroups.entries())) {
      const avgTime = queries.reduce((sum, q) => sum + q.executionTime, 0) / queries.length;
      const isSlow = avgTime > this.SLOW_QUERY_THRESHOLD;

      // Analyze filters to suggest indexes
      const allFilters = queries
        .map(q => q.filters)
        .filter(f => f !== undefined) as Record<string, any>[];

      const suggestedIndexes = this.suggestIndexes(table, allFilters, queries[0].sort);
      const optimizationSuggestions = this.generateOptimizationSuggestions(queries[0], avgTime, queries.length);

      analyses.push({
        queryId: signature,
        query: queries[0].query || signature,
        table,
        averageExecutionTime: avgTime,
        executionCount: queries.length,
        slowQuery: isSlow,
        suggestedIndexes,
        optimizationSuggestions,
      });
    }

    return analyses.sort((a, b) => b.averageExecutionTime - a.averageExecutionTime);
  }

  /**
   * Get query signature (simplified fingerprint)
   */
  private getQuerySignature(query: QueryExecution): string {
    const filterKeys = query.filters ? Object.keys(query.filters).sort().join(",") : "";
    const sortKeys = query.sort ? query.sort.map(s => `${s.field}:${s.direction}`).join(",") : "";
    return `${query.table}:${filterKeys}:${sortKeys}`;
  }

  /**
   * Suggest indexes based on query patterns
   */
  private suggestIndexes(
    table: string,
    filters: Record<string, any>[],
    sort?: Array<{ field: string; direction: "asc" | "desc" }>
  ): IndexSuggestion[] {
    const suggestions: IndexSuggestion[] = [];

    // Count filter field frequency
    const filterFieldCounts: Record<string, number> = {};
    for (const filter of filters) {
      for (const field of Object.keys(filter)) {
        filterFieldCounts[field] = (filterFieldCounts[field] || 0) + 1;
      }
    }

    // Suggest index for frequently filtered fields
    for (const [field, count] of Object.entries(filterFieldCounts)) {
      if (count >= 10) {
        suggestions.push({
          fields: [field],
          reason: `Field "${field}" is used in ${count} queries`,
          expectedImprovement: count >= 50 ? "high" : "medium",
          confidence: Math.min(count / 100, 0.9),
        });
      }
    }

    // Suggest composite index for filter + sort combinations
    if (sort && sort.length > 0) {
      const sortField = sort[0].field;
      const topFilterField = Object.entries(filterFieldCounts)
        .sort(([, a], [, b]) => b - a)[0]?.[0];

      if (topFilterField && topFilterField !== sortField) {
        suggestions.push({
          fields: [topFilterField, sortField],
          reason: `Composite filter+sort pattern: filtering by "${topFilterField}" and sorting by "${sortField}"`,
          expectedImprovement: "high",
          confidence: 0.8,
        });
      }
    }

    return suggestions;
  }

  /**
   * Generate optimization suggestions
   */
  private generateOptimizationSuggestions(
    query: QueryExecution,
    avgTime: number,
    executionCount: number
  ): string[] {
    const suggestions: string[] = [];

    if (avgTime > 5000) {
      suggestions.push("Query is very slow (>5s). Consider adding indexes or reducing data scope.");
    } else if (avgTime > 1000) {
      suggestions.push("Query is slow (>1s). Consider optimizing filters or adding indexes.");
    }

    if (query.rowsReturned > 1000) {
      suggestions.push(`Query returns ${query.rowsReturned} rows. Consider pagination or limiting results.`);
    }

    if (query.filters && Object.keys(query.filters).length > 5) {
      suggestions.push("Query has many filters. Consider combining filters or using a different query strategy.");
    }

    if (executionCount > 100) {
      suggestions.push(`Query executed ${executionCount} times. Consider caching results.`);
    }

    return suggestions;
  }

  /**
   * Get slow queries
   */
  getSlowQueries(threshold?: number): QueryExecution[] {
    const limit = threshold || this.SLOW_QUERY_THRESHOLD;
    return this.queryHistory
      .filter(q => q.executionTime > limit)
      .sort((a, b) => b.executionTime - a.executionTime);
  }

  /**
   * Get query statistics
   */
  getQueryStats(): {
    totalQueries: number;
    slowQueries: number;
    averageExecutionTime: number;
    slowestQuery: QueryExecution | null;
    mostFrequentTable: string | null;
  } {
    if (this.queryHistory.length === 0) {
      return {
        totalQueries: 0,
        slowQueries: 0,
        averageExecutionTime: 0,
        slowestQuery: null,
        mostFrequentTable: null,
      };
    }

    const slowQueries = this.queryHistory.filter(q => q.executionTime > this.SLOW_QUERY_THRESHOLD);
    const avgTime = this.queryHistory.reduce((sum, q) => sum + q.executionTime, 0) / this.queryHistory.length;
    const slowest = [...this.queryHistory].sort((a, b) => b.executionTime - a.executionTime)[0];

    // Find most frequent table
    const tableCounts: Record<string, number> = {};
    for (const query of this.queryHistory) {
      tableCounts[query.table] = (tableCounts[query.table] || 0) + 1;
    }
    const mostFrequent = Object.entries(tableCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || null;

    return {
      totalQueries: this.queryHistory.length,
      slowQueries: slowQueries.length,
      averageExecutionTime: avgTime,
      slowestQuery: slowest,
      mostFrequentTable: mostFrequent,
    };
  }
}

// Global instance
export const queryOptimizer = new QueryOptimizer();
