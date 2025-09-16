/**
 * Component API Contract Specification v1.0
 *
 * This file defines the core Component abstract class and interfaces that
 * all components in the platform must implement. This contract ensures that
 * every component is a predictable, secure, and composable building block.
 */
import { Construct, IConstruct } from 'constructs';
import { ComponentSpec, ComponentContext, ComponentCapabilities, IComponent } from './component-interfaces';
import { ITaggingService } from '../../../packages/tagging-service/tagging.service';
/**
 * Options for configuring observability on components
 */
export interface ObservabilityOptions {
    collectorEndpoint?: string;
    serviceName?: string;
    tracesSampling?: number;
    metricsInterval?: number;
    logsRetention?: number;
    enablePerformanceInsights?: boolean;
    enableXRayTracing?: boolean;
    customAttributes?: Record<string, string>;
}
/**
 * Complete observability configuration for a component
 */
export interface ObservabilityConfig {
    collectorEndpoint: string;
    serviceName: string;
    serviceVersion: string;
    environment: string;
    region: string;
    complianceFramework: string;
    tracesSampling: number;
    metricsInterval: number;
    logsRetention: number;
    enablePerformanceInsights: boolean;
    enableXRayTracing: boolean;
    customAttributes: Record<string, string>;
}
/**
 * Abstract base class that all platform components MUST extend - The Implementation Helper
 *
 * This rich class implements IComponent and provides shared functionality for:
 * - Predictable: Standard lifecycle methods (synth, getCapabilities)
 * - Secure: Standard tagging, logging, and observability integration
 * - Composable: Standard binding interface through capabilities
 *
 * Implements Interface Segregation Principle by providing concrete implementations
 * of common component functionality while maintaining the lean IComponent contract.
 */
export declare abstract class BaseComponent extends Construct implements IComponent {
    /** The component's specification from the service manifest. */
    readonly spec: ComponentSpec;
    /** The context of the service this component belongs to. */
    readonly context: ComponentContext;
    /** A map of handles to the real, synthesized CDK constructs. */
    protected readonly constructs: Map<string, IConstruct>;
    /** A map of the capabilities this component provides after synthesis. */
    protected capabilities: ComponentCapabilities;
    /** Tagging service for applying standard tags */
    protected readonly taggingService: ITaggingService;
    /**
     * Constructor for all platform components.
     *
     * @param scope The CDK scope (typically the service stack)
     * @param id Unique identifier for this component instance
     * @param context Service-wide context including environment, compliance framework
     * @param spec Component specification from the service.yml manifest
     */
    constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec, taggingService?: ITaggingService);
    /**
     * The core synthesis method. This method is responsible for:
     * 1. Using the component's ConfigBuilder to assemble final properties
     * 2. Instantiating the underlying native CDK L2 constructs
     * 3. Populating the `constructs` map with construct handles
     * 4. Populating the `capabilities` map with provided capabilities
     *
     * This method MUST be implemented by all components.
     * This method MUST populate both `constructs` and `capabilities` maps.
     * This method MUST be idempotent (safe to call multiple times).
     */
    abstract synth(): void;
    /**
     * Returns the machine-readable capabilities of the component.
     *
     * Capabilities define what this component provides to other components
     * for binding purposes. Each capability must conform to the Standard
     * Capability Vocabulary defined in the platform contract.
     *
     * @throws Error if called before synth() has completed
     * @returns ComponentCapabilities mapping capability keys to their data shapes
     */
    abstract getCapabilities(): ComponentCapabilities;
    /**
     * Returns the component's unique type identifier.
     *
     * This identifier is used for:
     * - Component registry lookups
     * - Schema validation
     * - Binding strategy selection
     * - Audit and compliance reporting
     *
     * @returns string The component type (e.g., 'rds-postgres', 'lambda-api')
     */
    abstract getType(): string;
    /**
     * Retrieves a handle to a synthesized CDK construct.
     *
     * This method provides controlled access to the underlying CDK constructs
     * for advanced use cases like patches or binding strategies that need
     * direct construct access.
     *
     * @param handle The key for the construct (e.g., 'main', 'database', 'securityGroup')
     * @returns The CDK construct or undefined if handle doesn't exist
     */
    getConstruct(handle: string): IConstruct | undefined;
    /**
     * Returns all construct handles available from this component.
     *
     * Useful for debugging, testing, and advanced binding scenarios.
     *
     * @returns Array of available construct handle names
     */
    getConstructHandles(): string[];
    /**
     * Validates that the component has been properly synthesized.
     *
     * This method checks that:
     * - synth() has been called
     * - constructs map is populated
     * - capabilities map is populated
     *
     * @throws Error if component is not properly synthesized
     */
    protected validateSynthesized(): void;
    /**
     * Registers a CDK construct with a handle for later retrieval.
     *
     * This method should be called during synth() to register all
     * important constructs that may need to be accessed by binding
     * strategies or patches.
     *
     * @param handle Unique identifier for this construct
     * @param construct The CDK construct instance
     */
    protected registerConstruct(handle: string, construct: IConstruct): void;
    /**
     * Registers a capability that this component provides.
     *
     * This method should be called during synth() to register all
     * capabilities that other components can bind to.
     *
     * @param capabilityKey The capability key from Standard Capability Vocabulary
     * @param capabilityData The data shape for this capability
     */
    protected registerCapability(capabilityKey: string, capabilityData: any): void;
    /**
     * Applies standard tags to any CDK construct that supports tagging.
     *
     * This method should be called for every taggable resource created by the component
     * to ensure compliance with the Platform Tagging Standard.
     *
     * @param resource The CDK construct to tag (must support Tags.of())
     * @param additionalTags Optional component-specific tags to add
     */
    protected applyStandardTags(resource: IConstruct, additionalTags?: Record<string, string>): void;
    /**
     * Determines backup requirement based on compliance framework and component policy
     */
    private getBackupRequirement;
    /**
     * Determines monitoring level based on compliance framework and component policy
     */
    private getMonitoringLevel;
    /**
     * Apply standardized OpenTelemetry observability configuration to any compute resource.
     *
     * This method implements the Platform OpenTelemetry Observability Standard v1.0 by automatically
     * configuring telemetry collection (traces, metrics, logs) based on compliance framework requirements.
     *
     * @param resource The AWS CDK construct to configure observability for
     * @param options Optional observability configuration overrides
     * @returns Environment variables for OpenTelemetry instrumentation
     */
    protected configureObservability(resource: IConstruct, options?: ObservabilityOptions): Record<string, string>;
    /**
     * Build observability configuration based on compliance framework and component requirements.
     *
     * @param options Component-specific observability options
     * @returns Complete observability configuration conforming to Platform OpenTelemetry Standard v1.0
     */
    private buildObservabilityConfig;
    /**
     * Build OpenTelemetry environment variables for automatic instrumentation.
     */
    private buildOtelEnvironmentVariables;
    /**
     * Get OpenTelemetry collector endpoint based on compliance framework and region.
     */
    private getCollectorEndpoint;
    /**
     * Get trace sampling rate based on compliance framework requirements.
     */
    private getTracesSamplingRate;
    /**
     * Get trace sampler configuration string.
     */
    private getTracesSampler;
    /**
     * Get metrics collection interval based on compliance requirements.
     */
    private getMetricsCollectionInterval;
    /**
     * Get logs retention period in days based on compliance framework.
     */
    private getLogsRetentionPeriod;
    /**
     * Determine if Performance Insights should be enabled for database components.
     */
    private shouldEnablePerformanceInsights;
    /**
     * Determine if X-Ray tracing should be enabled.
     */
    private shouldEnableXRayTracing;
    /**
     * Get platform logger instance configured for this component.
     *
     * This method implements the Platform Structured Logging Standard v1.0 by providing
     * a pre-configured logger with automatic service context and trace correlation.
     *
     * @param loggerName Optional specific logger name, defaults to component name
     * @returns Platform logger instance with automatic context injection
     */
    protected getLogger(loggerName?: string): any;
    /**
     * Log component lifecycle events with standardized format.
     */
    protected logComponentEvent(event: string, message: string, data?: any): void;
    /**
     * Log compliance-related events with automatic security classification.
     */
    protected logComplianceEvent(event: string, message: string, data?: any): void;
    /**
     * Log resource creation events with resource-specific context.
     */
    protected logResourceCreation(resourceType: string, resourceId: string, properties?: any): void;
    /**
     * Log error events with automatic error context and stack traces.
     */
    protected logError(error: Error, context: string, additionalData?: any): void;
    /**
     * Log performance metrics for component operations.
     */
    protected logPerformanceMetric(operation: string, duration: number, additionalMetrics?: any): void;
    /**
     * Determine data classification for logging based on compliance framework.
     */
    private getLogDataClassification;
    /**
     * Determine if audit logging is required based on compliance framework.
     */
    private isAuditLoggingRequired;
    /**
     * Sanitize resource properties to remove sensitive information from logs.
     */
    private sanitizeResourceProperties;
    /**
     * Get service instance identifier for logging context.
     */
    private getServiceInstance;
    /**
     * Get security group handle from this component for binding operations.
     * This is a standardized helper method for all binder strategies.
     *
     * @param role - Whether this component is the 'source' or 'target' in the binding
     * @returns The security group construct or throws error if not found
     */
    _getSecurityGroupHandle(role: 'source' | 'target'): any;
}
export declare const Component: typeof BaseComponent;
