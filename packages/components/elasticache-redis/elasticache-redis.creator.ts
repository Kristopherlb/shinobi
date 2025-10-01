import { Construct } from 'constructs';
import {
  ComponentContext,
  ComponentSpec,
  IComponentCreator
} from '@shinobi/core';
import { ElastiCacheRedisComponent } from './elasticache-redis.component.js';
import {
  ElastiCacheRedisConfig,
  ELASTICACHE_REDIS_CONFIG_SCHEMA
} from './elasticache-redis.builder.js';

export class ElastiCacheRedisComponentCreator implements IComponentCreator {
  public readonly componentType = 'elasticache-redis';
  public readonly displayName = 'ElastiCache Redis';
  public readonly description = 'Managed Redis cache with configuration-driven defaults.';
  public readonly category = 'cache';
  public readonly awsService = 'ELASTICACHE';
  public readonly tags = ['redis', 'elasticache', 'cache'];
  public readonly configSchema = ELASTICACHE_REDIS_CONFIG_SCHEMA;

  public createComponent(scope: Construct, spec: ComponentSpec, context: ComponentContext): ElastiCacheRedisComponent {
    return new ElastiCacheRedisComponent(scope, spec.name, context, spec);
  }

  public validateSpec(spec: ComponentSpec, context: ComponentContext): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const config = spec.config as Partial<ElastiCacheRedisConfig> | undefined;

    if (!spec.name || !/^[a-zA-Z][a-zA-Z0-9-_]*$/.test(spec.name)) {
      errors.push('Component name must start with a letter and contain only alphanumeric characters, hyphens, or underscores.');
    }

    if (config?.security && config.security.create === false && (!config.security.securityGroupIds || config.security.securityGroupIds.length === 0)) {
      errors.push('When security.create is false you must supply at least one securityGroupId.');
    }

    if (config?.multiAz?.automaticFailover && config.multiAz.enabled === false) {
      errors.push('automaticFailover requires multiAz.enabled to be true.');
    }

    if (context.environment === 'prod' && config?.monitoring?.enabled === false) {
      errors.push('Monitoring must remain enabled in production environments.');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  public getProvidedCapabilities(): string[] {
    return ['cache:redis'];
  }

  public getRequiredCapabilities(): string[] {
    return [];
  }

  public getConstructHandles(): string[] {
    return [
      'main',
      'replicationGroup',
      'subnetGroup',
      'securityGroup',
      'parameterGroup',
      'authToken',
      'alarm:cpuUtilization',
      'alarm:cacheMisses',
      'alarm:evictions',
      'alarm:connections'
    ];
  }
}
