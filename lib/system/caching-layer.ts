// Caching Layer - Task 47
// Cache heavy queries and frequently accessed data

export interface CacheEntry<T = any> {
  key: string;
  value: T;
  expiresAt: number; // Timestamp
  createdAt: number;
  accessCount: number;
  lastAccessed: number;
  size: number; // Estimated size in bytes
}

export interface CacheStats {
  totalEntries: number;
  totalSize: number; // bytes
  hitRate: number; // 0-1
  missRate: number; // 0-1
  evictions: number;
  hits: number;
  misses: number;
}

/**
 * Caching Layer
 */
export class CachingLayer {
  private cache: Map<string, CacheEntry> = new Map();
  private maxSize: number = 100 * 1024 * 1024; // 100MB default
  private maxEntries: number = 10000;
  private hitCount: number = 0;
  private missCount: number = 0;
  private evictionCount: number = 0;

  /**
   * Get value from cache
   */
  get<T = any>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.missCount++;
      return null;
    }

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.missCount++;
      return null;
    }

    // Update access stats
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.hitCount++;

    return entry.value as T;
  }

  /**
   * Get cache TTL for a key (HSE Phase II: Hyperstate-aware)
   * This is a helper - actual TTL is set in set() method
   */
  async getCacheTtlForKey(key: string): Promise<number> {
    const { getCurrentHyperstateLevel } = await import('@/lib/hse/hyperstate-context');
    const level = await getCurrentHyperstateLevel();

    if (level === 'DEGRADED' || level === 'ELEVATED_LOAD') {
      return 120; // seconds — more aggressive caching
    }

    if (level === 'CRITICAL') {
      return 300; // very aggressive
    }

    return 30; // default
  }

  /**
   * Set value in cache
   */
  set<T = any>(
    key: string,
    value: T,
    ttlSeconds: number = 300 // 5 minutes default
  ): void {
    const now = Date.now();
    const size = this.estimateSize(value);

    // Check if we need to evict
    this.evictIfNeeded(size);

    const entry: CacheEntry<T> = {
      key,
      value,
      expiresAt: now + ttlSeconds * 1000,
      createdAt: now,
      accessCount: 0,
      lastAccessed: now,
      size,
    };

    this.cache.set(key, entry);
  }

  /**
   * Delete from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
    this.evictionCount = 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalSize = Array.from(this.cache.values()).reduce((sum, e) => sum + e.size, 0);
    const totalRequests = this.hitCount + this.missCount;
    const hitRate = totalRequests > 0 ? this.hitCount / totalRequests : 0;
    const missRate = totalRequests > 0 ? this.missCount / totalRequests : 0;

    return {
      totalEntries: this.cache.size,
      totalSize,
      hitRate,
      missRate,
      evictions: this.evictionCount,
      hits: this.hitCount,
      misses: this.missCount,
    };
  }

  /**
   * Get most frequently accessed entries
   */
  getTopEntries(limit: number = 10): Array<{ key: string; accessCount: number; size: number }> {
    return Array.from(this.cache.values())
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, limit)
      .map(e => ({
        key: e.key,
        accessCount: e.accessCount,
        size: e.size,
      }));
  }

  /**
   * Evict entries if needed
   */
  private evictIfNeeded(newEntrySize: number): void {
    const currentSize = Array.from(this.cache.values()).reduce((sum, e) => sum + e.size, 0);
    const currentCount = this.cache.size;

    // Evict if over size limit
    if (currentSize + newEntrySize > this.maxSize) {
      this.evictBySize(currentSize + newEntrySize - this.maxSize);
    }

    // Evict if over entry limit
    if (currentCount >= this.maxEntries) {
      this.evictByCount(1);
    }
  }

  /**
   * Evict entries by size (LRU)
   */
  private evictBySize(targetSize: number): void {
    const entries = Array.from(this.cache.values())
      .sort((a, b) => a.lastAccessed - b.lastAccessed); // Oldest first

    let freed = 0;
    for (const entry of entries) {
      if (freed >= targetSize) break;
      this.cache.delete(entry.key);
      freed += entry.size;
      this.evictionCount++;
    }
  }

  /**
   * Evict entries by count (LRU)
   */
  private evictByCount(count: number): void {
    const entries = Array.from(this.cache.values())
      .sort((a, b) => a.lastAccessed - b.lastAccessed)
      .slice(0, count);

    for (const entry of entries) {
      this.cache.delete(entry.key);
      this.evictionCount++;
    }
  }

  /**
   * Estimate size of value
   */
  private estimateSize(value: any): number {
    try {
      const json = JSON.stringify(value);
      return new Blob([json]).size;
    } catch {
      // Fallback estimation
      return 1024; // 1KB default
    }
  }

  /**
   * Clean expired entries
   */
  cleanExpired(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Set max cache size
   */
  setMaxSize(size: number): void {
    this.maxSize = size;
    this.evictIfNeeded(0);
  }

  /**
   * Set max entries
   */
  setMaxEntries(count: number): void {
    this.maxEntries = count;
    if (this.cache.size >= count) {
      this.evictByCount(this.cache.size - count + 1);
    }
  }
}

// Global cache instance
export const cache = new CachingLayer();

/**
 * Cache decorator for async functions
 */
export function cached<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  keyGenerator?: (...args: Parameters<T>) => string,
  ttlSeconds: number = 300
): T {
  return (async (...args: Parameters<T>) => {
    const key = keyGenerator
      ? keyGenerator(...args)
      : `cache_${fn.name}_${JSON.stringify(args)}`;

    // Try cache first
    const cached = cache.get(key);
    if (cached !== null) {
      return cached;
    }

    // Execute and cache
    const result = await fn(...args);
    cache.set(key, result, ttlSeconds);
    return result;
  }) as T;
}
