import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  Component,
  ComponentSpec,
  ComponentContext,
  ComponentCapabilities
} from '@platform/contracts';
import {
  CloudFrontDistributionComponentConfigBuilder,
  CloudFrontDistributionConfig,
  CloudFrontAlarmConfig,
  CloudFrontMonitoringConfig
} from './cloudfront-distribution.builder';

export class CloudFrontDistributionComponent extends Component {
  private distribution?: cloudfront.Distribution;
  private origin?: cloudfront.IOrigin;
  private config?: CloudFrontDistributionConfig;

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
  }

  public synth(): void {
    this.logComponentEvent('synthesis_start', 'Starting CloudFront distribution synthesis');

    try {
      const builder = new CloudFrontDistributionComponentConfigBuilder(this.context, this.spec);
      this.config = builder.buildSync();

      this.logComponentEvent('config_resolved', 'Resolved CloudFront distribution configuration', {
        originType: this.config.origin.type,
        priceClass: this.config.priceClass,
        monitoringEnabled: this.config.monitoring?.enabled ?? false
      });

      this.createOrigin();
      this.createDistribution();
      this.configureMonitoring();

      this.registerConstruct('distribution', this.distribution!);
      this.registerCapability('cdn:cloudfront', this.buildCapability());

      this.logComponentEvent('synthesis_complete', 'CloudFront distribution synthesis completed', {
        distributionId: this.distribution!.distributionId,
        domainName: this.distribution!.distributionDomainName
      });
    } catch (error) {
      this.logError(error as Error, 'cloudfront distribution synthesis');
      throw error;
    }
  }

  public getCapabilities(): ComponentCapabilities {
    this.validateSynthesized();
    return this.capabilities;
  }

  public getType(): string {
    return 'cloudfront-distribution';
  }

  private createOrigin(): void {
    const originConfig = this.config!.origin;

    switch (originConfig.type) {
      case 's3': {
        if (!originConfig.s3BucketName) {
          throw new Error('CloudFront origin type "s3" requires origin.s3BucketName.');
        }

        const bucket = s3.Bucket.fromBucketName(this, 'OriginBucket', originConfig.s3BucketName);
        this.origin = new origins.S3Origin(bucket, {
          originPath: originConfig.originPath,
          customHeaders: originConfig.customHeaders
        });
        break;
      }
      case 'alb': {
        if (!originConfig.albDnsName) {
          throw new Error('CloudFront origin type "alb" requires origin.albDnsName.');
        }

        this.origin = new origins.HttpOrigin(originConfig.albDnsName, {
          originPath: originConfig.originPath,
          customHeaders: originConfig.customHeaders,
          protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY
        });
        break;
      }
      case 'custom': {
        if (!originConfig.customDomainName) {
          throw new Error('CloudFront origin type "custom" requires origin.customDomainName.');
        }

        this.origin = new origins.HttpOrigin(originConfig.customDomainName, {
          originPath: originConfig.originPath,
          customHeaders: originConfig.customHeaders,
          protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY
        });
        break;
      }
      default:
        throw new Error(`Unsupported CloudFront origin type: ${originConfig.type}`);
    }

    this.logResourceCreation('cloudfront-origin', `${originConfig.type}-origin`, {
      originType: originConfig.type,
      originPath: originConfig.originPath ?? '/'
    });
  }

  private createDistribution(): void {
    const logBucket = this.resolveLogBucket();
    const loggingEnabled = Boolean(logBucket) && (this.config!.logging?.enabled ?? false);

    const distributionProps: cloudfront.DistributionProps = {
      comment: this.config!.comment,
      defaultBehavior: this.buildDefaultBehavior(),
      additionalBehaviors: this.buildAdditionalBehaviors(),
      priceClass: this.resolvePriceClass(this.config!.priceClass),
      geoRestriction: this.buildGeoRestriction(),
      domainNames: this.config!.domain?.domainNames,
      certificate: this.config!.domain?.certificateArn
        ? certificatemanager.Certificate.fromCertificateArn(this, 'Certificate', this.config!.domain.certificateArn)
        : undefined,
      enableLogging: loggingEnabled,
      logBucket,
      logFilePrefix: loggingEnabled ? this.config!.logging?.prefix : undefined,
      logIncludesCookies: loggingEnabled ? (this.config!.logging?.includeCookies ?? false) : false,
      webAclId: this.config!.webAclId
    };

    this.distribution = new cloudfront.Distribution(this, 'CloudFrontDistribution', distributionProps);

    this.applyStandardTags(this.distribution, {
      'distribution-type': 'cdn',
      'origin-type': this.config!.origin.type,
      'price-class': this.config!.priceClass ?? 'PriceClass_100',
      'hardening-profile': this.config!.hardeningProfile ?? 'baseline'
    });

    this.logResourceCreation('cloudfront-distribution', this.distribution.distributionId, {
      domainName: this.distribution.distributionDomainName,
      originType: this.config!.origin.type,
      priceClass: this.config!.priceClass
    });
  }

  private buildDefaultBehavior(): cloudfront.BehaviorOptions {
    const behaviorConfig = this.config!.defaultBehavior ?? {};

    return {
      origin: this.origin!,
      viewerProtocolPolicy: this.resolveViewerProtocolPolicy(behaviorConfig.viewerProtocolPolicy),
      allowedMethods: this.resolveAllowedMethods(behaviorConfig.allowedMethods),
      cachedMethods: this.resolveCachedMethods(behaviorConfig.cachedMethods),
      compress: behaviorConfig.compress ?? true,
      cachePolicy: behaviorConfig.cachePolicyId
        ? cloudfront.CachePolicy.fromCachePolicyId(this, 'DefaultCachePolicy', behaviorConfig.cachePolicyId)
        : cloudfront.CachePolicy.CACHING_OPTIMIZED,
      originRequestPolicy: behaviorConfig.originRequestPolicyId
        ? cloudfront.OriginRequestPolicy.fromOriginRequestPolicyId(
            this,
            'DefaultOriginRequestPolicy',
            behaviorConfig.originRequestPolicyId
          )
        : undefined
    };
  }

  private buildAdditionalBehaviors(): Record<string, cloudfront.BehaviorOptions> | undefined {
    const additional = this.config!.additionalBehaviors ?? [];
    if (additional.length === 0) {
      return undefined;
    }

    return additional.reduce<Record<string, cloudfront.BehaviorOptions>>((acc, behavior, index) => {
      const behaviorId = `AdditionalBehavior-${index}`;

      acc[behavior.pathPattern] = {
        origin: this.origin!,
        viewerProtocolPolicy: this.resolveViewerProtocolPolicy(behavior.viewerProtocolPolicy),
        allowedMethods: this.resolveAllowedMethods(behavior.allowedMethods),
        cachedMethods: this.resolveCachedMethods(behavior.cachedMethods),
        compress: behavior.compress ?? true,
        cachePolicy: behavior.cachePolicyId
          ? cloudfront.CachePolicy.fromCachePolicyId(this, `${behaviorId}-CachePolicy`, behavior.cachePolicyId)
          : cloudfront.CachePolicy.CACHING_OPTIMIZED,
        originRequestPolicy: behavior.originRequestPolicyId
          ? cloudfront.OriginRequestPolicy.fromOriginRequestPolicyId(
              this,
              `${behaviorId}-OriginRequestPolicy`,
              behavior.originRequestPolicyId
            )
          : undefined
      };

      return acc;
    }, {});
  }

  private buildGeoRestriction(): cloudfront.GeoRestriction | undefined {
    const restriction = this.config!.geoRestriction;
    if (!restriction || restriction.type === 'none') {
      return undefined;
    }

    const countries = restriction.countries ?? [];
    if (restriction.type === 'whitelist') {
      return cloudfront.GeoRestriction.allowlist(...countries);
    }

    if (restriction.type === 'blacklist') {
      return cloudfront.GeoRestriction.denylist(...countries);
    }

    return undefined;
  }

  private resolvePriceClass(priceClass?: string): cloudfront.PriceClass {
    switch (priceClass) {
      case 'PriceClass_All':
        return cloudfront.PriceClass.PRICE_CLASS_ALL;
      case 'PriceClass_200':
        return cloudfront.PriceClass.PRICE_CLASS_200;
      default:
        return cloudfront.PriceClass.PRICE_CLASS_100;
    }
  }

  private resolveViewerProtocolPolicy(policy?: string): cloudfront.ViewerProtocolPolicy {
    switch (policy) {
      case 'https-only':
        return cloudfront.ViewerProtocolPolicy.HTTPS_ONLY;
      case 'redirect-to-https':
        return cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS;
      default:
        return cloudfront.ViewerProtocolPolicy.ALLOW_ALL;
    }
  }

  private resolveAllowedMethods(methods?: string[]): cloudfront.AllowedMethods {
    const methodSet = new Set((methods ?? ['GET', 'HEAD']).map(method => method.toUpperCase()));

    if (methodSet.has('DELETE') || methodSet.has('PUT') || methodSet.has('PATCH')) {
      return cloudfront.AllowedMethods.ALLOW_ALL;
    }

    if (methodSet.has('POST')) {
      return cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS;
    }

    return cloudfront.AllowedMethods.ALLOW_GET_HEAD;
  }

  private resolveCachedMethods(methods?: string[]): cloudfront.CachedMethods {
    const methodSet = new Set((methods ?? ['GET', 'HEAD']).map(method => method.toUpperCase()));
    if (methodSet.has('OPTIONS')) {
      return cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS;
    }
    return cloudfront.CachedMethods.CACHE_GET_HEAD;
  }

  private resolveLogBucket(): s3.IBucket | undefined {
    if (!this.config!.logging?.enabled) {
      return undefined;
    }

    const bucketName = this.config!.logging?.bucket;
    if (!bucketName) {
      this.logComponentEvent('logging_disabled', 'Logging requested without bucket; disabling logging to avoid synthesis failure');
      return undefined;
    }

    return s3.Bucket.fromBucketName(this, 'LogBucket', bucketName);
  }

  private configureMonitoring(): void {
    const monitoring = this.config!.monitoring;
    if (!monitoring?.enabled) {
      return;
    }

    this.createAlarm('CloudFront4xxAlarm', monitoring, monitoring.alarms?.error4xx, {
      alarmName: `${this.context.serviceName}-${this.spec.name}-4xx-errors`,
      metricName: '4xxErrorRate'
    });

    this.createAlarm('CloudFront5xxAlarm', monitoring, monitoring.alarms?.error5xx, {
      alarmName: `${this.context.serviceName}-${this.spec.name}-5xx-errors`,
      metricName: '5xxErrorRate'
    });

    this.createAlarm('CloudFrontOriginLatencyAlarm', monitoring, monitoring.alarms?.originLatencyMs, {
      alarmName: `${this.context.serviceName}-${this.spec.name}-origin-latency`,
      metricName: 'OriginLatency'
    });
  }

  private createAlarm(
    id: string,
    monitoring: CloudFrontMonitoringConfig,
    alarmConfig: CloudFrontAlarmConfig | undefined,
    options: { alarmName: string; metricName: string }
  ): void {
    if (!alarmConfig?.enabled) {
      return;
    }

    const metric = new cloudwatch.Metric({
      namespace: 'AWS/CloudFront',
      metricName: options.metricName,
      dimensionsMap: {
        DistributionId: this.distribution!.distributionId,
        Region: 'Global'
      },
      statistic: alarmConfig.statistic ?? 'Average',
      period: cdk.Duration.minutes(alarmConfig.periodMinutes ?? 5)
    });

    const alarm = new cloudwatch.Alarm(this, id, {
      alarmName: options.alarmName,
      alarmDescription: `${options.metricName} alarm for ${this.spec.name}`,
      metric,
      threshold: this.resolveThreshold(options.metricName, alarmConfig.threshold),
      evaluationPeriods: alarmConfig.evaluationPeriods ?? 2,
      comparisonOperator: this.resolveComparisonOperator(alarmConfig.comparisonOperator),
      treatMissingData: this.resolveTreatMissingData(alarmConfig.treatMissingData)
    });

    this.applyStandardTags(alarm, {
      'alarm-metric': options.metricName.toLowerCase(),
      ...(alarmConfig.tags ?? {})
    });

    this.registerConstruct(`${id}Construct`, alarm);
  }

  private resolveThreshold(metricName: string, threshold?: number): number {
    if (!threshold) {
      return 0;
    }

    if (metricName === 'OriginLatency') {
      return threshold / 1000;
    }

    return threshold;
  }

  private resolveComparisonOperator(operator?: string): cloudwatch.ComparisonOperator {
    switch (operator) {
      case 'gt':
        return cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD;
      case 'lt':
        return cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD;
      case 'lte':
        return cloudwatch.ComparisonOperator.LESS_THAN_OR_EQUAL_TO_THRESHOLD;
      case 'gte':
      default:
        return cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD;
    }
  }

  private resolveTreatMissingData(value?: string): cloudwatch.TreatMissingData {
    switch (value) {
      case 'breaching':
        return cloudwatch.TreatMissingData.BREACHING;
      case 'ignore':
        return cloudwatch.TreatMissingData.IGNORE;
      case 'missing':
        return cloudwatch.TreatMissingData.MISSING;
      case 'not-breaching':
      default:
        return cloudwatch.TreatMissingData.NOT_BREACHING;
    }
  }

  private buildCapability(): Record<string, any> {
    return {
      type: 'cdn:cloudfront',
      distributionId: this.distribution!.distributionId,
      distributionDomainName: this.distribution!.distributionDomainName,
      domainNames: this.config!.domain?.domainNames,
      originType: this.config!.origin.type,
      priceClass: this.config!.priceClass,
      hardeningProfile: this.config!.hardeningProfile ?? 'baseline'
    };
  }
}
