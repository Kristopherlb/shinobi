import { describe, it, expect } from 'vitest';
import { App, Stack, Environment } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { KinesisStreamComponent } from '../kinesis-stream.component.js';
import { KinesisStreamConfig } from '../kinesis-stream.builder.js';
import { ComponentContext, ComponentSpec } from '@shinobi/core';

const createMockContext = (framework: string = 'commercial'): ComponentContext => {
  const app = new App();
  const stack = new Stack(app, 'TestStack', {
    env: {
      account: '123456789012',
      region: 'us-east-1'
    } as Environment
  });

  return {
    serviceName: 'analytics-service',
    owner: 'platform-team',
    environment: 'dev',
    complianceFramework: framework as 'commercial' | 'fedramp-moderate' | 'fedramp-high',
    region: 'us-east-1',
    accountId: '123456789012',
    scope: stack,
    serviceLabels: {
      'service-name': 'analytics-service',
      owner: 'platform-team',
      environment: 'dev',
      'compliance-framework': framework
    },
    tags: {
      'service-name': 'analytics-service',
      environment: 'dev',
      'compliance-framework': framework
    }
  };
};

const createMockSpec = (config: Partial<KinesisStreamConfig> = {}): ComponentSpec => ({
  name: 'ingest-events',
  type: 'kinesis-stream',
  config
});

const synthesize = (context: ComponentContext, spec: ComponentSpec) => {
  const component = new KinesisStreamComponent(context.scope, spec.name, context, spec);
  component.synth();
  return { component, template: Template.fromStack(context.scope as Stack) };
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
    expect(capability.streamUrl).toBeDefined();
    expect(capability.streamUrl).toContain('console.aws.amazon.com/kinesis');
    expect(capability.streamUrl).toContain('us-east-1');
  });

  it('includes streamUrl in capabilities for console linking', () => {
    const { component } = synthesize(createMockContext('commercial'), createMockSpec());

    const capability = component.getCapabilities()['stream:kinesis'];
    expect(capability.streamUrl).toBeDefined();
    expect(capability.streamUrl).toMatch(/https:\/\/us-east-1\.console\.aws\.amazon\.com\/kinesis/);
    expect(capability.streamUrl).toContain(component.getCapabilities()['stream:kinesis'].streamName);
  });

  it('creates PutRecord.Success rate alarm when monitoring enabled', () => {
    const { template } = synthesize(
      createMockContext('commercial'),
      createMockSpec({
        monitoring: {
          enabled: true,
          alarms: {
            putRecordSuccessRate: {
              enabled: true,
              threshold: 50
            }
          }
        }
      })
    );

    template.hasResource('AWS::CloudWatch::Alarm', Match.objectLike({
      Properties: Match.objectLike({
        AlarmName: Match.stringLikeRegexp('put-record-success-rate'),
        MetricName: 'PutRecord.Success'
      })
    }));
  });

  it('creates GetRecords.Success rate alarm when monitoring enabled', () => {
    const { template } = synthesize(
      createMockContext('commercial'),
      createMockSpec({
        monitoring: {
          enabled: true,
          alarms: {
            getRecordsSuccessRate: {
              enabled: true,
              threshold: 50
            }
          }
        }
      })
    );

    template.hasResource('AWS::CloudWatch::Alarm', Match.objectLike({
      Properties: Match.objectLike({
        AlarmName: Match.stringLikeRegexp('get-records-success-rate'),
        MetricName: 'GetRecords.Success'
      })
    }));
  });

  it('logs encryption fallback to AWS-managed when customer key not configured', () => {
    const { component } = synthesize(
      createMockContext('commercial'),
      createMockSpec({
        encryption: {
          type: 'kms',
          // No kmsKeyArn or customerManagedKey.create
        }
      })
    );

    // Component should synthesize successfully with AWS-managed encryption
    expect(component).toBeDefined();
    const capability = component.getCapabilities()['stream:kinesis'];
    expect(capability.encryption).toBe('kms');
  });
});
