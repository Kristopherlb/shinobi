/**
 * CDK Nag Security Tests for SageMaker Notebook Instance Component
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
import { SageMakerNotebookInstanceComponent } from '../sagemaker-notebook-instance.component.js';
import { SageMakerNotebookInstanceComponentConfigBuilder } from '../sagemaker-notebook-instance.builder.js';
import { vi } from 'vitest';

let platformConfigSpy: any;

beforeEach(() => {
  platformConfigSpy = vi
    .spyOn(SageMakerNotebookInstanceComponentConfigBuilder.prototype as any, '_loadPlatformConfiguration')
    .mockImplementation(() => ({}));
});

describe('SageMakerNotebookInstanceComponent - CDK Nag Security Validation', () => {
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
    it('passes AwsSolutions security checks for basic SageMaker notebook instance', () => {
      const spec: ComponentSpec = {
        name: 'test-notebook',
        type: 'sagemaker-notebook-instance',
        config: {
          notebookInstanceName: 'test-notebook',
          instanceType: 'ml.t3.medium',
          roleArn: 'arn:aws:iam::123456789012:role/SageMakerNotebookRole'
        }
      };

      const component = new SageMakerNotebookInstanceComponent(stack, 'TestNotebook', context, spec);
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
        name: 'test-notebook',
        type: 'sagemaker-notebook-instance',
        config: {
          notebookInstanceName: 'test-notebook',
          instanceType: 'ml.t3.medium',
          roleArn: 'arn:aws:iam::123456789012:role/SageMakerNotebookRole',
          highRiskEnvironment: true,
          security: {
            directInternetAccess: 'Disabled',
            rootAccess: 'Disabled'
          }
        }
      };

      const component = new SageMakerNotebookInstanceComponent(stack, 'TestNotebook', context, spec);
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

