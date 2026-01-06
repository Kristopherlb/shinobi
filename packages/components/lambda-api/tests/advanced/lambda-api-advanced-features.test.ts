import { App, Stack } from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { LambdaApiAdvancedFeatures } from '../../advanced/lambda-api-advanced-features.js';
import { LambdaApiConfig } from '../../src/lambda-api.builder.js';

describe('LambdaApiAdvancedFeatures', () => {
  let app: App;
  let stack: Stack;
  let lambdaFunction: lambda.Function;
  let config: LambdaApiConfig;
  let context: any;

  beforeEach(() => {
    app = new App();
    stack = new Stack(app, 'TestStack');

    // Create a test Lambda function
    lambdaFunction = new lambda.Function(stack, 'TestFunction', {
      functionName: 'test-function',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline('exports.handler = async () => {};'),
      memorySize: 512,
      timeout: cdk.Duration.seconds(30)
    });

    config = {
      functionName: 'test-function',
      handler: 'index.handler',
      runtime: 'nodejs20.x',
      memorySize: 512,
      timeoutSeconds: 30,
      architecture: 'x86_64',
      tracing: 'Active',
      logFormat: 'JSON',
      environment: {},
      api: {
        type: 'rest',
        stageName: 'dev',
        metricsEnabled: true,
        tracingEnabled: true,
        apiKeyRequired: false,
        throttling: {
          burstLimit: 5000,
          rateLimit: 2000
        },
        usagePlan: {
          enabled: false
        },
        logging: {
          enabled: true,
          retentionDays: 14,
          logFormat: 'json',
          prefix: 'api-logs'
        },
        cors: {
          enabled: false,
          allowOrigins: [],
          allowHeaders: [],
          allowMethods: [],
          allowCredentials: false
        }
      },
      vpc: {
        enabled: false,
        subnetIds: [],
        securityGroupIds: []
      },
      encryption: {
        enabled: false
      },
      monitoring: {
        enabled: true,
        alarms: {
          lambdaErrors: {
            enabled: true,
            threshold: 1,
            evaluationPeriods: 1,
            periodMinutes: 1,
            comparisonOperator: 'gt',
            treatMissingData: 'breaching',
            statistic: 'Sum',
            tags: {}
          },
          lambdaThrottles: {
            enabled: true,
            threshold: 1,
            evaluationPeriods: 1,
            periodMinutes: 1,
            comparisonOperator: 'gt',
            treatMissingData: 'breaching',
            statistic: 'Sum',
            tags: {}
          },
          lambdaDuration: {
            enabled: true,
            threshold: 5000,
            evaluationPeriods: 1,
            periodMinutes: 1,
            comparisonOperator: 'gt',
            treatMissingData: 'breaching',
            statistic: 'Average',
            tags: {}
          },
          api4xxErrors: {
            enabled: true,
            threshold: 10,
            evaluationPeriods: 1,
            periodMinutes: 1,
            comparisonOperator: 'gt',
            treatMissingData: 'breaching',
            statistic: 'Sum',
            tags: {}
          },
          api5xxErrors: {
            enabled: true,
            threshold: 5,
            evaluationPeriods: 1,
            periodMinutes: 1,
            comparisonOperator: 'gt',
            treatMissingData: 'breaching',
            statistic: 'Sum',
            tags: {}
          }
        }
      },
      deployment: {
        codePath: './dist',
        inlineFallbackEnabled: true
      }
    };

    context = {
      serviceName: 'test-service',
      environment: 'dev',
      complianceFramework: 'commercial',
      scope: stack,
      region: 'us-east-1',
      accountId: '123456789012'
    };
  });

  describe('Dead Letter Queue Configuration', () => {
    it('should create DLQ when enabled', () => {
      const advancedFeatures = new LambdaApiAdvancedFeatures(stack, lambdaFunction, config, context);

      const dlqConfig = {
        enabled: true,
        retentionDays: 14,
        visibilityTimeoutSeconds: 30
      };

      const dlq = advancedFeatures.configureDeadLetterQueue(dlqConfig);

      expect(dlq).toBeDefined();
      expect(dlq?.queueName).toBe('test-function-dlq');

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::SQS::Queue', Match.objectLike({
        QueueName: 'test-function-dlq',
        MessageRetentionPeriod: 1209600, // 14 days in seconds
        VisibilityTimeout: 30
      }));
    });

    it('should not create DLQ when disabled', () => {
      const advancedFeatures = new LambdaApiAdvancedFeatures(stack, lambdaFunction, config, context);

      const dlqConfig = {
        enabled: false
      };

      const dlq = advancedFeatures.configureDeadLetterQueue(dlqConfig);

      expect(dlq).toBeUndefined();
    });

    it('should create DLQ monitoring alarms', () => {
      const advancedFeatures = new LambdaApiAdvancedFeatures(stack, lambdaFunction, config, context);

      const dlqConfig = {
        enabled: true
      };

      advancedFeatures.configureDeadLetterQueue(dlqConfig);
      const alarms = advancedFeatures.getPerformanceAlarms();

      expect(alarms.length).toBeGreaterThan(0);

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::CloudWatch::Alarm', Match.objectLike({
        AlarmName: Match.stringLikeRegexp('.*dlq.*'),
        AlarmDescription: Match.stringLikeRegexp('.*DLQ.*')
      }));
    });
  });

  describe('Event Sources Configuration', () => {
    it('should create SQS event sources when enabled', () => {
      const advancedFeatures = new LambdaApiAdvancedFeatures(stack, lambdaFunction, config, context);

      const eventSourceConfig = {
        sqs: {
          enabled: true,
          queues: [
            {
              name: 'test-queue',
              batchSize: 10,
              maximumBatchingWindowSeconds: 5
            }
          ]
        },
        eventBridge: {
          enabled: false,
          rules: []
        }
      };

      advancedFeatures.configureEventSources(eventSourceConfig);
      const eventSources = advancedFeatures.getEventSources();

      expect(eventSources.length).toBe(1);

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::SQS::Queue', Match.objectLike({
        QueueName: 'test-function-test-queue'
      }));
      template.hasResourceProperties('AWS::Lambda::EventSourceMapping', Match.objectLike({
        BatchSize: 10,
        MaximumBatchingWindowInSeconds: 5
      }));
    });

    it('should create EventBridge event sources when enabled', () => {
      const advancedFeatures = new LambdaApiAdvancedFeatures(stack, lambdaFunction, config, context);

      const eventSourceConfig = {
        sqs: {
          enabled: false,
          queues: []
        },
        eventBridge: {
          enabled: true,
          rules: [
            {
              name: 'test-rule',
              eventPattern: {
                source: ['test.source'],
                'detail-type': ['Test Event']
              }
            }
          ]
        }
      };

      advancedFeatures.configureEventSources(eventSourceConfig);

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Events::Rule', Match.objectLike({
        Name: 'test-function-test-rule',
        EventPattern: {
          source: ['test.source'],
          'detail-type': ['Test Event']
        }
      }));
    });

    it('should create SQS monitoring alarms', () => {
      const advancedFeatures = new LambdaApiAdvancedFeatures(stack, lambdaFunction, config, context);

      const eventSourceConfig = {
        sqs: {
          enabled: true,
          queues: [
            {
              name: 'test-queue'
            }
          ]
        },
        eventBridge: {
          enabled: false,
          rules: []
        }
      };

      advancedFeatures.configureEventSources(eventSourceConfig);
      const alarms = advancedFeatures.getPerformanceAlarms();

      expect(alarms.length).toBeGreaterThan(0);

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::CloudWatch::Alarm', Match.objectLike({
        AlarmName: Match.stringLikeRegexp('.*sqs.*test-queue.*'),
        AlarmDescription: Match.stringLikeRegexp('.*SQS.*')
      }));
    });
  });

  describe('Performance Optimizations Configuration', () => {
    it('should create provisioned concurrency when enabled', () => {
      const advancedFeatures = new LambdaApiAdvancedFeatures(stack, lambdaFunction, config, context);

      const perfConfig = {
        provisionedConcurrency: {
          enabled: true,
          minCapacity: 2,
          maxCapacity: 10,
          autoScaling: {
            enabled: true,
            targetUtilization: 70,
            scaleOutCooldown: 300,
            scaleInCooldown: 300
          }
        },
        reservedConcurrency: {
          enabled: false,
          reservedConcurrencyLimit: 0
        },
        snapStart: {
          enabled: false,
          optimizationTier: 'OPTIMIZE_FOR_LATENCY'
        }
      };

      advancedFeatures.configurePerformanceOptimizations(perfConfig);

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Lambda::Alias', Match.objectLike({
        Name: 'PROVISIONED',
        ProvisionedConcurrencyConfig: Match.objectLike({
          ProvisionedConcurrencyLimit: 2
        })
      }));
    });

    it('should create reserved concurrency when enabled', () => {
      const advancedFeatures = new LambdaApiAdvancedFeatures(stack, lambdaFunction, config, context);

      const perfConfig = {
        provisionedConcurrency: {
          enabled: false,
          minCapacity: 0,
          maxCapacity: 0,
          autoScaling: {
            enabled: false,
            targetUtilization: 0,
            scaleOutCooldown: 0,
            scaleInCooldown: 0
          }
        },
        reservedConcurrency: {
          enabled: true,
          reservedConcurrencyLimit: 100
        },
        snapStart: {
          enabled: false,
          optimizationTier: 'OPTIMIZE_FOR_LATENCY'
        }
      };

      advancedFeatures.configurePerformanceOptimizations(perfConfig);

      // Reserved concurrency is configured directly on the function
      // We can verify it through the function properties
      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Lambda::Function', Match.objectLike({
        ReservedConcurrencyLimit: 100
      }));
    });

    it('should create provisioned concurrency monitoring alarms', () => {
      const advancedFeatures = new LambdaApiAdvancedFeatures(stack, lambdaFunction, config, context);

      const perfConfig = {
        provisionedConcurrency: {
          enabled: true,
          minCapacity: 2,
          maxCapacity: 10,
          autoScaling: {
            enabled: false,
            targetUtilization: 0,
            scaleOutCooldown: 0,
            scaleInCooldown: 0
          }
        },
        reservedConcurrency: {
          enabled: false,
          reservedConcurrencyLimit: 0
        },
        snapStart: {
          enabled: false,
          optimizationTier: 'OPTIMIZE_FOR_LATENCY'
        }
      };

      advancedFeatures.configurePerformanceOptimizations(perfConfig);
      const alarms = advancedFeatures.getPerformanceAlarms();

      expect(alarms.length).toBeGreaterThan(0);

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::CloudWatch::Alarm', Match.objectLike({
        AlarmName: Match.stringLikeRegexp('.*provisioned-concurrency.*'),
        AlarmDescription: Match.stringLikeRegexp('.*provisioned concurrency.*')
      }));
    });
  });

  describe('Circuit Breaker Configuration', () => {
    it('should create circuit breaker monitoring when enabled', () => {
      const advancedFeatures = new LambdaApiAdvancedFeatures(stack, lambdaFunction, config, context);

      const circuitBreakerConfig = {
        enabled: true,
        failureThreshold: 10,
        recoveryTimeoutSeconds: 60,
        monitoringEnabled: true
      };

      advancedFeatures.configureCircuitBreaker(circuitBreakerConfig);
      const alarms = advancedFeatures.getPerformanceAlarms();

      expect(alarms.length).toBeGreaterThan(0);

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::CloudWatch::Alarm', Match.objectLike({
        AlarmName: Match.stringLikeRegexp('.*circuit-breaker.*'),
        AlarmDescription: Match.stringLikeRegexp('.*circuit breaker.*')
      }));
    });

    it('should not create circuit breaker monitoring when disabled', () => {
      const advancedFeatures = new LambdaApiAdvancedFeatures(stack, lambdaFunction, config, context);

      const circuitBreakerConfig = {
        enabled: false,
        failureThreshold: 0,
        recoveryTimeoutSeconds: 0,
        monitoringEnabled: false
      };

      advancedFeatures.configureCircuitBreaker(circuitBreakerConfig);
      const alarms = advancedFeatures.getPerformanceAlarms();

      expect(alarms.length).toBe(0);
    });
  });

  describe('Resource Management', () => {
    it('should return all created performance alarms', () => {
      const advancedFeatures = new LambdaApiAdvancedFeatures(stack, lambdaFunction, config, context);

      // Configure multiple features to create alarms
      advancedFeatures.configureDeadLetterQueue({ enabled: true });
      advancedFeatures.configureCircuitBreaker({
        enabled: true,
        failureThreshold: 10,
        recoveryTimeoutSeconds: 60,
        monitoringEnabled: true
      });

      const alarms = advancedFeatures.getPerformanceAlarms();

      expect(alarms.length).toBeGreaterThan(1);
      alarms.forEach(alarm => {
        expect(alarm).toBeDefined();
        expect(alarm.node.id).toContain('Alarm');
      });
    });

    it('should return DLQ when created', () => {
      const advancedFeatures = new LambdaApiAdvancedFeatures(stack, lambdaFunction, config, context);

      const dlq = advancedFeatures.configureDeadLetterQueue({ enabled: true });
      const returnedDLQ = advancedFeatures.getDeadLetterQueue();

      expect(dlq).toBeDefined();
      expect(returnedDLQ).toBe(dlq);
      expect(returnedDLQ?.queueName).toBe('test-function-dlq');
    });

    it('should return event sources when created', () => {
      const advancedFeatures = new LambdaApiAdvancedFeatures(stack, lambdaFunction, config, context);

      const eventSourceConfig = {
        sqs: {
          enabled: true,
          queues: [
            {
              name: 'test-queue'
            }
          ]
        },
        eventBridge: {
          enabled: false,
          rules: []
        }
      };

      advancedFeatures.configureEventSources(eventSourceConfig);
      const eventSources = advancedFeatures.getEventSources();

      expect(eventSources.length).toBe(1);
      expect(eventSources[0]).toBeDefined();
    });
  });

  describe('Integration Tests', () => {
    it('should configure all advanced features together', () => {
      const advancedFeatures = new LambdaApiAdvancedFeatures(stack, lambdaFunction, config, context);

      // Configure DLQ
      advancedFeatures.configureDeadLetterQueue({
        enabled: true,
        retentionDays: 14,
        visibilityTimeoutSeconds: 30
      });

      // Configure event sources
      advancedFeatures.configureEventSources({
        sqs: {
          enabled: true,
          queues: [
            {
              name: 'test-queue',
              batchSize: 10
            }
          ]
        },
        eventBridge: {
          enabled: true,
          rules: [
            {
              name: 'test-rule',
              eventPattern: {
                source: ['test.source']
              }
            }
          ]
        }
      });

      // Configure performance optimizations
      advancedFeatures.configurePerformanceOptimizations({
        provisionedConcurrency: {
          enabled: true,
          minCapacity: 2,
          maxCapacity: 10,
          autoScaling: {
            enabled: true,
            targetUtilization: 70,
            scaleOutCooldown: 300,
            scaleInCooldown: 300
          }
        },
        reservedConcurrency: {
          enabled: true,
          reservedConcurrencyLimit: 100
        },
        snapStart: {
          enabled: false,
          optimizationTier: 'OPTIMIZE_FOR_LATENCY'
        }
      });

      // Configure circuit breaker
      advancedFeatures.configureCircuitBreaker({
        enabled: true,
        failureThreshold: 10,
        recoveryTimeoutSeconds: 60,
        monitoringEnabled: true
      });

      // Verify all resources were created
      const dlq = advancedFeatures.getDeadLetterQueue();
      const eventSources = advancedFeatures.getEventSources();
      const alarms = advancedFeatures.getPerformanceAlarms();

      expect(dlq).toBeDefined();
      expect(eventSources.length).toBe(1);
      expect(alarms.length).toBeGreaterThan(0);

      // Verify CloudFormation template contains all resources
      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::SQS::Queue', Match.objectLike({
        QueueName: 'test-function-dlq'
      }));
      template.hasResourceProperties('AWS::Lambda::EventSourceMapping', Match.objectLike({
        BatchSize: 10
      }));
      template.hasResourceProperties('AWS::Events::Rule', Match.objectLike({
        Name: 'test-function-test-rule'
      }));
      template.hasResourceProperties('AWS::Lambda::Alias', Match.objectLike({
        Name: 'PROVISIONED'
      }));
    });
  });
});
