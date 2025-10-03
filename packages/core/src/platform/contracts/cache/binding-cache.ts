/**
 * Binding Cache
 * Performance optimization for binder strategy operations
 */

import { EnhancedBindingContext, EnhancedBindingResult } from '../bindings.ts';

/**
 * Cache entry for binding results
 */
export interface CacheEntry {
  /** Cached binding result */
  result: EnhancedBindingResult;
  /** Cache creation timestamp */
  createdAt: number;
  /** Cache expiration timestamp */
  expiresAt: number;
  /** Cache hit count */
  hitCount: number;
  /** Cache key */
  key: string;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  /** Total cache hits */
  hits: number;
  /** Total cache misses */
  misses: number;
  /** Total cache entries */
  entries: number;
  /** Cache hit ratio */
  hitRatio: number;
  /** Average cache entry age in milliseconds */
  averageAge: number;
  /** Memory usage estimate */
  memoryUsage: number;
}

/**
 * Binding cache configuration
 */
export interface CacheConfig {
  /** Maximum number of entries to cache */
  maxEntries: number;
  /** Default TTL in milliseconds */
  defaultTtl: number;
  /** Whether to enable cache */
  enabled: boolean;
  /** Cache cleanup interval in milliseconds */
  cleanupInterval: number;
}

/**
 * High-performance binding cache with LRU eviction
 */
export class BindingCache {
  private cache = new Map<string, CacheEntry>();
  private accessOrder: string[] = [];
  private stats = {
    hits: 0,
    misses: 0,
    entries: 0
  };
  private config: CacheConfig;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxEntries: config.maxEntries || 1000,
      defaultTtl: config.defaultTtl || 5 * 60 * 1000, // 5 minutes
      enabled: config.enabled !== false,
      cleanupInterval: config.cleanupInterval || 60 * 1000 // 1 minute
    };

    if (this.config.enabled) {
      this.startCleanupTimer();
    }
  }

  /**
   * Generate cache key from binding context
   */
  private generateCacheKey(context: EnhancedBindingContext): string {
    const key = {
      sourceType: context.source.getType(),
      targetType: context.target.getType(),
      capability: context.directive.capability,
      access: context.directive.access,
      environment: context.environment,
      complianceFramework: context.complianceFramework,
      targetCapabilityHash: this.hashCapabilityData(context.targetCapabilityData)
    };

    return Buffer.from(JSON.stringify(key)).toString('base64');
  }

  /**
   * Generate hash for capability data to detect changes
   */
  private hashCapabilityData(capabilityData: any): string {
    // Create a stable hash of the capability data
    const normalized = JSON.stringify(capabilityData, Object.keys(capabilityData).sort());
    return Buffer.from(normalized).toString('base64').slice(0, 16);
  }

  /**
   * Get cached binding result
   */
  get(context: EnhancedBindingContext): EnhancedBindingResult | null {
    if (!this.config.enabled) {
      this.stats.misses++;
      return null;
    }

    const key = this.generateCacheKey(context);
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if entry has expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      this.stats.misses++;
      return null;
    }

    // Update access order for LRU
    this.updateAccessOrder(key);
    entry.hitCount++;
    this.stats.hits++;

    return entry.result;
  }

  /**
   * Store binding result in cache
   */
  set(context: EnhancedBindingContext, result: EnhancedBindingResult, ttl?: number): void {
    if (!this.config.enabled) {
      return;
    }

    const key = this.generateCacheKey(context);
    const now = Date.now();
    const expiresAt = now + (ttl || this.config.defaultTtl);

    // Check if we need to evict entries
    if (this.cache.size >= this.config.maxEntries) {
      this.evictLRU();
    }

    const entry: CacheEntry = {
      result,
      createdAt: now,
      expiresAt,
      hitCount: 0,
      key
    };

    this.cache.set(key, entry);
    this.updateAccessOrder(key);
    this.stats.entries = this.cache.size;
  }

  /**
   * Update access order for LRU eviction
   */
  private updateAccessOrder(key: string): void {
    // Remove from current position
    this.removeFromAccessOrder(key);
    // Add to end (most recently used)
    this.accessOrder.push(key);
  }

  /**
   * Remove key from access order
   */
  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    if (this.accessOrder.length === 0) {
      return;
    }

    const lruKey = this.accessOrder[0];
    this.cache.delete(lruKey);
    this.removeFromAccessOrder(lruKey);
    this.stats.entries = this.cache.size;
  }

  /**
   * Clean up expired entries
   */
  private cleanupExpired(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
    });

    this.stats.entries = this.cache.size;
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpired();
    }, this.config.cleanupInterval);
  }

  /**
   * Stop cleanup timer
   */
  private stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRatio = totalRequests > 0 ? this.stats.hits / totalRequests : 0;

    // Calculate average age
    const now = Date.now();
    let totalAge = 0;
    for (const entry of this.cache.values()) {
      totalAge += now - entry.createdAt;
    }
    const averageAge = this.cache.size > 0 ? totalAge / this.cache.size : 0;

    // Estimate memory usage (rough calculation)
    const memoryUsage = this.cache.size * 1024; // Rough estimate

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      entries: this.stats.entries,
      hitRatio,
      averageAge,
      memoryUsage
    };
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
    this.stats = { hits: 0, misses: 0, entries: 0 };
  }

  /**
   * Update cache configuration
   */
  updateConfig(newConfig: Partial<CacheConfig>): void {
    const wasEnabled = this.config.enabled;
    this.config = { ...this.config, ...newConfig };

    if (!wasEnabled && this.config.enabled) {
      this.startCleanupTimer();
    } else if (wasEnabled && !this.config.enabled) {
      this.stopCleanupTimer();
      this.clear();
    }
  }

  /**
   * Get cache configuration
   */
  getConfig(): CacheConfig {
    return { ...this.config };
  }

  /**
   * Destroy cache and cleanup resources
   */
  destroy(): void {
    this.stopCleanupTimer();
    this.clear();
  }

  /**
   * Get detailed cache information for debugging
   */
  getDebugInfo(): {
    config: CacheConfig;
    stats: CacheStats;
    entries: Array<{
      key: string;
      age: number;
      hitCount: number;
      expiresAt: number;
    }>;
  } {
    const now = Date.now();
    const entries = Array.from(this.cache.values()).map(entry => ({
      key: entry.key,
      age: now - entry.createdAt,
      hitCount: entry.hitCount,
      expiresAt: entry.expiresAt
    }));

    return {
      config: this.getConfig(),
      stats: this.getStats(),
      entries
    };
  }
}
