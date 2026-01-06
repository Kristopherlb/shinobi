/**
 * CDK Nag Security Tests for SNS Topic Component
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
import { SnsTopicComponent } from '../../sns-topic.component';
import { SnsTopicComponentConfigBuilder } from '../../sns-topic.builder';
import { vi } from 'vitest';

let platformConfigSpy: any;

beforeEach(() => {
  platformConfigSpy = vi
    .spyOn(SnsTopicComponentConfigBuilder.prototype as any, '_loadPlatformConfiguration')
    .mockImplementation(() => ({}));
});

describe('SnsTopicComponent - CDK Nag Security Validation', () => {
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
    it('passes AwsSolutions security checks for basic topic', () => {
      const spec: ComponentSpec = {
        name: 'test-topic',
        type: 'sns-topic',
        config: {
          topicName: 'test-topic'
        }
      };

      const component = new SnsTopicComponent(stack, 'TestTopic', context, spec);
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
        name: 'test-topic',
        type: 'sns-topic',
        config: {
          topicName: 'test-topic-encrypted',
          encryption: {
            enabled: true
          }
        }
      };

      const component = new SnsTopicComponent(stack, 'TestTopic', context, spec);
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
        name: 'test-topic',
        type: 'sns-topic',
        config: {
          topicName: 'test-topic-secure',
          highRiskEnvironment: true
        }
      };

      const component = new SnsTopicComponent(stack, 'TestTopic', context, spec);
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

