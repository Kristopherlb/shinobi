/**
 * Configuration Builder for EcsClusterComponent Component
 * 
 * Implements the ConfigBuilder pattern as defined in the Platform Component API Contract.
 * Provides 5-layer configuration precedence chain and compliance-aware defaults.
 */

import { ConfigBuilder, ConfigBuilderContext } from '@shinobi/core';
import ECS_CLUSTER_CONFIG_SCHEMA_JSON from './Config.schema.json' with { type: 'json' };

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
  
  /** Tagging configuration */
  tags?: Record<string, string>;
}

/**
 * JSON Schema for ECS Cluster configuration validation
 */
export const ECS_CLUSTER_CONFIG_SCHEMA = ECS_CLUSTER_CONFIG_SCHEMA_JSON as const;

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
    const config = super.buildSync();
    this.validateConfig(config);
    return config;
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
      tags: {}
    };
  }
  
  /**
   * Layer 2: Compliance Framework Defaults
   * Security and compliance-specific configurations
   */
  protected getComplianceFrameworkDefaults(): Partial<EcsClusterConfig> {
    const framework = this.builderContext.context.complianceFramework;
    
    switch (framework) {
      case 'fedramp-high':
        return {
          containerInsights: true, // Mandatory for high compliance
          monitoring: {
            enabled: true,
            detailedMetrics: true
          },
          capacity: {
            enableMonitoring: true, // Enhanced monitoring required
            instanceType: 'm5.large', // Larger instances for compliance workloads
            minSize: 2, // High availability
            maxSize: 10 // Reasonable scale for compliance
          }
        };
        
      case 'fedramp-moderate':
        return {
          containerInsights: true, // Required for compliance
          monitoring: {
            enabled: true,
            detailedMetrics: true
          },
          capacity: {
            enableMonitoring: true, // Enhanced monitoring
            instanceType: 't3.medium', // Cost-balanced instances
            minSize: 1,
            maxSize: 5
          }
        };
        
      default: // commercial
        return {
          containerInsights: true, // Good practice for commercial
          monitoring: {
            enabled: true,
            detailedMetrics: false
          },
          capacity: {
            enableMonitoring: false, // Cost optimization
            instanceType: 't3.small', // Cost-optimized instances
            minSize: 1,
            maxSize: 3
          }
        };
    }
  }

  private validateConfig(config: EcsClusterConfig): void {
    if (!config.serviceConnect?.namespace?.trim()) {
      throw new Error('serviceConnect.namespace is required for ECS clusters');
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
  }
}
