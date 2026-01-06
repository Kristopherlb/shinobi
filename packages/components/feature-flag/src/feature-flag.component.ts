/**
 * Feature Flag Component
 *
 * Provisions an individual feature flag definition within an OpenFeature provider.
 * Implements Platform Feature Flagging & Canary Deployment Standard v1.0.
 */

import * as appconfig from 'aws-cdk-lib/aws-appconfig';
import { Construct } from 'constructs';
import {
  BaseComponent,
  ComponentCapabilities,
  ComponentContext,
  ComponentSpec
} from '@shinobi/core';
import {
  FeatureFlagConfig,
  FeatureFlagConfigBuilder,
  FeatureFlagTargetingCondition,
  FeatureFlagTargetingRules,
  FeatureFlagCapability
} from './feature-flag.builder.js';

export class FeatureFlagComponent extends BaseComponent {
  private hostedConfigurationVersion?: appconfig.CfnHostedConfigurationVersion;
  private config!: FeatureFlagConfig;

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
  }

  public synth(): void {
    this.logComponentEvent('synthesis_start', 'Starting Feature Flag component synthesis', {
      flagKey: this.spec.config?.flagKey
    });

    try {
      const configBuilder = new FeatureFlagConfigBuilder(this.context, this.spec);
      this.config = configBuilder.buildSync();

      this.logComponentEvent('config_resolved', 'Feature Flag configuration resolved', {
        flagKey: this.config.flagKey,
        flagType: this.config.flagType,
        enabled: this.config.enabled
      });

      this.createFeatureFlagDefinition();

      this.registerConstruct('main', this.hostedConfigurationVersion!);
      this.registerConstruct('flagDefinition', this.hostedConfigurationVersion!);
      this.registerCapability('feature-flags:flag', this.buildFlagCapability());

      this.logComponentEvent('synthesis_complete', 'Feature Flag component synthesis completed successfully', {
        flagKey: this.config.flagKey
      });
    } catch (error) {
      this.logError(error as Error, 'feature-flag synthesis', {
        componentType: 'feature-flag'
      });
      throw error;
    }
  }

  public getCapabilities(): ComponentCapabilities {
    this.validateSynthesized();
    return this.capabilities;
  }

  public getType(): string {
    return 'feature-flag';
  }

  private createFeatureFlagDefinition(): void {
    const flagDefinition = this.buildFlagDefinition();

    this.hostedConfigurationVersion = new appconfig.CfnHostedConfigurationVersion(this, 'FlagDefinition', {
      applicationId: this.resolveProviderBinding('openfeature-provider', 'applicationId'),
      configurationProfileId: this.resolveProviderBinding('openfeature-provider', 'configurationProfileId'),
      content: JSON.stringify(flagDefinition),
      contentType: 'application/json',
      description: `Feature flag definition for ${this.config.flagKey}`
    });

    this.applyStandardTags(this.hostedConfigurationVersion, {
      'feature-flag-key': this.config.flagKey,
      'feature-flag-type': this.config.flagType,
      'openfeature-standard': 'v1.0',
      ...this.config.tags
    });

    this.logResourceCreation('feature-flag', this.config.flagKey, {
      flagType: this.config.flagType,
      enabled: this.config.enabled,
      provider: this.spec.type
    });
  }

  private buildFlagDefinition(): Record<string, unknown> {
    const targeting = this.config.targetingRules ?? {};

    const flag: Record<string, unknown> = {
      enabled: this.config.enabled ?? true,
      defaultVariant: 'default',
      variants: {
        default: {
          value: this.config.defaultValue
        }
      }
    };

    const targetingDefinition = this.transformTargetingRules(targeting);
    if (targetingDefinition) {
      flag['targeting'] = targetingDefinition;
    }

    return {
      version: '1',
      flags: {
        [this.config.flagKey]: flag
      },
      values: {}
    };
  }

  private transformTargetingRules(rules: FeatureFlagTargetingRules): Record<string, unknown> | undefined {
    if (!rules.percentage && !rules.conditions && !rules.variants) {
      return undefined;
    }

    const targeting: Record<string, unknown> = {};

    if (typeof rules.percentage === 'number') {
      targeting['percentage'] = {
        variants: [
          { variant: 'default', weight: rules.percentage },
          { variant: 'disabled', weight: Math.max(0, 100 - rules.percentage) }
        ]
      };

      targeting['variants'] = {
        disabled: {
          value: this.getDisabledValue()
        }
      };
    }

    if (rules.conditions && rules.conditions.length > 0) {
      targeting['rules'] = rules.conditions.map(condition => ({
        attribute: condition.attribute,
        operator: this.mapOperatorToAppConfig(condition.operator),
        value: condition.value,
        variant: condition.variant ?? 'default'
      }));
    }

    if (rules.variants && rules.variants.length > 0) {
      targeting['variants'] = targeting['variants'] ?? {};
      rules.variants.forEach(variant => {
        (targeting['variants'] as Record<string, unknown>)[variant.name] = {
          value: variant.value
        };
      });

      targeting['percentage'] = {
        variants: rules.variants.map(variant => ({
          variant: variant.name,
          weight: variant.weight
        }))
      };
    }

    return targeting;
  }

  private getDisabledValue(): boolean | string | number | Record<string, unknown> {
    switch (this.config.flagType) {
      case 'boolean':
        return false;
      case 'string':
        return '';
      case 'number':
        return 0;
      case 'object':
      default:
        return {};
    }
  }

  private mapOperatorToAppConfig(operator: FeatureFlagTargetingCondition['operator']): string {
    const mapping: Record<string, string> = {
      equals: 'Equals',
      not_equals: 'NotEquals',
      in: 'In',
      not_in: 'NotIn',
      contains: 'Contains',
      starts_with: 'StartsWith',
      ends_with: 'EndsWith'
    };

    return mapping[operator] ?? 'Equals';
  }

  private resolveProviderBinding(componentType: string, resourceKey: string): string {
    // TODO: integrate with binder registry once available. Placeholder keeps manifest interpolations working.
    return `\${${componentType}.${resourceKey}}`;
  }

  private buildFlagCapability(): FeatureFlagCapability {
    return {
      flagKey: this.config.flagKey,
      flagType: this.config.flagType,
      defaultValue: this.config.defaultValue,
      description: this.config.description,
      targetingRules: this.config.targetingRules
    };
  }
}
