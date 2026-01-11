/**
 * CDK Nag Security Tests for EventBridge Rule Pattern Component
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
import { EventBridgeRulePatternComponent } from '../src/eventbridge-rule-pattern.component.js';
import { EventBridgeRulePatternComponentConfigBuilder } from '../src/eventbridge-rule-pattern.builder.js';
import { vi } from 'vitest';

let platformConfigSpy: any;

beforeEach(() => {
  platformConfigSpy = vi
    .spyOn(EventBridgeRulePatternComponentConfigBuilder.prototype as any, '_loadPlatformConfiguration')
    .mockImplementation(() => ({}));
});

describe.skip('EventBridgeRulePatternComponent - CDK Nag Security Validation', () => {
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
    it('passes AwsSolutions security checks for basic pattern rule', () => {
      const spec: ComponentSpec = {
        name: 'test-pattern',
        type: 'eventbridge-rule-pattern',
        config: {
          ruleName: 'test-pattern-rule',
          description: 'Test pattern rule',
          state: 'enabled',
          eventPattern: {
            source: ['aws.s3'],
            'detail-type': ['Object Created']
          },
          deadLetterQueue: {
            enabled: true,
            maxRetryAttempts: 3,
            retentionDays: 14
          },
          monitoring: {
            enabled: true,
            failedInvocations: {
              enabled: true,
              threshold: 5,
              evaluationPeriods: 2,
              periodMinutes: 5,
              comparisonOperator: 'gte',
              treatMissingData: 'not-breaching',
              statistic: 'Sum'
            },
            invocations: {
              enabled: true,
              threshold: 100,
              evaluationPeriods: 1,
              periodMinutes: 5,
              comparisonOperator: 'gte',
              treatMissingData: 'not-breaching',
              statistic: 'Sum'
            },
            matchedEvents: {
              enabled: true,
              threshold: 50,
              evaluationPeriods: 1,
              periodMinutes: 5,
              comparisonOperator: 'gte',
              treatMissingData: 'not-breaching',
              statistic: 'Sum'
            },
            deadLetterQueueMessages: {
              enabled: true,
              threshold: 10,
              evaluationPeriods: 1,
              periodMinutes: 5,
              comparisonOperator: 'gte',
              treatMissingData: 'not-breaching',
              statistic: 'Sum'
            },
            cloudWatchLogs: {
              enabled: true,
              retentionDays: 30,
              removalPolicy: 'retain'
            }
          },
          tags: {}
        }
      };

      const component = new EventBridgeRulePatternComponent(stack, 'TestPattern', context, spec);
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
        name: 'test-pattern',
        type: 'eventbridge-rule-pattern',
        config: {
          ruleName: 'test-pattern-rule',
          description: 'Test pattern rule',
          state: 'enabled',
          eventPattern: {
            source: ['aws.s3'],
            'detail-type': ['Object Created']
          },
          highRiskEnvironment: true,
          deadLetterQueue: {
            enabled: true,
            maxRetryAttempts: 3,
            retentionDays: 14
          },
          monitoring: {
            enabled: true,
            failedInvocations: {
              enabled: true,
              threshold: 5,
              evaluationPeriods: 2,
              periodMinutes: 5,
              comparisonOperator: 'gte',
              treatMissingData: 'not-breaching',
              statistic: 'Sum'
            },
            invocations: {
              enabled: true,
              threshold: 100,
              evaluationPeriods: 1,
              periodMinutes: 5,
              comparisonOperator: 'gte',
              treatMissingData: 'not-breaching',
              statistic: 'Sum'
            },
            matchedEvents: {
              enabled: true,
              threshold: 50,
              evaluationPeriods: 1,
              periodMinutes: 5,
              comparisonOperator: 'gte',
              treatMissingData: 'not-breaching',
              statistic: 'Sum'
            },
            deadLetterQueueMessages: {
              enabled: true,
              threshold: 10,
              evaluationPeriods: 1,
              periodMinutes: 5,
              comparisonOperator: 'gte',
              treatMissingData: 'not-breaching',
              statistic: 'Sum'
            },
            cloudWatchLogs: {
              enabled: true,
              retentionDays: 1095,
              removalPolicy: 'retain'
            }
          },
          tags: {}
        }
      };

      const component = new EventBridgeRulePatternComponent(stack, 'TestPattern', context, spec);
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

