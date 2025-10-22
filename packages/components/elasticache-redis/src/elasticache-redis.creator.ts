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

    if (!config?.vpc?.vpcId && !context.vpc) {
      errors.push('A VPC is required. Provide config.vpc.vpcId or ensure the platform context supplies context.vpc.');
    }

    if (config?.monitoring?.enabled === false) {
      errors.push('Monitoring cannot be disabled. The Platform Observability Standard requires telemetry for every deployment.');
    }

    if (config?.encryption?.atRest === false || config?.encryption?.inTransit === false) {
      errors.push('Encryption at rest and in transit must remain enabled for Redis clusters.');
    }

    if (config?.encryption?.authToken?.enabled === false) {
      errors.push('Redis AUTH token enforcement must remain enabled. Provide a secretArn if you need to supply an existing token.');
    }

    if (config?.security?.allowedCidrs?.some(cidr => cidr === '0.0.0.0/0')) {
      errors.push('CIDR 0.0.0.0/0 is not permitted for Redis ingress. Restrict allowedCidrs to private ranges.');
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
