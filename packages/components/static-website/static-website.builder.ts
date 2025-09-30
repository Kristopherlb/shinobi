import {
  ConfigBuilder,
  ConfigBuilderContext,
  ComponentConfigSchema
} from '@shinobi/core';

export type RemovalPolicyOption = 'retain' | 'destroy';
export type PriceClassOption = 'price-class-100' | 'price-class-200' | 'price-class-all';

export interface DomainConfig {
  domainName: string;
  alternativeDomainNames?: string[];
  certificateArn?: string;
  hostedZoneId?: string;
}

export interface BucketConfig {
  indexDocument: string;
  errorDocument: string;
  versioning: boolean;
  accessLogging: boolean;
  removalPolicy: RemovalPolicyOption;
}

export interface DistributionConfig {
  enabled: boolean;
  enableLogging: boolean;
  logFilePrefix?: string;
  priceClass: PriceClassOption;
}

export interface DeploymentConfig {
  sourcePath?: string;
  enabled: boolean;
  retainOnDelete: boolean;
}

export interface SecurityConfig {
  blockPublicAccess: boolean;
  encryption: boolean;
  enforceHTTPS: boolean;
}

export interface LoggingConfig {
  retentionDays: number;
}

export interface StaticWebsiteConfig {
  websiteName?: string;
  domain?: DomainConfig;
  bucket: BucketConfig;
  distribution: DistributionConfig;
  deployment: DeploymentConfig;
  security: SecurityConfig;
  logging: LoggingConfig;
  tags: Record<string, string>;
}

const DOMAIN_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['domainName'],
  properties: {
    domainName: { type: 'string' },
    alternativeDomainNames: {
      type: 'array',
      items: { type: 'string' }
    },
    certificateArn: { type: 'string' },
    hostedZoneId: { type: 'string' }
  }
};

const BUCKET_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    indexDocument: { type: 'string' },
    errorDocument: { type: 'string' },
    versioning: { type: 'boolean' },
    accessLogging: { type: 'boolean' },
    removalPolicy: { type: 'string', enum: ['retain', 'destroy'] }
  }
};

const DISTRIBUTION_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    enabled: { type: 'boolean' },
    enableLogging: { type: 'boolean' },
    logFilePrefix: { type: 'string' },
    priceClass: { type: 'string', enum: ['price-class-100', 'price-class-200', 'price-class-all'] }
  }
};

const DEPLOYMENT_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    sourcePath: { type: 'string' },
    enabled: { type: 'boolean' },
    retainOnDelete: { type: 'boolean' }
  }
};

const SECURITY_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    blockPublicAccess: { type: 'boolean' },
    encryption: { type: 'boolean' },
    enforceHTTPS: { type: 'boolean' }
  }
};

const LOGGING_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    retentionDays: { type: 'number', minimum: 1 }
  }
};

const STATIC_WEBSITE_CONFIG_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  title: 'Static Website Configuration',
  description: 'Configuration for hosting a static website with S3 and CloudFront',
  additionalProperties: false,
  properties: {
    websiteName: { type: 'string' },
    domain: DOMAIN_SCHEMA,
    bucket: BUCKET_SCHEMA,
    distribution: DISTRIBUTION_SCHEMA,
    deployment: DEPLOYMENT_SCHEMA,
    security: SECURITY_SCHEMA,
    logging: LOGGING_SCHEMA,
    tags: {
      type: 'object',
      additionalProperties: { type: 'string' }
    }
  }
};

const HARDENED_DEFAULTS: Partial<StaticWebsiteConfig> = {
  bucket: {
    indexDocument: 'index.html',
    errorDocument: 'error.html',
    versioning: false,
    accessLogging: false,
    removalPolicy: 'destroy'
  },
  distribution: {
    enabled: true,
    enableLogging: false,
    logFilePrefix: 'cloudfront/',
    priceClass: 'price-class-100'
  },
  deployment: {
    enabled: false,
    retainOnDelete: false
  },
  security: {
    blockPublicAccess: true,
    encryption: true,
    enforceHTTPS: true
  },
  logging: {
    retentionDays: 90
  },
  tags: {}
};

export class StaticWebsiteConfigBuilder extends ConfigBuilder<StaticWebsiteConfig> {
  constructor(context: ConfigBuilderContext['context'], spec: ConfigBuilderContext['spec']) {
    const builderContext: ConfigBuilderContext = { context, spec };
    super(builderContext, STATIC_WEBSITE_CONFIG_SCHEMA);
  }

  protected getHardcodedFallbacks(): Partial<StaticWebsiteConfig> {
    return HARDENED_DEFAULTS;
  }

  public buildSync(): StaticWebsiteConfig {
    const resolved = super.buildSync() as Partial<StaticWebsiteConfig>;
    return this.normaliseConfig(resolved);
  }

  public getSchema(): ComponentConfigSchema {
    return STATIC_WEBSITE_CONFIG_SCHEMA;
  }

  private normaliseConfig(config: Partial<StaticWebsiteConfig>): StaticWebsiteConfig {
    const bucket = {
      ...HARDENED_DEFAULTS.bucket,
      ...(config.bucket ?? {})
    } as BucketConfig;

    const distribution = {
      ...HARDENED_DEFAULTS.distribution,
      ...(config.distribution ?? {})
    } as DistributionConfig;

    const deployment = {
      ...HARDENED_DEFAULTS.deployment,
      ...(config.deployment ?? {})
    } as DeploymentConfig;

    const security = {
      ...HARDENED_DEFAULTS.security,
      ...(config.security ?? {})
    } as SecurityConfig;

    const logging = {
      ...HARDENED_DEFAULTS.logging,
      ...(config.logging ?? {})
    } as LoggingConfig;

    return {
      websiteName: config.websiteName,
      domain: config.domain ? {
        domainName: config.domain.domainName,
        alternativeDomainNames: config.domain.alternativeDomainNames ?? [],
        certificateArn: config.domain.certificateArn,
        hostedZoneId: config.domain.hostedZoneId
      } : undefined,
      bucket,
      distribution,
      deployment,
      security,
      logging,
      tags: config.tags ?? {}
    };
  }
}

export { STATIC_WEBSITE_CONFIG_SCHEMA };
