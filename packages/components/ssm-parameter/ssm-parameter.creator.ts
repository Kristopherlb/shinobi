import { Construct } from 'constructs';

import {
  ComponentContext,
  ComponentSpec,
  IComponentCreator
} from '@shinobi/core';

import { SsmParameterComponent } from './ssm-parameter.component.ts';
import {
  SsmParameterComponentConfig,
  SSM_PARAMETER_CONFIG_SCHEMA
} from './ssm-parameter.builder.ts';

export class SsmParameterComponentCreator implements IComponentCreator {
  public readonly componentType = 'ssm-parameter';
  public readonly displayName = 'SSM Parameter';
  public readonly description = 'AWS Systems Manager Parameter Store entry managed through platform configuration.';
  public readonly category = 'configuration';
  public readonly awsService = 'SSM';
  public readonly tags = ['ssm', 'parameter-store', 'configuration'];
  public readonly configSchema = SSM_PARAMETER_CONFIG_SCHEMA;

  public createComponent(scope: Construct, spec: ComponentSpec, context: ComponentContext): SsmParameterComponent {
    return new SsmParameterComponent(scope, spec.name, context, spec);
  }

  public validateSpec(spec: ComponentSpec): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const config = spec.config as Partial<SsmParameterComponentConfig> | undefined;

    if (!spec.name || !/^[a-zA-Z][a-zA-Z0-9-_]*$/.test(spec.name)) {
      errors.push('Component name must start with a letter and contain only alphanumeric characters, hyphens, or underscores.');
    }

    const name = config?.name ?? (config as any)?.parameterName;
    if (!name || name.toString().trim().length === 0) {
      errors.push('`config.name` is required for SSM parameters.');
    }

    const kind = config?.kind ?? 'string';
    if (kind === 'stringList') {
      const valueCount = (config?.values ?? []).length;
      const hasLegacyValue = (config?.value ?? '').trim().length > 0;
      if (valueCount === 0 && !hasLegacyValue) {
        errors.push('StringList parameters require `config.values` or a comma-separated `config.value`.');
      }
    }

    if (kind === 'secureString' && (config?.value === undefined || config.value === null)) {
      errors.push('SecureString parameters require a value.');
    }

    if (config?.encryption?.customerManagedKey?.enabled && kind !== 'secureString') {
      errors.push('Customer managed encryption can only be enabled when `config.kind` is `secureString`.');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  public getProvidedCapabilities(): string[] {
    return ['configuration:parameter'];
  }

  public getRequiredCapabilities(): string[] {
    return [];
  }

  public getConstructHandles(): string[] {
    return ['main', 'parameter', 'kmsKey'];
  }
}
