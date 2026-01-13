/**
 * CDK Nag Security Tests for Glue Job Component
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
import { GlueJobComponent } from '../../src/glue-job.component';
import { GlueJobComponentConfigBuilder } from '../../src/glue-job.builder';
import { vi } from 'vitest';

let platformConfigSpy: any;

beforeEach(() => {
  platformConfigSpy = vi
    .spyOn(GlueJobComponentConfigBuilder.prototype as any, '_loadPlatformConfiguration')
    .mockImplementation(() => ({}));
});

describe.skip('GlueJobComponent - CDK Nag Security Validation', () => {
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
    it('passes AwsSolutions security checks for basic Glue job', () => {
      const spec: ComponentSpec = {
        name: 'test-glue-job',
        type: 'glue-job',
        config: {
          scriptLocation: 's3://test-bucket/scripts/test-script.py',
          glueVersion: '4.0',
          jobType: 'glueetl',
          command: {
            pythonVersion: '3',
            scriptArguments: {}
          },
          workerConfiguration: {
            workerType: 'G.1X',
            numberOfWorkers: 10
          },
          security: {
            encryption: {
              enabled: false,
              createCustomerManagedKey: false,
              removalPolicy: 'destroy'
            }
          },
          logging: {
            groups: [
              {
                id: 'error',
                enabled: true,
                logGroupSuffix: 'error',
                retentionDays: 30,
                removalPolicy: 'destroy'
              }
            ]
          },
          monitoring: {
            enabled: true,
            jobFailure: {
              threshold: 1,
              evaluationPeriods: 1,
              periodMinutes: 5
            },
            jobDuration: {
              thresholdMs: 3600000,
              evaluationPeriods: 1,
              periodMinutes: 5
            }
          },
          tags: {}
        }
      };

      const component = new GlueJobComponent(stack, 'TestGlueJob', context, spec);
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
        name: 'test-glue-job',
        type: 'glue-job',
        config: {
          scriptLocation: 's3://test-bucket/scripts/test-script.py',
          glueVersion: '4.0',
          jobType: 'glueetl',
          highRiskEnvironment: true,
          command: {
            pythonVersion: '3',
            scriptArguments: {}
          },
          workerConfiguration: {
            workerType: 'G.1X',
            numberOfWorkers: 10
          },
          security: {
            encryption: {
              enabled: true,
              createCustomerManagedKey: true,
              removalPolicy: 'retain'
            }
          },
          logging: {
            groups: [
              {
                id: 'error',
                enabled: true,
                logGroupSuffix: 'error',
                retentionDays: 1095,
                removalPolicy: 'retain'
              }
            ]
          },
          monitoring: {
            enabled: true,
            jobFailure: {
              threshold: 1,
              evaluationPeriods: 1,
              periodMinutes: 5
            },
            jobDuration: {
              thresholdMs: 3600000,
              evaluationPeriods: 1,
              periodMinutes: 5
            }
          },
          tags: {}
        }
      };

      const component = new GlueJobComponent(stack, 'TestGlueJob', context, spec);
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

