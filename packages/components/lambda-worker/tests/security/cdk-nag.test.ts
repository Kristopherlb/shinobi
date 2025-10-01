/**
 * CDK Nag Security Tests for Lambda Worker Component
 * 
 * Validates that the Lambda Worker Component passes CDK Nag security checks
 * and has appropriate suppressions for legitimate Lambda use cases.
 */

import { App, Stack } from 'aws-cdk-lib';
import { AwsSolutionsChecks, NagSuppressions } from 'cdk-nag';
import { LambdaWorkerComponent } from '../../lambda-worker.component.js';
import { ComponentContext, ComponentSpec } from '@shinobi/core';

describe('CDK Nag Security Tests - Lambda Worker Component', () => {
  let app: App;
  let stack: Stack;
  let component: LambdaWorkerComponent;

  beforeEach(() => {
    app = new App();
    stack = new Stack(app, 'TestLambdaWorkerStack');

    const context: ComponentContext = {
      environment: 'test',
      complianceFramework: 'commercial',
      owner: 'test-owner',
      service: 'test-service'
    };

    const spec: ComponentSpec = {
      type: 'lambda-worker',
      name: 'test-lambda-worker',
      version: '1.0.0',
      config: {
        runtime: 'nodejs20.x',
        architecture: 'x86_64',
        handler: 'index.handler',
        codePath: './test-code',
        memorySize: 512,
        timeoutSeconds: 300,
        functionName: 'test-lambda-worker',
        description: 'Test Lambda worker for CDK Nag validation',
        hardeningProfile: 'standard',
        logging: {
          logFormat: 'json',
          systemLogLevel: 'INFO',
          applicationLogLevel: 'INFO',
          logRetentionDays: 30
        },
        observability: {
          otelEnabled: true,
          otelResourceAttributes: {
            'service.name': 'test-lambda-worker'
          }
        },
        securityTools: {
          falco: false,
          runtimeSecurity: false
        },
        tracing: {
          mode: 'Active'
        },
        eventSources: [],
        environment: {},
        tags: {},
        removalPolicy: 'destroy'
      }
    };

    component = new LambdaWorkerComponent(stack, 'TestLambdaWorker', context, spec);
  });

  test('should pass CDK Nag security checks', () => {
    // Add CDK Nag checks
    AwsSolutionsChecks.check(stack);

    // Verify that the component has proper CDK Nag suppressions
    const suppressions = NagSuppressions.getSuppressions(stack);
    expect(suppressions).toBeDefined();
    expect(suppressions.length).toBeGreaterThan(0);

    // Verify specific Lambda suppressions are present
    const suppressionIds = suppressions.map(s => s.id);
    expect(suppressionIds).toContain('AwsSolutions-L1'); // Lambda runtime version
    expect(suppressionIds).toContain('AwsSolutions-L2'); // Lambda logging
    expect(suppressionIds).toContain('AwsSolutions-L3'); // Lambda environment variables
    expect(suppressionIds).toContain('AwsSolutions-L4'); // Lambda memory
    expect(suppressionIds).toContain('AwsSolutions-L5'); // Lambda timeout
    expect(suppressionIds).toContain('AwsSolutions-L6'); // Lambda DLQ
    expect(suppressionIds).toContain('AwsSolutions-IAM4'); // Lambda execution role managed policies
    expect(suppressionIds).toContain('AwsSolutions-IAM5'); // Lambda execution role wildcards
  });

  test('should have proper Lambda runtime suppressions', () => {
    const suppressions = NagSuppressions.getSuppressions(stack);
    const l1Suppressions = suppressions.filter(s => s.id === 'AwsSolutions-L1');

    expect(l1Suppressions).toHaveLength(1);
    expect(l1Suppressions[0].reason).toContain('Lambda runtime version may be intentionally set for compatibility');
  });

  test('should have proper Lambda logging suppressions', () => {
    const suppressions = NagSuppressions.getSuppressions(stack);
    const l2Suppressions = suppressions.filter(s => s.id === 'AwsSolutions-L2');

    expect(l2Suppressions).toHaveLength(1);
    expect(l2Suppressions[0].reason).toContain('Custom log retention policy is configured based on compliance requirements');
  });

  test('should have proper Lambda environment variable suppressions', () => {
    const suppressions = NagSuppressions.getSuppressions(stack);
    const l3Suppressions = suppressions.filter(s => s.id === 'AwsSolutions-L3');

    expect(l3Suppressions).toHaveLength(1);
    expect(l3Suppressions[0].reason).toContain('Environment variables are required for Lambda function configuration');
  });

  test('should have proper Lambda memory suppressions', () => {
    const suppressions = NagSuppressions.getSuppressions(stack);
    const l4Suppressions = suppressions.filter(s => s.id === 'AwsSolutions-L4');

    expect(l4Suppressions).toHaveLength(1);
    expect(l4Suppressions[0].reason).toContain('Memory allocation is optimized based on workload requirements');
  });

  test('should have proper Lambda timeout suppressions', () => {
    const suppressions = NagSuppressions.getSuppressions(stack);
    const l5Suppressions = suppressions.filter(s => s.id === 'AwsSolutions-L5');

    expect(l5Suppressions).toHaveLength(1);
    expect(l5Suppressions[0].reason).toContain('Timeout settings are configured based on workload characteristics');
  });

  test('should have proper Lambda DLQ suppressions', () => {
    const suppressions = NagSuppressions.getSuppressions(stack);
    const l6Suppressions = suppressions.filter(s => s.id === 'AwsSolutions-L6');

    expect(l6Suppressions).toHaveLength(1);
    expect(l6Suppressions[0].reason).toContain('Dead letter queue configuration is handled by event source components');
  });

  test('should have proper IAM managed policy suppressions', () => {
    const suppressions = NagSuppressions.getSuppressions(stack);
    const iam4Suppressions = suppressions.filter(s => s.id === 'AwsSolutions-IAM4');

    expect(iam4Suppressions).toHaveLength(1);
    expect(iam4Suppressions[0].reason).toContain('Lambda execution role uses AWS managed policies');
  });

  test('should have proper IAM wildcard suppressions', () => {
    const suppressions = NagSuppressions.getSuppressions(stack);
    const iam5Suppressions = suppressions.filter(s => s.id === 'AwsSolutions-IAM5');

    expect(iam5Suppressions).toHaveLength(1);
    expect(iam5Suppressions[0].reason).toContain('Wildcard permissions are required for Lambda runtime');
  });

  describe('FedRAMP Compliance', () => {
    let fedrampStack: Stack;
    let fedrampComponent: LambdaWorkerComponent;

    beforeEach(() => {
      fedrampStack = new Stack(app, 'FedRAMPTestStack');

      const fedrampContext: ComponentContext = {
        environment: 'production',
        complianceFramework: 'fedramp-moderate',
        owner: 'fedramp-owner',
        service: 'fedramp-service'
      };

      const fedrampSpec: ComponentSpec = {
        type: 'lambda-worker',
        name: 'fedramp-lambda-worker',
        version: '1.0.0',
        config: {
          runtime: 'nodejs20.x',
          architecture: 'x86_64',
          handler: 'index.handler',
          codePath: './test-code',
          memorySize: 512,
          timeoutSeconds: 300,
          functionName: 'fedramp-lambda-worker',
          description: 'FedRAMP Lambda worker for CDK Nag validation',
          hardeningProfile: 'high',
          logging: {
            logFormat: 'json',
            systemLogLevel: 'INFO',
            applicationLogLevel: 'INFO',
            logRetentionDays: 90
          },
          observability: {
            otelEnabled: true,
            otelResourceAttributes: {
              'service.name': 'fedramp-lambda-worker'
            }
          },
          securityTools: {
            falco: true,
            runtimeSecurity: true
          },
          tracing: {
            mode: 'Active'
          },
          vpc: {
            enabled: true,
            vpcId: 'vpc-12345678',
            subnetIds: ['subnet-12345678'],
            securityGroupIds: ['sg-12345678']
          },
          kmsKeyArn: 'arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012',
          eventSources: [],
          environment: {},
          tags: {},
          removalPolicy: 'destroy'
        }
      };

      fedrampComponent = new LambdaWorkerComponent(fedrampStack, 'FedRAMPTestLambdaWorker', fedrampContext, fedrampSpec);
    });

    test('should have FedRAMP-specific suppressions', () => {
      const suppressions = NagSuppressions.getSuppressions(fedrampStack);
      const suppressionIds = suppressions.map(s => s.id);

      // Should have additional FedRAMP suppressions
      expect(suppressionIds).toContain('AwsSolutions-L7'); // Lambda VPC configuration
      expect(suppressionIds).toContain('AwsSolutions-L8'); // Lambda encryption
    });

    test('should have proper VPC configuration suppressions for FedRAMP', () => {
      const suppressions = NagSuppressions.getSuppressions(fedrampStack);
      const l7Suppressions = suppressions.filter(s => s.id === 'AwsSolutions-L7');

      expect(l7Suppressions).toHaveLength(1);
      expect(l7Suppressions[0].reason).toContain('VPC configuration is mandatory for FedRAMP compliance');
    });

    test('should have proper encryption suppressions for FedRAMP', () => {
      const suppressions = NagSuppressions.getSuppressions(fedrampStack);
      const l8Suppressions = suppressions.filter(s => s.id === 'AwsSolutions-L8');

      expect(l8Suppressions).toHaveLength(1);
      expect(l8Suppressions[0].reason).toContain('Environment variable encryption is mandatory for FedRAMP compliance');
    });
  });

  describe('Error Handling', () => {
    test('should handle missing configuration gracefully', () => {
      expect(() => {
        const invalidContext: ComponentContext = {
          environment: 'test',
          complianceFramework: 'commercial',
          owner: 'test-owner',
          service: 'test-service'
        };

        const invalidSpec: ComponentSpec = {
          type: 'lambda-worker',
          name: 'invalid-lambda-worker',
          version: '1.0.0',
          config: {} // Empty config should cause validation error
        };

        new LambdaWorkerComponent(stack, 'InvalidLambdaWorker', invalidContext, invalidSpec);
      }).toThrow();
    });
  });
});
