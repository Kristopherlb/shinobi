import { Construct } from 'constructs';
import {
  ComponentContext,
  ComponentSpec,
  IComponentCreator
} from '@shinobi/core';
import { GlueJobComponent } from './glue-job.component.ts';
import { GlueJobConfig, GLUE_JOB_CONFIG_SCHEMA } from './glue-job.builder.ts';

export class GlueJobComponentCreator implements IComponentCreator {
  public readonly componentType = 'glue-job';
  public readonly displayName = 'Glue Job Component';
  public readonly description = 'AWS Glue job with platform-managed defaults for security, logging, and monitoring.';
  public readonly category = 'analytics';
  public readonly awsService = 'GLUE';
  public readonly tags = ['glue', 'etl', 'analytics'];
  public readonly configSchema = GLUE_JOB_CONFIG_SCHEMA;

  public createComponent(scope: Construct, spec: ComponentSpec, context: ComponentContext): GlueJobComponent {
    return new GlueJobComponent(scope, spec.name, context, spec);
  }

  public validateSpec(spec: ComponentSpec, context: ComponentContext): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const config = spec.config as Partial<GlueJobConfig>;

    if (!spec.name || !/^[a-zA-Z][a-zA-Z0-9-_]*$/.test(spec.name)) {
      errors.push('Component name must start with a letter and contain only alphanumeric characters, hyphens, or underscores.');
    }

    if (!config?.scriptLocation) {
      errors.push('`scriptLocation` is required for glue-job components.');
    }

    if (context.environment === 'prod' && config?.monitoring?.enabled === false) {
      errors.push('Monitoring must remain enabled in production workloads.');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  public getProvidedCapabilities(): string[] {
    return ['etl:glue-job'];
  }

  public getRequiredCapabilities(): string[] {
    return [];
  }

  public getConstructHandles(): string[] {
    return [
      'main',
      'glueJob',
      'executionRole',
      'kmsKey',
      'securityConfiguration',
      'logGroup:<id>',
      'alarm:jobFailure',
      'alarm:jobDuration'
    ];
  }
}
