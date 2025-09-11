/**
 * Platform OpenTelemetry Observability Service
 *
 * Implements the Platform OpenTelemetry Observability Standard v1.0 by automatically
 * configuring OpenTelemetry instrumentation, CloudWatch alarms, and compliance-aware
 * monitoring for all supported component types.
 *
 * This service ensures every component is observable by default with:
 * - OpenTelemetry instrumentation (traces, metrics, logs)
 * - Compliance-aware configuration (Commercial/FedRAMP Moderate/FedRAMP High)
 * - Automatic environment variable injection
 * - CloudWatch alarms for operational monitoring
 *
 * Architecture: Uses the Handler Pattern for scalable, maintainable component-specific logic.
 */
import { IPlatformService, PlatformServiceContext } from '../platform/contracts/platform-services';
import { BaseComponent } from '../platform/contracts/component';
import { ObservabilityConfig } from './observability-handlers/observability-handler.interface';
import { ITaggingService } from '../../packages/tagging-service/tagging.service';
/**
 * Platform OpenTelemetry Observability Service
 *
 * Implements Platform OpenTelemetry Observability Standard v1.0 and
 * Platform Service Injector Standard v1.0 using the Handler Pattern
 */
export declare class ObservabilityService implements IPlatformService {
    readonly name = "ObservabilityService";
    private context;
    private readonly observabilityConfig;
    private readonly handlers;
    private readonly taggingService;
    constructor(context: PlatformServiceContext, taggingService?: ITaggingService);
    /**
     * Initialize the handler registry using the Handler Pattern
     * This replaces the monolithic switch statement with a scalable Map-based approach
     */
    private initializeHandlers;
    /**
     * Load observability configuration from centralized platform configuration
     * Implements Platform Configuration Standard v1.0 Layer 2
     */
    private loadObservabilityConfig;
    /**
     * Get the file path for platform configuration based on compliance framework
     */
    private getPlatformConfigPath;
    /**
     * Get fallback configuration when platform configuration is not available
     * These serve as the absolute final fallback (Layer 1 of Configuration Standard)
     */
    private getFallbackConfig;
    /**
     * The core method that applies OpenTelemetry observability to a component
     * after it has been fully synthesized.
     *
     * Implements Platform OpenTelemetry Observability Standard v1.0:
     * - Configures OpenTelemetry instrumentation
     * - Injects OTel environment variables
     * - Creates compliance-aware CloudWatch alarms
     * - Sets up proper retention and sampling
     *
     * Architecture: Uses the Handler Pattern for scalable, maintainable component-specific logic.
     */
    apply(component: BaseComponent): void;
    /**
     * Build OpenTelemetry environment variables from template
     * Performs string substitution on the template with actual values
     */
    buildOTelEnvironmentVariables(componentName: string): Record<string, string>;
    /**
     * Get OpenTelemetry authentication token for the compliance framework
     */
    private getOtelAuthToken;
    /**
     * Get the centralized observability configuration
     * This allows handlers to access configuration without hardcoding values
     */
    getObservabilityConfig(): ObservabilityConfig;
    /**
     * Get the list of supported component types for this service
     * Useful for debugging and service discovery
     */
    getSupportedComponentTypes(): string[];
    /**
     * Get handler information for debugging and monitoring
     */
    getHandlerInfo(): Record<string, string>;
}
