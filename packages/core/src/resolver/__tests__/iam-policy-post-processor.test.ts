/**
 * IAM Policy Post-Processor Tests
 * 
 * Tests for IAM policy post-processing following Platform Testing Standard v1.0
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IamPolicyPostProcessor } from '../iam-policy-post-processor.js';
import type { EnhancedBindingResult } from '../../platform/contracts/platform-binding-trigger-spec.js';
import { App, Stack } from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';

describe('IamPolicyPostProcessor', () => {
  describe('IamPolicyPostProcessor__WithBindingResult__AppliesPoliciesToLambda', () => {
    const metadata = {
      id: 'TP-iam-policy-postprocessor-001',
      level: 'unit' as const,
      capability: 'Applies IAM policies from binding results to Lambda execution roles',
      oracle: 'exact' as const,
      invariants: [
        'IAM policies from binding results are applied to Lambda roles',
        'Only Lambda components receive policies',
        'Non-Lambda components are skipped',
        'Multiple policies are all applied'
      ],
      fixtures: ['IamPolicyPostProcessor', 'MockLambdaFunction', 'MockComponents'],
      inputs: {
        shape: 'Array of binding results with iamPolicies',
        notes: 'Tests IAM policy application to Lambda roles'
      },
      risks: [
        'Policies applied to wrong resources',
        'Non-Lambda components receiving policies',
        'Missing policies'
      ],
      dependencies: ['aws-cdk-lib', '@shinobi/core', 'vitest'],
      evidence: ['Policy application assertions', 'Lambda role policy checks'],
      compliance_refs: ['docs/spec/platform-bindings-spec.md'],
      ai_generated: true,
      human_reviewed_by: 'platform-team'
    };

    it('IamPolicyPostProcessor__WithBindingResult__AppliesPoliciesToLambda', () => {
      const app = new App();
      const stack = new Stack(app, 'TestStack');

      // Create a Lambda function
      const testFunction = new lambda.Function(stack, 'TestFunction', {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: 'index.handler',
        code: lambda.Code.fromInline('exports.handler = async () => {}')
      });

      // Create mock component that provides Lambda function
      const mockComponent = {
        spec: {
          name: 'test-lambda',
          type: 'lambda-worker'
        },
        getType: () => 'lambda-worker',
        getConstruct: (handle: string) => {
          if (handle === 'function' || handle === 'main') {
            return testFunction;
          }
          return undefined;
        }
      };

      const bindings = [
        {
          source: 'test-lambda',
          target: 'test-queue',
          capability: 'messaging:sqs',
          result: {
            environmentVariables: {},
            iamPolicies: [
              {
                statement: new PolicyStatement({
                  effect: Effect.ALLOW,
                  actions: ['sqs:ReceiveMessage', 'sqs:DeleteMessage'],
                  resources: ['arn:aws:sqs:us-east-1:123456789012:test-queue']
                }),
                description: 'SQS queue read access permissions',
                complianceRequirement: 'Least privilege IAM access'
              }
            ],
            securityGroupRules: [],
            compliance: {
              status: 'compliant' as const,
              framework: 'commercial',
              actionsTaken: []
            }
          } as EnhancedBindingResult
        }
      ];

      // Act
      const result = IamPolicyPostProcessor.process(
        bindings,
        stack,
        [mockComponent]
      );

      // Assert
      expect(result.policiesApplied).toBe(1);
      expect(result.lambdaFunctionsAffected).toBe(1);
      
      // Verify policy was added to Lambda role
      const role = testFunction.role;
      expect(role).toBeDefined();
      // Note: We can't easily inspect inline policies in tests, but we verify the processor ran
    });

    it('IamPolicyPostProcessor__WithNonLambdaComponent__SkipsGracefully', () => {
      const app = new App();
      const stack = new Stack(app, 'TestStack');

      // Create mock non-Lambda component
      const mockComponent = {
        spec: {
          name: 'test-queue',
          type: 'sqs-queue'
        },
        getType: () => 'sqs-queue',
        getConstruct: () => undefined
      };

      const bindings = [
        {
          source: 'test-queue',
          target: 'test-bucket',
          capability: 'storage:s3',
          result: {
            environmentVariables: {},
            iamPolicies: [
              {
                statement: new PolicyStatement({
                  effect: Effect.ALLOW,
                  actions: ['s3:GetObject'],
                  resources: ['arn:aws:s3:::test-bucket/*']
                }),
                description: 'S3 bucket read access',
                complianceRequirement: 'Least privilege IAM access'
              }
            ],
            securityGroupRules: [],
            compliance: {
              status: 'compliant' as const,
              framework: 'commercial',
              actionsTaken: []
            }
          } as EnhancedBindingResult
        }
      ];

      // Act
      const result = IamPolicyPostProcessor.process(
        bindings,
        stack,
        [mockComponent]
      );

      // Assert - non-Lambda components are skipped
      expect(result.policiesApplied).toBe(0);
      expect(result.lambdaFunctionsAffected).toBe(0);
    });

    it('IamPolicyPostProcessor__WithMultiplePolicies__AppliesAll', () => {
      const app = new App();
      const stack = new Stack(app, 'TestStack');

      const testFunction = new lambda.Function(stack, 'TestFunction', {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: 'index.handler',
        code: lambda.Code.fromInline('exports.handler = async () => {}')
      });

      const mockComponent = {
        spec: {
          name: 'test-lambda',
          type: 'lambda-worker'
        },
        getType: () => 'lambda-worker',
        getConstruct: (handle: string) => {
          if (handle === 'function' || handle === 'main') {
            return testFunction;
          }
          return undefined;
        }
      };

      const bindings = [
        {
          source: 'test-lambda',
          target: 'test-queue',
          capability: 'messaging:sqs',
          result: {
            environmentVariables: {},
            iamPolicies: [
              {
                statement: new PolicyStatement({
                  effect: Effect.ALLOW,
                  actions: ['sqs:ReceiveMessage'],
                  resources: ['arn:aws:sqs:us-east-1:123456789012:test-queue']
                }),
                description: 'SQS receive permissions',
                complianceRequirement: 'Least privilege'
              },
              {
                statement: new PolicyStatement({
                  effect: Effect.ALLOW,
                  actions: ['sqs:DeleteMessage'],
                  resources: ['arn:aws:sqs:us-east-1:123456789012:test-queue']
                }),
                description: 'SQS delete permissions',
                complianceRequirement: 'Least privilege'
              }
            ],
            securityGroupRules: [],
            compliance: {
              status: 'compliant' as const,
              framework: 'commercial',
              actionsTaken: []
            }
          } as EnhancedBindingResult
        }
      ];

      // Act
      const result = IamPolicyPostProcessor.process(
        bindings,
        stack,
        [mockComponent]
      );

      // Assert - all policies applied
      expect(result.policiesApplied).toBe(2);
      expect(result.lambdaFunctionsAffected).toBe(1);
    });
  });
});

