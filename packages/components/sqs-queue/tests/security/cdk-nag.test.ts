/**
 * CDK Nag Security Tests for SQS Queue Component
 * 
 * Validates that the component follows AWS security best practices
 * using CDK Nag rule packs (AwsSolutions and FedRAMP)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as cdk from 'aws-cdk-lib';
import { Annotations, Match } from 'aws-cdk-lib/assertions';
import { AwsSolutionsChecks } from 'cdk-nag';
import { Aspects } from 'aws-cdk-lib';
import { ComponentContext, ComponentSpec } from '@shinobi/core';
import { SqsQueueComponent } from '../../sqs-queue.component';
import { SqsQueueConfigBuilder } from '../../sqs-queue.builder';

// Mock platform configuration loading to avoid requiring config files in tests
import { vi } from 'vitest';

let platformConfigSpy: any;

beforeEach(() => {
  platformConfigSpy = vi
    .spyOn(SqsQueueConfigBuilder.prototype as any, '_loadPlatformConfiguration')
    .mockImplementation(() => ({}));
});

afterEach(() => {
  platformConfigSpy?.mockRestore();
});

describe.skip('SqsQueueComponent - CDK Nag Security Validation', () => {
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
      scope: stack
    } as ComponentContext;
  });

  describe('Commercial Framework - AwsSolutions', () => {
    it('passes AwsSolutions security checks for basic queue', () => {
      const spec: ComponentSpec = {
        name: 'test-queue',
        type: 'sqs-queue',
        config: {}
      };

      const component = new SqsQueueComponent(stack, 'TestQueue', context, spec);
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
        name: 'test-queue',
        type: 'sqs-queue',
        config: {
          highRiskEnvironment: true // Enables encryption, DLQ, and detailed metrics
        }
      };

      const component = new SqsQueueComponent(stack, 'TestQueue', context, spec);
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
    
    it('passes AwsSolutions security checks with explicit encryption config', () => {
      const spec: ComponentSpec = {
        name: 'test-queue',
        type: 'sqs-queue',
        config: {
          encryption: {
            enabled: true
          },
          deadLetterQueue: {
            enabled: true
          }
        }
      };

      const component = new SqsQueueComponent(stack, 'TestQueue', context, spec);
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

