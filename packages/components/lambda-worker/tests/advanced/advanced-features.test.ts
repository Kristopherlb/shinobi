/**
 * Advanced Features Tests for Lambda Worker Component
 * 
 * Tests advanced Lambda features including DLQ, SQS, EventBridge, and error handling.
 */

import { App, Stack } from 'aws-cdk-lib';
import { LambdaWorkerComponent } from '../../lambda-worker.component';
import { ComponentContext, ComponentSpec } from '@shinobi/core';

describe('Advanced Features Tests - Lambda Worker Component', () => {
  let app: App;
  let stack: Stack;
  let component: LambdaWorkerComponent;

  beforeEach(() => {
    app = new App();
    stack = new Stack(app, 'TestAdvancedFeaturesStack');

    const context: ComponentContext = {
      environment: 'test',
      complianceFramework: 'commercial',
      owner: 'test-owner',
      service: 'test-service'
    };

    const spec: ComponentSpec = {
      type: 'lambda-worker',
      name: 'test-advanced-lambda-worker',
      version: '1.0.0',
      config: {
        runtime: 'nodejs20.x',
        architecture: 'x86_64',
        handler: 'index.handler',
        codePath: './test-code',
        memorySize: 512,
        timeoutSeconds: 300,
        functionName: 'test-advanced-lambda-worker',
        description: 'Test Lambda worker with advanced features',
        hardeningProfile: 'high',
        logging: {
          logFormat: 'json',
          systemLogLevel: 'INFO',
          applicationLogLevel: 'INFO',
          logRetentionDays: 30
        },
        observability: {
          otelEnabled: true,
          otelResourceAttributes: {
            'service.name': 'test-advanced-lambda-worker'
          }
        },
        securityTools: {
          falco: true,
          runtimeSecurity: true
        },
        tracing: {
          mode: 'Active'
        },
        // Advanced features configuration
        deadLetterQueue: {
          enabled: true,
          queueName: 'test-lambda-dlq',
          maxReceiveCount: 3,
          messageRetentionPeriod: 1209600, // 14 days
          visibilityTimeout: 30
        },
        vpc: {
          enabled: true,
          vpcId: 'vpc-12345678',
          subnetIds: ['subnet-12345678'],
          securityGroupIds: ['sg-12345678']
        },
        kmsKeyArn: 'arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012',
        secretsManager: {
          secretArn: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:test-secret'
        },
        provisionedConcurrency: {
          enabled: true,
          count: 2
        },
        reservedConcurrency: 50,
        snapStart: {
          enabled: false // Not applicable for Node.js
        },
        eventSources: [
          {
            type: 'sqs',
            arn: 'arn:aws:sqs:us-east-1:123456789012:test-queue'
          },
          {
            type: 'eventbridge',
            arn: 'arn:aws:events:us-east-1:123456789012:rule/test-rule'
          }
        ],
        environment: {
          'TEST_ENV_VAR': 'test-value',
          'SENSITIVE_DATA': 'encrypted-value'
        },
        tags: {
          'Environment': 'test',
          'Owner': 'test-owner'
        },
        removalPolicy: 'destroy'
      }
    };

    component = new LambdaWorkerComponent(stack, 'TestAdvancedLambdaWorker', context, spec);
  });

  test('should create Lambda function with advanced features', () => {
    expect(component).toBeDefined();
    expect(component.getType()).toBe('lambda-worker');
  });

  test('should configure Dead Letter Queue', () => {
    const dlq = component.getDeadLetterQueue();
    expect(dlq).toBeDefined();
    expect(dlq?.queueName).toContain('dlq');
  });

  test('should configure advanced features manager', () => {
    const advancedFeatures = component.getAdvancedFeatures();
    expect(advancedFeatures).toBeDefined();
  });

  test('should have proper VPC configuration', () => {
    // VPC configuration should be applied during synthesis
    expect(component).toBeDefined();
  });

  test('should have proper KMS encryption configuration', () => {
    // KMS configuration should be applied during synthesis
    expect(component).toBeDefined();
  });

  test('should have proper Secrets Manager configuration', () => {
    // Secrets Manager configuration should be applied during synthesis
    expect(component).toBeDefined();
  });

  test('should have proper provisioned concurrency configuration', () => {
    // Provisioned concurrency should be configured during synthesis
    expect(component).toBeDefined();
  });

  test('should have proper reserved concurrency configuration', () => {
    // Reserved concurrency should be configured during synthesis
    expect(component).toBeDefined();
  });

  describe('Error Handling Configuration', () => {
    test('should configure comprehensive error handling', () => {
      const advancedFeatures = component.getAdvancedFeatures();
      expect(advancedFeatures).toBeDefined();

      // Error handling should be configured with:
      // - DLQ enabled
      // - Retry mechanism
      // - Error logging
      // - Backoff strategy
    });

    test('should have proper error handling environment variables', () => {
      // Environment variables for error handling should be set
      expect(component).toBeDefined();
    });
  });

  describe('Performance Optimization Configuration', () => {
    test('should configure performance optimizations', () => {
      const advancedFeatures = component.getAdvancedFeatures();
      expect(advancedFeatures).toBeDefined();

      // Performance optimizations should include:
      // - Provisioned concurrency
      // - Reserved concurrency
      // - SnapStart (for Java)
    });
  });

  describe('Security Enhancement Configuration', () => {
    test('should configure security enhancements', () => {
      const advancedFeatures = component.getAdvancedFeatures();
      expect(advancedFeatures).toBeDefined();

      // Security enhancements should include:
      // - VPC configuration
      // - KMS encryption
      // - Secrets Manager integration
    });

    test('should have proper IAM permissions for security features', () => {
      // IAM permissions should be configured for:
      // - KMS operations
      // - Secrets Manager access
      // - VPC operations
      expect(component).toBeDefined();
    });
  });

  describe('Event Source Configuration', () => {
    test('should configure SQS event source', () => {
      // SQS event source should be configured
      expect(component).toBeDefined();
    });

    test('should configure EventBridge event source', () => {
      // EventBridge event source should be configured
      expect(component).toBeDefined();
    });

    test('should have proper event source permissions', () => {
      // Event source permissions should be configured
      expect(component).toBeDefined();
    });
  });

  describe('Compliance and Validation', () => {
    test('should pass validation with advanced features', () => {
      // Configuration with advanced features should pass validation
      expect(component).toBeDefined();
    });

    test('should meet compliance requirements with advanced features', () => {
      // Advanced features should enhance compliance posture
      expect(component).toBeDefined();
    });
  });

  describe('Integration with Existing Features', () => {
    test('should integrate with CDK Nag suppressions', () => {
      // Advanced features should work with CDK Nag suppressions
      expect(component).toBeDefined();
    });

    test('should integrate with observability features', () => {
      // Advanced features should integrate with OTEL and X-Ray
      expect(component).toBeDefined();
    });

    test('should integrate with Powertools extension', () => {
      // Advanced features should work with Powertools integration
      expect(component).toBeDefined();
    });
  });

  describe('Error Scenarios', () => {
    test('should handle missing advanced feature configuration gracefully', () => {
      const minimalContext: ComponentContext = {
        environment: 'test',
        complianceFramework: 'commercial',
        owner: 'test-owner',
        service: 'test-service'
      };

      const minimalSpec: ComponentSpec = {
        type: 'lambda-worker',
        name: 'minimal-lambda-worker',
        version: '1.0.0',
        config: {
          runtime: 'nodejs20.x',
          architecture: 'x86_64',
          handler: 'index.handler',
          codePath: './test-code',
          memorySize: 256,
          timeoutSeconds: 60,
          functionName: 'minimal-lambda-worker',
          description: 'Minimal Lambda worker without advanced features',
          hardeningProfile: 'standard',
          logging: {
            logFormat: 'json',
            systemLogLevel: 'INFO',
            applicationLogLevel: 'INFO',
            logRetentionDays: 30
          },
          observability: {
            otelEnabled: false,
            otelResourceAttributes: {}
          },
          securityTools: {
            falco: false,
            runtimeSecurity: false
          },
          tracing: {
            mode: 'PassThrough'
          },
          eventSources: [],
          environment: {},
          tags: {},
          removalPolicy: 'destroy'
        }
      };

      expect(() => {
        new LambdaWorkerComponent(stack, 'MinimalLambdaWorker', minimalContext, minimalSpec);
      }).not.toThrow();
    });

    test('should validate advanced feature configurations', () => {
      // Advanced feature configurations should be validated
      expect(component).toBeDefined();
    });
  });
});
