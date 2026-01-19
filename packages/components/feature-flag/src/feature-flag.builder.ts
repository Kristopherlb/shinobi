import {
  ConfigBuilder,
  ConfigBuilderContext,
  ComponentConfigSchema
} from '@shinobi/core';
import { ComponentContext, ComponentSpec } from '@shinobi/core';
import schemaJson from '../Config.schema.json' with { type: 'json' };

/**
 * Supported feature flag value types following the OpenFeature specification.
 */
export type FeatureFlagType = 'boolean' | 'string' | 'number' | 'object';

/**
 * A targeting condition that evaluates user context attributes to determine
 * which variant of a feature flag to return.
 * 
 * @example
 * ```yaml
 * conditions:
 *   - attribute: user.email
 *     operator: contains
 *     value: "@example.com"
 *     variant: "beta"
 * ```
 */
export interface FeatureFlagTargetingCondition {
  /** The user attribute or context key to evaluate (e.g., "user.email", "environment") */
  attribute: string;
  /** The comparison operator to use when evaluating the condition */
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'contains' | 'starts_with' | 'ends_with';
  /** The value to compare against */
  value: string | number | boolean | unknown[] | Record<string, unknown>;
  /** Optional variant name to return if this condition matches */
  variant?: string;
}

/**
 * A variant of a feature flag with an associated weight for percentage-based rollout.
 * Used for gradual rollouts where different users get different flag values.
 */
export interface FeatureFlagVariant {
  /** Human-readable name for this variant (e.g., "red", "blue", "control") */
  name: string;
  /** The value this variant returns when selected */
  value: string | number | boolean | Record<string, unknown>;
  /** Percentage weight (0-100) for this variant in percentage-based targeting. All variant weights must sum to 100. */
  weight: number;
}

/**
 * Rules for targeting which users receive which feature flag value.
 * Supports percentage-based rollouts, attribute-based conditions, and variant weighting.
 */
export interface FeatureFlagTargetingRules {
  /** Percentage (0-100) of users who should receive the flag enabled. Used for simple rollouts. */
  percentage?: number;
  /** Attribute-based conditions for fine-grained targeting based on user context */
  conditions?: FeatureFlagTargetingCondition[];
  /** Variant definitions with weights for A/B testing or gradual rollouts */
  variants?: FeatureFlagVariant[];
}

/**
 * Configuration for monitoring and observability of feature flag evaluations.
 * Tracks metrics, alarms, and performance characteristics of flag usage.
 */
export interface FeatureFlagMonitoringConfig {
  /** Whether monitoring is enabled for this flag */
  enabled?: boolean;
  /** Whether to emit detailed metrics (e.g., per-variant evaluation counts). Required for high-risk environments. */
  detailedMetrics?: boolean;
  /** Alarm thresholds for monitoring flag evaluation performance */
  alarms?: {
    /** Alert if flag evaluation latency exceeds this value (milliseconds) */
    evaluationLatencyMs?: number;
    /** Alert if flag evaluation error rate exceeds this percentage */
    errorRatePercent?: number;
  };
}

/**
 * Provider-specific configuration for feature flag backends.
 * Different providers (AWS AppConfig, LaunchDarkly, Flagsmith) have different configuration options.
 */
export interface FeatureFlagProviderConfig {
  /** AWS AppConfig-specific settings */
  awsAppConfig?: {
    /** Additional constraints for AppConfig deployment */
    constraints?: Record<string, unknown>;
    /** AppConfig deployment strategy ID for gradual rollouts */
    deploymentStrategyId?: string;
    /** KMS key ARN for encrypting AppConfig configuration */
    kmsKeyArn?: string;
  };
  /** LaunchDarkly-specific settings */
  launchDarkly?: {
    /** Tags to apply to the flag in LaunchDarkly */
    tags?: string[];
    /** Whether this is a temporary flag */
    temporary?: boolean;
  };
  /** Flagsmith-specific settings */
  flagsmith?: {
    /** Description for the flag in Flagsmith */
    description?: string;
    /** Initial value when creating the flag */
    initialValue?: string;
  };
}

/**
 * Complete configuration for a feature flag component.
 * This is the resolved configuration after all layers of precedence are merged.
 */
export interface FeatureFlagConfig {
  /** Optional component instance name (defaults to manifest component name) */
  name?: string;
  /** Human-readable description of what this flag controls */
  description?: string;
  /** Unique identifier for the flag used at runtime (e.g., "checkout_experience") */
  flagKey: string;
  /** The data type of the flag value (boolean, string, number, or object) */
  flagType: FeatureFlagType;
  /** Default value returned when no targeting rule matches or provider is unavailable */
  defaultValue: boolean | string | number | Record<string, unknown>;
  /** Whether the flag is enabled by default */
  enabled?: boolean;
  /** Rules for targeting which users receive which flag values */
  targetingRules?: FeatureFlagTargetingRules;
  /** Provider-specific configuration for the feature flag backend */
  providerConfig?: FeatureFlagProviderConfig;
  /** Monitoring and observability configuration */
  monitoring?: FeatureFlagMonitoringConfig;
  /** Additional tags merged with platform standard tags */
  tags?: Record<string, string>;
  /** 
   * High-risk environment flag (set via platform config or service.yml).
   * When true, applies enhanced security defaults (e.g., detailed metrics required).
   * Never check compliance frameworks directly - only use this flag.
   */
  highRiskEnvironment?: boolean;
}

/**
 * Capability interface exposed by this component for other components to discover.
 * Used for component-to-component integration via bindings.
 */
export interface FeatureFlagCapability {
  /** The flag key that other components can reference */
  flagKey: string;
  /** The data type of the flag value */
  flagType: FeatureFlagType;
  /** The default value when the flag is not available */
  defaultValue: boolean | string | number | Record<string, unknown>;
  /** Description of what this flag controls */
  description?: string;
  /** Targeting rules for this flag */
  targetingRules?: FeatureFlagTargetingRules;
}

export const FEATURE_FLAG_CONFIG_SCHEMA: ComponentConfigSchema = schemaJson as ComponentConfigSchema;

/**
 * Configuration builder for feature flag components.
 * 
 * Implements the platform's 5-layer configuration precedence chain:
 * 1. Hardcoded fallbacks (lowest priority)
 * 2. Platform configuration from `/config/{framework}.yml`
 * 3. Environment configuration from `service.yml` environments block
 * 4. Component overrides from `service.yml` component config
 * 5. Policy overrides (highest priority)
 * 
 * This builder merges all layers and validates the final configuration.
 */
export class FeatureFlagConfigBuilder extends ConfigBuilder<FeatureFlagConfig> {
  /**
   * Returns ultra-safe hardcoded fallbacks that work in any environment.
   * These are the lowest-priority defaults used when no other configuration is provided.
   * 
   * @returns Minimal safe configuration defaults
   */
  protected getHardcodedFallbacks(): Partial<FeatureFlagConfig> {
    return {
      enabled: true,
      monitoring: {
        enabled: true,
        detailedMetrics: false
      },
      tags: {}
    };
  }

  /**
   * Creates a new feature flag configuration builder.
   * 
   * @param context - Component context with service info, environment, and compliance framework
   * @param spec - Component specification from the service.yml manifest
   */
  constructor(context: ComponentContext, spec: ComponentSpec) {
    const builderContext: ConfigBuilderContext = { context, spec };
    super(builderContext, FEATURE_FLAG_CONFIG_SCHEMA);
  }

  /**
   * Returns compliance framework defaults based on risk assessment flags.
   * 
   * This method checks for the `highRiskEnvironment` flag (set via platform config
   * or service.yml) and applies enhanced security defaults when true. The method
   * is framework-agnostic and never checks compliance frameworks directly.
   * 
   * @returns Partial config with compliance defaults, or empty object if not high-risk
   */
  protected getComplianceFrameworkDefaults(): Partial<FeatureFlagConfig> {
    // Check if highRiskEnvironment flag is set in component config or platform config
    const componentConfig = this.builderContext.spec.config as Partial<FeatureFlagConfig> | undefined;
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
        monitoring: {
          enabled: true,
          detailedMetrics: true
        }
      };
    }
    
    return {}; // Standard/default environment - use hardcoded fallbacks
  }

  /**
   * Builds the complete feature flag configuration by merging all precedence layers.
   * 
   * This method:
   * 1. Calls the base class to merge hardcoded fallbacks, platform config, environment config, component overrides, and policy overrides
   * 2. Validates the merged configuration
   * 3. Ensures tags is always an object (never undefined)
   * 
   * @returns Complete validated feature flag configuration
   */
  public buildSync(): FeatureFlagConfig {
    const config = super.buildSync();
    this.validateConfig(config);
    return {
      ...config,
      tags: config.tags ?? {}
    };
  }

  /**
   * Validates the feature flag configuration for correctness.
   * 
   * Validates:
   * - Targeting percentage must be between 0 and 100
   * - Variant weights must be between 0 and 100
   * - Sum of all variant weights must equal 100
   * 
   * @param config - The configuration to validate
   * @throws Error if validation fails
   */
  private validateConfig(config: FeatureFlagConfig): void {
    const { targetingRules } = config;

    // Validate percentage-based targeting
    if (targetingRules?.percentage !== undefined) {
      const pct = targetingRules.percentage;
      if (pct < 0 || pct > 100) {
        throw new Error('Targeting percentage must be between 0 and 100.');
      }
    }

    // Validate variant-based targeting
    if (targetingRules?.variants && targetingRules.variants.length > 0) {
      let totalWeight = 0;
      targetingRules.variants.forEach(variant => {
        // Each variant weight must be valid
        if (variant.weight < 0 || variant.weight > 100) {
          throw new Error(`Variant weight for "${variant.name}" must be between 0 and 100.`);
        }
        totalWeight += variant.weight;
      });

      // All variant weights must sum to exactly 100 for deterministic rollout
      if (Math.abs(totalWeight - 100) > 0.0001) {
        throw new Error('Variant weights must total 100.');
      }
    }
  }
}
