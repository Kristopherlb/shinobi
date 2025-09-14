/**
 * Binding Cache
 * LRU-based caching system for binding results with configurable TTL
 */

export interface CacheConfig {
  maxSize: number;
  ttlMs: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  maxSize: number;
  hitRate: number;
}

/**
 * LRU cache for binding results
 */
export class BindingCache {
  private cache = new Map<string, { value: any; timestamp: number; ttl: number }>();
  private accessOrder: string[] = [];
  private hits = 0;
  private misses = 0;
  private maxSize: number;
  private ttlMs: number;

  constructor(config?: Partial<CacheConfig>) {
    this.maxSize = config?.maxSize || 1000;
    this.ttlMs = config?.ttlMs || 300000; // 5 minutes default
  }

  /**
   * Get cached value
   */
  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }

    // Check TTL
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      this.misses++;
      return null;
    }

    // Update access order
    this.removeFromAccessOrder(key);
    this.accessOrder.push(key);
    this.hits++;
    return entry.value;
  }

  /**
   * Set cached value
   */
  set(key: string, value: any, ttl?: number): void {
    const now = Date.now();
    const entryTtl = ttl || this.ttlMs;

    // Remove existing entry if present
    if (this.cache.has(key)) {
      this.removeFromAccessOrder(key);
    }

    // Add new entry
    this.cache.set(key, {
      value,
      timestamp: now,
      ttl: entryTtl
    });
    this.accessOrder.push(key);

    // Evict if over capacity
    if (this.cache.size > this.maxSize) {
      this.evictOldest();
    }
  }

  /**
   * Clear all cached values
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: total > 0 ? this.hits / total : 0
    };
  }

  /**
   * Remove entry from access order
   */
  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  /**
   * Evict oldest entry
   */
  private evictOldest(): void {
    if (this.accessOrder.length > 0) {
      const oldestKey = this.accessOrder[0];
      this.cache.delete(oldestKey);
      this.removeFromAccessOrder(oldestKey);
    }
  }
}
