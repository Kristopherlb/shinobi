import { Construct } from 'constructs';
import {
  ComponentContext,
  ComponentSpec,
  IComponentCreator
} from '@shinobi/core';
import { ContainerApplicationComponent } from './container-application.component.ts';
import {
  ContainerApplicationConfig,
  CONTAINER_APPLICATION_CONFIG_SCHEMA
} from './container-application.builder.ts';

export class ContainerApplicationComponentCreator implements IComponentCreator {
  public readonly componentType = 'container-application';
  public readonly displayName = 'Container Application';
  public readonly description = 'Opinionated ECS Fargate service with optional load balancer, observability, and secure defaults.';
  public readonly category = 'compute';
  public readonly awsService = 'ECS';
  public readonly tags = ['ecs', 'fargate', 'container', 'application', 'alb', 'observability'];
  public readonly configSchema = CONTAINER_APPLICATION_CONFIG_SCHEMA;

  public createComponent(spec: ComponentSpec, context: ComponentContext): ContainerApplicationComponent {
    const scope = context.scope as Construct | undefined;
    if (!scope) {
      throw new Error('ComponentContext.scope is required to create container-application components');
    }
    this.assertValidSpec(spec, context);
    return new ContainerApplicationComponent(scope, spec.name, context, spec);
  }

  public processComponent(spec: ComponentSpec, context: ComponentContext): ContainerApplicationComponent {
    return this.createComponent(spec, context);
  }

  public validateSpec(spec: ComponentSpec, context: ComponentContext): { valid: boolean; errors: string[] } {
    const errors = this.collectValidationErrors(spec, context);
    return {
      valid: errors.length === 0,
      errors
    };
  }

  public getProvidedCapabilities(): string[] {
    return ['service:connect', 'net:vpc', 'otel:environment'];
  }

  public getRequiredCapabilities(): string[] {
    return [];
  }

  public getConstructHandles(): string[] {
    return [
      'cluster',
      'service',
      'taskDefinition',
      'loadBalancer',
      'targetGroup',
      'applicationLogs',
      'repository'
    ];
  }

  private assertValidSpec(spec: ComponentSpec, context: ComponentContext): void {
    const errors = this.collectValidationErrors(spec, context);
    if (errors.length > 0) {
      throw new Error(`Invalid container-application specification: ${errors.join('; ')}`);
    }
  }

  private collectValidationErrors(spec: ComponentSpec, context: ComponentContext): string[] {
    const errors: string[] = [];
    const config = (spec.config ?? {}) as Partial<ContainerApplicationConfig>;

    if (!spec.name || spec.name.trim().length === 0) {
      errors.push('Component name is required.');
    }

    if (!config.application?.name) {
      errors.push('application.name is required');
    } else if (!/^[a-z0-9-]+$/.test(config.application.name)) {
      errors.push('application.name must contain lowercase letters, numbers, and hyphens only');
    }

    if (!config.application?.port) {
      errors.push('application.port is required');
    } else if (config.application.port < 1 || config.application.port > 65535) {
      errors.push('application.port must be between 1 and 65535');
    }

    if (config.ecr && config.ecr.createRepository === false && !config.ecr.repositoryArn) {
      errors.push('ecr.repositoryArn must be supplied when createRepository is false');
    }

    if (config.loadBalancer?.sslCertificateArn && !config.loadBalancer.sslCertificateArn.startsWith('arn:aws:acm:')) {
      errors.push('loadBalancer.sslCertificateArn must be a valid ACM certificate ARN');
    }

    if (context.environment?.toLowerCase().startsWith('prod') && config.observability && !config.observability.enabled) {
      errors.push('Observability must remain enabled for production environments');
    }

    return errors;
  }
}

export const containerApplicationComponentCreator = new ContainerApplicationComponentCreator();
