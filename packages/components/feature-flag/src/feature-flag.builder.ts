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

  protected get complianceFramework(): ComponentContext['complianceFramework'] {
    return this.builderContext.context.complianceFramework;
  }

  public buildSync(): FeatureFlagConfig {
    const config = super.buildSync();
    this.validateConfig(config);
    return this.applyComplianceAdjustments(config);
  }

  private applyComplianceAdjustments(config: FeatureFlagConfig): FeatureFlagConfig {
    if (this.complianceFramework === 'fedramp-moderate' || this.complianceFramework === 'fedramp-high') {
      const monitoring = config.monitoring ?? {};
      config.monitoring = {
        ...monitoring,
        enabled: true,
        detailedMetrics: true
      };
    }

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
