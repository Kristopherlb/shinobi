/**
 * Configuration Builder for EcsClusterComponent Component
 * 
 * Implements the ConfigBuilder pattern as defined in the Platform Component API Contract.
 * Provides 5-layer configuration precedence chain and compliance-aware defaults.
 */

import { ConfigBuilder, ConfigBuilderContext } from '../@shinobi/core/config-builder.js';

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
export const ECS_CLUSTER_CONFIG_SCHEMA = {
  type: 'object',
  title: 'ECS Cluster Configuration',
  description: 'Configuration for creating an ECS Cluster with Service Connect',
  required: ['serviceConnect'],
  properties: {
    name: {
      type: 'string',
      description: 'Component name (optional, will be auto-generated from component name)',
      pattern: '^[a-zA-Z][a-zA-Z0-9-_]*$',
      maxLength: 128
    },
    description: {
      type: 'string',
      description: 'Component description for documentation',
      maxLength: 1024
    },
    serviceConnect: {
      type: 'object',
      title: 'Service Connect Configuration', 
      description: 'Configuration for ECS Service Connect and service discovery',
      required: ['namespace'],
      properties: {
        namespace: {
          type: 'string',
          description: 'Cloud Map namespace for service discovery',
          pattern: '^[a-zA-Z][a-zA-Z0-9.-]*$',
          minLength: 1,
          maxLength: 64,
          examples: ['internal', 'my-app.internal', 'services']
        }
      },
      additionalProperties: false
    },
    capacity: {
      type: 'object',
      title: 'EC2 Capacity Configuration',
      description: 'Optional EC2 capacity for the cluster. If omitted, cluster is Fargate-only',
      required: ['instanceType', 'minSize', 'maxSize'],
      properties: {
        instanceType: {
          type: 'string',
          description: 'EC2 instance type for cluster instances',
          pattern: '^[a-z][0-9]*[a-z]*\\.[a-z0-9]+$',
          examples: ['t3.medium', 'm5.large', 'c5.xlarge']
        },
        minSize: {
          type: 'number',
          description: 'Minimum number of instances in Auto Scaling Group',
          minimum: 0,
          maximum: 1000
        },
        maxSize: {
          type: 'number',
          description: 'Maximum number of instances in Auto Scaling Group', 
          minimum: 1,
          maximum: 1000
        },
        desiredSize: {
          type: 'number',
          description: 'Desired number of instances (defaults to minSize)',
          minimum: 0,
          maximum: 1000
        },
        keyName: {
          type: 'string',
          description: 'EC2 key pair name for SSH access',
          pattern: '^[a-zA-Z][a-zA-Z0-9_-]*$'
        },
        enableMonitoring: {
          type: 'boolean',
          description: 'Enable detailed CloudWatch monitoring for instances',
          default: false
        }
      },
      additionalProperties: false
    },
    containerInsights: {
      type: 'boolean',
      description: 'Enable Container Insights for advanced monitoring',
      default: true
    },
    clusterName: {
      type: 'string',
      description: 'Override for cluster name (auto-generated if not provided)',
      pattern: '^[a-zA-Z][a-zA-Z0-9-]*$',
      minLength: 1,
      maxLength: 255
    },
    monitoring: {
      type: 'object',
      description: 'Monitoring and observability configuration',
      properties: {
        enabled: {
          type: 'boolean',
          default: true,
          description: 'Enable monitoring'
        },
        detailedMetrics: {
          type: 'boolean',
          default: false,
          description: 'Enable detailed CloudWatch metrics'
        },
        alarms: {
          type: 'object',
          description: 'Component-specific alarm thresholds',
          additionalProperties: true
        }
      },
      additionalProperties: false
    },
    tags: {
      type: 'object',
      description: 'Additional resource tags',
      additionalProperties: { type: 'string' }
    }
  },
  additionalProperties: false
};

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
}