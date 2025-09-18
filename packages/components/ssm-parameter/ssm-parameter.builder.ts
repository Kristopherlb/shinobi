/**
 * Configuration Builder for SSM Parameter Component
 * 
 * Implements the ConfigBuilder pattern as defined in the Platform Component API Contract.
 * Provides 5-layer configuration precedence chain and compliance-aware defaults.
 */

import { ConfigBuilder, ConfigBuilderContext } from '../@shinobi/core/config-builder';

/**
 * Configuration interface for SSM Parameter component
 */
export interface SsmParameterConfig {
  /** Parameter name (required) */
  parameterName: string;
  
  /** Parameter description */
  description?: string;
  
  /** Parameter type - platform abstraction for common use cases */
  parameterType?: 'configuration' | 'secret' | 'feature-flag' | 'connection-string';
  
  /** Parameter value */
  value?: string;
  
  /** Parameter sensitivity level - determines encryption and access patterns */
  sensitivityLevel?: 'public' | 'internal' | 'confidential';
  
  /** Value validation pattern - platform-managed patterns for common types */
  validationPattern?: 'url' | 'email' | 'json' | 'base64' | 'custom';
  
  /** Custom validation regex (only when validationPattern is 'custom') */
  customValidationPattern?: string;
  
  /** Encryption configuration for SecureString parameters */
  encryption?: {
    /** KMS key ARN for encryption */
    kmsKeyArn?: string;
  };
  
  /** Tags for the parameter */
  tags?: Record<string, string>;
}

/**
 * JSON Schema for SSM Parameter configuration validation
 */
export const SSM_PARAMETER_CONFIG_SCHEMA = {
  type: 'object',
  title: 'SSM Parameter Configuration',
  description: 'Configuration for creating an SSM Parameter Store parameter with platform abstractions',
  required: ['parameterName'],
  properties: {
    parameterName: {
      type: 'string',
      description: 'Name of the parameter (must start with /)',
      pattern: '^/[a-zA-Z0-9_.-/]+$',
      minLength: 1,
      maxLength: 2048
    },
    description: {
      type: 'string',
      description: 'Description of the parameter',
      maxLength: 1024
    },
    parameterType: {
      type: 'string',
      description: 'Parameter type - platform abstraction for common use cases',
      enum: ['configuration', 'secret', 'feature-flag', 'connection-string'],
      default: 'configuration'
    },
    value: {
      type: 'string',
      description: 'Parameter value',
      maxLength: 4096
    },
    sensitivityLevel: {
      type: 'string',
      description: 'Parameter sensitivity level - determines encryption and access patterns',
      enum: ['public', 'internal', 'confidential'],
      default: 'internal'
    },
    validationPattern: {
      type: 'string',
      description: 'Value validation pattern - platform-managed patterns for common types',
      enum: ['url', 'email', 'json', 'base64', 'custom'],
      default: 'custom'
    },
    customValidationPattern: {
      type: 'string',
      description: 'Custom validation regex (only when validationPattern is custom)'
    },
    encryption: {
      type: 'object',
      description: 'Encryption configuration',
      properties: {
        kmsKeyArn: {
          type: 'string',
          description: 'KMS key ARN for SecureString encryption'
        }
      },
      additionalProperties: false
    },
    tags: {
      type: 'object',
      description: 'Tags for the parameter',
      additionalProperties: {
        type: 'string'
      },
      default: {}
    }
  },
  additionalProperties: false
};

/**
 * ConfigBuilder for SSM Parameter component
 * 
 * Implements the 5-layer configuration precedence chain:
 * 1. Hardcoded Fallbacks (ultra-safe baseline)
 * 2. Platform Defaults (from platform config)
 * 3. Environment Defaults (from environment config) 
 * 4. Component Overrides (from service.yml)
 * 5. Policy Overrides (from governance policies)
 */
export class SsmParameterConfigBuilder extends ConfigBuilder<SsmParameterConfig> {
  
  constructor(builderContext: ConfigBuilderContext) {
    super(builderContext, SSM_PARAMETER_CONFIG_SCHEMA);
  }
  
  /**
   * Layer 1: Hardcoded Fallbacks
   * Ultra-safe baseline configuration that works in any environment
   */
  protected getHardcodedFallbacks(): Partial<SsmParameterConfig> {
    return {
      parameterType: 'configuration',
      sensitivityLevel: 'internal',
      validationPattern: 'custom',
      tags: {
        'platform-managed': 'true'
      }
    };
  }
  
  /**
   * Layer 2: Compliance Framework Defaults
   * Security and compliance-specific configurations loaded from platform config files
   */
  protected getComplianceFrameworkDefaults(): Partial<SsmParameterConfig> {
    // All compliance framework defaults are now managed via segregated platform 
    // configuration files (/config/*.yml) following "Configuration over Code" principle
    return {};
  }
  
  /**
   * Get the JSON Schema for validation
   */
  public getSchema(): any {
    return SSM_PARAMETER_CONFIG_SCHEMA;
  }
}