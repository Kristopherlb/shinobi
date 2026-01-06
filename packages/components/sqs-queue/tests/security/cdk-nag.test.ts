/**
 * CDK Nag Security Tests for SQS Queue Component
 * 
 * Validates that the component follows AWS security best practices
 * using CDK Nag rule packs (AwsSolutions and FedRAMP)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as cdk from 'aws-cdk-lib';
import { Annotations, Match } from 'aws-cdk-lib/assertions';
import { AwsSolutionsChecks } from 'cdk-nag';
import { Aspects } from 'aws-cdk-lib';
import { ComponentContext, ComponentSpec } from '@shinobi/core';
import { SqsQueueNewComponent } from '../../sqs-queue.component';

describe('SqsQueueNewComponent - CDK Nag Security Validation', () => {
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

      const component = new SqsQueueNewComponent(stack, 'TestQueue', context, spec);
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

  describe('FedRAMP Moderate Framework', () => {
    it('passes AwsSolutions security checks for FedRAMP Moderate', () => {
      const fedrampContext: ComponentContext = {
        ...context,
        complianceFramework: 'fedramp-moderate'
      };

      const spec: ComponentSpec = {
        name: 'test-queue',
        type: 'sqs-queue',
        config: {
          encryption: {
            enabled: true
          }
        }
      };

      const component = new SqsQueueNewComponent(stack, 'TestQueue', fedrampContext, spec);
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

