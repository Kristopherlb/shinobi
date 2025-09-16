/**
 * CloudFront Binder Strategy
 * Handles content delivery network bindings for Amazon CloudFront
 */

import { IBinderStrategy } from '../binder-strategy';
import { BindingContext } from '../../binding-context';
import { ComponentBinding } from '../../component-binding';
import { ComplianceFramework } from '../../../compliance/compliance-framework';

export class CloudFrontBinderStrategy implements IBinderStrategy {
  readonly supportedCapabilities = ['cloudfront:distribution', 'cloudfront:origin', 'cloudfront:cache-policy'];

  async bind(
    sourceComponent: any,
    targetComponent: any,
    binding: ComponentBinding,
    context: BindingContext
  ): Promise<void> {
    const { capability, access } = binding;

    switch (capability) {
      case 'cloudfront:distribution':
        await this.bindToDistribution(sourceComponent, targetComponent, binding, context);
        break;
      case 'cloudfront:origin':
        await this.bindToOrigin(sourceComponent, targetComponent, binding, context);
        break;
      case 'cloudfront:cache-policy':
        await this.bindToCachePolicy(sourceComponent, targetComponent, binding, context);
        break;
      default:
        throw new Error(`Unsupported CloudFront capability: ${capability}`);
    }
  }

  private async bindToDistribution(
    sourceComponent: any,
    targetComponent: any,
    binding: ComponentBinding,
    context: BindingContext
  ): Promise<void> {
    const { access } = binding;

    // Grant distribution access permissions
    if (access.includes('read')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'cloudfront:GetDistribution',
          'cloudfront:GetDistributionConfig',
          'cloudfront:ListDistributions'
        ],
        Resource: targetComponent.distributionArn
      });
    }

    if (access.includes('write')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'cloudfront:CreateDistribution',
          'cloudfront:UpdateDistribution',
          'cloudfront:DeleteDistribution'
        ],
        Resource: targetComponent.distributionArn
      });
    }

    // Grant invalidation permissions
    if (access.includes('invalidate')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'cloudfront:CreateInvalidation',
          'cloudfront:GetInvalidation',
          'cloudfront:ListInvalidations'
        ],
        Resource: targetComponent.distributionArn
      });
    }

    // Grant S3 access for origin
    if (targetComponent.origins) {
      targetComponent.origins.forEach((origin: any) => {
        if (origin.s3OriginConfig?.originAccessIdentity) {
          sourceComponent.addToRolePolicy({
            Effect: 'Allow',
            Action: [
              's3:GetObject'
            ],
            Resource: `${origin.domainName}/*`
          });
        }
      });
    }

    // Inject distribution environment variables
    sourceComponent.addEnvironment('CLOUDFRONT_DISTRIBUTION_ID', targetComponent.distributionId);
    sourceComponent.addEnvironment('CLOUDFRONT_DISTRIBUTION_ARN', targetComponent.distributionArn);
    sourceComponent.addEnvironment('CLOUDFRONT_DISTRIBUTION_DOMAIN_NAME', targetComponent.domainName);
    sourceComponent.addEnvironment('CLOUDFRONT_DISTRIBUTION_STATUS', targetComponent.status);

    // Configure distribution metadata
    sourceComponent.addEnvironment('CLOUDFRONT_DISTRIBUTION_ENABLED', targetComponent.enabled.toString());
    sourceComponent.addEnvironment('CLOUDFRONT_DISTRIBUTION_PRICE_CLASS', targetComponent.priceClass);

    // Configure origins
    if (targetComponent.origins) {
      sourceComponent.addEnvironment('CLOUDFRONT_ORIGINS', JSON.stringify(targetComponent.origins));
    }

    // Configure default cache behavior
    if (targetComponent.defaultCacheBehavior) {
      sourceComponent.addEnvironment('CLOUDFRONT_DEFAULT_CACHE_BEHAVIOR', JSON.stringify(targetComponent.defaultCacheBehavior));
    }

    // Configure secure access for FedRAMP environments
    if (context.complianceFramework === ComplianceFramework.FEDRAMP_MODERATE ||
      context.complianceFramework === ComplianceFramework.FEDRAMP_HIGH) {
      await this.configureSecureDistributionAccess(sourceComponent, targetComponent, context);
    }
  }

  private async bindToOrigin(
    sourceComponent: any,
    targetComponent: any,
    binding: ComponentBinding,
    context: BindingContext
  ): Promise<void> {
    const { access } = binding;

    // Grant origin access permissions
    if (access.includes('read')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'cloudfront:GetOriginRequestPolicy',
          'cloudfront:ListOriginRequestPolicies'
        ],
        Resource: targetComponent.originRequestPolicyArn
      });
    }

    if (access.includes('write')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'cloudfront:CreateOriginRequestPolicy',
          'cloudfront:UpdateOriginRequestPolicy',
          'cloudfront:DeleteOriginRequestPolicy'
        ],
        Resource: targetComponent.originRequestPolicyArn
      });
    }

    // Inject origin environment variables
    sourceComponent.addEnvironment('CLOUDFRONT_ORIGIN_DOMAIN_NAME', targetComponent.domainName);
    sourceComponent.addEnvironment('CLOUDFRONT_ORIGIN_ID', targetComponent.id);
    sourceComponent.addEnvironment('CLOUDFRONT_ORIGIN_PATH', targetComponent.originPath || '/');

    // Configure origin metadata
    if (targetComponent.customOriginConfig) {
      sourceComponent.addEnvironment('CLOUDFRONT_ORIGIN_HTTP_PORT', targetComponent.customOriginConfig.httpPort.toString());
      sourceComponent.addEnvironment('CLOUDFRONT_ORIGIN_HTTPS_PORT', targetComponent.customOriginConfig.httpsPort.toString());
      sourceComponent.addEnvironment('CLOUDFRONT_ORIGIN_PROTOCOL_POLICY', targetComponent.customOriginConfig.originProtocolPolicy);
    }

    if (targetComponent.s3OriginConfig) {
      sourceComponent.addEnvironment('CLOUDFRONT_ORIGIN_ACCESS_IDENTITY', targetComponent.s3OriginConfig.originAccessIdentity);
    }

    // Configure custom headers
    if (targetComponent.customHeaders) {
      sourceComponent.addEnvironment('CLOUDFRONT_ORIGIN_CUSTOM_HEADERS', JSON.stringify(targetComponent.customHeaders));
    }
  }

  private async bindToCachePolicy(
    sourceComponent: any,
    targetComponent: any,
    binding: ComponentBinding,
    context: BindingContext
  ): Promise<void> {
    const { access } = binding;

    // Grant cache policy access permissions
    if (access.includes('read')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'cloudfront:GetCachePolicy',
          'cloudfront:ListCachePolicies'
        ],
        Resource: targetComponent.cachePolicyArn
      });
    }

    if (access.includes('write')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'cloudfront:CreateCachePolicy',
          'cloudfront:UpdateCachePolicy',
          'cloudfront:DeleteCachePolicy'
        ],
        Resource: targetComponent.cachePolicyArn
      });
    }

    // Inject cache policy environment variables
    sourceComponent.addEnvironment('CLOUDFRONT_CACHE_POLICY_ID', targetComponent.cachePolicyId);
    sourceComponent.addEnvironment('CLOUDFRONT_CACHE_POLICY_ARN', targetComponent.cachePolicyArn);
    sourceComponent.addEnvironment('CLOUDFRONT_CACHE_POLICY_NAME', targetComponent.cachePolicyConfig.name);

    // Configure cache policy metadata
    if (targetComponent.cachePolicyConfig.comment) {
      sourceComponent.addEnvironment('CLOUDFRONT_CACHE_POLICY_COMMENT', targetComponent.cachePolicyConfig.comment);
    }

    // Configure TTL settings
    if (targetComponent.cachePolicyConfig.defaultTTL) {
      sourceComponent.addEnvironment('CLOUDFRONT_CACHE_DEFAULT_TTL', targetComponent.cachePolicyConfig.defaultTTL.toString());
    }

    if (targetComponent.cachePolicyConfig.maxTTL) {
      sourceComponent.addEnvironment('CLOUDFRONT_CACHE_MAX_TTL', targetComponent.cachePolicyConfig.maxTTL.toString());
    }

    if (targetComponent.cachePolicyConfig.minTTL) {
      sourceComponent.addEnvironment('CLOUDFRONT_CACHE_MIN_TTL', targetComponent.cachePolicyConfig.minTTL.toString());
    }

    // Configure parameters in cache key
    if (targetComponent.cachePolicyConfig.parametersInCacheKeyAndForwardedToOrigin) {
      const params = targetComponent.cachePolicyConfig.parametersInCacheKeyAndForwardedToOrigin;
      sourceComponent.addEnvironment('CLOUDFRONT_CACHE_HEADERS', JSON.stringify(params.headersConfig));
      sourceComponent.addEnvironment('CLOUDFRONT_CACHE_QUERY_STRINGS', JSON.stringify(params.queryStringsConfig));
      sourceComponent.addEnvironment('CLOUDFRONT_CACHE_COOKIES', JSON.stringify(params.cookiesConfig));
    }
  }

  private async configureSecureDistributionAccess(
    sourceComponent: any,
    targetComponent: any,
    context: BindingContext
  ): Promise<void> {
    // Configure HTTPS only for secure access
    sourceComponent.addEnvironment('CLOUDFRONT_HTTPS_ONLY_ENABLED', 'true');

    // Configure viewer protocol policy
    sourceComponent.addEnvironment('CLOUDFRONT_VIEWER_PROTOCOL_POLICY', 'redirect-to-https');

    // Configure SSL certificate
    if (targetComponent.viewerCertificate) {
      sourceComponent.addEnvironment('CLOUDFRONT_SSL_CERTIFICATE_ARN', targetComponent.viewerCertificate.acmCertificateArn);
      sourceComponent.addEnvironment('CLOUDFRONT_SSL_CERTIFICATE_SOURCE', targetComponent.viewerCertificate.certificateSource);

      // Grant ACM permissions
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'acm:DescribeCertificate'
        ],
        Resource: targetComponent.viewerCertificate.acmCertificateArn
      });
    }

    // Configure WAF for additional security
    if (targetComponent.webACLId) {
      sourceComponent.addEnvironment('CLOUDFRONT_WAF_WEB_ACL_ID', targetComponent.webACLId);

      // Grant WAF permissions
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'wafv2:GetWebACL'
        ],
        Resource: targetComponent.webACLId
      });
    }

    // Configure geo restriction for compliance
    if (targetComponent.restrictions?.geoRestriction) {
      sourceComponent.addEnvironment('CLOUDFRONT_GEO_RESTRICTION_ENABLED', 'true');
      sourceComponent.addEnvironment('CLOUDFRONT_GEO_RESTRICTION_TYPE', targetComponent.restrictions.geoRestriction.restrictionType);

      if (targetComponent.restrictions.geoRestriction.locations) {
        sourceComponent.addEnvironment('CLOUDFRONT_GEO_RESTRICTION_LOCATIONS', targetComponent.restrictions.geoRestriction.locations.join(','));
      }
    }

    // Configure logging
    if (targetComponent.logging) {
      sourceComponent.addEnvironment('CLOUDFRONT_ACCESS_LOGGING_ENABLED', 'true');
      sourceComponent.addEnvironment('CLOUDFRONT_LOG_BUCKET', targetComponent.logging.bucket);
      sourceComponent.addEnvironment('CLOUDFRONT_LOG_PREFIX', targetComponent.logging.prefix);

      // Grant S3 permissions for logging
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          's3:PutObject'
        ],
        Resource: `${targetComponent.logging.bucket}/${targetComponent.logging.prefix}*`
      });
    }

    // Configure real-time metrics for monitoring
    sourceComponent.addEnvironment('CLOUDFRONT_REAL_TIME_METRICS_ENABLED', 'true');

    // Grant CloudWatch permissions
    sourceComponent.addToRolePolicy({
      Effect: 'Allow',
      Action: [
        'cloudwatch:PutMetricData',
        'cloudwatch:GetMetricStatistics'
      ],
      Resource: '*'
    });

    // Configure audit logging for compliance
    sourceComponent.addEnvironment('CLOUDFRONT_AUDIT_LOGGING_ENABLED', 'true');

    // Grant CloudTrail permissions for audit logging
    sourceComponent.addToRolePolicy({
      Effect: 'Allow',
      Action: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents'
      ],
      Resource: `arn:aws:logs:${context.region}:${context.accountId}:log-group:/aws/cloudfront/*`
    });

    // Configure edge locations for FedRAMP High
    if (context.complianceFramework === ComplianceFramework.FEDRAMP_HIGH) {
      sourceComponent.addEnvironment('CLOUDFRONT_EDGE_LOCATIONS_US_ONLY', 'true');
    }
  }
}
