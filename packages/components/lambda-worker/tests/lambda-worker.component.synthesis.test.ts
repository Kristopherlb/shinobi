import * as path from 'path';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { App, Stack } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { LambdaWorkerComponent } from '../src/lambda-worker.component';
import { LambdaWorkerConfig } from '../src/lambda-worker.builder';
import { ComponentContext, ComponentSpec } from '../../../platform/contracts/component-interfaces.js';
import { SqsQueueComponent } from '../../sqs-queue/sqs-queue.component';

const FIXTURE_PATH = path.join(__dirname, 'fixtures/basic-lambda');

const createContext = (framework: string = 'commercial'): ComponentContext => ({
  serviceName: 'worker-service',
  owner: 'platform-team',
  environment: 'dev',
  complianceFramework: framework,
  region: 'us-east-1',
  account: '123456789012',
  tags: {
    'service-name': 'worker-service',
    environment: 'dev',
    'compliance-framework': framework
  }
});

const createSpec = (config: Partial<LambdaWorkerConfig>): ComponentSpec => ({
  name: 'image-worker',
  type: 'lambda-worker',
  config: {
    handler: 'index.handler',
    codePath: FIXTURE_PATH,
    ...config
  }
});

const synthesizeComponent = (context: ComponentContext, spec: ComponentSpec) => {
  const app = new App();
  const stack = new Stack(app, 'TestStack', {
    env: { account: context.account, region: context.region }
  });

  const component = new LambdaWorkerComponent(stack, spec.name, context, spec);
  component.synth();

  return {
    component,
    template: Template.fromStack(stack)
  };
};

describe('LambdaWorkerComponent synthesis', () => {

  it('synthesises a commercial worker with an SQS event source', () => {
    const spec = createSpec({
      environment: {
        STAGE: 'dev'
      },
      eventSources: [
        {
          type: 'sqs',
          queueArn: 'arn:aws:sqs:us-east-1:123456789012:image-worker-queue',
          batchSize: 5,
          allowDirectGrant: true // Required for external queue ARN
        }
      ],
      monitoring: {
        enabled: true,
        alarms: {
          errors: { enabled: true }
        }
      }
    });

    const { component, template } = synthesizeComponent(createContext('commercial'), spec);

    template.hasResourceProperties('AWS::Lambda::Function', Match.objectLike({
      Handler: 'index.handler',
      Runtime: 'nodejs20.x',
      MemorySize: 256,
      Environment: Match.objectLike({
        Variables: Match.objectLike({ STAGE: 'dev' })
      })
    }));

    template.hasResourceProperties('AWS::Lambda::EventSourceMapping', Match.objectLike({
      EventSourceArn: 'arn:aws:sqs:us-east-1:123456789012:image-worker-queue'
    }));

    expect(component.getCapabilities()['lambda:function']).toBeDefined();
  });

  it('enables logging and monitoring controls when requested', () => {
    const spec = createSpec({
      logging: {
        logRetentionDays: 90,
        logFormat: 'JSON',
        systemLogLevel: 'WARN',
        applicationLogLevel: 'WARN'
      },
      monitoring: {
        enabled: true,
        alarms: {
          errors: { enabled: true, threshold: 2 },
          throttles: { enabled: true },
          duration: { enabled: true, threshold: 80000 }
        }
      }
    });

    const { template } = synthesizeComponent(createContext('commercial'), spec);

    template.hasResource('AWS::CloudWatch::Alarm', Match.objectLike({
      Properties: Match.objectLike({ AlarmName: Match.stringLikeRegexp('errors-alarm') })
    }));

    template.hasResource('AWS::Lambda::Function', Match.objectLike({
      Properties: Match.objectLike({
        Runtime: 'nodejs20.x',
        MemorySize: 256
      })
    }));
  });

  it('honours fedramp-high defaults including VPC lookups', () => {
    const app = new App();
    const stack = new Stack(app, 'TestStack', {
      env: { account: '123456789012', region: 'us-east-1' }
    });
    // Create VPC construct and inject via context (avoids Vpc.fromLookup() in unit tests)
    const vpc = new ec2.Vpc(stack, 'TestVpc', { maxAzs: 2 });
    const context = createContext('fedramp-high');
    context.vpc = vpc;

    const spec = createSpec({
      vpc: {
        enabled: true,
        // Use injected VPC via context.vpc instead of vpcId (avoids Vpc.fromLookup() in unit tests)
        // Omit subnetIds to use VPC's privateSubnets (fromSubnetId doesn't work with injected VPC constructs)
        subnetIds: [],
        securityGroupIds: ['sg-0123456789abcdef0']
      },
      kmsKeyArn: 'arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012' // Required for FedRAMP High
    });

    const component = new LambdaWorkerComponent(stack, spec.name, context, spec);
    component.synth();
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::Lambda::Function', Match.objectLike({
      VpcConfig: Match.objectLike({
        SecurityGroupIds: ['sg-0123456789abcdef0']
      }),
      TracingConfig: Match.objectLike({ Mode: 'Active' })
    }));
  });

  describe('SQS Event Source Constraint Validation', () => {
    it('SqsEventSource__VisibilityTimeoutLessThanLambdaTimeout__ThrowsError', () => {
      const context = createContext('commercial');
      const app = new App();
      const stack = new Stack(app, 'TestStack', {
        env: { account: context.account, region: context.region }
      });

      // Create SQS queue with low visibility timeout (30s)
      const queueSpec: ComponentSpec = {
        name: 'test-queue',
        type: 'sqs-queue',
        config: {
          visibilityTimeoutSeconds: 30,
          description: 'Test queue with low visibility timeout'
        }
      };
      const queueComponent = new SqsQueueComponent(stack, 'test-queue', context, queueSpec);
      queueComponent.synth();

      // Create Lambda worker with higher timeout (60s) that references the queue
      const lambdaSpec = createSpec({
        timeoutSeconds: 60,
        eventSources: [
          {
            type: 'sqs',
            queueArn: '@component:test-queue',
            batchSize: 10
          }
        ]
      });

      const lambdaComponent = new LambdaWorkerComponent(stack, 'test-lambda', context, lambdaSpec);

      // Synthesis should throw error because visibility timeout (30s) < Lambda timeout (60s)
      expect(() => {
        lambdaComponent.synth();
      }).toThrow(/SQS queue visibility timeout.*must be >= Lambda timeout/);
    });

    it('SqsEventSource__VisibilityTimeoutEqualToLambdaTimeout__Succeeds', () => {
      const context = createContext('commercial');
      const app = new App();
      const stack = new Stack(app, 'TestStack', {
        env: { account: context.account, region: context.region }
      });

      // Create SQS queue with visibility timeout equal to Lambda timeout (60s)
      const queueSpec: ComponentSpec = {
        name: 'test-queue',
        type: 'sqs-queue',
        config: {
          visibilityTimeoutSeconds: 60,
          description: 'Test queue with visibility timeout equal to Lambda timeout'
        }
      };
      const queueComponent = new SqsQueueComponent(stack, 'test-queue', context, queueSpec);
      queueComponent.synth();

      // Create Lambda worker with timeout (60s) that references the queue
      const lambdaSpec = createSpec({
        timeoutSeconds: 60,
        eventSources: [
          {
            type: 'sqs',
            queueArn: '@component:test-queue',
            batchSize: 10
          }
        ]
      });

      const lambdaComponent = new LambdaWorkerComponent(stack, 'test-lambda', context, lambdaSpec);

      // Synthesis should succeed (visibility timeout >= Lambda timeout)
      expect(() => {
        lambdaComponent.synth();
      }).not.toThrow();
    });

    it('SqsEventSource__VisibilityTimeout6xLambdaTimeout__SucceedsWithWarning', () => {
      const context = createContext('commercial');
      const app = new App();
      const stack = new Stack(app, 'TestStack', {
        env: { account: context.account, region: context.region }
      });

      // Create SQS queue with visibility timeout = 6x Lambda timeout (360s)
      const queueSpec: ComponentSpec = {
        name: 'test-queue',
        type: 'sqs-queue',
        config: {
          visibilityTimeoutSeconds: 360, // 6x 60s
          description: 'Test queue with recommended visibility timeout'
        }
      };
      const queueComponent = new SqsQueueComponent(stack, 'test-queue', context, queueSpec);
      queueComponent.synth();

      // Create Lambda worker with timeout (60s) that references the queue
      const lambdaSpec = createSpec({
        timeoutSeconds: 60,
        eventSources: [
          {
            type: 'sqs',
            queueArn: '@component:test-queue',
            batchSize: 10
          }
        ]
      });

      const lambdaComponent = new LambdaWorkerComponent(stack, 'test-lambda', context, lambdaSpec);

      // Synthesis should succeed without warnings (visibility timeout >= 6x Lambda timeout)
      expect(() => {
        lambdaComponent.synth();
      }).not.toThrow();
    });
  });
});
