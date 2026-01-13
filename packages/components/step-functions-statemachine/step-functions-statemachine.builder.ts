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
  /** High-risk environment flag (set via platform config or service.yml) */
  highRiskEnvironment?: boolean;
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
   * 
   * Provides sensible defaults based on risk assessment flags rather than framework checks.
   * High-risk environment defaults can be set via:
   * - Platform config files (`/config/{framework}.yml`) setting `highRiskEnvironment: true`
   * - Service-level configuration in `service.yml`
   * - Environment defaults
   * 
   * This ensures configuration is data-driven and risk-based, not framework-dependent.
   */
  protected getComplianceFrameworkDefaults(): Partial<StepFunctionsStateMachineConfig> {
    // Check if highRiskEnvironment flag is set in component config or platform config
    const componentConfig = this.builderContext.spec.config as Partial<StepFunctionsStateMachineConfig> | undefined;
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
    
    if (isHighRisk) {
      // Apply enhanced security defaults for high-risk environments
      // These defaults align with FedRAMP Moderate/High requirements when highRiskEnvironment is set
      return {
        loggingConfiguration: {
          enabled: true, // Mandatory logging for compliance
          level: 'ALL',
          includeExecutionData: true // Required for audit trail
        },
        tracingConfiguration: {
          enabled: true // Required for compliance monitoring
        },
        timeout: {
          seconds: 1800 // Shorter timeout for security (can be overridden)
        },
        tags: {
          'logging-level': 'comprehensive',
          'audit-trail': 'enabled'
        }
      };
    }
    
    return {}; // Standard/default environment - use hardcoded fallbacks
  }
  
  /**
   * Get the JSON Schema for validation
   */
  public getSchema(): any {
    return STEP_FUNCTIONS_STATEMACHINE_CONFIG_SCHEMA;
  }
}
