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
/**
 * Performance metrics collector and analyzer
 */
export class PerformanceMetricsCollector {
    static instance;
    config;
    activeOperations = new Map();
    completedOperations = [];
    constructor(config) {
        this.config = config;
    }
    /**
     * Get singleton instance with default configuration
     */
    static getInstance(config) {
        if (!PerformanceMetricsCollector.instance) {
            const defaultConfig = {
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
    startOperation(operationName, metadata) {
        const operationId = `${operationName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const metrics = {
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
    endOperation(operationId) {
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
    getOperationSummary(operationName) {
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
    getAllMetrics() {
        return [...this.completedOperations];
    }
    /**
     * Clear all metrics (useful for testing)
     */
    clearMetrics() {
        this.completedOperations = [];
        this.activeOperations.clear();
    }
    /**
     * Check performance thresholds and log warnings/errors
     */
    checkThresholds(metrics) {
        const thresholds = this.config.customThresholds?.get(metrics.operationName) ||
            this.config.defaultThresholds;
        if (metrics.durationMs >= thresholds.criticalMs) {
            console.error(`🚨 CRITICAL: Operation ${metrics.operationName} took ${metrics.durationMs.toFixed(2)}ms (threshold: ${thresholds.criticalMs}ms)`, {
                operationName: metrics.operationName,
                durationMs: metrics.durationMs,
                threshold: thresholds.criticalMs,
                metadata: metrics.metadata
            });
        }
        else if (metrics.durationMs >= thresholds.errorMs) {
            console.error(`❌ ERROR: Operation ${metrics.operationName} took ${metrics.durationMs.toFixed(2)}ms (threshold: ${thresholds.errorMs}ms)`, {
                operationName: metrics.operationName,
                durationMs: metrics.durationMs,
                threshold: thresholds.errorMs,
                metadata: metrics.metadata
            });
        }
        else if (metrics.durationMs >= thresholds.warningMs) {
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
export function TimedOperation(operationName) {
    return function (target, propertyName, descriptor) {
        const method = descriptor.value;
        const collector = PerformanceMetricsCollector.getInstance();
        descriptor.value = async function (...args) {
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
            }
            catch (error) {
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
export function withPerformanceTiming(operationName, operation, metadata) {
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
};
//# sourceMappingURL=performance-metrics.js.map