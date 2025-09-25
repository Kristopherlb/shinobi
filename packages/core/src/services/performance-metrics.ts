/**
 * Performance Metrics Utility
 * 
 * Provides standardized performance timing and metrics collection for platform services.
 * Implements the Platform Performance Monitoring Standard v1.0.
 * 
 * Features:
 * - High-resolution timing with performance.now()
 * - Memory usage tracking
 * - Operation categorization
 * - Structured logging with performance data
 * - Performance thresholds and alerts
 */

export interface PerformanceMetrics {
  operationName: string;
  startTime: number;
  endTime: number;
  durationMs: number;
  memoryUsage?: {
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
  metadata?: Record<string, any>;
}

export interface PerformanceThresholds {
  warningMs: number;
  errorMs: number;
  criticalMs: number;
}

export interface PerformanceConfig {
  enableMemoryTracking: boolean;
  enableThresholds: boolean;
  defaultThresholds: PerformanceThresholds;
  customThresholds?: Map<string, PerformanceThresholds>;
}

/**
 * Performance metrics collector and analyzer
 */
export class PerformanceMetricsCollector {
  private static instance: PerformanceMetricsCollector;
  private config: PerformanceConfig;
  private activeOperations: Map<string, PerformanceMetrics> = new Map();
  private completedOperations: PerformanceMetrics[] = [];

  private constructor(config: PerformanceConfig) {
    this.config = config;
  }

  /**
   * Get singleton instance with default configuration
   */
  public static getInstance(config?: Partial<PerformanceConfig>): PerformanceMetricsCollector {
    if (!PerformanceMetricsCollector.instance) {
      const defaultConfig: PerformanceConfig = {
        enableMemoryTracking: true,
        enableThresholds: true,
        defaultThresholds: {
          warningMs: 1000,
          errorMs: 5000,
          criticalMs: 10000
        },
        customThresholds: new Map()
      };

      PerformanceMetricsCollector.instance = new PerformanceMetricsCollector({
        ...defaultConfig,
        ...config
      });
    }
    return PerformanceMetricsCollector.instance;
  }

  /**
   * Start timing an operation
   */
  public startOperation(operationName: string, metadata?: Record<string, any>): string {
    const operationId = `${operationName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const metrics: PerformanceMetrics = {
      operationName,
      startTime: performance.now(),
      endTime: 0,
      durationMs: 0,
      metadata
    };

    if (this.config.enableMemoryTracking) {
      const memUsage = process.memoryUsage();
      metrics.memoryUsage = {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external
      };
    }

    this.activeOperations.set(operationId, metrics);
    return operationId;
  }

  /**
   * End timing an operation and return performance metrics
   */
  public endOperation(operationId: string): PerformanceMetrics | null {
    const metrics = this.activeOperations.get(operationId);
    if (!metrics) {
      console.warn(`Performance operation ${operationId} not found`);
      return null;
    }

    metrics.endTime = performance.now();
    metrics.durationMs = metrics.endTime - metrics.startTime;

    // Check thresholds if enabled
    if (this.config.enableThresholds) {
      this.checkThresholds(metrics);
    }

    // Move to completed operations
    this.activeOperations.delete(operationId);
    this.completedOperations.push(metrics);

    return metrics;
  }

  /**
   * Get performance summary for an operation type
   */
  public getOperationSummary(operationName: string): {
    count: number;
    avgDurationMs: number;
    minDurationMs: number;
    maxDurationMs: number;
    totalDurationMs: number;
  } {
    const operations = this.completedOperations.filter(op => op.operationName === operationName);

    if (operations.length === 0) {
      return {
        count: 0,
        avgDurationMs: 0,
        minDurationMs: 0,
        maxDurationMs: 0,
        totalDurationMs: 0
      };
    }

    const durations = operations.map(op => op.durationMs);
    const totalDuration = durations.reduce((sum, duration) => sum + duration, 0);

    return {
      count: operations.length,
      avgDurationMs: totalDuration / operations.length,
      minDurationMs: Math.min(...durations),
      maxDurationMs: Math.max(...durations),
      totalDurationMs: totalDuration
    };
  }

  /**
   * Get all performance metrics
   */
  public getAllMetrics(): PerformanceMetrics[] {
    return [...this.completedOperations];
  }

  /**
   * Clear all metrics (useful for testing)
   */
  public clearMetrics(): void {
    this.completedOperations = [];
    this.activeOperations.clear();
  }

  /**
   * Check performance thresholds and log warnings/errors
   */
  private checkThresholds(metrics: PerformanceMetrics): void {
    const thresholds = this.config.customThresholds?.get(metrics.operationName) ||
      this.config.defaultThresholds;

    if (metrics.durationMs >= thresholds.criticalMs) {
      console.error(`🚨 CRITICAL: Operation ${metrics.operationName} took ${metrics.durationMs.toFixed(2)}ms (threshold: ${thresholds.criticalMs}ms)`, {
        operationName: metrics.operationName,
        durationMs: metrics.durationMs,
        threshold: thresholds.criticalMs,
        metadata: metrics.metadata
      });
    } else if (metrics.durationMs >= thresholds.errorMs) {
      console.error(`❌ ERROR: Operation ${metrics.operationName} took ${metrics.durationMs.toFixed(2)}ms (threshold: ${thresholds.errorMs}ms)`, {
        operationName: metrics.operationName,
        durationMs: metrics.durationMs,
        threshold: thresholds.errorMs,
        metadata: metrics.metadata
      });
    } else if (metrics.durationMs >= thresholds.warningMs) {
      console.warn(`⚠️  WARNING: Operation ${metrics.operationName} took ${metrics.durationMs.toFixed(2)}ms (threshold: ${thresholds.warningMs}ms)`, {
        operationName: metrics.operationName,
        durationMs: metrics.durationMs,
        threshold: thresholds.warningMs,
        metadata: metrics.metadata
      });
    }
  }
}

/**
 * Decorator for automatic performance timing of methods
 */
export function TimedOperation(operationName?: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const collector = PerformanceMetricsCollector.getInstance();

    descriptor.value = async function (...args: any[]) {
      const opName = operationName || `${target.constructor.name}.${propertyName}`;
      const operationId = collector.startOperation(opName, {
        className: target.constructor.name,
        methodName: propertyName,
        args: args.length
      });

      try {
        const result = await method.apply(this, args);
        const metrics = collector.endOperation(operationId);

        if (metrics) {
          console.debug(`✅ Operation completed: ${opName} (${metrics.durationMs.toFixed(2)}ms)`, {
            operationName: opName,
            durationMs: metrics.durationMs,
            memoryUsage: metrics.memoryUsage
          });
        }

        return result;
      } catch (error) {
        const metrics = collector.endOperation(operationId);

        if (metrics) {
          console.error(`❌ Operation failed: ${opName} (${metrics.durationMs.toFixed(2)}ms)`, {
            operationName: opName,
            durationMs: metrics.durationMs,
            error: error instanceof Error ? error.message : String(error)
          });
        }

        throw error;
      }
    };
  };
}

/**
 * Utility function for manual performance timing
 */
export function withPerformanceTiming<T>(
  operationName: string,
  operation: () => T | Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  const collector = PerformanceMetricsCollector.getInstance();
  const operationId = collector.startOperation(operationName, metadata);

  return Promise.resolve(operation())
    .then(result => {
      const metrics = collector.endOperation(operationId);
      if (metrics) {
        console.debug(`✅ Operation completed: ${operationName} (${metrics.durationMs.toFixed(2)}ms)`, {
          operationName,
          durationMs: metrics.durationMs,
          memoryUsage: metrics.memoryUsage,
          metadata
        });
      }
      return result;
    })
    .catch(error => {
      const metrics = collector.endOperation(operationId);
      if (metrics) {
        console.error(`❌ Operation failed: ${operationName} (${metrics.durationMs.toFixed(2)}ms)`, {
          operationName,
          durationMs: metrics.durationMs,
          error: error instanceof Error ? error.message : String(error),
          metadata
        });
      }
      throw error;
    });
}

/**
 * Performance thresholds for common platform operations
 */
export const PLATFORM_PERFORMANCE_THRESHOLDS = {
  'config-loader.getTemplateConfig': { warningMs: 100, errorMs: 500, criticalMs: 1000 },
  'context-hydrator.hydrateContext': { warningMs: 200, errorMs: 1000, criticalMs: 2000 },
  'enhanced-schema-validator.validateManifest': { warningMs: 500, errorMs: 2000, criticalMs: 5000 },
  'file-discovery.findManifest': { warningMs: 100, errorMs: 500, criticalMs: 1000 },
  'manifest-parser.parseManifest': { warningMs: 50, errorMs: 200, criticalMs: 500 },
  'observability-service.apply': { warningMs: 100, errorMs: 500, criticalMs: 1000 },
  'resolver-engine.synthesize': { warningMs: 1000, errorMs: 5000, criticalMs: 10000 }
} as const;
