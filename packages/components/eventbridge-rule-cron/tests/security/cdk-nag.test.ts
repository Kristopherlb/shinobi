/**
 * CDK Nag Security Tests for EventBridge Rule Cron Component
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
import { EventBridgeRuleCronComponent } from '../eventbridge-rule-cron.component.js';
import { EventBridgeRuleCronComponentConfigBuilder } from '../eventbridge-rule-cron.builder.js';
import { vi } from 'vitest';

let platformConfigSpy: any;

beforeEach(() => {
  platformConfigSpy = vi
    .spyOn(EventBridgeRuleCronComponentConfigBuilder.prototype as any, '_loadPlatformConfiguration')
    .mockImplementation(() => ({}));
});

describe('EventBridgeRuleCronComponent - CDK Nag Security Validation', () => {
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
    it('passes AwsSolutions security checks for basic cron rule', () => {
      const spec: ComponentSpec = {
        name: 'test-cron',
        type: 'eventbridge-rule-cron',
        config: {
          schedule: 'rate(10 minutes)',
          deadLetterQueue: {
            enabled: true,
            maxRetryAttempts: 3,
            retentionDays: 14
          },
          monitoring: {
            enabled: true,
            alarms: {
              failedInvocations: {
                enabled: true,
                threshold: 5,
                evaluationPeriods: 2,
                periodMinutes: 5,
                comparisonOperator: 'gte',
                treatMissingData: 'not-breaching',
                statistic: 'Sum'
              },
              invocationRate: {
                enabled: true,
                threshold: 100,
                evaluationPeriods: 1,
                periodMinutes: 5,
                comparisonOperator: 'gte',
                treatMissingData: 'not-breaching',
                statistic: 'Sum'
              }
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

      const component = new EventBridgeRuleCronComponent(stack, 'TestCron', context, spec);
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
        name: 'test-cron',
        type: 'eventbridge-rule-cron',
        config: {
          schedule: 'rate(10 minutes)',
          highRiskEnvironment: true,
          deadLetterQueue: {
            enabled: true,
            maxRetryAttempts: 3,
            retentionDays: 14
          },
          monitoring: {
            enabled: true,
            alarms: {
              failedInvocations: {
                enabled: true,
                threshold: 5,
                evaluationPeriods: 2,
                periodMinutes: 5,
                comparisonOperator: 'gte',
                treatMissingData: 'not-breaching',
                statistic: 'Sum'
              },
              invocationRate: {
                enabled: true,
                threshold: 100,
                evaluationPeriods: 1,
                periodMinutes: 5,
                comparisonOperator: 'gte',
                treatMissingData: 'not-breaching',
                statistic: 'Sum'
              }
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

      const component = new EventBridgeRuleCronComponent(stack, 'TestCron', context, spec);
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

