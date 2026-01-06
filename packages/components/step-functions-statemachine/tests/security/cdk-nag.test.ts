/**
 * CDK Nag Security Tests for Step Functions State Machine Component
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
import { StepFunctionsStateMachineComponent } from '../step-functions-statemachine.component.js';
import { StepFunctionsStateMachineConfigBuilder } from '../step-functions-statemachine.builder.js';
import { vi } from 'vitest';

let platformConfigSpy: any;

beforeEach(() => {
  platformConfigSpy = vi
    .spyOn(StepFunctionsStateMachineConfigBuilder.prototype as any, '_loadPlatformConfiguration')
    .mockImplementation(() => ({}));
});

describe('StepFunctionsStateMachineComponent - CDK Nag Security Validation', () => {
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
    it('passes AwsSolutions security checks for basic state machine', () => {
      const spec: ComponentSpec = {
        name: 'test-state-machine',
        type: 'step-functions-statemachine',
        config: {
          stateMachineName: 'test-state-machine',
          stateMachineType: 'STANDARD',
          definition: {
            definition: {
              Comment: 'Test state machine',
              StartAt: 'HelloWorld',
              States: {
                HelloWorld: {
                  Type: 'Pass',
                  End: true
                }
              }
            }
          },
          roleArn: 'arn:aws:iam::123456789012:role/StepFunctionsRole'
        }
      };

      const component = new StepFunctionsStateMachineComponent(stack, 'TestStateMachine', context, spec);
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
        name: 'test-state-machine',
        type: 'step-functions-statemachine',
        config: {
          stateMachineName: 'test-state-machine',
          stateMachineType: 'STANDARD',
          highRiskEnvironment: true,
          definition: {
            definition: {
              Comment: 'Test state machine',
              StartAt: 'HelloWorld',
              States: {
                HelloWorld: {
                  Type: 'Pass',
                  End: true
                }
              }
            }
          },
          roleArn: 'arn:aws:iam::123456789012:role/StepFunctionsRole',
          loggingConfiguration: {
            enabled: true,
            level: 'ALL'
          },
          tracingConfiguration: {
            enabled: true
          }
        }
      };

      const component = new StepFunctionsStateMachineComponent(stack, 'TestStateMachine', context, spec);
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

