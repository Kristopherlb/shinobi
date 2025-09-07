/**
 * Configuration Contract
 * 
 * This file defines the contracts for component configuration, including
 * schema validation, configuration builders, and validation mechanisms.
 */

import { JSONSchema7 } from 'json-schema';

/**
 * Component configuration schema definition.
 * Every component package MUST publish a Config.schema.json file that conforms to this interface.
 */
export interface ComponentConfigSchema extends JSONSchema7 {
  /** Schema must be object type for component configurations */
  type: 'object';
  
  /** 
   * Component-specific title for documentation and error messages 
   * Should follow pattern: "{ComponentType} Configuration"
   */
  title: string;
  
  /** Human-readable description of what this component does */
  description: string;
  
  /** Required properties that must be provided in the config block */
  required?: string[];
  
  /** Property definitions with types, descriptions, and validation rules */
  properties: {
    [key: string]: JSONSchema7;
  };
  
  /** Additional properties policy - typically false for strict validation */
  additionalProperties?: boolean;
  
  /** 
   * Default values that will be applied if not provided in config.
   * These should focus on non-functional requirements like monitoring,
   * encryption, etc. Business logic parameters should be explicitly required.
   */
  defaults?: Record<string, any>;
}

/**
 * Configuration validation result.
 * Returned by the SchemaValidationHandler when validating component configurations.
 */
export interface ConfigValidationResult {
  /** Whether the configuration is valid */
  valid: boolean;
  
  /** Validation errors if invalid */
  errors?: ConfigValidationError[];
  
  /** Warnings for deprecated or suboptimal configurations */
  warnings?: ConfigValidationWarning[];
  
  /** The validated configuration with defaults applied */
  validatedConfig?: Record<string, any>;
}

/**
 * Configuration validation error.
 */
export interface ConfigValidationError {
  /** JSONPath to the invalid property */
  path: string;
  
  /** Error message */
  message: string;
  
  /** The invalid value */
  value?: any;
  
  /** Suggested correction if available */
  suggestion?: string;
}

/**
 * Configuration validation warning.
 */
export interface ConfigValidationWarning {
  /** JSONPath to the property causing the warning */
  path: string;
  
  /** Warning message */
  message: string;
  
  /** Recommended action */
  recommendation?: string;
}

/**
 * Configuration builder context.
 * Provided to components during configuration building phase.
 */
export interface ConfigBuilderContext {
  /** Component specification from manifest */
  spec: import('./interfaces').ComponentSpec;
  
  /** Service-wide context */
  context: import('./interfaces').ComponentContext;
  
  /** Resolved environment configuration values */
  environmentConfig: Record<string, any>;
  
  /** Compliance framework defaults */
  complianceDefaults: Record<string, any>;
}

/**
 * Abstract base class for component configuration builders.
 * Components should extend this class to handle configuration processing.
 */
export abstract class ConfigBuilder<TConfig = Record<string, any>> {
  protected readonly context: ConfigBuilderContext;
  protected readonly schema: ComponentConfigSchema;
  
  constructor(context: ConfigBuilderContext, schema: ComponentConfigSchema) {
    this.context = context;
    this.schema = schema;
  }
  
  /**
   * Builds the final configuration by:
   * 1. Applying schema defaults
   * 2. Merging user config from manifest
   * 3. Applying compliance framework defaults
   * 4. Resolving environment variable interpolations
   * 5. Validating final configuration against schema
   * 
   * @returns The final, validated configuration
   * @throws Error if configuration is invalid
   */
  public abstract build(): Promise<TConfig>;
  
  /**
   * Validates configuration against the component's schema.
   * 
   * @param config The configuration to validate
   * @returns Validation result
   */
  protected validateConfiguration(config: Record<string, any>): ConfigValidationResult {
    // Implementation would use AJV or similar JSON schema validator
    // This is a placeholder for the actual validation logic
    return {
      valid: true,
      validatedConfig: config
    };
  }
  
  /**
   * Applies compliance framework defaults based on the service's compliance requirements.
   * 
   * @param config Base configuration
   * @returns Configuration with compliance defaults applied
   */
  protected applyComplianceDefaults(config: Record<string, any>): Record<string, any> {
    const complianceDefaults = this.getComplianceDefaults();
    return this.deepMerge(complianceDefaults, config);
  }
  
  /**
   * Resolves environment variable interpolations like ${env:key}.
   * 
   * @param config Configuration with potential interpolations
   * @returns Configuration with interpolations resolved
   */
  protected resolveEnvironmentInterpolations(config: Record<string, any>): Record<string, any> {
    return this.processInterpolations(config, this.context.environmentConfig);
  }
  
  /**
   * Gets compliance-specific defaults based on the framework.
   */
  private getComplianceDefaults(): Record<string, any> {
    switch (this.context.context.complianceFramework) {
      case 'fedramp-moderate':
        return {
          encryption: { atRest: true, inTransit: true },
          monitoring: { enabled: true, retentionDays: 90 },
          backup: { enabled: true, retentionDays: 30 }
        };
      
      case 'fedramp-high':
        return {
          encryption: { atRest: true, inTransit: true, keyRotation: true },
          monitoring: { enabled: true, retentionDays: 365 },
          backup: { enabled: true, retentionDays: 90, crossRegionReplication: true }
        };
      
      default: // commercial
        return {
          monitoring: { enabled: true, retentionDays: 30 }
        };
    }
  }
  
  /**
   * Deep merge utility for combining configuration objects.
   */
  private deepMerge(target: Record<string, any>, source: Record<string, any>): Record<string, any> {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }
  
  /**
   * Process interpolation expressions in configuration values.
   */
  private processInterpolations(obj: any, envConfig: Record<string, any>): any {
    if (typeof obj === 'string') {
      return obj.replace(/\$\{env:([^}]+)\}/g, (match, key) => {
        if (key in envConfig) {
          return envConfig[key];
        }
        throw new Error(`Environment variable '${key}' not found in environment configuration`);
      });
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.processInterpolations(item, envConfig));
    }
    
    if (obj && typeof obj === 'object') {
      const result: Record<string, any> = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.processInterpolations(value, envConfig);
      }
      return result;
    }
    
    return obj;
  }
}

/**
 * Schema validation handler for component configurations.
 * Used by the platform's validation pipeline before synthesis begins.
 */
export interface SchemaValidationHandler {
  /**
   * Validates a component configuration against its schema.
   * 
   * @param componentType The component type identifier
   * @param config The configuration to validate
   * @returns Validation result
   */
  validateComponentConfig(
    componentType: string,
    config: Record<string, any>
  ): Promise<ConfigValidationResult>;
  
  /**
   * Loads and caches the schema for a component type.
   * 
   * @param componentType The component type identifier
   * @returns The component's configuration schema
   */
  loadComponentSchema(componentType: string): Promise<ComponentConfigSchema>;
  
  /**
   * Validates all components in a service manifest.
   * 
   * @param serviceManifest The complete service.yml content
   * @returns Validation results for all components
   */
  validateServiceManifest(
    serviceManifest: Record<string, any>
  ): Promise<Record<string, ConfigValidationResult>>;
}