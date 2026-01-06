/**
 * CDK Nag Security Tests for SSM Parameter Component
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
import { SsmParameterComponent } from '../../ssm-parameter.component';
import { SsmParameterComponentConfigBuilder } from '../../ssm-parameter.builder';
import { vi } from 'vitest';

let platformConfigSpy: any;

beforeEach(() => {
  platformConfigSpy = vi
    .spyOn(SsmParameterComponentConfigBuilder.prototype as any, '_loadPlatformConfiguration')
    .mockImplementation(() => ({}));
});

describe('SsmParameterComponent - CDK Nag Security Validation', () => {
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
    it('passes AwsSolutions security checks for basic parameter', () => {
      const spec: ComponentSpec = {
        name: 'test-parameter',
        type: 'ssm-parameter',
        config: {
          name: '/test/parameter',
          kind: 'String',
          value: 'test-value'
        }
      };

      const component = new SsmParameterComponent(stack, 'TestParameter', context, spec);
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

    it('passes AwsSolutions security checks with encryption enabled', () => {
      const spec: ComponentSpec = {
        name: 'test-parameter',
        type: 'ssm-parameter',
        config: {
          name: '/test/parameter-encrypted',
          kind: 'SecureString',
          value: 'test-value',
          encryption: {
            enabled: true
          }
        }
      };

      const component = new SsmParameterComponent(stack, 'TestParameter', context, spec);
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
        name: 'test-parameter',
        type: 'ssm-parameter',
        config: {
          name: '/test/parameter-secure',
          kind: 'SecureString',
          value: 'test-value',
          highRiskEnvironment: true
        }
      };

      const component = new SsmParameterComponent(stack, 'TestParameter', context, spec);
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

