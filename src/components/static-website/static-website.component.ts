/**
 * Static Website Component
 * 
 * Static website hosting with S3 and CloudFront CDN for global performance.
 * Implements three-tiered compliance model (Commercial/FedRAMP Moderate/FedRAMP High).
 */

import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  Component,
  ComponentSpec,
  ComponentContext,
  ComponentCapabilities
} from '@platform/contracts';

/**
 * Configuration interface for Static Website component
 */
export interface StaticWebsiteConfig {
  /** Website name (used for bucket naming) */
  websiteName?: string;
  
  /** Domain configuration */
  domain?: {
    /** Primary domain name */
    domainName: string;
    /** Alternative domain names */
    alternativeDomainNames?: string[];
    /** Certificate ARN for SSL/TLS */
    certificateArn?: string;
    /** Hosted zone ID for DNS */
    hostedZoneId?: string;
  };
  
  /** S3 bucket configuration */
  bucket?: {
    /** Custom bucket name */
    bucketName?: string;
    /** Website index document */
    indexDocument?: string;
    /** Website error document */
    errorDocument?: string;
    /** Enable versioning */
    versioning?: boolean;
    /** Enable access logging */
    accessLogging?: boolean;
    /** Access log bucket */
    accessLogBucket?: string;
  };
  
  /** CloudFront distribution configuration */
  distribution?: {
    /** Enable distribution */
    enabled?: boolean;
    /** Price class */
    priceClass?: 'PriceClass_All' | 'PriceClass_100' | 'PriceClass_200';
    /** Default cache behavior */
    defaultBehavior?: {
      /** Allowed HTTP methods */
      allowedMethods?: string[];
      /** Cached HTTP methods */
      cachedMethods?: string[];
      /** Cache policy */
      cachePolicy?: string;
      /** Viewer protocol policy */
      viewerProtocolPolicy?: 'REDIRECT_TO_HTTPS' | 'HTTPS_ONLY' | 'ALLOW_ALL';
    };
    /** Enable access logging */
    enableLogging?: boolean;
    /** Log bucket for CloudFront */
    logBucket?: string;
    /** Log prefix */
    logFilePrefix?: string;
  };
  
  /** Deployment configuration */
  deployment?: {
    /** Source path for website files */
    sourcePath?: string;
    /** Enable automatic deployment */
    enabled?: boolean;
    /** Deployment retention policy */
    retainOnDelete?: boolean;
  };
  
  /** Security configuration */
  security?: {
    /** Block public access */
    blockPublicAccess?: boolean;
    /** Enable encryption */
    encryption?: boolean;
    /** Enforce HTTPS */
    enforceHTTPS?: boolean;
    /** Security headers */
    securityHeaders?: Record<string, string>;
  };
  
  /** Tags for resources */
  tags?: Record<string, string>;
}

/**
 * Configuration schema for Static Website component
 */
export const STATIC_WEBSITE_CONFIG_SCHEMA = {
  type: 'object',
  title: 'Static Website Configuration',
  description: 'Configuration for creating a static website with S3 and CloudFront',
  properties: {
    websiteName: {
      type: 'string',
      description: 'Name of the website (used for resource naming)',
      pattern: '^[a-z0-9-]+$',
      maxLength: 63
    },
    domain: {
      type: 'object',
      description: 'Domain configuration',
      properties: {
        domainName: {
          type: 'string',
          description: 'Primary domain name for the website'
        },
        alternativeDomainNames: {
          type: 'array',
          description: 'Alternative domain names',
          items: { type: 'string' },
          default: []
        },
        certificateArn: {
          type: 'string',
          description: 'ACM certificate ARN for SSL/TLS'
        },
        hostedZoneId: {
          type: 'string',
          description: 'Route53 hosted zone ID'
        }
      },
      required: ['domainName'],
      additionalProperties: false
    },
    bucket: {
      type: 'object',
      description: 'S3 bucket configuration',
      properties: {
        bucketName: {
          type: 'string',
          description: 'Custom S3 bucket name'
        },
        indexDocument: {
          type: 'string',
          description: 'Index document for website',
          default: 'index.html'
        },
        errorDocument: {
          type: 'string',
          description: 'Error document for website',
          default: 'error.html'
        },
        versioning: {
          type: 'boolean',
          description: 'Enable S3 versioning',
          default: false
        },
        accessLogging: {
          type: 'boolean',
          description: 'Enable S3 access logging',
          default: false
        },
        accessLogBucket: {
          type: 'string',
          description: 'S3 access log bucket name'
        }
      },
      additionalProperties: false,
      default: { indexDocument: 'index.html', errorDocument: 'error.html', versioning: false, accessLogging: false }
    },
    distribution: {
      type: 'object',
      description: 'CloudFront distribution configuration',
      properties: {
        enabled: {
          type: 'boolean',
          description: 'Enable CloudFront distribution',
          default: true
        },
        priceClass: {
          type: 'string',
          description: 'CloudFront price class',
          enum: ['PriceClass_All', 'PriceClass_100', 'PriceClass_200'],
          default: 'PriceClass_100'
        },
        defaultBehavior: {
          type: 'object',
          description: 'Default cache behavior',
          properties: {
            allowedMethods: {
              type: 'array',
              description: 'Allowed HTTP methods',
              items: { type: 'string' },
              default: ['GET', 'HEAD', 'OPTIONS']
            },
            cachedMethods: {
              type: 'array',
              description: 'Cached HTTP methods',
              items: { type: 'string' },
              default: ['GET', 'HEAD']
            },
            viewerProtocolPolicy: {
              type: 'string',
              description: 'Viewer protocol policy',
              enum: ['REDIRECT_TO_HTTPS', 'HTTPS_ONLY', 'ALLOW_ALL'],
              default: 'REDIRECT_TO_HTTPS'
            }
          },
          additionalProperties: false,
          default: { allowedMethods: ['GET', 'HEAD', 'OPTIONS'], cachedMethods: ['GET', 'HEAD'], viewerProtocolPolicy: 'REDIRECT_TO_HTTPS' }
        },
        enableLogging: {
          type: 'boolean',
          description: 'Enable CloudFront access logging',
          default: false
        },
        logBucket: {
          type: 'string',
          description: 'CloudFront log bucket name'
        },
        logFilePrefix: {
          type: 'string',
          description: 'CloudFront log file prefix',
          default: 'cloudfront/'
        }
      },
      additionalProperties: false,
      default: { enabled: true, priceClass: 'PriceClass_100', enableLogging: false, logFilePrefix: 'cloudfront/' }
    },
    deployment: {
      type: 'object',
      description: 'Deployment configuration',
      properties: {
        sourcePath: {
          type: 'string',
          description: 'Source path for website files'
        },
        enabled: {
          type: 'boolean',
          description: 'Enable automatic deployment',
          default: false
        },
        retainOnDelete: {
          type: 'boolean',
          description: 'Retain deployment on stack deletion',
          default: false
        }
      },
      additionalProperties: false,
      default: { enabled: false, retainOnDelete: false }
    },
    security: {
      type: 'object',
      description: 'Security configuration',
      properties: {
        blockPublicAccess: {
          type: 'boolean',
          description: 'Block S3 public access (uses CloudFront only)',
          default: true
        },
        encryption: {
          type: 'boolean',
          description: 'Enable S3 encryption',
          default: true
        },
        enforceHTTPS: {
          type: 'boolean',
          description: 'Enforce HTTPS connections',
          default: true
        },
        securityHeaders: {
          type: 'object',
          description: 'Security headers for responses',
          additionalProperties: { type: 'string' },
          default: {}
        }
      },
      additionalProperties: false,
      default: { blockPublicAccess: true, encryption: true, enforceHTTPS: true, securityHeaders: {} }
    },
    tags: {
      type: 'object',
      description: 'Tags for resources',
      additionalProperties: { type: 'string' },
      default: {}
    }
  },
  additionalProperties: false,
  defaults: {
    bucket: { indexDocument: 'index.html', errorDocument: 'error.html', versioning: false, accessLogging: false },
    distribution: { enabled: true, priceClass: 'PriceClass_100', enableLogging: false, logFilePrefix: 'cloudfront/' },
    deployment: { enabled: false, retainOnDelete: false },
    security: { blockPublicAccess: true, encryption: true, enforceHTTPS: true, securityHeaders: {} },
    tags: {}
  }
};

/**
 * Configuration builder for Static Website component
 */
export class StaticWebsiteConfigBuilder {
  private context: ComponentContext;
  private spec: ComponentSpec;
  
  constructor(context: ComponentContext, spec: ComponentSpec) {
    this.context = context;
    this.spec = spec;
  }

  public async build(): Promise<StaticWebsiteConfig> {
    return this.buildSync();
  }

  public buildSync(): StaticWebsiteConfig {
    const platformDefaults = this.getPlatformDefaults();
    const complianceDefaults = this.getComplianceFrameworkDefaults();
    const userConfig = this.spec.config || {};
    
    const mergedConfig = this.mergeConfigs(
      this.mergeConfigs(platformDefaults, complianceDefaults),
      userConfig
    );
    
    return mergedConfig as StaticWebsiteConfig;
  }

  private mergeConfigs(target: Record<string, any>, source: Record<string, any>): Record<string, any> {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.mergeConfigs(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  private getPlatformDefaults(): Record<string, any> {
    return {
      bucket: {
        indexDocument: 'index.html',
        errorDocument: 'error.html',
        versioning: this.getDefaultVersioning(),
        accessLogging: this.getDefaultAccessLogging()
      },
      distribution: {
        enabled: true,
        priceClass: 'PriceClass_100',
        enableLogging: this.getDefaultDistributionLogging(),
        defaultBehavior: {
          viewerProtocolPolicy: 'REDIRECT_TO_HTTPS'
        }
      },
      security: {
        blockPublicAccess: true,
        encryption: true,
        enforceHTTPS: true,
        securityHeaders: this.getDefaultSecurityHeaders()
      },
      tags: {
        'service': this.context.serviceName,
        'environment': this.context.environment,
        'website-type': 'static'
      }
    };
  }

  private getComplianceFrameworkDefaults(): Record<string, any> {
    const framework = this.context.complianceFramework;
    
    switch (framework) {
      case 'fedramp-moderate':
        return {
          bucket: {
            versioning: true, // Required for compliance
            accessLogging: true // Mandatory logging
          },
          distribution: {
            enableLogging: true, // Required logging
            defaultBehavior: {
              viewerProtocolPolicy: 'HTTPS_ONLY' // Strict HTTPS
            }
          },
          security: {
            enforceHTTPS: true,
            securityHeaders: {
              'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
              'X-Content-Type-Options': 'nosniff',
              'X-Frame-Options': 'SAMEORIGIN',
              'Referrer-Policy': 'strict-origin-when-cross-origin'
            }
          },
          tags: {
            'compliance-framework': 'fedramp-moderate',
            'logging': 'comprehensive',
            'https-enforced': 'true'
          }
        };
        
      case 'fedramp-high':
        return {
          bucket: {
            versioning: true, // Mandatory
            accessLogging: true // Mandatory comprehensive logging
          },
          distribution: {
            enableLogging: true, // Mandatory
            priceClass: 'PriceClass_All', // Global presence for high security
            defaultBehavior: {
              viewerProtocolPolicy: 'HTTPS_ONLY' // Strict HTTPS only
            }
          },
          security: {
            enforceHTTPS: true,
            securityHeaders: {
              'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
              'X-Content-Type-Options': 'nosniff',
              'X-Frame-Options': 'DENY',
              'X-XSS-Protection': '1; mode=block',
              'Referrer-Policy': 'no-referrer',
              'Content-Security-Policy': "default-src 'self'",
              'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
            }
          },
          tags: {
            'compliance-framework': 'fedramp-high',
            'logging': 'comprehensive',
            'https-enforced': 'strict',
            'security-level': 'high'
          }
        };
        
      default: // commercial
        return {
          security: {
            securityHeaders: {
              'X-Content-Type-Options': 'nosniff',
              'X-Frame-Options': 'SAMEORIGIN'
            }
          }
        };
    }
  }

  private getDefaultVersioning(): boolean {
    return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework);
  }

  private getDefaultAccessLogging(): boolean {
    return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework);
  }

  private getDefaultDistributionLogging(): boolean {
    return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework);
  }

  private getDefaultSecurityHeaders(): Record<string, string> {
    const framework = this.context.complianceFramework;
    
    switch (framework) {
      case 'fedramp-high':
        return {
          'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'X-XSS-Protection': '1; mode=block',
          'Referrer-Policy': 'no-referrer'
        };
      case 'fedramp-moderate':
        return {
          'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'SAMEORIGIN'
        };
      default:
        return {
          'X-Content-Type-Options': 'nosniff'
        };
    }
  }
}

/**
 * Static Website Component implementing Component API Contract v1.0
 */
export class StaticWebsiteComponent extends Component {
  private bucket?: s3.Bucket;
  private distribution?: cloudfront.Distribution;
  private deployment?: s3deploy.BucketDeployment;
  private accessLogBucket?: s3.Bucket;
  private distributionLogBucket?: s3.Bucket;
  private config?: StaticWebsiteConfig;

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
  }

  public synth(): void {
    this.logComponentEvent('synthesis_start', 'Starting Static Website component synthesis', {
      websiteName: this.spec.config?.websiteName,
      hasDomain: !!this.spec.config?.domain
    });
    
    const startTime = Date.now();
    
    try {
      const configBuilder = new StaticWebsiteConfigBuilder(this.context, this.spec);
      this.config = configBuilder.buildSync();
      
      this.logComponentEvent('config_built', 'Static Website configuration built successfully', {
        websiteName: this.config.websiteName,
        hasCustomDomain: !!this.config.domain,
        distributionEnabled: this.config.distribution?.enabled
      });
      
      this.createAccessLogBucketIfNeeded();
      this.createDistributionLogBucketIfNeeded();
      this.createWebsiteBucket();
      this.createCloudFrontDistribution();
      this.createDnsRecordsIfNeeded();
      this.createDeploymentIfNeeded();
      this.applyComplianceHardening();
      this.configureObservabilityForWebsite();
    
      this.registerConstruct('bucket', this.bucket!);
      if (this.distribution) {
        this.registerConstruct('distribution', this.distribution);
      }
      if (this.deployment) {
        this.registerConstruct('deployment', this.deployment);
      }
      if (this.accessLogBucket) {
        this.registerConstruct('accessLogBucket', this.accessLogBucket);
      }
    
      this.registerCapability('website:static', this.buildWebsiteCapability());
    
      const duration = Date.now() - startTime;
      this.logPerformanceMetric('component_synthesis', duration, {
        resourcesCreated: Object.keys(this.capabilities).length
      });
    
      this.logComponentEvent('synthesis_complete', 'Static Website component synthesis completed successfully', {
        bucketCreated: 1,
        distributionCreated: this.config.distribution?.enabled ? 1 : 0,
        deploymentCreated: this.config.deployment?.enabled ? 1 : 0
      });
      
    } catch (error) {
      this.logError(error as Error, 'component synthesis', {
        componentType: 'static-website',
        stage: 'synthesis'
      });
      throw error;
    }
  }

  public getCapabilities(): ComponentCapabilities {
    this.validateSynthesized();
    return this.capabilities;
  }

  public getType(): string {
    return 'static-website';
  }

  private createAccessLogBucketIfNeeded(): void {
    if (this.config!.bucket?.accessLogging) {
      this.accessLogBucket = new s3.Bucket(this, 'AccessLogBucket', {
        bucketName: this.config!.bucket.accessLogBucket || `${this.buildWebsiteName()}-access-logs`,
        encryption: s3.BucketEncryption.S3_MANAGED,
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        removalPolicy: this.getBucketRemovalPolicy(),
        lifecycleRules: [{
          id: 'DeleteOldLogs',
          expiration: cdk.Duration.days(this.getLogRetentionDays())
        }]
      });

      this.applyStandardTags(this.accessLogBucket, {
        'bucket-type': 'access-logs',
        'website': this.buildWebsiteName()!,
        'log-retention': this.getLogRetentionDays().toString()
      });
    }
  }

  private createDistributionLogBucketIfNeeded(): void {
    if (this.config!.distribution?.enableLogging) {
      this.distributionLogBucket = new s3.Bucket(this, 'DistributionLogBucket', {
        bucketName: this.config!.distribution.logBucket || `${this.buildWebsiteName()}-cloudfront-logs`,
        encryption: s3.BucketEncryption.S3_MANAGED,
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        removalPolicy: this.getBucketRemovalPolicy(),
        lifecycleRules: [{
          id: 'DeleteOldLogs',
          expiration: cdk.Duration.days(this.getLogRetentionDays())
        }]
      });

      this.applyStandardTags(this.distributionLogBucket, {
        'bucket-type': 'distribution-logs',
        'website': this.buildWebsiteName()!,
        'log-retention': this.getLogRetentionDays().toString()
      });
    }
  }

  private createWebsiteBucket(): void {
    const bucketProps: s3.BucketProps = {
      bucketName: this.config!.bucket?.bucketName || this.buildWebsiteName(),
      websiteIndexDocument: this.config!.bucket?.indexDocument,
      websiteErrorDocument: this.config!.bucket?.errorDocument,
      versioned: this.config!.bucket?.versioning,
      encryption: this.config!.security?.encryption ? s3.BucketEncryption.S3_MANAGED : s3.BucketEncryption.UNENCRYPTED,
      blockPublicAccess: this.config!.security?.blockPublicAccess ? s3.BlockPublicAccess.BLOCK_ALL : s3.BlockPublicAccess.BLOCK_ACLS,
      removalPolicy: this.getBucketRemovalPolicy(),
      serverAccessLogsBucket: this.accessLogBucket,
      serverAccessLogsPrefix: 's3-access/'
    };

    this.bucket = new s3.Bucket(this, 'WebsiteBucket', bucketProps);

    // Add bucket policy for CloudFront access
    if (this.config!.security?.blockPublicAccess) {
      const oai = new cloudfront.OriginAccessIdentity(this, 'OAI', {
        comment: `OAI for ${this.buildWebsiteName()}`
      });

      this.bucket.addToResourcePolicy(new iam.PolicyStatement({
        actions: ['s3:GetObject'],
        resources: [this.bucket.arnForObjects('*')],
        principals: [new iam.CanonicalUserPrincipal(oai.cloudFrontOriginAccessIdentityS3CanonicalUserId)]
      }));
    }

    this.applyStandardTags(this.bucket, {
      'bucket-type': 'website',
      'website-name': this.buildWebsiteName()!,
      'versioning': (this.config!.bucket?.versioning || false).toString(),
      'encryption': (this.config!.security?.encryption || false).toString()
    });

    if (this.config!.tags) {
      Object.entries(this.config!.tags).forEach(([key, value]) => {
        cdk.Tags.of(this.bucket!).add(key, value);
      });
    }
    
    this.logResourceCreation('s3-bucket', this.buildWebsiteName()!, {
      bucketName: this.bucket.bucketName,
      versioning: this.config!.bucket?.versioning,
      encryption: this.config!.security?.encryption
    });
  }

  private createCloudFrontDistribution(): void {
    if (!this.config!.distribution?.enabled) {
      return;
    }

    const behaviors: Record<string, cloudfront.BehaviorOptions> = {};

    // Default behavior
    const defaultBehavior: cloudfront.BehaviorOptions = {
      origin: new origins.S3Origin(this.bucket!),
      viewerProtocolPolicy: this.mapViewerProtocolPolicy(this.config!.distribution.defaultBehavior?.viewerProtocolPolicy!),
      allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
      cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
      cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED
    };

    const distributionProps: cloudfront.DistributionProps = {
      defaultBehavior: defaultBehavior,
      additionalBehaviors: behaviors,
      domainNames: this.config!.domain ? [this.config!.domain.domainName, ...(this.config!.domain.alternativeDomainNames || [])] : undefined,
      certificate: this.config!.domain?.certificateArn ? 
        certificatemanager.Certificate.fromCertificateArn(this, 'Certificate', this.config!.domain.certificateArn) : 
        undefined,
      priceClass: this.mapPriceClass(this.config!.distribution.priceClass!),
      defaultRootObject: this.config!.bucket?.indexDocument,
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 404,
          responsePagePath: `/${this.config!.bucket?.errorDocument}`
        }
      ],
      enableLogging: this.config!.distribution.enableLogging,
      logBucket: this.distributionLogBucket,
      logFilePrefix: this.config!.distribution.logFilePrefix
    };

    this.distribution = new cloudfront.Distribution(this, 'Distribution', distributionProps);

    this.applyStandardTags(this.distribution, {
      'distribution-type': 'website',
      'website': this.buildWebsiteName()!,
      'price-class': this.config!.distribution.priceClass!,
      'logging-enabled': (this.config!.distribution.enableLogging || false).toString()
    });
    
    this.logResourceCreation('cloudfront-distribution', this.distribution.distributionId, {
      domainName: this.distribution.distributionDomainName,
      priceClass: this.config!.distribution.priceClass,
      loggingEnabled: this.config!.distribution.enableLogging
    });
  }

  private mapViewerProtocolPolicy(policy: string): cloudfront.ViewerProtocolPolicy {
    switch (policy) {
      case 'HTTPS_ONLY':
        return cloudfront.ViewerProtocolPolicy.HTTPS_ONLY;
      case 'ALLOW_ALL':
        return cloudfront.ViewerProtocolPolicy.ALLOW_ALL;
      default:
        return cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS;
    }
  }

  private mapPriceClass(priceClass: string): cloudfront.PriceClass {
    switch (priceClass) {
      case 'PriceClass_All':
        return cloudfront.PriceClass.PRICE_CLASS_ALL;
      case 'PriceClass_200':
        return cloudfront.PriceClass.PRICE_CLASS_200;
      default:
        return cloudfront.PriceClass.PRICE_CLASS_100;
    }
  }

  private createDnsRecordsIfNeeded(): void {
    if (!this.config!.domain || !this.distribution) {
      return;
    }

    if (this.config!.domain.hostedZoneId) {
      const hostedZone = route53.HostedZone.fromHostedZoneId(this, 'HostedZone', this.config!.domain.hostedZoneId);

      // Create A record for primary domain
      new route53.ARecord(this, 'AliasRecord', {
        zone: hostedZone,
        recordName: this.config!.domain.domainName,
        target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(this.distribution))
      });

      // Create A records for alternative domains
      if (this.config!.domain.alternativeDomainNames) {
        this.config!.domain.alternativeDomainNames.forEach((altDomain, index) => {
          new route53.ARecord(this, `AliasRecord${index}`, {
            zone: hostedZone,
            recordName: altDomain,
            target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(this.distribution!))
          });
        });
      }
    }
  }

  private createDeploymentIfNeeded(): void {
    if (!this.config!.deployment?.enabled || !this.config!.deployment.sourcePath) {
      return;
    }

    this.deployment = new s3deploy.BucketDeployment(this, 'Deployment', {
      sources: [s3deploy.Source.asset(this.config!.deployment.sourcePath)],
      destinationBucket: this.bucket!,
      distribution: this.distribution,
      distributionPaths: ['/*'],
      retainOnDelete: this.config!.deployment.retainOnDelete
    });

    this.applyStandardTags(this.deployment, {
      'deployment-type': 'automatic',
      'source-path': this.config!.deployment.sourcePath,
      'retain-on-delete': (this.config!.deployment.retainOnDelete || false).toString()
    });
  }

  private buildWebsiteName(): string | undefined {
    if (this.config!.websiteName) {
      return this.config!.websiteName;
    }
    return `${this.context.serviceName}-${this.spec.name}`;
  }

  private getBucketRemovalPolicy(): cdk.RemovalPolicy {
    return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework) 
      ? cdk.RemovalPolicy.RETAIN 
      : cdk.RemovalPolicy.DESTROY;
  }

  private getLogRetentionDays(): number {
    switch (this.context.complianceFramework) {
      case 'fedramp-high':
        return 3650; // 10 years
      case 'fedramp-moderate':
        return 365;  // 1 year
      default:
        return 90;   // 3 months
    }
  }

  private applyComplianceHardening(): void {
    switch (this.context.complianceFramework) {
      case 'fedramp-moderate':
        this.applyFedrampModerateHardening();
        break;
      case 'fedramp-high':
        this.applyFedrampHighHardening();
        break;
      default:
        this.applyCommercialHardening();
        break;
    }
  }

  private applyCommercialHardening(): void {
    // Basic security logging
    if (this.bucket) {
      const securityLogGroup = new logs.LogGroup(this, 'SecurityLogGroup', {
        logGroupName: `/aws/s3/${this.buildWebsiteName()}/security`,
        retention: logs.RetentionDays.THREE_MONTHS,
        removalPolicy: cdk.RemovalPolicy.DESTROY
      });

      this.applyStandardTags(securityLogGroup, {
        'log-type': 'security',
        'retention': '3-months'
      });
    }
  }

  private applyFedrampModerateHardening(): void {
    this.applyCommercialHardening();

    if (this.bucket) {
      const complianceLogGroup = new logs.LogGroup(this, 'ComplianceLogGroup', {
        logGroupName: `/aws/s3/${this.buildWebsiteName()}/compliance`,
        retention: logs.RetentionDays.ONE_YEAR,
        removalPolicy: cdk.RemovalPolicy.RETAIN
      });

      this.applyStandardTags(complianceLogGroup, {
        'log-type': 'compliance',
        'retention': '1-year',
        'compliance': 'fedramp-moderate'
      });
    }
  }

  private applyFedrampHighHardening(): void {
    this.applyFedrampModerateHardening();

    if (this.bucket) {
      const auditLogGroup = new logs.LogGroup(this, 'AuditLogGroup', {
        logGroupName: `/aws/s3/${this.buildWebsiteName()}/audit`,
        retention: logs.RetentionDays.TEN_YEARS,
        removalPolicy: cdk.RemovalPolicy.RETAIN
      });

      this.applyStandardTags(auditLogGroup, {
        'log-type': 'audit',
        'retention': '10-years',
        'compliance': 'fedramp-high'
      });
    }
  }

  private buildWebsiteCapability(): any {
    return {
      bucketName: this.bucket!.bucketName,
      websiteUrl: this.bucket!.bucketWebsiteUrl,
      distributionDomainName: this.distribution?.distributionDomainName,
      distributionId: this.distribution?.distributionId
    };
  }

  private configureObservabilityForWebsite(): void {
    if (this.context.complianceFramework === 'commercial') {
      return;
    }

    const websiteName = this.buildWebsiteName()!;

    // 1. CloudFront 4xx Error Rate Alarm
    if (this.distribution) {
      const errorRateAlarm = new cloudwatch.Alarm(this, 'CloudFrontErrorRateAlarm', {
        alarmName: `${this.context.serviceName}-${this.spec.name}-high-error-rate`,
        alarmDescription: 'CloudFront high 4xx error rate alarm',
        metric: new cloudwatch.Metric({
          namespace: 'AWS/CloudFront',
          metricName: '4xxErrorRate',
          dimensionsMap: {
            DistributionId: this.distribution.distributionId
          },
          statistic: 'Average',
          period: cdk.Duration.minutes(5)
        }),
        threshold: 5, // 5% error rate threshold
        evaluationPeriods: 3,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
      });

      this.applyStandardTags(errorRateAlarm, {
        'alarm-type': 'high-error-rate',
        'metric-type': 'reliability',
        'threshold': '5-percent'
      });
    }

    // 2. S3 Bucket Size Alarm
    const bucketSizeAlarm = new cloudwatch.Alarm(this, 'BucketSizeAlarm', {
      alarmName: `${this.context.serviceName}-${this.spec.name}-bucket-size`,
      alarmDescription: 'S3 bucket size monitoring alarm',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/S3',
        metricName: 'BucketSizeBytes',
        dimensionsMap: {
          BucketName: this.bucket!.bucketName,
          StorageType: 'StandardStorage'
        },
        statistic: 'Average',
        period: cdk.Duration.hours(24)
      }),
      threshold: 10737418240, // 10GB threshold
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });

    this.applyStandardTags(bucketSizeAlarm, {
      'alarm-type': 'bucket-size',
      'metric-type': 'capacity',
      'threshold': '10GB'
    });

    this.logComponentEvent('observability_configured', 'OpenTelemetry observability standard applied to Static Website', {
      alarmsCreated: 2,
      websiteName: websiteName,
      monitoringEnabled: true
    });
  }
}