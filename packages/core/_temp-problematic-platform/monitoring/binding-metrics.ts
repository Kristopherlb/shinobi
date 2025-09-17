/**
 * Binding Metrics and Monitoring
 * Comprehensive monitoring and metrics collection for binding operations
 */

import { EnhancedBindingContext, EnhancedBindingResult } from '../bindings';

/**
 * Binding operation metrics
 */
export interface BindingMetrics {
  /** Total binding operations */
  totalBindings: number;
  /** Successful bindings */
  successfulBindings: number;
  /** Failed bindings */
  failedBindings: number;
  /** Average binding duration in milliseconds */
  averageDuration: number;
  /** Binding success rate (0-1) */
  successRate: number;
  /** Bindings by compliance framework */
  byFramework: Record<string, number>;
  /** Bindings by strategy */
  byStrategy: Record<string, number>;
  /** Bindings by capability type */
  byCapability: Record<string, number>;
  /** Error types and counts */
  errorTypes: Record<string, number>;
  /** Performance percentiles */
  percentiles: {
    p50: number;
    p90: number;
    p95: number;
    p99: number;
  };
}

/**
 * Binding operation event
 */
export interface BindingEvent {
  /** Event timestamp */
  timestamp: number;
  /** Event type */
  type: 'binding_start' | 'binding_success' | 'binding_error' | 'compliance_check' | 'cache_hit' | 'cache_miss';
  /** Binding context */
  context: {
    sourceType: string;
    targetType: string;
    capability: string;
    complianceFramework: string;
    environment: string;
  };
  /** Event duration in milliseconds */
  duration?: number;
  /** Event data */
  data?: Record<string, any>;
  /** Error information */
  error?: {
    message: string;
    code: string;
    stack?: string;
  };
}

/**
 * Performance benchmark configuration
 */
export interface BenchmarkConfig {
  /** Number of iterations to run */
  iterations: number;
  /** Warmup iterations */
  warmupIterations: number;
  /** Target operations per second */
  targetOpsPerSecond?: number;
  /** Memory usage tracking */
  trackMemory: boolean;
  /** CPU usage tracking */
  trackCpu: boolean;
}

/**
 * Benchmark results
 */
export interface BenchmarkResults {
  /** Total duration in milliseconds */
  totalDuration: number;
  /** Operations per second */
  opsPerSecond: number;
  /** Average operation duration */
  averageDuration: number;
  /** Minimum operation duration */
  minDuration: number;
  /** Maximum operation duration */
  maxDuration: number;
  /** Performance percentiles */
  percentiles: {
    p50: number;
    p90: number;
    p95: number;
    p99: number;
  };
  /** Memory usage statistics */
  memoryStats?: {
    initial: number;
    peak: number;
    final: number;
  };
  /** Error count */
  errorCount: number;
  /** Success rate */
  successRate: number;
}

/**
 * Binding metrics collector and analyzer
 */
export class BindingMetricsCollector {
  private events: BindingEvent[] = [];
  private metrics: BindingMetrics;
  private maxEvents: number = 10000;

  constructor(maxEvents: number = 10000) {
    this.maxEvents = maxEvents;
    this.metrics = this.initializeMetrics();
  }

  /**
   * Record a binding event
   */
  recordEvent(event: BindingEvent): void {
    this.events.push(event);

    // Maintain event limit
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Update metrics
    this.updateMetrics();
  }

  /**
   * Record binding start
   */
  recordBindingStart(context: EnhancedBindingContext): void {
    this.recordEvent({
      timestamp: Date.now(),
      type: 'binding_start',
      context: this.extractContext(context),
      data: {
        sourceName: context.source.getName(),
        targetName: context.target.getName()
      }
    });
  }

  /**
   * Record binding success
   */
  recordBindingSuccess(context: EnhancedBindingContext, result: EnhancedBindingResult, duration: number): void {
    this.recordEvent({
      timestamp: Date.now(),
      type: 'binding_success',
      context: this.extractContext(context),
      duration,
      data: {
        sourceName: context.source.getName(),
        targetName: context.target.getName(),
        environmentVariablesCount: Object.keys(result.environmentVariables).length,
        iamPoliciesCount: result.iamPolicies.length,
        securityGroupRulesCount: result.securityGroupRules.length,
        complianceActionsCount: result.complianceActions.length
      }
    });
  }

  /**
   * Record binding error
   */
  recordBindingError(context: EnhancedBindingContext, error: Error, duration: number): void {
    this.recordEvent({
      timestamp: Date.now(),
      type: 'binding_error',
      context: this.extractContext(context),
      duration,
      error: {
        message: error.message,
        code: error.constructor.name,
        stack: error.stack
      }
    });
  }

  /**
   * Record compliance check
   */
  recordComplianceCheck(context: EnhancedBindingContext, duration: number, violations: number): void {
    this.recordEvent({
      timestamp: Date.now(),
      type: 'compliance_check',
      context: this.extractContext(context),
      duration,
      data: {
        violations
      }
    });
  }

  /**
   * Record cache hit
   */
  recordCacheHit(context: EnhancedBindingContext): void {
    this.recordEvent({
      timestamp: Date.now(),
      type: 'cache_hit',
      context: this.extractContext(context)
    });
  }

  /**
   * Record cache miss
   */
  recordCacheMiss(context: EnhancedBindingContext): void {
    this.recordEvent({
      timestamp: Date.now(),
      type: 'cache_miss',
      context: this.extractContext(context)
    });
  }

  /**
   * Get current metrics
   */
  getMetrics(): BindingMetrics {
    return { ...this.metrics };
  }

  /**
   * Get metrics for a specific time range
   */
  getMetricsForTimeRange(startTime: number, endTime: number): BindingMetrics {
    const filteredEvents = this.events.filter(
      event => event.timestamp >= startTime && event.timestamp <= endTime
    );

    return this.calculateMetrics(filteredEvents);
  }

  /**
   * Get performance benchmark results
   */
  async runBenchmark(
    bindingFunction: (context: EnhancedBindingContext) => Promise<EnhancedBindingResult>,
    context: EnhancedBindingContext,
    config: BenchmarkConfig
  ): Promise<BenchmarkResults> {
    const results: number[] = [];
    let errorCount = 0;
    let memoryStats: any;

    // Warmup
    for (let i = 0; i < config.warmupIterations; i++) {
      try {
        await bindingFunction(context);
      } catch (error) {
        // Ignore warmup errors
      }
    }

    // Track memory if enabled
    if (config.trackMemory) {
      memoryStats = {
        initial: process.memoryUsage().heapUsed
      };
    }

    const startTime = Date.now();

    // Run benchmark iterations
    for (let i = 0; i < config.iterations; i++) {
      const iterationStart = Date.now();

      try {
        await bindingFunction(context);
        const duration = Date.now() - iterationStart;
        results.push(duration);
      } catch (error) {
        errorCount++;
        const duration = Date.now() - iterationStart;
        results.push(duration);
      }
    }

    const endTime = Date.now();
    const totalDuration = endTime - startTime;

    // Final memory stats
    if (config.trackMemory && memoryStats) {
      memoryStats.final = process.memoryUsage().heapUsed;
      memoryStats.peak = Math.max(...results.map(() => process.memoryUsage().heapUsed));
    }

    // Calculate statistics
    const sortedResults = results.sort((a, b) => a - b);
    const opsPerSecond = (results.length / totalDuration) * 1000;
    const averageDuration = results.reduce((sum, duration) => sum + duration, 0) / results.length;
    const successRate = (results.length - errorCount) / results.length;

    const percentiles = {
      p50: this.calculatePercentile(sortedResults, 50),
      p90: this.calculatePercentile(sortedResults, 90),
      p95: this.calculatePercentile(sortedResults, 95),
      p99: this.calculatePercentile(sortedResults, 99)
    };

    return {
      totalDuration,
      opsPerSecond,
      averageDuration,
      minDuration: Math.min(...results),
      maxDuration: Math.max(...results),
      percentiles,
      memoryStats,
      errorCount,
      successRate
    };
  }

  /**
   * Get detailed event history
   */
  getEventHistory(limit?: number): BindingEvent[] {
    if (limit) {
      return this.events.slice(-limit);
    }
    return [...this.events];
  }

  /**
   * Clear all metrics and events
   */
  clear(): void {
    this.events = [];
    this.metrics = this.initializeMetrics();
  }

  /**
   * Export metrics to JSON
   */
  exportMetrics(): string {
    return JSON.stringify({
      metrics: this.metrics,
      events: this.events,
      timestamp: Date.now()
    }, null, 2);
  }

  /**
   * Initialize metrics structure
   */
  private initializeMetrics(): BindingMetrics {
    return {
      totalBindings: 0,
      successfulBindings: 0,
      failedBindings: 0,
      averageDuration: 0,
      successRate: 0,
      byFramework: {},
      byStrategy: {},
      byCapability: {},
      errorTypes: {},
      percentiles: {
        p50: 0,
        p90: 0,
        p95: 0,
        p99: 0
      }
    };
  }

  /**
   * Extract context information from binding context
   */
  private extractContext(context: EnhancedBindingContext) {
    return {
      sourceType: context.source.getType(),
      targetType: context.target.getType(),
      capability: context.directive.capability,
      complianceFramework: context.complianceFramework,
      environment: context.environment
    };
  }

  /**
   * Update metrics based on current events
   */
  private updateMetrics(): void {
    this.metrics = this.calculateMetrics(this.events);
  }

  /**
   * Calculate metrics from events
   */
  private calculateMetrics(events: BindingEvent[]): BindingMetrics {
    const bindingEvents = events.filter(e =>
      e.type === 'binding_start' || e.type === 'binding_success' || e.type === 'binding_error'
    );

    const totalBindings = events.filter(e => e.type === 'binding_start').length;
    const successfulBindings = events.filter(e => e.type === 'binding_success').length;
    const failedBindings = events.filter(e => e.type === 'binding_error').length;

    // Calculate durations
    const durations = events
      .filter(e => e.duration !== undefined)
      .map(e => e.duration!);

    const averageDuration = durations.length > 0
      ? durations.reduce((sum, duration) => sum + duration, 0) / durations.length
      : 0;

    const successRate = totalBindings > 0 ? successfulBindings / totalBindings : 0;

    // Group by framework
    const byFramework: Record<string, number> = {};
    events.forEach(event => {
      byFramework[event.context.complianceFramework] =
        (byFramework[event.context.complianceFramework] || 0) + 1;
    });

    // Group by capability
    const byCapability: Record<string, number> = {};
    events.forEach(event => {
      byCapability[event.context.capability] =
        (byCapability[event.context.capability] || 0) + 1;
    });

    // Error types
    const errorTypes: Record<string, number> = {};
    events
      .filter(e => e.error)
      .forEach(event => {
        errorTypes[event.error!.code] = (errorTypes[event.error!.code] || 0) + 1;
      });

    // Calculate percentiles
    const sortedDurations = durations.sort((a, b) => a - b);
    const percentiles = {
      p50: this.calculatePercentile(sortedDurations, 50),
      p90: this.calculatePercentile(sortedDurations, 90),
      p95: this.calculatePercentile(sortedDurations, 95),
      p99: this.calculatePercentile(sortedDurations, 99)
    };

    return {
      totalBindings,
      successfulBindings,
      failedBindings,
      averageDuration,
      successRate,
      byFramework,
      byCapability,
      byStrategy: {}, // Would need strategy information
      errorTypes,
      percentiles
    };
  }

  /**
   * Calculate percentile from sorted array
   */
  private calculatePercentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;

    const index = (percentile / 100) * (sortedArray.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;

    if (upper >= sortedArray.length) {
      return sortedArray[sortedArray.length - 1];
    }

    return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
  }
}
