/**
 * CDK Nag Security Tests for Kinesis Stream Component
 * 
 * Validates that the component follows AWS security best practices
 * using CDK Nag rule packs (AwsSolutions)
 * 
 * Based on AWS best practices:
 * - Kinesis streams should be encrypted at rest
 * - Customer-managed KMS keys preferred for high-risk environments
 * - Monitoring and alarms should be enabled
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as cdk from 'aws-cdk-lib';
import { Annotations, Match } from 'aws-cdk-lib/assertions';
import { AwsSolutionsChecks } from 'cdk-nag';
import { Aspects } from 'aws-cdk-lib';
import { ComponentContext, ComponentSpec } from '@shinobi/core';
import { KinesisStreamComponent } from '../../kinesis-stream.component';
import { KinesisStreamComponentConfigBuilder } from '../../kinesis-stream.builder';
import { vi } from 'vitest';

let platformConfigSpy: any;

beforeEach(() => {
  platformConfigSpy = vi
    .spyOn(KinesisStreamComponentConfigBuilder.prototype as any, '_loadPlatformConfiguration')
    .mockImplementation(() => ({}));
});

describe.skip('KinesisStreamComponent - CDK Nag Security Validation', () => {
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
    it('passes AwsSolutions security checks for basic stream', () => {
      const spec: ComponentSpec = {
        name: 'test-stream',
        type: 'kinesis-stream',
        config: {
          streamName: 'test-stream',
          streamMode: 'on-demand'
        }
      };

      const component = new KinesisStreamComponent(stack, 'TestStream', context, spec);
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
        name: 'test-stream',
        type: 'kinesis-stream',
        config: {
          streamName: 'test-stream-encrypted',
          streamMode: 'on-demand',
          encryption: {
            type: 'kms'
          }
        }
      };

      const component = new KinesisStreamComponent(stack, 'TestStream', context, spec);
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
        name: 'test-stream',
        type: 'kinesis-stream',
        config: {
          streamName: 'test-stream-secure',
          streamMode: 'on-demand',
          highRiskEnvironment: true
        }
      };

      const component = new KinesisStreamComponent(stack, 'TestStream', context, spec);
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

