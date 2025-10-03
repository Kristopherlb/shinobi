jest.mock(
  '@platform/logger',
  () => ({
    Logger: {
      getLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }),
      setGlobalContext: jest.fn()
    }
  }),
  { virtual: true }
);

import { App, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { KinesisStreamComponent } from '../kinesis-stream.component.ts';
import { KinesisStreamConfig } from '../kinesis-stream.builder.ts';
import { ComponentContext, ComponentSpec } from '../../../platform/contracts/component-interfaces.ts';

const createMockContext = (framework: string): ComponentContext => ({
  serviceName: 'analytics-service',
  owner: 'platform-team',
  environment: 'dev',
  complianceFramework: framework,
  region: 'us-east-1',
  account: '123456789012',
  tags: {
    'service-name': 'analytics-service',
    environment: 'dev',
    'compliance-framework': framework
  }
});

const createMockSpec = (config: Partial<KinesisStreamConfig> = {}): ComponentSpec => ({
  name: 'ingest-events',
  type: 'kinesis-stream',
  config
});

const synthesize = (context: ComponentContext, spec: ComponentSpec) => {
  const app = new App();
  const stack = new Stack(app, 'TestStack');
  const component = new KinesisStreamComponent(stack, spec.name, context, spec);
  component.synth();
  return { component, template: Template.fromStack(stack) };
};

describe('KinesisStreamComponent synthesis', () => {
  it('creates commercial stream with baseline defaults', () => {
    const { template } = synthesize(createMockContext('commercial'), createMockSpec());

    template.hasResourceProperties('AWS::Kinesis::Stream', {
      Name: 'ingest-events',
      StreamModeDetails: Match.absent(),
      ShardCount: 1,
      RetentionPeriodHours: 24
    });
  });

  it('applies FedRAMP High hardened defaults', () => {
    const { template } = synthesize(createMockContext('fedramp-high'), createMockSpec());

    template.hasResourceProperties('AWS::Kinesis::Stream', {
      Name: 'ingest-events',
      ShardCount: Match.integerGreaterThan(1),
      RetentionPeriodHours: Match.integerGreaterThanOrEqual(168)
    });
  });

  it('respects manifest overrides for stream mode and encryption', () => {
    const { template, component } = synthesize(
      createMockContext('commercial'),
      createMockSpec({
        streamMode: 'on-demand',
        encryption: {
          type: 'aws-managed'
        },
        monitoring: {
          enabled: true,
          alarms: {
            iteratorAgeMs: {
              enabled: true,
              threshold: 120000
            }
          }
        }
      })
    );

    template.hasResourceProperties('AWS::Kinesis::Stream', {
      StreamModeDetails: Match.objectLike({
        StreamMode: 'ON_DEMAND'
      }),
      StreamEncryption: Match.objectLike({
        EncryptionType: 'KMS'
      })
    });

    const capability = component.getCapabilities()['stream:kinesis'];
    expect(capability.streamMode).toBe('on-demand');
    expect(capability.encryption).toBe('aws-managed');
  });
});
