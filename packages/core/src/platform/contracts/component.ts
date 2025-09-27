/**
 * Component API Contract Specification v1.0
 * 
 * This file defines the core Component abstract class and interfaces that
 * all components in the platform must implement. This contract ensures that
 * every component is a predictable, secure, and composable building block.
 */

import * as cdk from 'aws-cdk-lib';
import { Construct, IConstruct } from 'constructs';
import { ComponentSpec, ComponentContext, ComponentCapabilities, IComponent } from './component-interfaces';
import { ITaggingService, TaggingContext, defaultTaggingService } from '../services/tagging-service/tagging.service';
import { IObservabilityService, defaultObservabilityService } from '../services/observability';
import { ILoggingService, defaultLoggingService } from '../services/logging';
import { IGovernanceService, GovernanceMetadata, defaultGovernanceService } from '../services/governance';
import { IComplianceService, defaultComplianceService } from '../services/compliance';
import { ISecurityService, defaultSecurityService } from '../services/security';
import { ISecurityOperationsService, defaultSecurityOperationsService } from '../services/security-operations';
import { ICostManagementService, defaultCostManagementService } from '../services/cost-management';
import { IBackupRecoveryService, defaultBackupRecoveryService } from '../services/backup-recovery';
import { IPerformanceOptimizationService, defaultPerformanceOptimizationService } from '../services/performance';
import { IFeatureFlagService, defaultFeatureFlagService } from '../services/feature-flags';

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

interface BaseComponentServices {
  taggingService: ITaggingService;
  observabilityService: IObservabilityService;
  loggingService: ILoggingService;
  governanceService: IGovernanceService;
  complianceService: IComplianceService;
  securityService: ISecurityService;
  costManagementService: ICostManagementService;
  backupRecoveryService: IBackupRecoveryService;
  performanceOptimizationService: IPerformanceOptimizationService;
  featureFlagService: IFeatureFlagService;
  securityOperationsService: ISecurityOperationsService;
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
export abstract class BaseComponent extends Construct implements IComponent {
  /** The component's specification from the service manifest. */
  public readonly spec: ComponentSpec;

  /** The context of the service this component belongs to. */
  public readonly context: ComponentContext;

  /** A map of handles to the real, synthesized CDK constructs. */
  protected readonly constructs: Map<string, IConstruct> = new Map();

  /** A map of the capabilities this component provides after synthesis. */
  protected capabilities: ComponentCapabilities = {};

  /** Services injected for cross-cutting platform concerns */
  protected readonly taggingService: ITaggingService;
  protected readonly observabilityService: IObservabilityService;
  protected readonly loggingService: ILoggingService;
  protected readonly governanceService: IGovernanceService;
  protected readonly complianceService: IComplianceService;
  protected readonly securityService: ISecurityService;
  protected readonly costManagementService: ICostManagementService;
  protected readonly backupRecoveryService: IBackupRecoveryService;
  protected readonly performanceOptimizationService: IPerformanceOptimizationService;
  protected readonly featureFlagService: IFeatureFlagService;
  protected readonly securityOperationsService: ISecurityOperationsService;

  private governanceMetadataCache?: GovernanceMetadata;

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
    spec: ComponentSpec,
    services: Partial<BaseComponentServices> = {}
  ) {
    super(scope, id);
    this.context = context;
    this.spec = spec;
    this.taggingService = services.taggingService ?? defaultTaggingService;
    this.observabilityService = services.observabilityService ?? defaultObservabilityService;
    this.loggingService = services.loggingService ?? defaultLoggingService;
    this.governanceService = services.governanceService ?? defaultGovernanceService;
    this.complianceService = services.complianceService ?? defaultComplianceService;
    this.securityService = services.securityService ?? defaultSecurityService;
    this.costManagementService = services.costManagementService ?? defaultCostManagementService;
    this.backupRecoveryService = services.backupRecoveryService ?? defaultBackupRecoveryService;
    this.performanceOptimizationService = services.performanceOptimizationService ?? defaultPerformanceOptimizationService;
    this.featureFlagService = services.featureFlagService ?? defaultFeatureFlagService;
    this.securityOperationsService = services.securityOperationsService ?? defaultSecurityOperationsService;
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
   * Returns the component name.
   */
  public getName(): string {
    return this.spec.name;
  }

  /**
   * Returns the component ID.
   */
  public getId(): string {
    return this.node.id;
  }

  /**
   * Returns the service name this component belongs to.
   */
  public getServiceName(): string {
    return this.context.serviceName;
  }

  /**
   * Returns the capability data for this component.
   */
  public getCapabilityData(): any {
    return this.getCapabilities();
  }

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
   * Applies standard tags to any CDK construct that supports tagging.
   * 
   * This method should be called for every taggable resource created by the component
   * to ensure compliance with the Platform Tagging Standard.
   * 
   * @param resource The CDK construct to tag (must support Tags.of())
   * @param additionalTags Optional component-specific tags to add
   */
  protected applyStandardTags(resource: IConstruct, additionalTags?: Record<string, string>): void {
    const taggingContext: TaggingContext = {
      serviceName: this.context.serviceName,
      serviceLabels: this.context.serviceLabels,
      componentName: this.spec.name,
      componentType: this.getType(),
      environment: this.context.environment,
      region: this.context.region,
      accountId: this.context.accountId,
      complianceFramework: this.context.complianceFramework,
      tags: this.context.tags,
      governance: this.governanceMetadata
    };

    this.taggingService.applyStandardTags(resource, taggingContext, additionalTags);
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
    const config = this.observabilityService.buildConfig({
      context: this.context,
      spec: this.spec,
      policy: this.spec.policy,
      options,
      governance: this.governanceMetadata
    });

    return this.observabilityService.buildEnvironmentVariables(config, this.governanceMetadata);
  }

  protected get governanceMetadata(): GovernanceMetadata {
    if (!this.governanceMetadataCache) {
      this.governanceMetadataCache = this.governanceService.resolveGovernance({
        context: this.context,
        spec: this.spec,
        policy: this.spec.policy,
        tags: this.context.tags,
        serviceLabels: this.context.serviceLabels,
        logging: this.context.logging,
        observability: this.context.observability
      });
    }

    return this.governanceMetadataCache;
  }

  /**
   * Get platform logger instance configured for this component.
   * 
   * This method implements the Platform Structured Logging Standard v1.0 by providing
   * a pre-configured logger with automatic service context and trace correlation.
   * 
   * @param loggerName Optional specific logger name, defaults to component name
   * @returns Platform logger instance with automatic context injection
   */
  protected getLogger(loggerName?: string): any {
    return this.loggingService.getLogger({
      component: this.spec,
      context: this.context,
      governance: this.governanceMetadata
    }, loggerName);
  }
  protected logComponentEvent(event: string, message: string, data?: any): void {
    const logger = this.getLogger();

    logger.info(message, {
      context: {
        action: 'component_lifecycle',
        resource: this.spec.name,
        component: this.getType(),
        operationId: `${event}_${this.spec.name}`
      },
      data: {
        event,
        componentName: this.spec.name,
        componentType: this.getType(),
        ...data
      },
      security: {
        classification: this.governanceMetadata.dataClassification,
        auditRequired: this.governanceMetadata.auditLoggingRequired
      }
    });
  }

  /**
   * Log compliance-related events with automatic security classification.
   */
  protected logComplianceEvent(event: string, message: string, data?: any): void {
    const logger = this.getLogger();

    logger.info(message, {
      context: {
        action: 'compliance_event',
        resource: this.spec.name,
        component: this.getType(),
        operationId: `compliance_${event}_${this.spec.name}`
      },
      data: {
        complianceFramework: this.context.complianceFramework,
        event,
        ...data
      },
      security: {
        classification: this.governanceMetadata.dataClassification,
        auditRequired: true,
        securityEvent: 'compliance_action'
      }
    });
  }

  /**
   * Log resource creation events with resource-specific context.
   */
  protected logResourceCreation(resourceType: string, resourceId: string, properties?: any): void {
    const logger = this.getLogger();

    logger.info(`${resourceType} created successfully`, {
      context: {
        action: 'resource_creation',
        resource: resourceType,
        component: this.getType(),
        operationId: `create_${resourceType}_${resourceId}`
      },
      data: {
        resourceType,
        resourceId,
        componentName: this.spec.name,
        properties: this.sanitizeResourceProperties(properties)
      },
      security: {
        classification: this.governanceMetadata.dataClassification,
        auditRequired: this.governanceMetadata.auditLoggingRequired
      }
    });
  }

  /**
   * Log error events with automatic error context and stack traces.
   */
  protected logError(error: Error, context: string, additionalData?: any): void {
    const logger = this.getLogger();

    logger.error(`Error in ${context}`, error, {
      context: {
        action: 'error_event',
        resource: this.spec.name,
        component: this.getType(),
        operationId: `error_${this.spec.name}_${Date.now()}`
      },
      data: {
        errorContext: context,
        componentName: this.spec.name,
        componentType: this.getType(),
        ...additionalData
      },
      security: {
        classification: this.governanceMetadata.dataClassification,
        auditRequired: true,
        securityEvent: 'system_error'
      }
    });
  }

  /**
   * Log performance metrics for component operations.
   */
  protected logPerformanceMetric(operation: string, duration: number, additionalMetrics?: any): void {
    const logger = this.getLogger();

    logger.info(`Performance metric: ${operation}`, {
      context: {
        action: 'performance_measurement',
        resource: this.spec.name,
        component: this.getType(),
        operationId: `perf_${operation}_${this.spec.name}`
      },
      data: {
        operation,
        componentName: this.spec.name
      },
      performance: {
        duration,
        ...additionalMetrics
      },
      security: {
        classification: this.governanceMetadata.dataClassification,
        auditRequired: this.governanceMetadata.auditLoggingRequired
      }
    });
  }

  /**
   * Sanitize resource properties to remove sensitive information from logs.
   */
  private sanitizeResourceProperties(properties?: any): any {
    if (properties === undefined || properties === null) {
      return {};
    }

    const securityPreferences = this.context.security ?? {};
    const patternInputs = securityPreferences.sensitivePatterns ?? [];
    const sensitivePatterns = patternInputs.map(pattern => {
      try {
        return new RegExp(pattern, 'i');
      } catch {
        return new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      }
    });

    return this.securityService.sanitizeProperties(properties, {
      sensitiveKeys: securityPreferences.sensitiveKeys,
      sensitivePatterns,
      maskValue: securityPreferences.maskValue,
      maxDepth: securityPreferences.maxDepth
    });
  }

  /**
   * Get security group handle from this component for binding operations.
   * This is a standardized helper method for all binder strategies.
   * 
   * @param role - Whether this component is the 'source' or 'target' in the binding
   * @returns The security group construct or throws error if not found
   */
  public _getSecurityGroupHandle(role: 'source' | 'target'): any {
    try {
      return this.securityService.getSecurityGroupHandle(this, role);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(
        `Failed to resolve security group for ${role} component '${this.node.id}': ${message}`
      );
    }
  }
}

// Backwards compatibility export - maintains existing import patterns
export const Component = BaseComponent;
