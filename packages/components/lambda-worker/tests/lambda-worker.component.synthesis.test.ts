import * as path from 'path';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { App, Stack } from 'aws-cdk-lib';
import { LambdaWorkerComponent } from '../lambda-worker.component';
import { LambdaWorkerConfig } from '../lambda-worker.builder';
import { ComponentContext, ComponentSpec } from '../../../platform/contracts/component-interfaces';

const FIXTURE_PATH = path.join(__dirname, 'fixtures/basic-lambda');
const VPC_ID = 'vpc-0abc123def4567890';
const CONTEXT_KEY = `vpcProvider:account=123456789012:filter.vpcId=${VPC_ID}:region=us-east-1`;

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
  const originalContext = process.env.CDK_CONTEXT_JSON;

  beforeAll(() => {
    process.env.CDK_CONTEXT_JSON = JSON.stringify({
      [CONTEXT_KEY]: {
        vpcId: VPC_ID,
        availabilityZones: ['us-east-1a', 'us-east-1b'],
        publicSubnetIds: ['subnet-public-a', 'subnet-public-b'],
        privateSubnetIds: ['subnet-private-a', 'subnet-private-b'],
        isolatedSubnetIds: [],
        ownerAccountId: '123456789012'
      }
    });
  });

  afterAll(() => {
    if (originalContext === undefined) {
      delete process.env.CDK_CONTEXT_JSON;
    } else {
      process.env.CDK_CONTEXT_JSON = originalContext;
    }
  });

  it('synthesises a commercial worker with an SQS event source', () => {
    const spec = createSpec({
      environment: {
        STAGE: 'dev'
      },
      eventSources: [
        {
          type: 'sqs',
          queueArn: 'arn:aws:sqs:us-east-1:123456789012:image-worker-queue',
          batchSize: 5
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
    const spec = createSpec({
      vpc: {
        enabled: true,
        vpcId: VPC_ID,
        subnetIds: ['subnet-private-a', 'subnet-private-b'],
        securityGroupIds: ['sg-0123456789abcdef0']
      }
    });

    const { template } = synthesizeComponent(createContext('fedramp-high'), spec);

    template.hasResourceProperties('AWS::Lambda::Function', Match.objectLike({
      VpcConfig: Match.objectLike({
        SecurityGroupIds: ['sg-0123456789abcdef0']
      }),
      TracingConfig: Match.objectLike({ Mode: 'Active' })
    }));
  });
});
