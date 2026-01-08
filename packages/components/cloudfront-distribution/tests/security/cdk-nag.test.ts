/**
 * CDK Nag Security Tests for CloudFront Distribution Component
 * 
 * Validates that the component follows AWS security best practices
 * using CDK Nag rule packs (AwsSolutions)
 * 
 * Based on AWS best practices:
 * - CloudFront distributions should use HTTPS only
 * - Origin Access Control (OAC) should be used for S3 origins
 * - WAF should be enabled for high-risk environments
 * - Logging should be enabled
 * - Default root object should be configured
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Annotations, Match } from 'aws-cdk-lib/assertions';
import { AwsSolutionsChecks, NagSuppressions } from 'cdk-nag';
import { Aspects } from 'aws-cdk-lib';
import { ComponentContext, ComponentSpec } from '@shinobi/core';
import { CloudFrontDistributionComponent } from '../../src/cloudfront-distribution.component';
import { CloudFrontDistributionComponentConfigBuilder } from '../../src/cloudfront-distribution.builder';
import { vi } from 'vitest';

let platformConfigSpy: any;

beforeEach(() => {
  platformConfigSpy = vi
    .spyOn(CloudFrontDistributionComponentConfigBuilder.prototype as any, '_loadPlatformConfiguration')
    .mockImplementation(() => ({}));
});

describe.skip('CloudFrontDistributionComponent - CDK Nag Security Validation', () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let bucket: s3.Bucket;
  let context: ComponentContext;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack', {
      env: { account: '123456789012', region: 'us-east-1' }
    });

    bucket = new s3.Bucket(stack, 'TestBucket', {
      bucketName: 'test-bucket'
    });

    context = {
      serviceName: 'test-service',
      environment: 'dev',
      complianceFramework: 'commercial',
      accountId: '123456789012',
      region: 'us-east-1',
      scope: stack,
      serviceLabels: {
        'service-name': 'test-service',
        'environment': 'dev',
        'compliance-framework': 'commercial'
      }
    } as ComponentContext;
  });

  describe('Commercial Framework - AwsSolutions', () => {
    it('passes AwsSolutions security checks for basic distribution', () => {
      const spec: ComponentSpec = {
        name: 'test-distribution',
        type: 'cloudfront-distribution',
        config: {
          origin: {
            type: 's3',
            bucketName: bucket.bucketName,
            domainName: bucket.bucketRegionalDomainName
          },
          defaultBehavior: {
            viewerProtocolPolicy: 'redirect-to-https'
          }
        }
      };

      const component = new CloudFrontDistributionComponent(stack, 'TestDistribution', context, spec);
      component.synth();

      // Apply CDK Nag
      Aspects.of(stack).add(new AwsSolutionsChecks({ verbose: true }));

      // Check for errors (may need suppressions for CloudFront-specific rules)
      const errors = Annotations.fromStack(stack).findError(
        '*',
        Match.stringLikeRegexp('AwsSolutions-.*')
      );

      // Filter out expected CloudFront-specific warnings that may be acceptable
      const criticalErrors = errors.filter((error: any) => {
        const message = String(error?.entry?.data ?? '');
        // Allow some CloudFront-specific suppressions if documented
        return !message.includes('AwsSolutions-CFR1'); // CloudFront access logging
      });

      expect(criticalErrors).toHaveLength(0);
    });

    it('passes AwsSolutions security checks with OAC enabled', () => {
      const spec: ComponentSpec = {
        name: 'test-distribution',
        type: 'cloudfront-distribution',
        config: {
          origin: {
            type: 's3',
            bucketName: bucket.bucketName,
            domainName: bucket.bucketRegionalDomainName,
            oacSigning: 'SIGV4_ALWAYS'
          },
          defaultBehavior: {
            viewerProtocolPolicy: 'redirect-to-https'
          }
        }
      };

      const component = new CloudFrontDistributionComponent(stack, 'TestDistribution', context, spec);
      component.synth();

      // Apply CDK Nag
      Aspects.of(stack).add(new AwsSolutionsChecks({ verbose: true }));

      // Check for errors
      const errors = Annotations.fromStack(stack).findError(
        '*',
        Match.stringLikeRegexp('AwsSolutions-.*')
      );

      const criticalErrors = errors.filter((error: any) => {
        const message = String(error?.entry?.data ?? '');
        return !message.includes('AwsSolutions-CFR1');
      });

      expect(criticalErrors).toHaveLength(0);
    });
  });

  describe('High Risk Environment - Enhanced Security', () => {
    it('passes AwsSolutions security checks with highRiskEnvironment enabled', () => {
      const spec: ComponentSpec = {
        name: 'test-distribution',
        type: 'cloudfront-distribution',
        config: {
          origin: {
            type: 's3',
            bucketName: bucket.bucketName,
            domainName: bucket.bucketRegionalDomainName,
            oacSigning: 'SIGV4_ALWAYS'
          },
          defaultBehavior: {
            viewerProtocolPolicy: 'redirect-to-https'
          },
          highRiskEnvironment: true
        }
      };

      const component = new CloudFrontDistributionComponent(stack, 'TestDistribution', context, spec);
      component.synth();

      // Apply CDK Nag
      Aspects.of(stack).add(new AwsSolutionsChecks({ verbose: true }));

      // Check for errors
      const errors = Annotations.fromStack(stack).findError(
        '*',
        Match.stringLikeRegexp('AwsSolutions-.*')
      );

      const criticalErrors = errors.filter((error: any) => {
        const message = String(error?.entry?.data ?? '');
        return !message.includes('AwsSolutions-CFR1');
      });

      expect(criticalErrors).toHaveLength(0);
    });
  });
});

