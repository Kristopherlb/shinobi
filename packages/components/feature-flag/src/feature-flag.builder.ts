import {
  ConfigBuilder,
  ConfigBuilderContext,
  ComponentConfigSchema
} from '@shinobi/core';
import { ComponentContext, ComponentSpec } from '@shinobi/core';
import schemaJson from '../Config.schema.json' with { type: 'json' };

export type FeatureFlagType = 'boolean' | 'string' | 'number' | 'object';

export interface FeatureFlagTargetingCondition {
  attribute: string;
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'contains' | 'starts_with' | 'ends_with';
  value: string | number | boolean | unknown[] | Record<string, unknown>;
  variant?: string;
}

export interface FeatureFlagVariant {
  name: string;
  value: string | number | boolean | Record<string, unknown>;
  weight: number;
}

export interface FeatureFlagTargetingRules {
  percentage?: number;
  conditions?: FeatureFlagTargetingCondition[];
  variants?: FeatureFlagVariant[];
}

export interface FeatureFlagMonitoringConfig {
  enabled?: boolean;
  detailedMetrics?: boolean;
  alarms?: {
    evaluationLatencyMs?: number;
    errorRatePercent?: number;
  };
}

export interface FeatureFlagProviderConfig {
  awsAppConfig?: {
    constraints?: Record<string, unknown>;
    deploymentStrategyId?: string;
    kmsKeyArn?: string;
  };
  launchDarkly?: {
    tags?: string[];
    temporary?: boolean;
  };
  flagsmith?: {
    description?: string;
    initialValue?: string;
  };
}

export interface FeatureFlagConfig {
  name?: string;
  description?: string;
  flagKey: string;
  flagType: FeatureFlagType;
  defaultValue: boolean | string | number | Record<string, unknown>;
  enabled?: boolean;
  targetingRules?: FeatureFlagTargetingRules;
  providerConfig?: FeatureFlagProviderConfig;
  monitoring?: FeatureFlagMonitoringConfig;
  tags?: Record<string, string>;
  /** High-risk environment flag (set via platform config or service.yml) */
  highRiskEnvironment?: boolean;
}

export interface FeatureFlagCapability {
  flagKey: string;
  flagType: FeatureFlagType;
  defaultValue: boolean | string | number | Record<string, unknown>;
  description?: string;
  targetingRules?: FeatureFlagTargetingRules;
}

export const FEATURE_FLAG_CONFIG_SCHEMA: ComponentConfigSchema = schemaJson as ComponentConfigSchema;

export class FeatureFlagConfigBuilder extends ConfigBuilder<FeatureFlagConfig> {
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

  constructor(context: ComponentContext, spec: ComponentSpec) {
    const builderContext: ConfigBuilderContext = { context, spec };
    super(builderContext, FEATURE_FLAG_CONFIG_SCHEMA);
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

  public buildSync(): FeatureFlagConfig {
    const config = super.buildSync();
    this.validateConfig(config);
    return {
      ...config,
      tags: config.tags ?? {}
    };
  }

  private validateConfig(config: FeatureFlagConfig): void {
    const { targetingRules } = config;

    if (targetingRules?.percentage !== undefined) {
      const pct = targetingRules.percentage;
      if (pct < 0 || pct > 100) {
        throw new Error('Targeting percentage must be between 0 and 100.');
      }
    }

    if (targetingRules?.variants && targetingRules.variants.length > 0) {
      let totalWeight = 0;
      targetingRules.variants.forEach(variant => {
        if (variant.weight < 0 || variant.weight > 100) {
          throw new Error(`Variant weight for "${variant.name}" must be between 0 and 100.`);
        }
        totalWeight += variant.weight;
      });

      if (Math.abs(totalWeight - 100) > 0.0001) {
        throw new Error('Variant weights must total 100.');
      }
    }
  }
}
