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
export declare class PerformanceMetricsCollector {
    private static instance;
    private config;
    private activeOperations;
    private completedOperations;
    private constructor();
    /**
     * Get singleton instance with default configuration
     */
    static getInstance(config?: Partial<PerformanceConfig>): PerformanceMetricsCollector;
    /**
     * Start timing an operation
     */
    startOperation(operationName: string, metadata?: Record<string, any>): string;
    /**
     * End timing an operation and return performance metrics
     */
    endOperation(operationId: string): PerformanceMetrics | null;
    /**
     * Get performance summary for an operation type
     */
    getOperationSummary(operationName: string): {
        count: number;
        avgDurationMs: number;
        minDurationMs: number;
        maxDurationMs: number;
        totalDurationMs: number;
    };
    /**
     * Get all performance metrics
     */
    getAllMetrics(): PerformanceMetrics[];
    /**
     * Clear all metrics (useful for testing)
     */
    clearMetrics(): void;
    /**
     * Check performance thresholds and log warnings/errors
     */
    private checkThresholds;
}
/**
 * Decorator for automatic performance timing of methods
 */
export declare function TimedOperation(operationName?: string): (target: any, propertyName: string, descriptor: PropertyDescriptor) => void;
/**
 * Utility function for manual performance timing
 */
export declare function withPerformanceTiming<T>(operationName: string, operation: () => T | Promise<T>, metadata?: Record<string, any>): Promise<T>;
/**
 * Performance thresholds for common platform operations
 */
export declare const PLATFORM_PERFORMANCE_THRESHOLDS: {
    readonly 'config-loader.getTemplateConfig': {
        readonly warningMs: 100;
        readonly errorMs: 500;
        readonly criticalMs: 1000;
    };
    readonly 'context-hydrator.hydrateContext': {
        readonly warningMs: 200;
        readonly errorMs: 1000;
        readonly criticalMs: 2000;
    };
    readonly 'enhanced-schema-validator.validateManifest': {
        readonly warningMs: 500;
        readonly errorMs: 2000;
        readonly criticalMs: 5000;
    };
    readonly 'file-discovery.findManifest': {
        readonly warningMs: 100;
        readonly errorMs: 500;
        readonly criticalMs: 1000;
    };
    readonly 'manifest-parser.parseManifest': {
        readonly warningMs: 50;
        readonly errorMs: 200;
        readonly criticalMs: 500;
    };
    readonly 'observability-service.apply': {
        readonly warningMs: 100;
        readonly errorMs: 500;
        readonly criticalMs: 1000;
    };
    readonly 'resolver-engine.synthesize': {
        readonly warningMs: 1000;
        readonly errorMs: 5000;
        readonly criticalMs: 10000;
    };
};
//# sourceMappingURL=performance-metrics.d.ts.map