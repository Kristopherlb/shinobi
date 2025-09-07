/**
 * Feature Flag Component
 * 
 * Defines individual feature flags within an OpenFeature provider.
 * Implements Platform Feature Flagging & Canary Deployment Standard v1.0.
 */

import * as appconfig from 'aws-cdk-lib/aws-appconfig';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  Component,
  ComponentSpec,
  ComponentContext,
  ComponentCapabilities,
  ComponentConfigSchema,
  FeatureFlagCapability
} from '@platform/contracts';

/**
 * Configuration interface for Feature Flag component
 */
export interface FeatureFlagConfig {
  /** Feature flag key/name (required) */
  flagKey: string;
  
  /** Flag type (boolean, string, number, object) */
  flagType: 'boolean' | 'string' | 'number' | 'object';
  
  /** Default value for the flag */
  defaultValue: any;
  
  /** Flag description for documentation */
  description?: string;
  
  /** Enabled state of the flag */
  enabled?: boolean;
  
  /** Targeting rules for the flag */
  targetingRules?: {
    /** Percentage rollout (0-100) */
    percentage?: number;
    /** User/context targeting conditions */
    conditions?: Array<{
      attribute: string;
      operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'contains' | 'starts_with' | 'ends_with';
      value: any;
    }>;
    /** Variant configuration for string/object flags */
    variants?: Array<{
      name: string;
      value: any;
      weight: number; // 0-100
    }>;
  };
  
  /** Provider-specific configuration */
  providerConfig?: {
    /** AWS AppConfig specific settings */
    awsAppConfig?: {
      /** JSON constraints for validation */
      constraints?: Record<string, any>;
    };
    /** LaunchDarkly specific settings */
    launchDarkly?: {
      /** Flag tags for organization */
      tags?: string[];
      /** Temporary flag indicator */
      temporary?: boolean;
    };
    /** Flagsmith specific settings */
    flagsmith?: {
      /** Flag description */
      description?: string;
      /** Initial value */
      initialValue?: string;
    };
  };
}

/**
 * Configuration schema for Feature Flag component
 */
export const FEATURE_FLAG_CONFIG_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  title: 'Feature Flag Configuration',
  description: 'Configuration for creating individual feature flags',
  properties: {
    flagKey: {
      type: 'string',
      description: 'Unique identifier for the feature flag',
      pattern: '^[a-zA-Z][a-zA-Z0-9_-]*$',
      minLength: 1,
      maxLength: 100
    },
    flagType: {
      type: 'string',
      enum: ['boolean', 'string', 'number', 'object'],
      description: 'Data type of the flag value',
      default: 'boolean'
    },
    defaultValue: {
      description: 'Default value when flag cannot be retrieved'
    },
    description: {
      type: 'string',
      description: 'Human-readable description of the flag purpose',
      maxLength: 500
    },
    enabled: {
      type: 'boolean',
      description: 'Whether the flag is enabled',
      default: true
    }
  },
  required: ['flagKey', 'flagType', 'defaultValue'],
  additionalProperties: false,
  defaults: {
    flagType: 'boolean',
    enabled: true
  }
};

/**
 * Feature Flag Component implementing OpenFeature Standard
 */
export class FeatureFlagComponent extends Component {
  private hostedConfigurationVersion?: appconfig.CfnHostedConfigurationVersion;
  private config?: FeatureFlagConfig;

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
  }

  /**
   * Synthesis phase - Create feature flag definition
   */
  public synth(): void {
    this.logComponentEvent('synthesis_start', 'Starting Feature Flag component synthesis', {
      flagKey: this.spec.config?.flagKey,
      flagType: this.spec.config?.flagType
    });
    
    const startTime = Date.now();
    
    try {
      // Build configuration
      this.config = this.buildConfigSync();
      
      this.logComponentEvent('config_built', 'Feature Flag configuration built successfully', {
        flagKey: this.config.flagKey,
        flagType: this.config.flagType,
        enabled: this.config.enabled
      });
      
      // Create flag definition based on provider type
      this.createFeatureFlagDefinition();
      
      // Register capabilities
      this.registerCapability('feature:flag', this.buildFlagCapability());
      
      // Log successful synthesis completion
      const duration = Date.now() - startTime;
      this.logPerformanceMetric('component_synthesis', duration, {
        resourcesCreated: Object.keys(this.capabilities).length
      });
      
      this.logComponentEvent('synthesis_complete', 'Feature Flag component synthesis completed successfully', {
        flagKey: this.config.flagKey,
        resourcesCreated: Object.keys(this.constructs).size
      });
      
    } catch (error) {
      this.logError(error as Error, 'component synthesis', {
        componentType: 'feature-flag',
        stage: 'synthesis'
      });
      throw error;
    }
  }

  /**
   * Get the capabilities this component provides
   */
  public getCapabilities(): ComponentCapabilities {
    this.validateSynthesized();
    return this.capabilities;
  }

  /**
   * Get the component type identifier
   */
  public getType(): string {
    return 'feature-flag';
  }

  /**
   * Create feature flag definition
   */
  private createFeatureFlagDefinition(): void {
    // Create AWS AppConfig hosted configuration for the flag
    // This creates a JSON configuration that defines the feature flag
    const flagDefinition = this.buildFlagDefinitionJson();
    
    this.hostedConfigurationVersion = new appconfig.CfnHostedConfigurationVersion(this, 'FlagDefinition', {
      applicationId: this.resolveDependentResource('openfeature-provider', 'applicationId'),
      configurationProfileId: this.resolveDependentResource('openfeature-provider', 'configurationProfileId'),
      content: JSON.stringify(flagDefinition),
      contentType: 'application/json',
      description: `Feature flag definition for ${this.config!.flagKey}`
    });

    this.applyStandardTags(this.hostedConfigurationVersion, {
      'feature-flag-key': this.config!.flagKey,
      'feature-flag-type': this.config!.flagType,
      'openfeature-standard': 'v1.0'
    });

    // Register constructs
    this.registerConstruct('flagDefinition', this.hostedConfigurationVersion);

    this.logResourceCreation('feature-flag', this.config!.flagKey, {
      flagType: this.config!.flagType,
      enabled: this.config!.enabled,
      defaultValue: this.config!.defaultValue
    });
  }

  /**
   * Build JSON definition for the feature flag compatible with OpenFeature
   */
  private buildFlagDefinitionJson(): any {
    const flagDefinition: any = {
      flags: {}
    };

    const flag: any = {
      enabled: this.config!.enabled ?? true,
      defaultVariant: 'default',
      variants: {
        default: {
          value: this.config!.defaultValue
        }
      }
    };

    // Add targeting rules if specified
    if (this.config!.targetingRules) {
      flag.targeting = this.buildTargetingRules();
    }

    // Add provider-specific constraints
    if (this.config!.providerConfig?.awsAppConfig?.constraints) {
      flag.constraints = this.config!.providerConfig.awsAppConfig.constraints;
    }

    flagDefinition.flags[this.config!.flagKey] = flag;
    flagDefinition.values = {};
    flagDefinition.version = '1';

    return flagDefinition;
  }

  /**
   * Build targeting rules for progressive delivery
   */
  private buildTargetingRules(): any {
    const rules = this.config!.targetingRules!;
    const targeting: any = {};

    // Percentage rollout
    if (rules.percentage !== undefined) {
      targeting.percentage = {
        variants: [
          { variant: 'default', weight: rules.percentage },
          { variant: 'disabled', weight: 100 - rules.percentage }
        ]
      };

      // Add disabled variant if not exists
      if (!targeting.variants) {
        targeting.variants = {};
      }
      targeting.variants.disabled = {
        value: this.getDisabledValue()
      };
    }

    // Context-based conditions
    if (rules.conditions) {
      targeting.rules = rules.conditions.map(condition => ({
        attribute: condition.attribute,
        operator: this.mapOperatorToAppConfig(condition.operator),
        value: condition.value,
        variant: 'default'
      }));
    }

    // Variant configuration for A/B testing
    if (rules.variants) {
      targeting.variants = {};
      rules.variants.forEach(variant => {
        targeting.variants![variant.name] = {
          value: variant.value
        };
      });

      targeting.percentage = {
        variants: rules.variants.map(variant => ({
          variant: variant.name,
          weight: variant.weight
        }))
      };
    }

    return targeting;
  }

  /**
   * Get disabled value based on flag type
   */
  private getDisabledValue(): any {
    switch (this.config!.flagType) {
      case 'boolean':
        return false;
      case 'string':
        return '';
      case 'number':
        return 0;
      case 'object':
        return {};
      default:
        return false;
    }
  }

  /**
   * Map generic operators to AWS AppConfig operators
   */
  private mapOperatorToAppConfig(operator: string): string {
    const mapping: Record<string, string> = {
      'equals': 'Equals',
      'not_equals': 'NotEquals',
      'in': 'In',
      'not_in': 'NotIn',
      'contains': 'Contains',
      'starts_with': 'StartsWith',
      'ends_with': 'EndsWith'
    };
    
    return mapping[operator] || 'Equals';
  }

  /**
   * Resolve dependent resource from bound components
   */
  private resolveDependentResource(componentType: string, resourceKey: string): string {
    // This would typically resolve bound component resources
    // For now, we'll use a placeholder that would be resolved at synthesis time
    return `\${${componentType}.${resourceKey}}`;
  }

  /**
   * Build flag capability data shape
   */
  private buildFlagCapability(): FeatureFlagCapability {
    return {
      flagKey: this.config!.flagKey,
      flagType: this.config!.flagType,
      defaultValue: this.config!.defaultValue,
      description: this.config!.description,
      targetingRules: this.config!.targetingRules
    };
  }

  /**
   * Simplified config building for component
   */
  private buildConfigSync(): FeatureFlagConfig {
    const config: FeatureFlagConfig = {
      flagKey: this.spec.config?.flagKey,
      flagType: this.spec.config?.flagType || 'boolean',
      defaultValue: this.spec.config?.defaultValue,
      description: this.spec.config?.description,
      enabled: this.spec.config?.enabled ?? true,
      targetingRules: this.spec.config?.targetingRules,
      providerConfig: this.spec.config?.providerConfig
    };

    // Validation
    if (!config.flagKey) {
      throw new Error('Feature flag flagKey is required');
    }

    if (config.defaultValue === undefined) {
      throw new Error('Feature flag defaultValue is required');
    }

    return config;
  }
}