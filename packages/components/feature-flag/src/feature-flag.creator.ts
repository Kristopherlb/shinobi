import { Construct } from 'constructs';
import { ComponentContext, ComponentSpec, IComponentCreator } from '@platform/contracts';
import { FeatureFlagComponent } from './feature-flag.component.js';
import {
  FeatureFlagConfig,
  FEATURE_FLAG_CONFIG_SCHEMA
} from './feature-flag.builder.js';

export class FeatureFlagComponentCreator implements IComponentCreator {
  public readonly componentType = 'feature-flag';
  public readonly displayName = 'Feature Flag Component';
  public readonly description = 'Provision individual feature flags compliant with the platform OpenFeature standard.';
  public readonly category = 'feature-flags';
  public readonly awsService = 'APPCONFIG';
  public readonly tags = ['feature-flag', 'feature-flags', 'appconfig', 'openfeature'];
  public readonly configSchema = FEATURE_FLAG_CONFIG_SCHEMA;

  public createComponent(scope: Construct, spec: ComponentSpec, context: ComponentContext): FeatureFlagComponent {
    return new FeatureFlagComponent(scope, spec.name, context, spec);
  }

  public validateSpec(spec: ComponentSpec, context: ComponentContext): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const config = spec.config as FeatureFlagConfig | undefined;

    if (!spec.name || !/^[a-zA-Z][a-zA-Z0-9-_]*$/.test(spec.name)) {
      errors.push('Component name is required and must match ^[a-zA-Z][a-zA-Z0-9-_]*$.');
    }

    if (!config) {
      errors.push('Configuration block is required for feature-flag components.');
      return { valid: errors.length === 0, errors };
    }

    if (!config.flagKey) {
      errors.push('config.flagKey is required.');
    }

    if (!config.flagType || !['boolean', 'string', 'number', 'object'].includes(config.flagType)) {
      errors.push('config.flagType must be one of boolean|string|number|object.');
    }

    if (config.defaultValue === undefined) {
      errors.push('config.defaultValue is required.');
    }

    if (config.targetingRules?.percentage !== undefined) {
      const pct = config.targetingRules.percentage;
      if (pct < 0 || pct > 100) {
        errors.push('config.targetingRules.percentage must be between 0 and 100.');
      }
    }

    if (config.targetingRules?.variants) {
      config.targetingRules.variants.forEach(variant => {
        if (variant.weight < 0 || variant.weight > 100) {
          errors.push(`Variant ${variant.name} weight must be between 0 and 100.`);
        }
      });
    }

    if (context.complianceFramework !== 'commercial' && config.monitoring?.enabled === false) {
      errors.push('Monitoring cannot be disabled for regulated compliance frameworks.');
    }

    return { valid: errors.length === 0, errors };
  }

  public getProvidedCapabilities(): string[] {
    return ['feature-flags:flag'];
  }

  public getRequiredCapabilities(): string[] {
    return ['openfeature:provider'];
  }

  public getConstructHandles(): string[] {
    return ['main', 'flagDefinition'];
  }
}
