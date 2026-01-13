/**
 * Configuration Builder for StepFunctionsStateMachineComponent Component
 * 
 * Implements the ConfigBuilder pattern as defined in the Platform Component API Contract.
 * Provides 5-layer configuration precedence chain and compliance-aware defaults.
 */

import { ConfigBuilder, ConfigBuilderContext, ComponentConfigSchema, ComponentContext, ComponentSpec } from '@shinobi/core';
import schemaJson from './Config.schema.json' with { type: 'json' };

/**
 * Configuration interface for Step Functions State Machine component
 */
export interface StepFunctionsStateMachineConfig {
  /** State machine name (optional, will be auto-generated) */
  stateMachineName?: string;
  
  /** State machine type */
  stateMachineType?: 'STANDARD' | 'EXPRESS';
  
  /** State machine definition */
  definition?: {
    /** JSON definition as object */
    definition?: any;
    /** Definition from JSON string */
    definitionString?: string;
    /** Definition substitutions */
    definitionSubstitutions?: Record<string, string>;
  };
  
  /** State machine role ARN (optional, will create if not provided) */
  roleArn?: string;
  
  /** Logging configuration */
  loggingConfiguration?: {
    /** Enable logging */
    enabled?: boolean;
    /** Log level */
    level?: 'ALL' | 'ERROR' | 'FATAL' | 'OFF';
    /** Include execution data */
    includeExecutionData?: boolean;
  };
  
  /** Tracing configuration */
  tracingConfiguration?: {
    /** Enable X-Ray tracing */
    enabled?: boolean;
  };
  
  /** Timeout for state machine execution */
  timeout?: {
    /** Timeout in seconds */
    seconds?: number;
  };
  
  /** Additional resource tags */
  tags?: Record<string, string>;
}

/**
 * JSON Schema for Step Functions State Machine configuration validation
 */
export const STEP_FUNCTIONS_STATEMACHINE_CONFIG_SCHEMA: ComponentConfigSchema = schemaJson as ComponentConfigSchema;

/**
 * ConfigBuilder for Step Functions State Machine component
 * 
 * Implements the 5-layer configuration precedence chain:
 * 1. Hardcoded Fallbacks (ultra-safe baseline)
 * 2. Platform Defaults (from platform config)
 * 3. Environment Defaults (from environment config) 
 * 4. Component Overrides (from service.yml)
 * 5. Policy Overrides (from governance policies)
 */
export class StepFunctionsStateMachineConfigBuilder extends ConfigBuilder<StepFunctionsStateMachineConfig> {
  
  constructor(context: ComponentContext, spec: ComponentSpec) {
    const builderContext: ConfigBuilderContext = { context, spec };
    super(builderContext, STEP_FUNCTIONS_STATEMACHINE_CONFIG_SCHEMA);
  }

  /**
   * Layer 1: Hardcoded Fallbacks
   * Ultra-safe baseline configuration that works in any environment
   */
  protected getHardcodedFallbacks(): Partial<StepFunctionsStateMachineConfig> {
    return {
      stateMachineType: 'STANDARD',
      loggingConfiguration: {
        enabled: false,
        level: 'ERROR',
        includeExecutionData: false
      },
      tracingConfiguration: {
        enabled: false
      },
      timeout: {
        seconds: 3600 // 1 hour default
      },
      tags: {}
    };
  }
  
  /**
   * Layer 2: Compliance Framework Defaults
   * Security and compliance-specific configurations
   */
  protected getComplianceFrameworkDefaults(): Partial<StepFunctionsStateMachineConfig> {
    const framework = this.builderContext.context.complianceFramework;
    
    switch (framework) {
      case 'fedramp-moderate':
        return {
          loggingConfiguration: {
            enabled: true, // Mandatory logging for compliance
            level: 'ALL',
            includeExecutionData: true // Required for audit trail
          },
          tracingConfiguration: {
            enabled: true // Required for compliance monitoring
          },
          tags: {
            'compliance-framework': 'fedramp-moderate',
            'logging-level': 'comprehensive',
            'audit-trail': 'enabled'
          }
        };
        
      case 'fedramp-high':
        return {
          loggingConfiguration: {
            enabled: true, // Mandatory
            level: 'ALL',
            includeExecutionData: true // Required for detailed audit
          },
          tracingConfiguration: {
            enabled: true // Mandatory for high security
          },
          timeout: {
            seconds: 1800 // Shorter timeout for security
          },
          tags: {
            'compliance-framework': 'fedramp-high',
            'logging-level': 'comprehensive',
            'audit-trail': 'enabled',
            'security-level': 'high'
          }
        };
        
      default: // commercial
        return {
          loggingConfiguration: {
            enabled: false,
            level: 'ERROR'
          },
          tracingConfiguration: {
            enabled: false
          }
        };
    }
  }
  
  /**
   * Get the JSON Schema for validation
   */
  public getSchema(): any {
    return STEP_FUNCTIONS_STATEMACHINE_CONFIG_SCHEMA;
  }
}
