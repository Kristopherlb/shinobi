/**
 * Component API Contract Specification v1.0
 * 
 * This file defines the core Component abstract class and interfaces that
 * all components in the platform must implement. This contract ensures that
 * every component is a predictable, secure, and composable building block.
 */

import * as cdk from 'aws-cdk-lib';
import { Construct, IConstruct } from 'constructs';
import { ComponentSpec, ComponentContext, ComponentCapabilities } from './interfaces';

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
 * Abstract base class that all platform components MUST extend.
 * 
 * This class enforces the implementation of a standard interface that ensures
 * components are:
 * - Predictable: Standard lifecycle methods (synth, getCapabilities)
 * - Secure: Proper construct encapsulation and capability exposure
 * - Composable: Standard binding interface through capabilities
 */
export abstract class Component extends Construct {
  /** The component's specification from the service manifest. */
  protected readonly spec: ComponentSpec;
  
  /** The context of the service this component belongs to. */
  protected readonly context: ComponentContext;
  
  /** A map of handles to the real, synthesized CDK constructs. */
  protected readonly constructs: Map<string, IConstruct> = new Map();
  
  /** A map of the capabilities this component provides after synthesis. */
  protected capabilities: ComponentCapabilities = {};

  /**
   * Constructor for all platform components.
   * 
   * @param scope The CDK scope (typically the service stack)
   * @param id Unique identifier for this component instance
   * @param context Service-wide context including environment, compliance framework
   * @param spec Component specification from the service.yml manifest
   */
  constructor(
    scope: Construct,
    id: string,
    context: ComponentContext,
    spec: ComponentSpec
  ) {
    super(scope, id);
    this.context = context;
    this.spec = spec;
  }

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
  public abstract synth(): void;

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
  public abstract getCapabilities(): ComponentCapabilities;

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
  public abstract getType(): string;

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
  public getConstruct(handle: string): IConstruct | undefined {
    return this.constructs.get(handle);
  }

  /**
   * Returns all construct handles available from this component.
   * 
   * Useful for debugging, testing, and advanced binding scenarios.
   * 
   * @returns Array of available construct handle names
   */
  public getConstructHandles(): string[] {
    return Array.from(this.constructs.keys());
  }

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
  protected validateSynthesized(): void {
    if (this.constructs.size === 0) {
      throw new Error(`Component ${this.node.id} has not been synthesized. Call synth() before accessing constructs.`);
    }
    
    if (Object.keys(this.capabilities).length === 0) {
      throw new Error(`Component ${this.node.id} provides no capabilities. Components must expose at least one capability.`);
    }
  }

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
  protected registerConstruct(handle: string, construct: IConstruct): void {
    if (this.constructs.has(handle)) {
      throw new Error(`Construct handle '${handle}' is already registered in component ${this.node.id}`);
    }
    
    this.constructs.set(handle, construct);
  }

  /**
   * Registers a capability that this component provides.
   * 
   * This method should be called during synth() to register all
   * capabilities that other components can bind to.
   * 
   * @param capabilityKey The capability key from Standard Capability Vocabulary
   * @param capabilityData The data shape for this capability
   */
  protected registerCapability(capabilityKey: string, capabilityData: any): void {
    this.capabilities[capabilityKey] = capabilityData;
  }

  /**
   * Builds standardized tags according to the Platform Tagging Standard v1.0.
   * 
   * This method creates the complete set of mandatory tags that must be applied
   * to all AWS resources created by platform components.
   * 
   * @returns Record of tag keys to tag values
   */
  protected buildStandardTags(): Record<string, string> {
    const now = new Date();
    const deploymentId = `deploy-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;
    
    return {
      // Core Service Tags
      'service-name': this.context.serviceName,
      'service-version': this.context.serviceLabels?.version || '1.0.0',
      'component-name': this.spec.name,
      'component-type': this.getType(),
      
      // Environment & Deployment Tags
      'environment': this.context.environment,
      'region': this.context.region,
      'deployed-by': `platform-v1.0.0`,
      'deployment-id': deploymentId,
      
      // Governance & Compliance Tags
      'compliance-framework': this.context.complianceFramework,
      'data-classification': this.spec.labels?.['data-classification'] || 'internal',
      'backup-required': this.getBackupRequirement().toString(),
      'monitoring-level': this.getMonitoringLevel(),
      
      // Cost Management Tags
      'cost-center': this.context.serviceLabels?.['cost-center'] || 'engineering',
      'billing-project': this.context.serviceLabels?.['billing-project'] || this.context.serviceName,
      'resource-owner': this.context.serviceLabels?.['resource-owner'] || 'platform-team'
    };
  }

  /**
   * Applies standard tags to any CDK construct that supports tagging.
   * 
   * This method should be called for every taggable resource created by the component
   * to ensure compliance with the Platform Tagging Standard.
   * 
   * @param resource The CDK construct to tag (must support Tags.of())
   * @param additionalTags Optional component-specific tags to add
   */
  protected applyStandardTags(resource: IConstruct, additionalTags?: Record<string, string>): void {
    const standardTags = this.buildStandardTags();
    
    // Apply all standard tags
    Object.entries(standardTags).forEach(([key, value]) => {
      cdk.Tags.of(resource).add(key, value);
    });
    
    // Apply any additional component-specific tags
    if (additionalTags) {
      Object.entries(additionalTags).forEach(([key, value]) => {
        cdk.Tags.of(resource).add(key, value);
      });
    }
  }

  /**
   * Determines backup requirement based on compliance framework and component policy
   */
  private getBackupRequirement(): boolean {
    // Check component policy first
    if (this.spec.policy?.backup?.enabled !== undefined) {
      return this.spec.policy.backup.enabled;
    }
    
    // Default based on compliance framework
    switch (this.context.complianceFramework) {
      case 'fedramp-high':
      case 'fedramp-moderate':
        return true;
      default:
        return false;
    }
  }

  /**
   * Determines monitoring level based on compliance framework and component policy
   */
  private getMonitoringLevel(): string {
    if (this.spec.policy?.monitoring?.metricsEnabled) {
      return this.context.complianceFramework === 'fedramp-high' ? 'comprehensive' : 'enhanced';
    }
    
    switch (this.context.complianceFramework) {
      case 'fedramp-high':
        return 'comprehensive';
      case 'fedramp-moderate':
        return 'enhanced';
      default:
        return 'basic';
    }
  }

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
  protected configureObservability(resource: IConstruct, options: ObservabilityOptions = {}): Record<string, string> {
    const otelConfig = this.buildObservabilityConfig(options);
    return this.buildOtelEnvironmentVariables(otelConfig);
  }

  /**
   * Build observability configuration based on compliance framework and component requirements.
   * 
   * @param options Component-specific observability options
   * @returns Complete observability configuration conforming to Platform OpenTelemetry Standard v1.0
   */
  private buildObservabilityConfig(options: ObservabilityOptions = {}): ObservabilityConfig {
    return {
      collectorEndpoint: options.collectorEndpoint || this.getCollectorEndpoint(),
      serviceName: options.serviceName || this.spec.name,
      serviceVersion: this.context.serviceLabels?.version || '1.0.0',
      environment: this.context.environment,
      region: this.context.region,
      complianceFramework: this.context.complianceFramework,
      tracesSampling: options.tracesSampling ?? this.getTracesSamplingRate(),
      metricsInterval: options.metricsInterval ?? this.getMetricsCollectionInterval(),
      logsRetention: options.logsRetention ?? this.getLogsRetentionPeriod(),
      enablePerformanceInsights: options.enablePerformanceInsights ?? this.shouldEnablePerformanceInsights(),
      enableXRayTracing: options.enableXRayTracing ?? this.shouldEnableXRayTracing(),
      customAttributes: options.customAttributes || {}
    };
  }

  /**
   * Build OpenTelemetry environment variables for automatic instrumentation.
   */
  private buildOtelEnvironmentVariables(config: ObservabilityConfig): Record<string, string> {
    const resourceAttributes = [
      `service.name=${config.serviceName}`,
      `service.version=${config.serviceVersion}`,
      `deployment.environment=${config.environment}`,
      `cloud.provider=aws`,
      `cloud.region=${config.region}`,
      `compliance.framework=${config.complianceFramework}`,
      `component.name=${this.spec.name}`,
      `component.type=${this.getType()}`
    ];

    // Add custom attributes
    Object.entries(config.customAttributes).forEach(([key, value]) => {
      resourceAttributes.push(`${key}=${value}`);
    });

    const envVars: Record<string, string> = {
      'OTEL_EXPORTER_OTLP_ENDPOINT': config.collectorEndpoint,
      'OTEL_EXPORTER_OTLP_HEADERS': `authorization=Bearer \${OTEL_COLLECTOR_AUTH_TOKEN}`,
      'OTEL_SERVICE_NAME': config.serviceName,
      'OTEL_SERVICE_VERSION': config.serviceVersion,
      'OTEL_RESOURCE_ATTRIBUTES': resourceAttributes.join(','),
      'OTEL_TRACES_SAMPLER': this.getTracesSampler(config.tracesSampling),
      'OTEL_METRICS_EXPORTER': 'otlp',
      'OTEL_LOGS_EXPORTER': 'otlp',
      'OTEL_PROPAGATORS': 'tracecontext,baggage,xray',
      'OTEL_INSTRUMENTATION_COMMON_DEFAULT_ENABLED': 'true'
    };

    // Add X-Ray tracing if enabled
    if (config.enableXRayTracing) {
      envVars['_X_AMZN_TRACE_ID'] = 'Root=1-\${AWS_X_RAY_TRACE_ID}';
      envVars['OTEL_INSTRUMENTATION_AWS_LAMBDA_ENABLED'] = 'true';
      envVars['OTEL_INSTRUMENTATION_AWS_LAMBDA_FLUSH_TIMEOUT'] = '30000';
    }

    return envVars;
  }

  /**
   * Get OpenTelemetry collector endpoint based on compliance framework and region.
   */
  private getCollectorEndpoint(): string {
    const framework = this.context.complianceFramework;
    const region = this.context.region;
    
    switch (framework) {
      case 'fedramp-high':
        return `https://otel-collector.fedramp-high.${region}.platform.local:4317`;
      case 'fedramp-moderate':
        return `https://otel-collector.fedramp-moderate.${region}.platform.local:4317`;
      default:
        return `https://otel-collector.commercial.${region}.platform.local:4317`;
    }
  }

  /**
   * Get trace sampling rate based on compliance framework requirements.
   */
  private getTracesSamplingRate(): number {
    const framework = this.context.complianceFramework;
    
    switch (framework) {
      case 'fedramp-high':
        return 1.0; // 100% sampling for complete audit trail
      case 'fedramp-moderate':
        return 0.25; // 25% sampling for enhanced monitoring
      default:
        return 0.1; // 10% sampling for cost optimization
    }
  }

  /**
   * Get trace sampler configuration string.
   */
  private getTracesSampler(samplingRate: number): string {
    if (samplingRate >= 1.0) {
      return 'always_on';
    } else if (samplingRate <= 0.0) {
      return 'always_off';
    } else {
      return `traceidratio:${samplingRate}`;
    }
  }

  /**
   * Get metrics collection interval based on compliance requirements.
   */
  private getMetricsCollectionInterval(): number {
    const framework = this.context.complianceFramework;
    
    switch (framework) {
      case 'fedramp-high':
        return 30; // 30 seconds for high-frequency monitoring
      case 'fedramp-moderate':
        return 60; // 1 minute for standard monitoring
      default:
        return 300; // 5 minutes for cost-effective monitoring
    }
  }

  /**
   * Get logs retention period in days based on compliance framework.
   */
  private getLogsRetentionPeriod(): number {
    const framework = this.context.complianceFramework;
    
    switch (framework) {
      case 'fedramp-high':
        return 2555; // 7 years (approximately)
      case 'fedramp-moderate':
        return 1095; // 3 years
      default:
        return 365; // 1 year
    }
  }

  /**
   * Determine if Performance Insights should be enabled for database components.
   */
  private shouldEnablePerformanceInsights(): boolean {
    const framework = this.context.complianceFramework;
    return framework !== 'commercial'; // Enable for all compliance frameworks
  }

  /**
   * Determine if X-Ray tracing should be enabled.
   */
  private shouldEnableXRayTracing(): boolean {
    const framework = this.context.complianceFramework;
    return framework === 'fedramp-moderate' || framework === 'fedramp-high';
  }
}