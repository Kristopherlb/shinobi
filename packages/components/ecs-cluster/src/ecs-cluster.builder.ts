/**
 * Configuration Builder for EcsClusterComponent Component
 * 
 * Implements the ConfigBuilder pattern as defined in the Platform Component API Contract.
 * Provides 5-layer configuration precedence chain and compliance-aware defaults.
 */

import { ConfigBuilder, ConfigBuilderContext } from '@shinobi/core';
import ECS_CLUSTER_CONFIG_SCHEMA_JSON from '../Config.schema.json' with { type: 'json' };

/**
 * Configuration interface for ECS Cluster component
 */
export interface EcsClusterConfig {
  /** Component name (optional, will be auto-generated) */
  name?: string;
  
  /** Component description */
  description?: string;
  
  /** Service Connect configuration for microservice discovery */
  serviceConnect: {
    /** Cloud Map namespace for service discovery (e.g., "internal", "my-app.internal") */
    namespace: string;
  };
  
  /** Optional EC2 capacity configuration. If omitted, cluster is Fargate-only */
  capacity?: {
    /** EC2 instance type for the cluster */
    instanceType: string;
    /** Minimum number of instances in the Auto Scaling Group */
    minSize: number;
    /** Maximum number of instances in the Auto Scaling Group */
    maxSize: number;
    /** Desired number of instances (optional, defaults to minSize) */
    desiredSize?: number;
    /** Key pair name for SSH access (optional) */
    keyName?: string;
    /** Enable detailed CloudWatch monitoring (optional, defaults to false) */
    enableMonitoring?: boolean;
    /** Optional CMK used to encrypt instance volumes */
    kmsKeyArn?: string;
  };
  
  /** Container Insights configuration (optional, defaults based on compliance) */
  containerInsights?: boolean;
  
  /** Cluster name override (optional, auto-generated from service and component name) */
  clusterName?: string;
  
  /** Enable detailed monitoring */
  monitoring?: {
    enabled?: boolean;
    detailedMetrics?: boolean;
    alarms?: {
      // TODO: Define component-specific alarm thresholds
    };
  };

  /** Observability configuration for alarms, dashboards, and telemetry */
  observability?: {
    logging?: {
      retentionInDays?: number;
    };
    alarms?: {
      notificationTopicArn?: string;
      severityOverrides?: Record<string, string>;
    };
    dashboard?: {
      enabled?: boolean;
      name?: string;
    };
    tracing?: {
      adotSidecar?: boolean;
      collectorEndpoint?: string;
    };
  };
  
  /** Tagging configuration */
  tags?: Record<string, string>;
  
  /** High-risk environment flag (set via platform config or service.yml). When true, applies enhanced security defaults aligned with FedRAMP requirements. */
  highRiskEnvironment?: boolean;
}

/**
 * JSON Schema for ECS Cluster configuration validation
 */
export const ECS_CLUSTER_CONFIG_SCHEMA = ECS_CLUSTER_CONFIG_SCHEMA_JSON;

/**
 * ConfigBuilder for ECS Cluster component
 * 
 * Implements the 5-layer configuration precedence chain:
 * 1. Hardcoded Fallbacks (ultra-safe baseline)
 * 2. Platform Defaults (from platform config)
 * 3. Environment Defaults (from environment config) 
 * 4. Component Overrides (from service.yml)
 * 5. Policy Overrides (from governance policies)
 */
export class EcsClusterComponentConfigBuilder extends ConfigBuilder<EcsClusterConfig> {
 
  public buildSync(): EcsClusterConfig {
    // Get all layers
    const hardcodedFallbacks = this.getHardcodedFallbacks();
    const platformConfig = (this as any)._loadPlatformConfiguration();
    const environmentConfig = (this as any)._getEnvironmentConfiguration();
    const componentOverrides = this.builderContext.spec.config || {};
    const policyOverrides = (this as any)._getPolicyOverrides();
    const complianceDefaults = this.getComplianceFrameworkDefaults();
    
    // Merge in precedence order: hardcoded < platform < compliance < environment < component < policy
    const mergedConfig = (this as any)._deepMergeConfigs(
      hardcodedFallbacks,
      platformConfig,
      complianceDefaults,
      environmentConfig,
      componentOverrides,
      policyOverrides
    );
    
    // Resolve environment interpolations (${env:key} patterns)
    const resolvedConfig = (this as any)._resolveEnvironmentInterpolationsSync(mergedConfig);
    
    // Validate final config
    this.validateConfig(resolvedConfig);
    return resolvedConfig;
  }
  
  constructor(context: ConfigBuilderContext) {
    super(context, ECS_CLUSTER_CONFIG_SCHEMA);
  }
  
  /**
   * Layer 1: Hardcoded Fallbacks
   * Ultra-safe baseline configuration that works in any environment
   */
  protected getHardcodedFallbacks(): Partial<EcsClusterConfig> {
    return {
      serviceConnect: {
        namespace: 'internal' // Safe default namespace
      },
      containerInsights: true, // Enable observability by default
      monitoring: {
        enabled: true,
        detailedMetrics: false
      },
      observability: {
        logging: {
          retentionInDays: 30
        },
        alarms: {},
        dashboard: {
          enabled: true
        },
        tracing: {
          adotSidecar: true
        }
      },
      tags: {}
    };
  }
  
  /**
   * Layer 2: Compliance Framework Defaults
   * 
   * Provides sensible defaults based on risk assessment flags rather than framework checks.
   * High-risk environment defaults can be set via:
   * - Platform config files (`/config/{framework}.yml`) setting `highRiskEnvironment: true`
   * - Service-level configuration in `service.yml`
   * - Environment defaults
   * 
   * This ensures configuration is data-driven and risk-based, not framework-dependent.
   */
  protected getComplianceFrameworkDefaults(): Partial<EcsClusterConfig> {
    // Check if highRiskEnvironment flag is set in component config or platform config
    const componentConfig = this.builderContext.spec.config as Partial<EcsClusterConfig> | undefined;
    let isHighRisk = componentConfig?.highRiskEnvironment ?? false;
    
    // Also check platform config if available (loaded by base class)
    try {
      const platformConfig = (this as any)._loadPlatformConfiguration();
      if (platformConfig?.highRiskEnvironment) {
        isHighRisk = true;
      }
    } catch {
      // Platform config might not be available in tests, ignore
    }
    
    // Don't force capacity defaults - capacity should only be added if:
    // 1. User explicitly requests it in spec.config.capacity, OR
    // 2. Platform config provides it
    // Compliance framework defaults should not force capacity on minimal clusters
    const userConfig = this.builderContext.spec.config || {};
    const hasUserCapacity = userConfig.capacity !== undefined && userConfig.capacity !== null;
    
    if (isHighRisk) {
      // Apply enhanced security defaults for high-risk environments
      // These defaults align with FedRAMP Moderate/High requirements when highRiskEnvironment is set
      const highRiskDefaults: Partial<EcsClusterConfig> = {
        containerInsights: true, // Mandatory for high-risk environments
        monitoring: {
          enabled: true,
          detailedMetrics: true
        },
        observability: {
          logging: {
            retentionInDays: 365 // Can be overridden to 2555 for higher risk scenarios
          }
        }
      };
      
      // Only add capacity defaults if user has explicitly provided capacity config
      // This ensures minimal clusters remain minimal even for high-risk environments
      if (hasUserCapacity && typeof userConfig.capacity === 'object') {
        // User provided capacity config - enhance it with high-risk defaults
        highRiskDefaults.capacity = {
          enableMonitoring: true, // Enhanced monitoring required
          instanceType: 'm5.large', // Larger instances for high-risk workloads
          minSize: 2, // High availability
          maxSize: 10, // Reasonable scale for high-risk environments
          ...(userConfig.capacity as any) // Merge with user's capacity config
        };
      }
      // If user didn't provide capacity, don't add it - keep cluster minimal
      
      return highRiskDefaults;
    }
    
    return {}; // Standard/default environment - use hardcoded fallbacks
  }

  private validateConfig(config: EcsClusterConfig): void {
    if (!config.serviceConnect?.namespace?.trim()) {
      throw new Error('serviceConnect.namespace is required for ECS clusters');
    }

    if (config.monitoring?.enabled === false) {
      throw new Error('monitoring.enabled cannot be set to false for ECS clusters');
    }

    if (config.capacity) {
      const { minSize, maxSize, desiredSize } = config.capacity;

      if (minSize > maxSize) {
        throw new Error('capacity.minSize cannot be greater than capacity.maxSize');
      }

      if (desiredSize !== undefined) {
        if (desiredSize < minSize || desiredSize > maxSize) {
          throw new Error('capacity.desiredSize must be between minSize and maxSize');
        }
      }
    }

    const retention = config.observability?.logging?.retentionInDays;
    if (retention !== undefined && retention <= 0) {
      throw new Error('observability.logging.retentionInDays must be greater than zero when provided');
    }
  }
}
