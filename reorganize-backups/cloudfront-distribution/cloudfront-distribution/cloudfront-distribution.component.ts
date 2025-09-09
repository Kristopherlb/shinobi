/**
 * CloudFront Distribution Component implementing Component API Contract v1.0
 * 
 * A managed Content Delivery Network (CDN) for global, low-latency content delivery.
 * Implements three-tiered compliance model (Commercial/FedRAMP Moderate/FedRAMP High).
 */

import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  Component,
  ComponentSpec,
  ComponentContext,
  ComponentCapabilities
} from '../../../platform/contracts/src';

/**
 * Configuration interface for CloudFront Distribution component
 */
export interface CloudFrontDistributionConfig {
  /** Distribution comment/description */
  comment?: string;
  
  /** Origin configuration */
  origin: {
    type: 's3' | 'alb' | 'custom';
    s3BucketName?: string;
    albDnsName?: string;
    customDomainName?: string;
    originPath?: string;
    customHeaders?: Record<string, string>;
  };
  
  /** Custom domain configuration */
  domain?: {
    domainNames?: string[];
    certificateArn?: string;
    sslSupportMethod?: 'sni-only' | 'vip';
    minimumProtocolVersion?: string;
  };
  
  /** Default cache behavior */
  defaultBehavior?: {
    viewerProtocolPolicy?: 'allow-all' | 'redirect-to-https' | 'https-only';
    allowedMethods?: string[];
    cachedMethods?: string[];
    cachePolicyId?: string;
    originRequestPolicyId?: string;
    compress?: boolean;
    ttl?: {
      default?: number;
      maximum?: number;
      minimum?: number;
    };
  };
  
  /** Additional cache behaviors */
  additionalBehaviors?: Array<{
    pathPattern: string;
    viewerProtocolPolicy?: 'allow-all' | 'redirect-to-https' | 'https-only';
    allowedMethods?: string[];
    cachedMethods?: string[];
    cachePolicyId?: string;
    originRequestPolicyId?: string;
    compress?: boolean;
  }>;
  
  /** Geographic restrictions */
  geoRestriction?: {
    type: 'whitelist' | 'blacklist' | 'none';
    countries?: string[];
  };
  
  /** Price class */
  priceClass?: 'PriceClass_All' | 'PriceClass_200' | 'PriceClass_100';
  
  /** Logging configuration */
  logging?: {
    enabled?: boolean;
    bucket?: string;
    prefix?: string;
    includeCookies?: boolean;
  };
  
  /** WAF configuration */
  webAclId?: string;
  
  /** Monitoring configuration */
  monitoring?: {
    enabled?: boolean;
    alarms?: {
      error4xxThreshold?: number;
      error5xxThreshold?: number;
      originLatencyThreshold?: number;
    };
  };
  
  /** Tags for the distribution */
  tags?: Record<string, string>;
}

/**
 * JSON Schema for CloudFront Distribution configuration
 */
export const CLOUDFRONT_DISTRIBUTION_CONFIG_SCHEMA = {
  type: 'object',
  properties: {
    comment: { type: 'string' },
    origin: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['s3', 'alb', 'custom']
        },
        s3BucketName: { type: 'string' },
        albDnsName: { type: 'string' },
        customDomainName: { type: 'string' },
        originPath: { type: 'string' },
        customHeaders: {
          type: 'object',
          additionalProperties: { type: 'string' }
        }
      },
      required: ['type']
    },
    domain: {
      type: 'object',
      properties: {
        domainNames: {
          type: 'array',
          items: { type: 'string' }
        },
        certificateArn: { type: 'string' },
        sslSupportMethod: {
          type: 'string',
          enum: ['sni-only', 'vip']
        },
        minimumProtocolVersion: { type: 'string' }
      }
    },
    defaultBehavior: {
      type: 'object',
      properties: {
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
        cachePolicyId: { type: 'string' },
        originRequestPolicyId: { type: 'string' },
        compress: { type: 'boolean' },
        ttl: {
          type: 'object',
          properties: {
            default: { type: 'number', minimum: 0 },
            maximum: { type: 'number', minimum: 0 },
            minimum: { type: 'number', minimum: 0 }
          }
        }
      }
    },
    additionalBehaviors: {
      type: 'array',
      items: {
        type: 'object',
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
          cachePolicyId: { type: 'string' },
          originRequestPolicyId: { type: 'string' },
          compress: { type: 'boolean' }
        },
        required: ['pathPattern']
      }
    },
    geoRestriction: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['whitelist', 'blacklist', 'none']
        },
        countries: {
          type: 'array',
          items: { type: 'string' }
        }
      },
      required: ['type']
    },
    priceClass: {
      type: 'string',
      enum: ['PriceClass_All', 'PriceClass_200', 'PriceClass_100']
    },
    logging: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean' },
        bucket: { type: 'string' },
        prefix: { type: 'string' },
        includeCookies: { type: 'boolean' }
      }
    },
    webAclId: { type: 'string' },
    monitoring: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean' },
        alarms: {
          type: 'object',
          properties: {
            error4xxThreshold: { type: 'number', minimum: 0 },
            error5xxThreshold: { type: 'number', minimum: 0 },
            originLatencyThreshold: { type: 'number', minimum: 0 }
          }
        }
      }
    },
    tags: {
      type: 'object',
      additionalProperties: { type: 'string' }
    }
  },
  required: ['origin'],
  additionalProperties: false
};

/**
 * ConfigBuilder for CloudFront Distribution component
 */
export class CloudFrontDistributionConfigBuilder {
  constructor(private context: ComponentContext, private spec: ComponentSpec) {}

  /**
   * Asynchronous build method - delegates to synchronous implementation
   */
  public async build(): Promise<CloudFrontDistributionConfig> {
    return this.buildSync();
  }

  /**
   * Synchronous version of build for use in synth() method
   */
  public buildSync(): CloudFrontDistributionConfig {
    // Start with platform defaults
    const platformDefaults = this.getPlatformDefaults();
    
    // Apply compliance framework defaults
    const complianceDefaults = this.getComplianceFrameworkDefaults();
    
    // Merge user configuration from spec
    const userConfig = this.spec.config || {};
    
    // Merge configurations (user config takes precedence)
    const mergedConfig = this.mergeConfigs(
      this.mergeConfigs(platformDefaults, complianceDefaults),
      userConfig
    );
    
    return mergedConfig as CloudFrontDistributionConfig;
  }

  /**
   * Simple merge utility for combining configuration objects
   */
  private mergeConfigs(base: Record<string, any>, override: Record<string, any>): Record<string, any> {
    const result = { ...base };
    
    for (const [key, value] of Object.entries(override)) {
      if (value !== undefined && value !== null) {
        if (typeof value === 'object' && !Array.isArray(value) && typeof result[key] === 'object' && !Array.isArray(result[key])) {
          result[key] = this.mergeConfigs(result[key] || {}, value);
        } else {
          result[key] = value;
        }
      }
    }
    
    return result;
  }

  /**
   * Get platform-wide defaults with intelligent configuration
   */
  private getPlatformDefaults(): Partial<CloudFrontDistributionConfig> {
    return {
      comment: `CloudFront distribution for ${this.spec.name}`,
      defaultBehavior: {
        viewerProtocolPolicy: this.getDefaultViewerProtocolPolicy(),
        allowedMethods: ['GET', 'HEAD', 'OPTIONS'],
        cachedMethods: ['GET', 'HEAD'],
        compress: true,
        ttl: {
          default: 86400, // 24 hours
          maximum: 31536000, // 1 year
          minimum: 0
        }
      },
      priceClass: this.getDefaultPriceClass(),
      geoRestriction: {
        type: 'none'
      },
      logging: {
        enabled: this.shouldEnableLogging(),
        includeCookies: false
      },
      monitoring: {
        enabled: true,
        alarms: {
          error4xxThreshold: 50,
          error5xxThreshold: 10,
          originLatencyThreshold: 5000
        }
      }
    };
  }

  /**
   * Get compliance framework-specific defaults
   */
  private getComplianceFrameworkDefaults(): Partial<CloudFrontDistributionConfig> {
    switch (this.context.complianceFramework) {
      case 'fedramp-high':
        return {
          defaultBehavior: {
            viewerProtocolPolicy: 'https-only', // Mandatory HTTPS
            ttl: {
              default: 3600, // Shorter cache for security
              maximum: 86400,
              minimum: 0
            }
          },
          priceClass: 'PriceClass_All', // Global coverage for compliance
          logging: {
            enabled: true, // Mandatory logging
            includeCookies: true
          },
          monitoring: {
            enabled: true,
            alarms: {
              error4xxThreshold: 25, // More sensitive monitoring
              error5xxThreshold: 5,
              originLatencyThreshold: 3000
            }
          }
        };
        
      case 'fedramp-moderate':
        return {
          defaultBehavior: {
            viewerProtocolPolicy: 'redirect-to-https', // Force HTTPS
            ttl: {
              default: 7200, // 2 hours
              maximum: 86400,
              minimum: 0
            }
          },
          priceClass: 'PriceClass_200', // US, Europe, Asia coverage
          logging: {
            enabled: true, // Recommended logging
            includeCookies: false
          },
          monitoring: {
            enabled: true,
            alarms: {
              error4xxThreshold: 35,
              error5xxThreshold: 8,
              originLatencyThreshold: 4000
            }
          }
        };
        
      default: // commercial
        return {
          defaultBehavior: {
            viewerProtocolPolicy: 'allow-all', // Flexible for commercial
          },
          priceClass: 'PriceClass_100', // Cost-optimized
          logging: {
            enabled: false // Optional for commercial
          },
          monitoring: {
            enabled: false // Optional monitoring
          }
        };
    }
  }

  /**
   * Get default viewer protocol policy based on compliance framework
   */
  private getDefaultViewerProtocolPolicy(): 'allow-all' | 'redirect-to-https' | 'https-only' {
    switch (this.context.complianceFramework) {
      case 'fedramp-high':
        return 'https-only';
      case 'fedramp-moderate':
        return 'redirect-to-https';
      default:
        return 'allow-all';
    }
  }

  /**
   * Get default price class based on compliance framework
   */
  private getDefaultPriceClass(): 'PriceClass_All' | 'PriceClass_200' | 'PriceClass_100' {
    switch (this.context.complianceFramework) {
      case 'fedramp-high':
        return 'PriceClass_All';
      case 'fedramp-moderate':
        return 'PriceClass_200';
      default:
        return 'PriceClass_100';
    }
  }

  /**
   * Determine if logging should be enabled by default
   */
  private shouldEnableLogging(): boolean {
    return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework);
  }
}

/**
 * CloudFront Distribution Component implementing Component API Contract v1.0
 */
export class CloudFrontDistributionComponent extends Component {
  private distribution?: cloudfront.Distribution;
  private origin?: cloudfront.IOrigin;
  private config?: CloudFrontDistributionConfig;

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
  }

  /**
   * Synthesis phase - Create CloudFront distribution with global CDN
   */
  public synth(): void {
    this.logComponentEvent('synthesis_start', 'Starting CloudFront Distribution synthesis');
    
    try {
      // Build configuration using ConfigBuilder
      const configBuilder = new CloudFrontDistributionConfigBuilder(this.context, this.spec);
      this.config = configBuilder.buildSync();
      
      // Create origin based on configuration
      this.createOrigin();
      
      // Create CloudFront distribution
      this.createCloudFrontDistribution();
      
      // Configure observability
      this.configureCloudFrontObservability();
      
      // Apply compliance hardening
      this.applyComplianceHardening();
      
      // Register constructs
      this.registerConstruct('distribution', this.distribution!);
      
      // Register capabilities
      this.registerCapability('cdn:cloudfront', this.buildCloudFrontCapability());
      
      this.logComponentEvent('synthesis_complete', 'CloudFront Distribution synthesis completed successfully');
    } catch (error) {
      this.logError(error as Error, 'CloudFront Distribution synthesis');
      throw error;
    }
  }

  /**
   * Get the capabilities this component provides
   */
  public getCapabilities(): ComponentCapabilities {
    this.validateSynthesized();
    return this.capabilities;
  }

  /**
   * Get the component type identifier
   */
  public getType(): string {
    return 'cloudfront-distribution';
  }

  /**
   * Create origin based on configuration
   */
  private createOrigin(): void {
    const originConfig = this.config!.origin;

    switch (originConfig.type) {
      case 's3':
        if (!originConfig.s3BucketName) {
          throw new Error('S3 bucket name is required for S3 origin');
        }
        const bucket = s3.Bucket.fromBucketName(this, 'OriginBucket', originConfig.s3BucketName);
        this.origin = new origins.S3Origin(bucket, {
          originPath: originConfig.originPath,
          customHeaders: originConfig.customHeaders
        });
        break;
        
      case 'alb':
        if (!originConfig.albDnsName) {
          throw new Error('ALB DNS name is required for ALB origin');
        }
        this.origin = new origins.HttpOrigin(originConfig.albDnsName, {
          originPath: originConfig.originPath,
          customHeaders: originConfig.customHeaders,
          protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY
        });
        break;
        
      case 'custom':
        if (!originConfig.customDomainName) {
          throw new Error('Custom domain name is required for custom origin');
        }
        this.origin = new origins.HttpOrigin(originConfig.customDomainName, {
          originPath: originConfig.originPath,
          customHeaders: originConfig.customHeaders,
          protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY
        });
        break;
        
      default:
        throw new Error(`Unsupported origin type: ${originConfig.type}`);
    }

    this.logResourceCreation('cloudfront-origin', `${originConfig.type}-origin`, {
      type: originConfig.type,
      path: originConfig.originPath
    });
  }

  /**
   * Create CloudFront distribution
   */
  private createCloudFrontDistribution(): void {
    const distributionProps: cloudfront.DistributionProps = {
      comment: this.config!.comment,
      defaultBehavior: {
        origin: this.origin!,
        viewerProtocolPolicy: this.getViewerProtocolPolicy(),
        allowedMethods: this.getAllowedMethods(),
        cachedMethods: this.getCachedMethods(),
        compress: this.config!.defaultBehavior?.compress,
        cachePolicy: this.config!.defaultBehavior?.cachePolicyId ? 
          cloudfront.CachePolicy.fromCachePolicyId(this, 'CachePolicy', this.config!.defaultBehavior.cachePolicyId) : 
          cloudfront.CachePolicy.CACHING_OPTIMIZED,
        originRequestPolicy: this.config!.defaultBehavior?.originRequestPolicyId ? 
          cloudfront.OriginRequestPolicy.fromOriginRequestPolicyId(this, 'OriginRequestPolicy', this.config!.defaultBehavior.originRequestPolicyId) : 
          undefined
      },
      additionalBehaviors: this.buildAdditionalBehaviors(),
      priceClass: this.getPriceClass(),
      geoRestriction: this.buildGeoRestriction(),
      certificate: this.config!.domain?.certificateArn ? 
        certificatemanager.Certificate.fromCertificateArn(this, 'Certificate', this.config!.domain.certificateArn) : 
        undefined,
      domainNames: this.config!.domain?.domainNames,
      enableLogging: this.config!.logging?.enabled,
      logBucket: this.config!.logging?.bucket ? 
        s3.Bucket.fromBucketName(this, 'LogBucket', this.config!.logging.bucket) : 
        undefined,
      logFilePrefix: this.config!.logging?.prefix,
      logIncludesCookies: this.config!.logging?.includeCookies,
      webAclId: this.config!.webAclId
    };

    this.distribution = new cloudfront.Distribution(this, 'CloudFrontDistribution', distributionProps);

    // Apply standard tags
    this.applyStandardTags(this.distribution, {
      'distribution-type': 'cdn',
      'origin-type': this.config!.origin.type,
      'price-class': this.config!.priceClass || 'PriceClass_100'
    });

    this.logResourceCreation('cloudfront-distribution', this.distribution.distributionId, {
      domainName: this.distribution.distributionDomainName,
      priceClass: this.config!.priceClass,
      originType: this.config!.origin.type
    });
  }

  /**
   * Configure CloudWatch observability for CloudFront distribution
   */
  private configureCloudFrontObservability(): void {
    if (!this.config!.monitoring?.enabled) {
      return;
    }

    const distributionId = this.distribution!.distributionId;

    // 1. 4XX Error Rate Alarm
    new cloudwatch.Alarm(this, 'Error4xxAlarm', {
      alarmName: `${this.context.serviceName}-${this.spec.name}-4xx-errors`,
      alarmDescription: 'CloudFront 4XX error rate alarm',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/CloudFront',
        metricName: '4xxErrorRate',
        dimensionsMap: {
          DistributionId: distributionId
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(5)
      }),
      threshold: this.config!.monitoring!.alarms?.error4xxThreshold || 50,
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });

    // 2. 5XX Error Rate Alarm
    new cloudwatch.Alarm(this, 'Error5xxAlarm', {
      alarmName: `${this.context.serviceName}-${this.spec.name}-5xx-errors`,
      alarmDescription: 'CloudFront 5XX error rate alarm',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/CloudFront',
        metricName: '5xxErrorRate',
        dimensionsMap: {
          DistributionId: distributionId
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(5)
      }),
      threshold: this.config!.monitoring!.alarms?.error5xxThreshold || 10,
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });

    this.logComponentEvent('observability_configured', 'OpenTelemetry observability standard applied to CloudFront distribution', {
      alarmsCreated: 2,
      distributionId: distributionId,
      monitoringEnabled: true
    });
  }

  /**
   * Apply compliance hardening based on framework
   */
  private applyComplianceHardening(): void {
    if (!this.distribution) return;

    switch (this.context.complianceFramework) {
      case 'fedramp-high':
      case 'fedramp-moderate':
        // For FedRAMP environments, ensure distribution has proper security and logging
        const cfnDistribution = this.distribution.node.defaultChild as cloudfront.CfnDistribution;
        cfnDistribution.addMetadata('ComplianceFramework', this.context.complianceFramework);
        
        this.logComponentEvent('compliance_hardening_applied', 'FedRAMP compliance hardening applied', {
          framework: this.context.complianceFramework,
          httpsOnly: this.config!.defaultBehavior?.viewerProtocolPolicy === 'https-only',
          loggingEnabled: this.config!.logging?.enabled
        });
        break;
        
      default:
        // No special hardening needed for commercial
        break;
    }
  }

  /**
   * Build CloudFront capability descriptor
   */
  private buildCloudFrontCapability(): any {
    return {
      type: 'cdn:cloudfront',
      distributionId: this.distribution!.distributionId,
      distributionDomainName: this.distribution!.distributionDomainName,
      domainNames: this.config!.domain?.domainNames,
      originType: this.config!.origin.type,
      priceClass: this.config!.priceClass
    };
  }

  /**
   * Helper methods for building CDK properties
   */
  private getViewerProtocolPolicy(): cloudfront.ViewerProtocolPolicy {
    switch (this.config!.defaultBehavior?.viewerProtocolPolicy) {
      case 'https-only':
        return cloudfront.ViewerProtocolPolicy.HTTPS_ONLY;
      case 'redirect-to-https':
        return cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS;
      default:
        return cloudfront.ViewerProtocolPolicy.ALLOW_ALL;
    }
  }

  private getAllowedMethods(): cloudfront.AllowedMethods {
    const methods = this.config!.defaultBehavior?.allowedMethods || ['GET', 'HEAD'];
    if (methods.includes('DELETE') || methods.includes('PUT') || methods.includes('PATCH')) {
      return cloudfront.AllowedMethods.ALLOW_ALL;
    }
    if (methods.includes('POST')) {
      return cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS;
    }
    return cloudfront.AllowedMethods.ALLOW_GET_HEAD;
  }

  private getCachedMethods(): cloudfront.CachedMethods {
    const methods = this.config!.defaultBehavior?.cachedMethods || ['GET', 'HEAD'];
    if (methods.includes('OPTIONS')) {
      return cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS;
    }
    return cloudfront.CachedMethods.CACHE_GET_HEAD;
  }

  private buildAdditionalBehaviors(): Record<string, cloudfront.BehaviorOptions> | undefined {
    if (!this.config!.additionalBehaviors) {
      return undefined;
    }

    const behaviors: Record<string, cloudfront.BehaviorOptions> = {};
    
    for (const behavior of this.config!.additionalBehaviors) {
      behaviors[behavior.pathPattern] = {
        origin: this.origin!,
        viewerProtocolPolicy: this.getViewerProtocolPolicyForBehavior(behavior.viewerProtocolPolicy),
        allowedMethods: this.getAllowedMethodsForBehavior(behavior.allowedMethods),
        cachedMethods: this.getCachedMethodsForBehavior(behavior.cachedMethods),
        compress: behavior.compress,
        cachePolicy: behavior.cachePolicyId ? 
          cloudfront.CachePolicy.fromCachePolicyId(this, `CachePolicy-${behavior.pathPattern}`, behavior.cachePolicyId) : 
          cloudfront.CachePolicy.CACHING_OPTIMIZED
      };
    }

    return behaviors;
  }

  private getPriceClass(): cloudfront.PriceClass {
    switch (this.config!.priceClass) {
      case 'PriceClass_All':
        return cloudfront.PriceClass.PRICE_CLASS_ALL;
      case 'PriceClass_200':
        return cloudfront.PriceClass.PRICE_CLASS_200;
      default:
        return cloudfront.PriceClass.PRICE_CLASS_100;
    }
  }

  private buildGeoRestriction(): cloudfront.GeoRestriction | undefined {
    if (!this.config!.geoRestriction || this.config!.geoRestriction.type === 'none') {
      return undefined;
    }

    const countries = this.config!.geoRestriction.countries || [];
    
    switch (this.config!.geoRestriction.type) {
      case 'whitelist':
        return cloudfront.GeoRestriction.allowlist(...countries);
      case 'blacklist':
        return cloudfront.GeoRestriction.denylist(...countries);
      default:
        return undefined;
    }
  }

  private getViewerProtocolPolicyForBehavior(policy?: string): cloudfront.ViewerProtocolPolicy {
    switch (policy) {
      case 'https-only':
        return cloudfront.ViewerProtocolPolicy.HTTPS_ONLY;
      case 'redirect-to-https':
        return cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS;
      default:
        return cloudfront.ViewerProtocolPolicy.ALLOW_ALL;
    }
  }

  private getAllowedMethodsForBehavior(methods?: string[]): cloudfront.AllowedMethods {
    if (!methods) return cloudfront.AllowedMethods.ALLOW_GET_HEAD;
    
    if (methods.includes('DELETE') || methods.includes('PUT') || methods.includes('PATCH')) {
      return cloudfront.AllowedMethods.ALLOW_ALL;
    }
    if (methods.includes('POST')) {
      return cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS;
    }
    return cloudfront.AllowedMethods.ALLOW_GET_HEAD;
  }

  private getCachedMethodsForBehavior(methods?: string[]): cloudfront.CachedMethods {
    if (!methods) return cloudfront.CachedMethods.CACHE_GET_HEAD;
    
    if (methods.includes('OPTIONS')) {
      return cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS;
    }
    return cloudfront.CachedMethods.CACHE_GET_HEAD;
  }
}