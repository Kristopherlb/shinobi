/**
 * Lambda Observability Service
 *
 * Unified service for applying comprehensive observability to AWS Lambda functions.
 * Combines base OpenTelemetry instrumentation with AWS Lambda Powertools enhancements.
 *
 * This service is designed to be used by all Lambda components (lambda-api, lambda-worker, etc.)
 * and provides a single interface for observability configuration.
 */
import { BaseComponent } from '@shinobi/core';
import { PlatformServiceContext } from '@shinobi/core/platform-services';
import { ObservabilityConfig } from '@shinobi/core/platform/contracts';
import { LambdaPowertoolsConfig } from './lambda-powertools-extension.handler.js';
/**
 * Configuration for the Lambda Observability Service
 */
export interface LambdaObservabilityServiceConfig {
    /**
     * Base observability configuration
     */
    observabilityConfig: ObservabilityConfig;
    /**
     * Powertools configuration
     */
    powertoolsConfig: LambdaPowertoolsConfig;
    /**
     * Enable full integration (base OTEL + Powertools)
     * @default true
     */
    enableFullIntegration?: boolean;
    /**
     * Service name for observability
     */
    serviceName: string;
    /**
     * Compliance framework
     */
    complianceFramework: string;
}
/**
 * Result of applying observability
 */
export interface ObservabilityResult {
    success: boolean;
    baseInstrumentation: {
        instrumentationApplied: boolean;
        alarmsCreated: number;
        executionTimeMs: number;
    };
    powertoolsEnhancements: {
        instrumentationApplied: boolean;
        alarmsCreated: number;
        executionTimeMs: number;
    };
    totalExecutionTimeMs: number;
    error?: string;
}
/**
 * Lambda Observability Service
 *
 * Provides unified observability management for Lambda functions, combining
 * base OpenTelemetry instrumentation with Powertools enhancements.
 */
export declare class LambdaObservabilityService {
    private config;
    private context;
    private powertoolsHandler;
    constructor(context: PlatformServiceContext, config: LambdaObservabilityServiceConfig);
    /**
     * Factory method to create a service instance
     */
    static create(context: PlatformServiceContext, serviceName: string, complianceFramework: string, powertoolsConfig?: Partial<LambdaPowertoolsConfig>): LambdaObservabilityService;
    /**
     * Factory method to create an audit service
     */
    static createAuditService(context: PlatformServiceContext, serviceName: string, complianceFramework: string): LambdaObservabilityService;
    /**
     * Factory method to create a worker service
     */
    static createWorkerService(context: PlatformServiceContext, serviceName: string, complianceFramework: string): LambdaObservabilityService;
    /**
     * Get current configuration
     */
    getConfig(): LambdaObservabilityServiceConfig;
    /**
     * Update configuration
     */
    updateConfig(config: Partial<LambdaObservabilityServiceConfig>): void;
    /**
     * Get Powertools configuration
     */
    getPowertoolsConfig(): LambdaPowertoolsConfig;
    /**
     * Update Powertools configuration
     */
    updatePowertoolsConfig(config: Partial<LambdaPowertoolsConfig>): void;
    /**
     * Apply complete observability to a Lambda component
     */
    applyObservability(component: BaseComponent): Promise<ObservabilityResult>;
    /**
     * Apply only base observability (OTEL + X-Ray)
     */
    applyBaseObservability(component: BaseComponent): {
        instrumentationApplied: boolean;
        alarmsCreated: number;
        executionTimeMs: number;
    };
    /**
     * Apply only Powertools enhancements
     */
    applyPowertoolsOnly(component: BaseComponent): {
        instrumentationApplied: boolean;
        alarmsCreated: number;
        executionTimeMs: number;
    };
}
//# sourceMappingURL=lambda-observability.service.d.ts.map