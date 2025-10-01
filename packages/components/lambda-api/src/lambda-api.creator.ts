import { Construct } from 'constructs';
import {
  ComponentContext,
  ComponentSpec,
  IComponentCreator
} from '@shinobi/core';

import { LambdaApiComponent } from './lambda-api.component.js';
import {
  LAMBDA_API_CONFIG_SCHEMA,
  LambdaApiConfig
} from './lambda-api.builder.js';

export class LambdaApiComponentCreator implements IComponentCreator {
  public readonly componentType = 'lambda-api';
  public readonly displayName = 'Lambda API Component';
  public readonly description = 'Managed Lambda function with API Gateway integration and compliance-driven defaults.';
  public readonly category = 'compute';
  public readonly awsService = 'LAMBDA';
  public readonly tags = ['lambda', 'api-gateway', 'compute'];
  public readonly configSchema = LAMBDA_API_CONFIG_SCHEMA;

  public createComponent(scope: Construct, spec: ComponentSpec, context: ComponentContext): LambdaApiComponent {
    return new LambdaApiComponent(scope, spec.name, context, spec);
  }

  public validateSpec(spec: ComponentSpec): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const config = spec.config as Partial<LambdaApiConfig> | undefined;

    if (!spec.name || !/^[a-zA-Z][a-zA-Z0-9-_]*$/.test(spec.name)) {
      errors.push('Component name must start with a letter and contain only alphanumeric characters, hyphens, or underscores.');
    }

    if (!config?.handler) {
      errors.push('`handler` is required for lambda-api components.');
    }

    if (config?.api?.apiKeyRequired && !config.api.usagePlan?.enabled) {
      errors.push('API key enforcement requires an enabled usage plan. Set api.usagePlan.enabled to true.');
    }

    if (config?.vpc?.enabled) {
      if (!config.vpc.vpcId) {
        errors.push('`vpc.vpcId` is required when VPC deployment is enabled.');
      }
      if ((config.vpc.subnetIds ?? []).length === 0) {
        errors.push('Provide at least one subnet ID when deploying Lambda API inside a VPC.');
      }
      if ((config.vpc.securityGroupIds ?? []).length === 0) {
        errors.push('Provide at least one security group ID when VPC deployment is enabled.');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  public getProvidedCapabilities(): string[] {
    return ['lambda:function', 'api:rest'];
  }

  public getRequiredCapabilities(): string[] {
    return [];
  }

  public getConstructHandles(): string[] {
    return ['main', 'lambdaFunction', 'api', 'accessLogs', 'usagePlan'];
  }
}
