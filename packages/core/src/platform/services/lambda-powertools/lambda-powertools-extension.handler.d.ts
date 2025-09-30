/**
 * Lambda Powertools Extension Handler
 *
 * Extends the existing OTEL observability handlers to add AWS Lambda Powertools
 * capabilities while maintaining compatibility with existing OTEL + X-Ray setup.
 *
 * This handler is designed to be used by all Lambda components (lambda-api, lambda-worker, etc.)
 * and provides enhanced observability capabilities without replacing existing infrastructure.
 */
import { BaseComponent } from '@shinobi/core';
import { ObservabilityConfig } from '../../../standards/otel/observability-handlers/src/observability-handlers/observability-handler.interface';
import { PlatformServiceContext } from '@shinobi/core/platform-services';
/**
 * Configuration for Lambda Powertools integration.
 */
export interface LambdaPowertoolsConfig {
    /**
     * Enable Powertools for this Lambda function.
     * @default false
     */
    enabled?: boolean;
    /**
     * Specify the Powertools layer ARN. If not provided, a default will be attempted based on runtime.
     */
    layerArn?: string;
    /**
     * Enable Powertools Logger.
     * @default true
     */
    enableLogger?: boolean;
    /**
     * Enable Powertools Tracer.
     * @default true
     */
    enableTracer?: boolean;
    /**
     * Enable Powertools Metrics.
     * @default true
     */
    enableMetrics?: boolean;
    /**
     * Enable Powertools Parameters utility.
     * @default false
     */
    enableParameters?: boolean;
    /**
     * Enable Powertools Idempotency utility.
     * @default false
     */
    enableIdempotency?: boolean;
    /**
     * Log level for Powertools Logger.
     * @default 'INFO'
     */
    logLevel?: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
    /**
     * Service name for Powertools. Defaults to component name.
     */
    serviceName?: string;
    /**
     * Metrics namespace for Powertools Metrics.
     * @default 'Shinobi'
     */
    metricsNamespace?: string;
    /**
     * Enable business metrics collection.
     * @default false
     */
    businessMetrics?: boolean;
    /**
     * Enable parameter store integration.
     * @default false
     */
    parameterStore?: boolean;
    /**
     * Enable audit logging.
     * @default false
     */
    auditLogging?: boolean;
    /**
     * Enable log event capture.
     * @default false
     */
    logEvent?: boolean;
}
/**
 * Default Powertools configuration
 */
export declare const DEFAULT_POWERTOOLS_CONFIG: Required<LambdaPowertoolsConfig>;
/**
 * Result of applying Powertools enhancements
 */
export interface PowertoolsEnhancementResult {
    instrumentationApplied: boolean;
    alarmsCreated: number;
    executionTimeMs: number;
    error?: string;
}
/**
 * Lambda Powertools Extension Handler
 *
 * Provides enhanced observability capabilities for Lambda functions while maintaining
 * compatibility with existing OTEL + X-Ray infrastructure.
 */
export declare class LambdaPowertoolsExtensionHandler {
    private config;
    private context;
    constructor(context: PlatformServiceContext, config?: Partial<LambdaPowertoolsConfig>);
    /**
     * Factory method to create a handler instance
     */
    static create(context: PlatformServiceContext, config?: Partial<LambdaPowertoolsConfig>): LambdaPowertoolsExtensionHandler;
    /**
     * Get current Powertools configuration
     */
    getPowertoolsConfig(): Required<LambdaPowertoolsConfig>;
    /**
     * Update Powertools configuration
     */
    updatePowertoolsConfig(config: Partial<LambdaPowertoolsConfig>): void;
    /**
     * Apply Powertools enhancements to a Lambda component
     */
    applyPowertoolsEnhancements(component: BaseComponent, observabilityConfig: ObservabilityConfig): PowertoolsEnhancementResult;
    /**
     * Apply Powertools layer to Lambda function
     */
    private applyPowertoolsLayer;
    /**
     * Apply Powertools environment variables
     */
    private applyEnvironmentVariables;
    /**
     * Apply IAM permissions for Powertools utilities
     */
    private applyIamPermissions;
    /**
     * Get Powertools layer ARN based on runtime
     */
    private getPowertoolsLayerArn;
}
//# sourceMappingURL=lambda-powertools-extension.handler.d.ts.map