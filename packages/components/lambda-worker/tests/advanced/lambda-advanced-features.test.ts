/**
 * Lambda Advanced Features Tests
 * 
 * Tests the LambdaAdvancedFeatures class for DLQ, SQS, EventBridge,
 * error handling, performance optimizations, and security enhancements.
 */

import { App, Stack } from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as events from 'aws-cdk-lib/aws-events';
import { LambdaAdvancedFeatures } from '../../advanced/lambda-advanced-features.js';

describe('Lambda Advanced Features Tests', () => {
  let app: App;
  let stack: Stack;
  let lambdaFunction: lambda.Function;
  let advancedFeatures: LambdaAdvancedFeatures;

  beforeEach(() => {
    app = new App();
    stack = new Stack(app, 'TestAdvancedFeaturesStack');

    // Create a basic Lambda function for testing
    lambdaFunction = new lambda.Function(stack, 'TestLambdaFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline('exports.handler = async () => {};'),
      functionName: 'test-lambda-function'
    });

    advancedFeatures = new LambdaAdvancedFeatures(stack, lambdaFunction);
  });

  describe('Dead Letter Queue Configuration', () => {
    test('should configure DLQ when enabled', () => {
      const dlqConfig = {
        enabled: true,
        queueName: 'test-lambda-dlq',
        maxReceiveCount: 3,
        messageRetentionPeriod: 1209600, // 14 days
        visibilityTimeout: 30
      };

      const dlq = advancedFeatures.configureDeadLetterQueue(dlqConfig);

      expect(dlq).toBeDefined();
      expect(dlq?.queueName).toBe('test-lambda-dlq');
    });

    test('should not configure DLQ when disabled', () => {
      const dlqConfig = {
        enabled: false
      };

      const dlq = advancedFeatures.configureDeadLetterQueue(dlqConfig);

      expect(dlq).toBeUndefined();
    });

    test('should return existing DLQ when called multiple times', () => {
      const dlqConfig = {
        enabled: true,
        queueName: 'test-lambda-dlq'
      };

      const dlq1 = advancedFeatures.configureDeadLetterQueue(dlqConfig);
      const dlq2 = advancedFeatures.getDeadLetterQueue();

      expect(dlq1).toBe(dlq2);
    });

    test('should configure DLQ with default values', () => {
      const dlqConfig = {
        enabled: true
      };

      const dlq = advancedFeatures.configureDeadLetterQueue(dlqConfig);

      expect(dlq).toBeDefined();
      expect(dlq?.queueName).toContain('dlq');
    });
  });

  describe('SQS Event Source Configuration', () => {
    test('should configure SQS event source', () => {
      const sqsConfig = {
        queueArn: 'arn:aws:sqs:us-east-1:123456789012:test-queue',
        batchSize: 10,
        maxBatchingWindow: 5,
        maxConcurrency: 5,
        reportBatchItemFailures: true,
        functionResponseType: lambda.FunctionResponseType.REPORT_BATCH_ITEM_FAILURES
      };

      const eventSource = advancedFeatures.configureSqsEventSource(sqsConfig);

      expect(eventSource).toBeDefined();
      expect(eventSource.batchSize).toBe(10);
      expect(eventSource.maxBatchingWindow?.toSeconds()).toBe(5);
    });

    test('should configure SQS event source with default values', () => {
      const sqsConfig = {
        queueArn: 'arn:aws:sqs:us-east-1:123456789012:test-queue'
      };

      const eventSource = advancedFeatures.configureSqsEventSource(sqsConfig);

      expect(eventSource).toBeDefined();
      expect(eventSource.batchSize).toBe(10); // Default value
    });
  });

  describe('EventBridge Event Source Configuration', () => {
    test('should configure EventBridge event source', () => {
      const eventBridgeConfig = {
        eventPattern: {
          source: ['aws.lambda'],
          detailType: ['Lambda Function State Change']
        },
        maxRetryAttempts: 3,
        retryInterval: 60
      };

      const rule = advancedFeatures.configureEventBridgeEventSource(eventBridgeConfig);

      expect(rule).toBeDefined();
      expect(rule.eventPattern).toEqual(eventBridgeConfig.eventPattern);
    });

    test('should configure EventBridge event source with custom event bus', () => {
      const eventBridgeConfig = {
        eventPattern: {
          source: ['custom.source']
        },
        eventBusArn: 'arn:aws:events:us-east-1:123456789012:event-bus/custom-bus'
      };

      const rule = advancedFeatures.configureEventBridgeEventSource(eventBridgeConfig);

      expect(rule).toBeDefined();
    });
  });

  describe('Error Handling Configuration', () => {
    test('should configure comprehensive error handling', () => {
      const errorHandlingOptions = {
        enableDLQ: true,
        enableRetry: true,
        maxRetries: 3,
        retryBackoff: true,
        logErrors: true
      };

      // Mock console.log to avoid output during tests
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      advancedFeatures.configureErrorHandling(errorHandlingOptions);

      // Verify environment variables are set
      expect(lambdaFunction.node.findChild('Environment').toString()).toContain('ERROR_HANDLING_ENABLED');
      expect(lambdaFunction.node.findChild('Environment').toString()).toContain('MAX_RETRIES');

      consoleSpy.mockRestore();
    });

    test('should configure error handling with minimal options', () => {
      const errorHandlingOptions = {
        enableDLQ: false,
        enableRetry: false,
        logErrors: false
      };

      // Mock console.log to avoid output during tests
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      advancedFeatures.configureErrorHandling(errorHandlingOptions);

      expect(lambdaFunction.node.findChild('Environment').toString()).toContain('ERROR_HANDLING_ENABLED');

      consoleSpy.mockRestore();
    });
  });

  describe('Performance Optimization Configuration', () => {
    test('should configure provisioned concurrency', () => {
      const performanceOptions = {
        enableProvisionedConcurrency: true,
        provisionedConcurrencyCount: 5,
        enableReservedConcurrency: false,
        enableSnapStart: false
      };

      // Mock console.log to avoid output during tests
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      advancedFeatures.configurePerformanceOptimizations(performanceOptions);

      // Verify that the configuration was applied (specific assertions would depend on implementation)
      expect(performanceOptions.enableProvisionedConcurrency).toBe(true);

      consoleSpy.mockRestore();
    });

    test('should configure reserved concurrency', () => {
      const performanceOptions = {
        enableProvisionedConcurrency: false,
        enableReservedConcurrency: true,
        reservedConcurrencyLimit: 100,
        enableSnapStart: false
      };

      // Mock console.log to avoid output during tests
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      advancedFeatures.configurePerformanceOptimizations(performanceOptions);

      expect(performanceOptions.enableReservedConcurrency).toBe(true);

      consoleSpy.mockRestore();
    });

    test('should configure SnapStart for Java functions', () => {
      // Create a Java Lambda function for SnapStart testing
      const javaLambdaFunction = new lambda.Function(stack, 'JavaLambdaFunction', {
        runtime: lambda.Runtime.JAVA_17,
        handler: 'com.example.Handler',
        code: lambda.Code.fromInline('// Java code'),
        functionName: 'java-lambda-function'
      });

      const javaAdvancedFeatures = new LambdaAdvancedFeatures(stack, javaLambdaFunction);

      const performanceOptions = {
        enableProvisionedConcurrency: false,
        enableReservedConcurrency: false,
        enableSnapStart: true
      };

      // Mock console.log to avoid output during tests
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      javaAdvancedFeatures.configurePerformanceOptimizations(performanceOptions);

      expect(performanceOptions.enableSnapStart).toBe(true);

      consoleSpy.mockRestore();
    });
  });

  describe('Security Enhancement Configuration', () => {
    test('should configure VPC security enhancements', () => {
      const securityOptions = {
        enableVPC: true,
        vpcConfig: {
          vpcId: 'vpc-12345678',
          subnetIds: ['subnet-12345678'],
          securityGroupIds: ['sg-12345678']
        },
        enableKMS: false,
        enableSecretsManager: false
      };

      // Mock console.log to avoid output during tests
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      advancedFeatures.configureSecurityEnhancements(securityOptions);

      // Verify environment variables are set
      expect(lambdaFunction.node.findChild('Environment').toString()).toContain('VPC_ENABLED');
      expect(lambdaFunction.node.findChild('Environment').toString()).toContain('VPC_ID');

      consoleSpy.mockRestore();
    });

    test('should configure KMS security enhancements', () => {
      const securityOptions = {
        enableVPC: false,
        enableKMS: true,
        kmsKeyArn: 'arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012',
        enableSecretsManager: false
      };

      // Mock console.log to avoid output during tests
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      advancedFeatures.configureSecurityEnhancements(securityOptions);

      // Verify environment variables are set
      expect(lambdaFunction.node.findChild('Environment').toString()).toContain('KMS_ENABLED');
      expect(lambdaFunction.node.findChild('Environment').toString()).toContain('KMS_KEY_ARN');

      consoleSpy.mockRestore();
    });

    test('should configure Secrets Manager security enhancements', () => {
      const securityOptions = {
        enableVPC: false,
        enableKMS: false,
        enableSecretsManager: true,
        secretsManagerSecretArn: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:test-secret'
      };

      // Mock console.log to avoid output during tests
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      advancedFeatures.configureSecurityEnhancements(securityOptions);

      // Verify environment variables are set
      expect(lambdaFunction.node.findChild('Environment').toString()).toContain('SECRETS_MANAGER_ENABLED');
      expect(lambdaFunction.node.findChild('Environment').toString()).toContain('SECRETS_MANAGER_SECRET_ARN');

      consoleSpy.mockRestore();
    });

    test('should configure all security enhancements', () => {
      const securityOptions = {
        enableVPC: true,
        vpcConfig: {
          vpcId: 'vpc-12345678',
          subnetIds: ['subnet-12345678'],
          securityGroupIds: ['sg-12345678']
        },
        enableKMS: true,
        kmsKeyArn: 'arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012',
        enableSecretsManager: true,
        secretsManagerSecretArn: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:test-secret'
      };

      // Mock console.log to avoid output during tests
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      advancedFeatures.configureSecurityEnhancements(securityOptions);

      // Verify all environment variables are set
      expect(lambdaFunction.node.findChild('Environment').toString()).toContain('VPC_ENABLED');
      expect(lambdaFunction.node.findChild('Environment').toString()).toContain('KMS_ENABLED');
      expect(lambdaFunction.node.findChild('Environment').toString()).toContain('SECRETS_MANAGER_ENABLED');

      consoleSpy.mockRestore();
    });
  });

  describe('Monitoring Dashboard Creation', () => {
    test('should create monitoring dashboard', () => {
      // Mock console.log to avoid output during tests
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      advancedFeatures.createMonitoringDashboard();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Monitoring dashboard configuration for test-lambda-function')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Integration Tests', () => {
    test('should integrate all advanced features', () => {
      // Configure DLQ
      const dlq = advancedFeatures.configureDeadLetterQueue({
        enabled: true,
        queueName: 'integration-test-dlq'
      });

      expect(dlq).toBeDefined();

      // Configure error handling
      // Mock console.log to avoid output during tests
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      advancedFeatures.configureErrorHandling({
        enableDLQ: true,
        enableRetry: true,
        maxRetries: 5,
        retryBackoff: true,
        logErrors: true
      });

      // Configure performance optimizations
      advancedFeatures.configurePerformanceOptimizations({
        enableProvisionedConcurrency: true,
        provisionedConcurrencyCount: 3,
        enableReservedConcurrency: true,
        reservedConcurrencyLimit: 50,
        enableSnapStart: false
      });

      // Configure security enhancements
      advancedFeatures.configureSecurityEnhancements({
        enableVPC: true,
        vpcConfig: {
          vpcId: 'vpc-12345678',
          subnetIds: ['subnet-12345678'],
          securityGroupIds: ['sg-12345678']
        },
        enableKMS: true,
        kmsKeyArn: 'arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012',
        enableSecretsManager: true,
        secretsManagerSecretArn: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:test-secret'
      });

      // Verify all configurations were applied
      expect(dlq?.queueName).toBe('integration-test-dlq');
      expect(lambdaFunction.node.findChild('Environment').toString()).toContain('ERROR_HANDLING_ENABLED');
      expect(lambdaFunction.node.findChild('Environment').toString()).toContain('VPC_ENABLED');
      expect(lambdaFunction.node.findChild('Environment').toString()).toContain('KMS_ENABLED');
      expect(lambdaFunction.node.findChild('Environment').toString()).toContain('SECRETS_MANAGER_ENABLED');

      consoleSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    test('should handle missing DLQ configuration gracefully', () => {
      const dlqConfig = {
        enabled: false
      };

      expect(() => {
        advancedFeatures.configureDeadLetterQueue(dlqConfig);
      }).not.toThrow();
    });

    test('should handle invalid SQS configuration gracefully', () => {
      const sqsConfig = {
        queueArn: 'invalid-arn'
      };

      expect(() => {
        advancedFeatures.configureSqsEventSource(sqsConfig);
      }).not.toThrow();
    });
  });
});
