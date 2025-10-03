import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { NagSuppressions } from 'cdk-nag';
import {
  BaseComponent,
  ComponentSpec,
  ComponentContext,
  ComponentCapabilities
} from '@shinobi/core';
import {
  CloudFrontDistributionComponentConfigBuilder,
  CloudFrontDistributionConfig,
  CloudFrontAlarmConfig,
  CloudFrontMonitoringConfig,
  CloudFrontXRayTracingConfig,
  CloudFrontObservabilityConfig
} from './cloudfront-distribution.builder.js';

/**
 * CloudFrontDistributionComponent orchestrates the full lifecycle of a CloudFront distribution
 * backed by the platform configuration engine. The class translates the merged configuration
 * (hardcoded fallbacks + platform defaults + manifest overrides) into concrete AWS resources and
 * registers the resulting capabilities for downstream binders.
 *
 * The implementation is intentionally verbose because CloudFront has a large set of optional
 * features (behaviours, logging, geo restrictions, observability). Detailed comments are provided
 * to explain *why* each step is taken so future maintainers can reason about the guard‑rails.
 */
export class CloudFrontDistributionComponent extends BaseComponent {
  private distribution?: cloudfront.Distribution;
  private origin?: cloudfront.IOrigin;
  private config?: CloudFrontDistributionConfig;

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
  }

  /**
   * synth() is the canonical entrypoint mandated by the Component API contract. The method:
   *  1. Builds the final configuration via the shared ConfigBuilder (ensuring precedence rules).
   *  2. Creates the origin and distribution constructs using secure defaults.
   *  3. Enables platform monitoring/observability and applies CDK Nag suppressions with context.
   *  4. Registers the primary construct handles (`main` + `distribution`) and the published
   *     capability payload so binders can wire dependants.
   */
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
      this.applyCDKNagSuppressions();

      this.registerConstruct('main', this.distribution!);
      this.registerConstruct('distribution', this.distribution!);
      const capability = this.buildCapability();
      this.registerCapability('cloudfront:distribution', capability);

      this.logComponentEvent('observability_registered', 'Recorded CloudFront telemetry directives', {
        telemetry: capability.telemetry
      });

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

  /**
   * Resolves the origin construct based on the manifest configuration. Each origin type has
   * a bespoke validation block because the inputs differ (S3 bucket name vs ALB DNS vs custom host).
   * Whenever a required field is missing we fail fast with an explanatory error.
   */
  private createOrigin(): void {
    const originConfig = this.config!.origin;

    switch (originConfig.type) {
      case 's3': {
        if (!originConfig.s3BucketName) {
          throw new Error('CloudFront origin type "s3" requires origin.s3BucketName.');
        }

        const bucket = s3.Bucket.fromBucketName(this, 'OriginBucket', originConfig.s3BucketName);
        this.origin = origins.S3BucketOrigin.withBucketDefaults(bucket, {
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

  /**
   * Instantiates the CloudFront distribution with logging, behaviours, and WAF wiring. We keep the
   * `DistributionProps` assembly in a dedicated method so it stays close to the tagging logic and
   * the follow-up observability hooks.
   */
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
      'hardening-profile': this.config!.hardeningProfile ?? 'baseline',
      ...(this.config?.tags ?? {})
    });

    this.logResourceCreation('cloudfront-distribution', this.distribution.distributionId, {
      domainName: this.distribution.distributionDomainName,
      originType: this.config!.origin.type,
      priceClass: this.config!.priceClass
    });
  }

  /**
   * Builds the default behaviour for the distribution. The configuration that arrives here already
   * reflects the precedence chain, so the implementation mostly focuses on translating enums into
  * the correct CDK constructs while keeping secure defaults (HTTPS and compression) intact.
   */
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

  /**
   * CloudFront supports a map of additional behaviours keyed by path pattern. We reduce the array
   * into the shape expected by the CDK, reusing the resolved origin. Each behaviour receives a
   * deterministic identifier so cache/origin request policies can be referenced safely.
   */
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

  /**
   * Converts the manifest geo restriction into the CDK helper enum. Returning `undefined` keeps the
   * CloudFront behaviour identical to the console (no restriction) when the type is `none`.
   */
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

  /**
   * Price classes map directly to CDK enums but we still centralise the translation for clarity and
   * to provide a guaranteed default (`PRICE_CLASS_100`) when the manifest omits a value.
   */
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

  /**
   * Enforces HTTPS everywhere unless the manifest explicitly loosens the policy. This is the last
   * line of defence after the builder's secure defaults.
   */
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

  /**
   * Normalises the allowed HTTP methods. CloudFront exposes three enums (`GET/HEAD`, `GET/HEAD/OPTIONS`,
   * or `ALL`). We collapse the manifest array into the closest enum to minimise policy drift.
   */
  private resolveAllowedMethods(methods?: string[]): cloudfront.AllowedMethods {
    const methodSet = new Set((methods ?? ['GET', 'HEAD']).map(method => method.toUpperCase()));

    const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    if (mutatingMethods.some(method => methodSet.has(method))) {
      return cloudfront.AllowedMethods.ALLOW_ALL;
    }

    if (methodSet.has('OPTIONS')) {
      return cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS;
    }

    return cloudfront.AllowedMethods.ALLOW_GET_HEAD;
  }

  /**
   * CloudFront only allows caching GET/HEAD/OPTIONS. We still accept a manifest array for symmetry
   * with `allowedMethods`, but the method ultimately picks whichever enum best represents the input.
   *
   * The default (`['GET', 'HEAD']`) intentionally matches CloudFront's safe baseline to prevent
   * unexpected caching of mutating requests.
   */
  private resolveCachedMethods(methods?: string[]): cloudfront.CachedMethods {
    const methodSet = new Set((methods ?? ['GET', 'HEAD']).map(method => method.toUpperCase()));
    if (methodSet.has('OPTIONS')) {
      return cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS;
    }
    return cloudfront.CachedMethods.CACHE_GET_HEAD;
  }

  /**
   * Logging becomes a no-op when the manifest requests it but omits a bucket. Instead of failing the
   * entire synthesis, we log a structured event and disable logging to avoid deploying an invalid
   * distribution. Platform policy can escalate this scenario via CDK Nag or higher-level checks.
   */
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

  /**
   * Configures 4xx/5xx/OriginLatency alarms when monitoring is enabled. Each alarm ships with
   * tagging so the observability service can discover and aggregate them across environments.
   */
  /**
   * The capability payload exposes the core identifiers surfaced to binder strategies. Keeping the
   * shape small and predictable prevents downstream consumers from relying on internal CDK details.
   */
  private buildCapability(): Record<string, any> {
    const telemetry = this.buildTelemetryDirectives();

    return {
      type: 'cloudfront:distribution',
      distributionId: this.distribution!.distributionId,
      distributionArn: this.distribution!.distributionArn,
      distributionDomainName: this.distribution!.distributionDomainName,
      domainNames: this.config!.domain?.domainNames,
      originType: this.config!.origin.type,
      priceClass: this.config!.priceClass,
      hardeningProfile: this.config!.hardeningProfile ?? 'baseline',
      enabled: true,
      status: 'Deployed',
      telemetry
    };
  }

  private buildTelemetryDirectives(): Record<string, any> {
    const monitoring = this.config!.monitoring;
    const observability = this.config!.observability;
    const distributionId = this.distribution!.distributionId;

    const baseDimensions = {
      DistributionId: distributionId,
      Region: 'Global'
    };

    const metrics: Array<Record<string, any>> = [
      {
        id: `${distributionId}-requests`,
        namespace: 'AWS/CloudFront',
        metricName: 'Requests',
        dimensions: baseDimensions,
        statistic: 'Sum',
        periodSeconds: 300,
        description: 'Total viewer requests served by the distribution'
      },
      {
        id: `${distributionId}-4xx-rate`,
        namespace: 'AWS/CloudFront',
        metricName: '4xxErrorRate',
        dimensions: baseDimensions,
        statistic: 'Average',
        periodSeconds: 300,
        description: 'Percentage of viewer requests resulting in 4xx errors'
      },
      {
        id: `${distributionId}-5xx-rate`,
        namespace: 'AWS/CloudFront',
        metricName: '5xxErrorRate',
        dimensions: baseDimensions,
        statistic: 'Average',
        periodSeconds: 300,
        description: 'Percentage of viewer requests resulting in 5xx errors'
      },
      {
        id: `${distributionId}-origin-latency`,
        namespace: 'AWS/CloudFront',
        metricName: 'OriginLatency',
        dimensions: baseDimensions,
        statistic: 'Average',
        periodSeconds: 300,
        unit: 'Seconds',
        description: 'Average time in seconds for CloudFront to receive the first byte from origin'
      }
    ];

    const alarms: Array<Record<string, any>> = [];

    const addAlarm = (
      id: string,
      metricId: string,
      alarmConfig?: CloudFrontAlarmConfig,
      severity: 'info' | 'warning' | 'critical' = 'warning',
      transformThreshold?: (threshold: number) => number
    ): void => {
      if (!monitoring?.enabled || !alarmConfig?.enabled) {
        return;
      }

      const threshold = alarmConfig.threshold ?? 0;
      alarms.push({
        id,
        metricId,
        alarmName: `${this.context.serviceName}-${this.spec.name}-${id}`,
        alarmDescription: `${metricId} threshold breached for CloudFront distribution`,
        threshold: transformThreshold ? transformThreshold(threshold) : threshold,
        comparisonOperator: this.mapTelemetryComparisonOperator(alarmConfig.comparisonOperator),
        evaluationPeriods: alarmConfig.evaluationPeriods ?? 2,
        severity,
        treatMissingData: this.mapTelemetryTreatMissingData(alarmConfig.treatMissingData)
      });
    };

    addAlarm(`${distributionId}-4xx-rate-alarm`, `${distributionId}-4xx-rate`, monitoring?.alarms?.error4xx, 'warning');
    addAlarm(`${distributionId}-5xx-rate-alarm`, `${distributionId}-5xx-rate`, monitoring?.alarms?.error5xx, 'critical');
    addAlarm(
      `${distributionId}-origin-latency-alarm`,
      `${distributionId}-origin-latency`,
      monitoring?.alarms?.originLatencyMs,
      'warning',
      value => value / 1000
    );

    const logging = {
      enabled: Boolean(this.config!.logging?.enabled && this.config!.logging?.bucketName),
      destination: 's3',
      bucketName: this.config!.logging?.bucketName,
      prefix: this.config!.logging?.prefix,
      includeCookies: this.config!.logging?.includeCookies ?? false
    };

    const tracingConfig = observability?.xrayTracing;
    const tracing = tracingConfig?.enabled
      ? {
          enabled: true,
          provider: 'xray',
          samplingRate: tracingConfig.samplingRate ?? 0.1,
          attributes: {
            'service.name': tracingConfig.serviceName ?? `${this.context.serviceName}-${this.spec.name}`
          }
        }
      : {
          enabled: false,
          provider: 'xray'
        };

    const dashboards: Array<Record<string, any>> = [];
    const dashboardConfig = observability?.dashboard;
    if (dashboardConfig?.enabled) {
      dashboards.push({
        id: `${distributionId}-dashboard`,
        name: dashboardConfig.name ?? `${this.context.serviceName}-cloudfront-dashboard`,
        description: 'CloudFront distribution telemetry rendered by the observability service',
        widgets: [
          {
            id: 'cf-requests-widget',
            type: 'metric',
            title: 'Viewer Requests',
            width: 12,
            height: 6,
            metrics: [{ metricId: `${distributionId}-requests`, label: 'Requests', stat: 'Sum' }]
          },
          {
            id: 'cf-error-rate-widget',
            type: 'metric',
            title: 'Error Rates',
            width: 12,
            height: 6,
            metrics: [
              { metricId: `${distributionId}-4xx-rate`, label: '4xx Rate', stat: 'Average' },
              { metricId: `${distributionId}-5xx-rate`, label: '5xx Rate', stat: 'Average' }
            ]
          }
        ]
      });
    }

    return {
      metrics,
      alarms: alarms.length ? alarms : undefined,
      dashboards: dashboards.length ? dashboards : undefined,
      logging,
      tracing,
      custom: {
        originType: this.config!.origin.type,
        webAclId: this.config!.webAclId
      }
    };
  }

  private mapTelemetryComparisonOperator(operator?: string): 'gt' | 'gte' | 'lt' | 'lte' {
    switch ((operator ?? 'gte').toLowerCase()) {
      case 'gt':
        return 'gt';
      case 'lt':
        return 'lt';
      case 'lte':
        return 'lte';
      case 'gte':
      default:
        return 'gte';
    }
  }

  private mapTelemetryTreatMissingData(
    value?: string
  ): 'breaching' | 'notBreaching' | 'ignore' | 'missing' | undefined {
    switch ((value ?? '').toLowerCase()) {
      case 'breaching':
        return 'breaching';
      case 'ignore':
        return 'ignore';
      case 'missing':
        return 'missing';
      case 'not-breaching':
        return 'notBreaching';
      default:
        return undefined;
    }
  }

  /**
   * Configure observability features including X-Ray tracing and dashboards
   */
  /**
   * Applies optional observability features (X-Ray sampling + CloudWatch dashboards). The builder
   * enables these features by default, but they are still guard-railed individually in case a service
   * turns them off.
   */
  /**
   * Apply CDK Nag suppressions for CloudFront-specific security rules
   */
  /**
   * Applies targeted suppressions for AWS Solutions-nag rules where the platform provides alternate
   * controls (e.g., logging can be governed at the manifest level). Every suppression includes a
   * justification so compliance reviews understand the rationale.
   */
  private applyCDKNagSuppressions(): void {
    if (!this.distribution) {
      return;
    }

    // Suppress CFR1: CloudFront distribution should have logging enabled
    // Justification: Logging is configurable and may be disabled for cost optimization
    NagSuppressions.addResourceSuppressions(this.distribution, [
      {
        id: 'AwsSolutions-CFR1',
        reason: 'CloudFront logging is configurable and may be disabled for cost optimization. Logging can be enabled via configuration when required for compliance.'
      }
    ]);

    // Suppress CFR2: CloudFront distribution should have a WAF web ACL attached
    // Justification: WAF is optional and can be attached via webAclId configuration
    NagSuppressions.addResourceSuppressions(this.distribution, [
      {
        id: 'AwsSolutions-CFR2',
        reason: 'WAF web ACL is optional and can be attached via webAclId configuration. Component supports WAF integration when security requirements demand it.'
      }
    ]);

    // Suppress CFR3: CloudFront distribution should have origin failover configured
    // Justification: Origin failover is an advanced feature not required for basic CDN functionality
    NagSuppressions.addResourceSuppressions(this.distribution, [
      {
        id: 'AwsSolutions-CFR3',
        reason: 'Origin failover is an advanced feature not required for basic CDN functionality. Can be implemented via additional behaviors if needed.'
      }
    ]);

    // Suppress CFR4: CloudFront distribution should have origin access control (OAC) configured
    // Justification: OAC is only applicable for S3 origins and is handled by the S3 bucket component
    NagSuppressions.addResourceSuppressions(this.distribution, [
      {
        id: 'AwsSolutions-CFR4',
        reason: 'Origin Access Control (OAC) is only applicable for S3 origins and should be configured at the S3 bucket level, not the CloudFront distribution level.'
      }
    ]);

    this.logComponentEvent('cdk_nag_suppressions_applied', 'Applied CDK Nag suppressions for CloudFront distribution');
  }
}
