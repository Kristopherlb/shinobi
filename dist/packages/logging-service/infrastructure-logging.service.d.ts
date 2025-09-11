/**
 * Platform Logging Service
 *
 * Implements the Platform Structured Logging Standard v1.0 using the Service Injector Pattern.
 * Automatically provisions logging infrastructure and instruments components with standardized loggers.
 *
 * Features:
 * - Compliance-aware log retention (1yr commercial, 3yr FedRAMP Moderate, 7yr FedRAMP High)
 * - Automatic encryption and security classification
 * - PII detection and redaction based on compliance framework
 * - Structured JSON logging with automatic correlation
 * - CloudWatch Log Groups provisioning and configuration
 */
import * as logs from 'aws-cdk-lib/aws-logs';
import { IPlatformService, PlatformServiceContext } from '../../src/platform/contracts/platform-services';
import { IComponent } from '../../src/platform/contracts/component-interfaces';
import { LoggingHandlerResult, LogRetentionPolicy, LogSecurityConfig, PlatformLoggerConfig } from '../../src/platform/contracts/logging-interfaces';
import { LoggingConfig } from './src/logging-config.interface';
/**
 * Platform Logging Service implementing Platform Service Injector Standard v1.0
 * Uses the Handler Pattern for extensible, component-specific logging logic
 */
export declare class LoggingService implements IPlatformService {
    readonly name = "LoggingService";
    private readonly handlers;
    private readonly context;
    private readonly loggingConfig;
    constructor(context: PlatformServiceContext);
    /**
     * Apply logging infrastructure to a component using the appropriate handler
     */
    apply(component: IComponent): void;
    /**
     * Register all available logging handlers
     */
    private registerHandlers;
    /**
     * Load logging configuration from centralized platform configuration
     * Implements Platform Configuration Standard v1.0 Layer 2
     */
    private loadLoggingConfig;
    /**
     * Get the file path for platform configuration based on compliance framework
     */
    private getPlatformConfigPath;
    /**
     * Get fallback logging configuration when platform configuration is not available
     */
    private getFallbackLoggingConfig;
    /**
     * Get retention policy for the current compliance framework
     */
    getRetentionPolicy(policyName?: string): LogRetentionPolicy;
    /**
     * Create a standardized CloudWatch Log Group with compliance-appropriate configuration
     */
    createLogGroup(scope: IComponent, logGroupName: string, classification?: LogSecurityConfig['classification']): {
        logGroup: logs.LogGroup;
        result: LoggingHandlerResult;
    };
    /**
     * Generate platform logger configuration for component instrumentation
     */
    generateLoggerConfig(componentName: string, componentType: string, logGroupName: string, classification?: LogSecurityConfig['classification']): PlatformLoggerConfig;
    /**
     * Get PII redaction rules based on classification level
     */
    private getRedactionRules;
    /**
     * Map retention days to CloudWatch LogGroup retention enum
     */
    private mapRetentionDays;
    /**
     * Get supported component types
     */
    getSupportedTypes(): string[];
    /**
     * Check if a component type is supported
     */
    isSupported(componentType: string): boolean;
    /**
     * Get security classification for a component type
     */
    getSecurityClassification(componentType: string): LogSecurityConfig['classification'];
    /**
     * Get the current logging configuration
     */
    getLoggingConfig(): Readonly<LoggingConfig>;
}
