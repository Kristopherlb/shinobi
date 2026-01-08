/**
 * CDK Nag Security Tests for OpenFeature Provider Component
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
import { OpenFeatureProviderComponent } from '../../src/openfeature-provider.component.js';
import { OpenFeatureProviderComponentConfigBuilder } from '../src/openfeature-provider.builder.js';
import { vi } from 'vitest';

let platformConfigSpy: any;

beforeEach(() => {
  platformConfigSpy = vi
    .spyOn(OpenFeatureProviderComponentConfigBuilder.prototype as any, '_loadPlatformConfiguration')
    .mockImplementation(() => ({}));
});

describe('OpenFeatureProviderComponent - CDK Nag Security Validation', () => {
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
    it('passes AwsSolutions security checks for basic OpenFeature provider', () => {
      const spec: ComponentSpec = {
        name: 'test-provider',
        type: 'openfeature-provider',
        config: {
          provider: 'awsAppConfig',
          awsAppConfig: {
            applicationId: 'test-app',
            environmentId: 'test-env',
            configurationProfileId: 'test-profile'
          }
        }
      };

      const component = new OpenFeatureProviderComponent(stack, 'TestProvider', context, spec);
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
    it('Security__HighRiskEnvironment__PassesAwsSolutionsChecks', () => {
      const spec: ComponentSpec = {
        name: 'test-provider',
        type: 'openfeature-provider',
        config: {
          provider: 'awsAppConfig',
          highRiskEnvironment: true,
          awsAppConfig: {
            applicationId: 'test-app',
            environmentId: 'test-env',
            configurationProfileId: 'test-profile',
            kmsKeyArn: 'arn:aws:kms:us-east-1:123456789012:key/test-key'
          }
        }
      };

      const component = new OpenFeatureProviderComponent(stack, 'TestProvider', context, spec);
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

