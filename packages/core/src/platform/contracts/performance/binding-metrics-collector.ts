/**
 * Binding Metrics Collector
 * Collects metrics and events related to binding operations
 */

export interface BindingEvent {
  id: string;
  type: 'success' | 'failure' | 'cache_hit' | 'cache_miss';
  timestamp: number;
  duration?: number;
  strategy?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface MetricsStats {
  totalBindings: number;
  successfulBindings: number;
  failedBindings: number;
  cacheHits: number;
  cacheMisses: number;
  averageDuration: number;
  strategies: Record<string, number>;
  errors: Record<string, number>;
}

/**
 * Collects and tracks binding operation metrics
 */
export class BindingMetricsCollector {
  private events: BindingEvent[] = [];
  private maxEvents = 10000;

  /**
   * Record successful binding operation
   */
  recordBindingSuccess(id: string, duration: number, strategy: string): void {
    this.addEvent({
      id,
      type: 'success',
      timestamp: Date.now(),
      duration,
      strategy
    });
  }

  /**
   * Record failed binding operation
   */
  recordBindingFailure(id: string, duration: number, error: string): void {
    this.addEvent({
      id,
      type: 'failure',
      timestamp: Date.now(),
      duration,
      error
    });
  }

  /**
   * Record cache hit
   */
  recordCacheHit(id: string): void {
    this.addEvent({
      id,
      type: 'cache_hit',
      timestamp: Date.now()
    });
  }

  /**
   * Record cache miss
   */
  recordCacheMiss(id: string): void {
    this.addEvent({
      id,
      type: 'cache_miss',
      timestamp: Date.now()
    });
  }

  /**
   * Get comprehensive metrics statistics
   */
  getStats(): MetricsStats {
    const now = Date.now();
    const recentEvents = this.events.filter(e => now - e.timestamp < 3600000); // Last hour

    const totalBindings = recentEvents.filter(e => e.type === 'success' || e.type === 'failure').length;
    const successfulBindings = recentEvents.filter(e => e.type === 'success').length;
    const failedBindings = recentEvents.filter(e => e.type === 'failure').length;
    const cacheHits = recentEvents.filter(e => e.type === 'cache_hit').length;
    const cacheMisses = recentEvents.filter(e => e.type === 'cache_miss').length;

    const durations = recentEvents
      .filter(e => e.duration !== undefined)
      .map(e => e.duration!);
    const averageDuration = durations.length > 0
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length
      : 0;

    const strategies: Record<string, number> = {};
    recentEvents
      .filter(e => e.strategy)
      .forEach(e => {
        strategies[e.strategy!] = (strategies[e.strategy!] || 0) + 1;
      });

    const errors: Record<string, number> = {};
    recentEvents
      .filter(e => e.error)
      .forEach(e => {
        errors[e.error!] = (errors[e.error!] || 0) + 1;
      });

    return {
      totalBindings,
      successfulBindings,
      failedBindings,
      cacheHits,
      cacheMisses,
      averageDuration,
      strategies,
      errors
    };
  }

  /**
   * Get event history
   */
  getEventHistory(limit?: number): BindingEvent[] {
    const events = this.events.slice().reverse(); // Most recent first
    return limit ? events.slice(0, limit) : events;
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.events = [];
  }

  /**
   * Add event to history
   */
  private addEvent(event: BindingEvent): void {
    this.events.push(event);

    // Trim events if over limit
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
  }
}
