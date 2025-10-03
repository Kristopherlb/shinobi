/**
 * Configuration Builder for SqsQueueNew Component
 * 
 * Implements the ConfigBuilder pattern as defined in the Platform Component API Contract.
 * Provides 5-layer configuration precedence chain and compliance-aware defaults.
 * 
 * @author Platform Team
 * @category messaging
 * @service SQS
 */

import { ConfigBuilder, ConfigBuilderContext } from '../../platform/contracts/config-builder.ts';

/**
 * Configuration interface for SqsQueueNew component
 */
export interface SqsQueueNewConfig {
  /** Component name (optional, will be auto-generated) */
  name?: string;
  
  /** Component description */
  description?: string;
  
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
  
  // TODO: Add component-specific configuration properties
  // Example for SQS service:
  // 
  // /** SQS specific configuration */
  // sqs?: {
  //   // Add service-specific properties here
  // };
}

/**
 * JSON Schema for SqsQueueNew configuration validation
 */
export const SQS_QUEUE_NEW_CONFIG_SCHEMA = {
  type: 'object',
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
        }
      },
      additionalProperties: false
    },
    tags: {
      type: 'object',
      description: 'Additional resource tags',
      additionalProperties: { type: 'string' }
    }
    // TODO: Add component-specific schema properties
  },
  additionalProperties: false
};

/**
 * ConfigBuilder for SqsQueueNew component
 * 
 * Implements the 5-layer configuration precedence chain:
 * 1. Hardcoded Fallbacks (ultra-safe baseline)
 * 2. Platform Defaults (from platform config)
 * 3. Environment Defaults (from environment config) 
 * 4. Component Overrides (from service.yml)
 * 5. Policy Overrides (from governance policies)
 */
export class SqsQueueNewConfigBuilder extends ConfigBuilder<SqsQueueNewConfig> {
  
  /**
   * Layer 1: Hardcoded Fallbacks
   * Ultra-safe baseline configuration that works in any environment
   */
  protected getHardcodedFallbacks(): Partial<SqsQueueNewConfig> {
    return {
      monitoring: {
        enabled: true,
        detailedMetrics: false
      },
      tags: {}
      // TODO: Add component-specific hardcoded fallbacks
    };
  }
  
  /**
   * Layer 2: Compliance Framework Defaults
   * Security and compliance-specific configurations
   */
  protected getComplianceFrameworkDefaults(): Partial<SqsQueueNewConfig> {
    const framework = this.context.complianceFramework;
    
    const baseCompliance: Partial<SqsQueueNewConfig> = {
      monitoring: {
        enabled: true,
        detailedMetrics: true
      }
    };
    
    if (framework === 'fedramp-moderate' || framework === 'fedramp-high') {
      return {
        ...baseCompliance,
        monitoring: {
          ...baseCompliance.monitoring,
          detailedMetrics: true // Mandatory for FedRAMP
        }
        // TODO: Add FedRAMP-specific compliance defaults
      };
    }
    
    return baseCompliance;
  }
  
  /**
   * Get the JSON Schema for validation
   */
  public getSchema(): any {
    return SQS_QUEUE_NEW_CONFIG_SCHEMA;
  }
}