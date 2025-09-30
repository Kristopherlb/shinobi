/**
 * CloudFront Distribution configuration builder.
 *
 * Provides a configuration surface that follows the platform precedence chain
 * and removes compliance-specific branching from the component implementation.
 */

import {
  ConfigBuilder,
  ConfigBuilderContext,
  ComponentConfigSchema
} from '@shinobi/core';
import { ComponentContext, ComponentSpec } from '@platform/contracts';

export type ViewerProtocolPolicy = 'allow-all' | 'redirect-to-https' | 'https-only';
export type PriceClass = 'PriceClass_100' | 'PriceClass_200' | 'PriceClass_All';
export type GeoRestrictionType = 'none' | 'whitelist' | 'blacklist';
export type OriginType = 's3' | 'alb' | 'custom';

export interface CloudFrontAlarmConfig {
  enabled?: boolean;
  threshold?: number;
  evaluationPeriods?: number;
  periodMinutes?: number;
  comparisonOperator?: 'gt' | 'gte' | 'lt' | 'lte';
  treatMissingData?: 'breaching' | 'not-breaching' | 'ignore' | 'missing';
  statistic?: string;
  tags?: Record<string, string>;
}

export interface CloudFrontMonitoringConfig {
  enabled?: boolean;
  alarms?: {
    error4xx?: CloudFrontAlarmConfig;
    error5xx?: CloudFrontAlarmConfig;
    originLatencyMs?: CloudFrontAlarmConfig;
  };
}

export interface CloudFrontDomainConfig {
  domainNames?: string[];
  certificateArn?: string;
}

export interface CloudFrontLoggingConfig {
  enabled?: boolean;
  bucket?: string;
  prefix?: string;
  includeCookies?: boolean;
}

export interface CloudFrontOriginConfig {
  type: OriginType;
  s3BucketName?: string;
  albDnsName?: string;
  customDomainName?: string;
  originPath?: string;
  customHeaders?: Record<string, string>;
}

export interface CloudFrontBehaviorConfig {
  viewerProtocolPolicy?: ViewerProtocolPolicy;
  allowedMethods?: string[];
  cachedMethods?: string[];
  compress?: boolean;
  cachePolicyId?: string;
  originRequestPolicyId?: string;
}

export interface CloudFrontAdditionalBehaviorConfig extends CloudFrontBehaviorConfig {
  pathPattern: string;
}

export interface CloudFrontGeoRestrictionConfig {
  type?: GeoRestrictionType;
  countries?: string[];
}

export interface CloudFrontDistributionConfig {
  comment?: string;
  origin: CloudFrontOriginConfig;
  defaultBehavior?: CloudFrontBehaviorConfig;
  additionalBehaviors?: CloudFrontAdditionalBehaviorConfig[];
  priceClass?: PriceClass;
  geoRestriction?: CloudFrontGeoRestrictionConfig;
  domain?: CloudFrontDomainConfig;
  logging?: CloudFrontLoggingConfig;
  monitoring?: CloudFrontMonitoringConfig;
  webAclId?: string;
  hardeningProfile?: string;
  tags?: Record<string, string>;
}

const ALARM_CONFIG_DEFINITION = {
  type: 'object',
  additionalProperties: false,
  properties: {
    enabled: { type: 'boolean', default: false },
    threshold: { type: 'number' },
    evaluationPeriods: { type: 'number', minimum: 1, default: 2 },
    periodMinutes: { type: 'number', minimum: 1, default: 5 },
    comparisonOperator: {
      type: 'string',
      enum: ['gt', 'gte', 'lt', 'lte'],
      default: 'gte'
    },
    treatMissingData: {
      type: 'string',
      enum: ['breaching', 'not-breaching', 'ignore', 'missing'],
      default: 'not-breaching'
    },
    statistic: { type: 'string', default: 'Average' },
    tags: {
      type: 'object',
      additionalProperties: { type: 'string' }
    }
  }
};

export const CLOUDFRONT_DISTRIBUTION_CONFIG_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['origin'],
  properties: {
    comment: { type: 'string', maxLength: 128 },
    origin: {
      type: 'object',
      additionalProperties: false,
      required: ['type'],
      properties: {
        type: { type: 'string', enum: ['s3', 'alb', 'custom'] },
        s3BucketName: { type: 'string' },
        albDnsName: { type: 'string' },
        customDomainName: { type: 'string' },
        originPath: { type: 'string' },
        customHeaders: {
          type: 'object',
          additionalProperties: { type: 'string' }
        }
      }
    },
    defaultBehavior: {
      type: 'object',
      additionalProperties: false,
      properties: {
        viewerProtocolPolicy: {
          type: 'string',
          enum: ['allow-all', 'redirect-to-https', 'https-only'],
          default: 'allow-all'
        },
        allowedMethods: {
          type: 'array',
          items: { type: 'string' },
          default: ['GET', 'HEAD']
        },
        cachedMethods: {
          type: 'array',
          items: { type: 'string' },
          default: ['GET', 'HEAD']
        },
        compress: { type: 'boolean', default: true },
        cachePolicyId: { type: 'string' },
        originRequestPolicyId: { type: 'string' }
      },
      default: {}
    },
    additionalBehaviors: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['pathPattern'],
        properties: {
          pathPattern: { type: 'string' },
          viewerProtocolPolicy: {
            type: 'string',
            enum: ['allow-all', 'redirect-to-https', 'https-only']
          },
          allowedMethods: {
            type: 'array',
            items: { type: 'string' }
          },
          cachedMethods: {
            type: 'array',
            items: { type: 'string' }
          },
          compress: { type: 'boolean' },
          cachePolicyId: { type: 'string' },
          originRequestPolicyId: { type: 'string' }
        }
      },
      default: []
    },
    priceClass: {
      type: 'string',
      enum: ['PriceClass_100', 'PriceClass_200', 'PriceClass_All'],
      default: 'PriceClass_100'
    },
    geoRestriction: {
      type: 'object',
      additionalProperties: false,
      properties: {
        type: {
          type: 'string',
          enum: ['none', 'whitelist', 'blacklist'],
          default: 'none'
        },
        countries: {
          type: 'array',
          items: { type: 'string' }
        }
      },
      default: {}
    },
    domain: {
      type: 'object',
      additionalProperties: false,
      properties: {
        domainNames: {
          type: 'array',
          items: { type: 'string' }
        },
        certificateArn: { type: 'string' }
      },
      default: {}
    },
    logging: {
      type: 'object',
      additionalProperties: false,
      properties: {
        enabled: { type: 'boolean', default: false },
        bucket: { type: 'string' },
        prefix: { type: 'string' },
        includeCookies: { type: 'boolean', default: false }
      },
      default: {}
    },
    monitoring: {
      type: 'object',
      additionalProperties: false,
      properties: {
        enabled: { type: 'boolean', default: false },
        alarms: {
          type: 'object',
          additionalProperties: false,
          properties: {
            error4xx: ALARM_CONFIG_DEFINITION,
            error5xx: ALARM_CONFIG_DEFINITION,
            originLatencyMs: ALARM_CONFIG_DEFINITION
          },
          default: {}
        }
      },
      default: {}
    },
    webAclId: { type: 'string' },
    hardeningProfile: { type: 'string' },
    tags: {
      type: 'object',
      additionalProperties: { type: 'string' },
      default: {}
    }
  }
};

export class CloudFrontDistributionComponentConfigBuilder extends ConfigBuilder<CloudFrontDistributionConfig> {
  constructor(context: ComponentContext, spec: ComponentSpec) {
    const builderContext: ConfigBuilderContext = { context, spec };
    super(builderContext, CLOUDFRONT_DISTRIBUTION_CONFIG_SCHEMA);
  }

  protected getHardcodedFallbacks(): Partial<CloudFrontDistributionConfig> {
    return {
      comment: 'Managed by Shinobi platform',
      origin: {
        type: 's3'
      },
      defaultBehavior: {
        viewerProtocolPolicy: 'allow-all',
        allowedMethods: ['GET', 'HEAD'],
        cachedMethods: ['GET', 'HEAD'],
        compress: true
      },
      additionalBehaviors: [],
      priceClass: 'PriceClass_100',
      geoRestriction: {
        type: 'none',
        countries: []
      },
      logging: {
        enabled: false,
        includeCookies: false
      },
      monitoring: {
        enabled: false,
        alarms: {}
      },
      hardeningProfile: 'baseline',
      tags: {}
    };
  }

  public buildSync(): CloudFrontDistributionConfig {
    const resolved = super.buildSync() as CloudFrontDistributionConfig;
    return this.normaliseConfig(resolved);
  }

  private normaliseAlarmConfig(
    alarm: CloudFrontAlarmConfig | undefined,
    defaults: Required<Omit<CloudFrontAlarmConfig, 'tags'>>
  ): CloudFrontAlarmConfig {
    return {
      enabled: alarm?.enabled ?? defaults.enabled,
      threshold: alarm?.threshold ?? defaults.threshold,
      evaluationPeriods: alarm?.evaluationPeriods ?? defaults.evaluationPeriods,
      periodMinutes: alarm?.periodMinutes ?? defaults.periodMinutes,
      comparisonOperator: alarm?.comparisonOperator ?? defaults.comparisonOperator,
      treatMissingData: alarm?.treatMissingData ?? defaults.treatMissingData,
      statistic: alarm?.statistic ?? defaults.statistic,
      tags: alarm?.tags ?? {}
    };
  }

  private normaliseConfig(config: CloudFrontDistributionConfig): CloudFrontDistributionConfig {
    const originType = config.origin.type ?? 's3';
    return {
      comment: config.comment ?? 'Managed by Shinobi platform',
      origin: {
        type: originType,
        s3BucketName: originType === 's3'
          ? config.origin.s3BucketName ?? this.generateDefaultBucketName()
          : config.origin.s3BucketName,
        albDnsName: config.origin.albDnsName,
        customDomainName: config.origin.customDomainName,
        originPath: config.origin.originPath,
        customHeaders: config.origin.customHeaders ?? {}
      },
      defaultBehavior: {
        viewerProtocolPolicy: config.defaultBehavior?.viewerProtocolPolicy ?? 'allow-all',
        allowedMethods: config.defaultBehavior?.allowedMethods ?? ['GET', 'HEAD'],
        cachedMethods: config.defaultBehavior?.cachedMethods ?? ['GET', 'HEAD'],
        compress: config.defaultBehavior?.compress ?? true,
        cachePolicyId: config.defaultBehavior?.cachePolicyId,
        originRequestPolicyId: config.defaultBehavior?.originRequestPolicyId
      },
      additionalBehaviors: (config.additionalBehaviors ?? []).map(behavior => ({
        pathPattern: behavior.pathPattern,
        viewerProtocolPolicy: behavior.viewerProtocolPolicy ?? config.defaultBehavior?.viewerProtocolPolicy ?? 'allow-all',
        allowedMethods: behavior.allowedMethods ?? ['GET', 'HEAD'],
        cachedMethods: behavior.cachedMethods ?? ['GET', 'HEAD'],
        compress: behavior.compress ?? true,
        cachePolicyId: behavior.cachePolicyId,
        originRequestPolicyId: behavior.originRequestPolicyId
      })),
      priceClass: config.priceClass ?? 'PriceClass_100',
      geoRestriction: {
        type: config.geoRestriction?.type ?? 'none',
        countries: config.geoRestriction?.countries ?? []
      },
      domain: {
        domainNames: config.domain?.domainNames ?? [],
        certificateArn: config.domain?.certificateArn
      },
      logging: {
        enabled: config.logging?.enabled ?? false,
        bucket: config.logging?.bucket,
        prefix: config.logging?.prefix,
        includeCookies: config.logging?.includeCookies ?? false
      },
      monitoring: {
        enabled: config.monitoring?.enabled ?? false,
        alarms: {
          error4xx: this.normaliseAlarmConfig(config.monitoring?.alarms?.error4xx, {
            enabled: config.monitoring?.enabled ?? false,
            threshold: 50,
            evaluationPeriods: 2,
            periodMinutes: 5,
            comparisonOperator: 'gte',
            treatMissingData: 'not-breaching',
            statistic: 'Average'
          }),
          error5xx: this.normaliseAlarmConfig(config.monitoring?.alarms?.error5xx, {
            enabled: config.monitoring?.enabled ?? false,
            threshold: 10,
            evaluationPeriods: 2,
            periodMinutes: 5,
            comparisonOperator: 'gte',
            treatMissingData: 'not-breaching',
            statistic: 'Average'
          }),
          originLatencyMs: this.normaliseAlarmConfig(config.monitoring?.alarms?.originLatencyMs, {
            enabled: config.monitoring?.enabled ?? false,
            threshold: 5000,
            evaluationPeriods: 2,
            periodMinutes: 5,
            comparisonOperator: 'gte',
            treatMissingData: 'not-breaching',
            statistic: 'Average'
          })
        }
      },
      webAclId: config.webAclId,
      hardeningProfile: config.hardeningProfile ?? 'baseline',
      tags: config.tags ?? {}
    };
  }

  private generateDefaultBucketName(): string {
    const service = this.builderContext.context.serviceName || 'service';
    const component = this.builderContext.spec.name || 'distribution';
    const raw = `${service}-${component}-origin`.toLowerCase();
    const sanitized = raw.replace(/[^a-z0-9.-]/g, '-').replace(/^-+/, '').replace(/-+$/, '');
    return sanitized.substring(0, 63) || 'cloudfront-origin';
  }
}
