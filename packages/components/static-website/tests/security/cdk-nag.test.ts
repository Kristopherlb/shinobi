/**
 * CDK Nag Security Tests for Static Website Component
 * 
 * Validates that the component follows AWS security best practices
 * using CDK Nag rule packs (AwsSolutions)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as cdk from 'aws-cdk-lib';
import { Annotations, Match } from 'aws-cdk-lib/assertions';
import { AwsSolutionsChecks } from 'cdk-nag';
import { Aspects } from 'aws-cdk-lib';
import { ComponentContext, ComponentSpec } from '@shinobi/core';
import { StaticWebsiteComponent } from '../static-website.component.js';
import { StaticWebsiteConfigBuilder } from '../static-website.builder.js';
import { vi } from 'vitest';

let platformConfigSpy: any;

beforeEach(() => {
  platformConfigSpy = vi
    .spyOn(StaticWebsiteConfigBuilder.prototype as any, '_loadPlatformConfiguration')
    .mockImplementation(() => ({}));
});

describe('StaticWebsiteComponent - CDK Nag Security Validation', () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let context: ComponentContext;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack', {
      env: { account: '123456789012', region: 'us-east-1' }
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
    it('passes AwsSolutions security checks for basic static website', () => {
      const spec: ComponentSpec = {
        name: 'test-website',
        type: 'static-website',
        config: {
          websiteName: 'test-website',
          bucket: {
            bucketName: 'test-website-bucket'
          }
        }
      };

      const component = new StaticWebsiteComponent(stack, 'TestWebsite', context, spec);
      component.synth();

      // Apply CDK Nag
      Aspects.of(stack).add(new AwsSolutionsChecks({ verbose: true }));

      // Check for errors
      const errors = Annotations.fromStack(stack).findError(
        '*',
        Match.stringLikeRegexp('AwsSolutions-.*')
      );

      expect(errors).toHaveLength(0);
    });
  });

  describe('High Risk Environment - Enhanced Security', () => {
    it('passes AwsSolutions security checks with highRiskEnvironment enabled', () => {
      const spec: ComponentSpec = {
        name: 'test-website',
        type: 'static-website',
        config: {
          websiteName: 'test-website',
          highRiskEnvironment: true,
          bucket: {
            bucketName: 'test-website-bucket',
            encryption: {
              enabled: true
            }
          },
          security: {
            wafEnabled: true
          }
        }
      };

      const component = new StaticWebsiteComponent(stack, 'TestWebsite', context, spec);
      component.synth();

      // Apply CDK Nag
      Aspects.of(stack).add(new AwsSolutionsChecks({ verbose: true }));

      // Check for errors
      const errors = Annotations.fromStack(stack).findError(
        '*',
        Match.stringLikeRegexp('AwsSolutions-.*')
      );

      expect(errors).toHaveLength(0);
    });
  });
});

