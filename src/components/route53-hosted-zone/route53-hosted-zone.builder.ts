/**
 * Configuration Builder for Route53HostedZoneComponent Component
 * 
 * Implements the ConfigBuilder pattern as defined in the Platform Component API Contract.
 * Provides 5-layer configuration precedence chain and compliance-aware defaults.
 */

import { ConfigBuilder, ConfigBuilderContext } from '../../platform/contracts/config-builder';

/**
 * Configuration interface for Route53HostedZoneComponent component
 */
export interface Route53HostedZoneConfig {
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
}

/**
 * JSON Schema for Route53HostedZoneComponent configuration validation
 */
export const ROUTE53_HOSTED_ZONE_CONFIG_SCHEMA = {
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
 * ConfigBuilder for Route53HostedZoneComponent component
 * 
 * Implements the 5-layer configuration precedence chain:
 * 1. Hardcoded Fallbacks (ultra-safe baseline)
 * 2. Platform Defaults (from platform config)
 * 3. Environment Defaults (from environment config) 
 * 4. Component Overrides (from service.yml)
 * 5. Policy Overrides (from governance policies)
 */
export class Route53HostedZoneComponentConfigBuilder extends ConfigBuilder<Route53HostedZoneConfig> {
  
  /**
   * Layer 1: Hardcoded Fallbacks
   * Ultra-safe baseline configuration that works in any environment
   */
  protected getHardcodedFallbacks(): Partial<Route53HostedZoneConfig> {
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
  protected getComplianceFrameworkDefaults(): Partial<Route53HostedZoneConfig> {
    const framework = this.context.complianceFramework;
    
    const baseCompliance: Partial<Route53HostedZoneConfig> = {
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
    return ROUTE53_HOSTED_ZONE_CONFIG_SCHEMA;
  }
}