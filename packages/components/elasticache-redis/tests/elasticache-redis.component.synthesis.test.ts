import { App, Stack } from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { ComponentContext, ComponentSpec } from '@shinobi/core';
import { ElastiCacheRedisComponent } from '../elasticache-redis.component';
import { ElastiCacheRedisConfig } from '../elasticache-redis.builder';

type Framework = 'commercial' | 'fedramp-moderate' | 'fedramp-high';

const baseContext = (framework: Framework = 'commercial'): ComponentContext => ({
  serviceName: 'test-service',
  environment: 'dev',
  complianceFramework: framework,
  scope: {} as Construct,
  region: 'us-east-1',
  accountId: '123456789012'
} as ComponentContext);

const spec = (config: Partial<ElastiCacheRedisConfig> = {}): ComponentSpec => ({
  name: 'test-redis',
  type: 'elasticache-redis',
  config
});

const synthesize = (framework: Framework, config?: Partial<ElastiCacheRedisConfig>) => {
  const app = new App();
  const stack = new Stack(app, `TestStack-${framework}`);
  const context = baseContext(framework);
  context.vpc = new ec2.Vpc(stack, `TestVpc-${framework}`, { maxAzs: 2 });
  const component = new ElastiCacheRedisComponent(stack, `Redis-${framework}`, context, spec(config));
  component.synth();
  return {
    component,
    template: Template.fromStack(stack)
  };
};

describe('ElastiCacheRedisComponent synthesis', () => {
  it('creates a commercial cluster without encryption or snapshots', () => {
    const { template, component } = synthesize('commercial');

    template.hasResourceProperties('AWS::ElastiCache::ReplicationGroup', Match.objectLike({
      AtRestEncryptionEnabled: false,
      TransitEncryptionEnabled: false,
      SnapshotRetentionLimit: 0,
      NumCacheClusters: 1,
      MultiAZEnabled: false
    }));

    expect(component.getConstruct('securityGroup')).toBeDefined();
    expect(component.getCapabilities()['cache:redis'].multiAz).toBe(false);
  });

  it('enables encryption and monitoring for fedramp-high defaults', () => {
    const { template, component } = synthesize('fedramp-high');

    template.hasResourceProperties('AWS::ElastiCache::ReplicationGroup', Match.objectLike({
      AtRestEncryptionEnabled: true,
      TransitEncryptionEnabled: true,
      AutomaticFailoverEnabled: true,
      SnapshotRetentionLimit: 30
    }));

    template.hasResourceProperties('AWS::ElastiCache::ReplicationGroup', {
      LogDeliveryConfigurations: Match.arrayWith([
        Match.objectLike({
          LogType: 'slow-log',
          DestinationType: 'cloudwatch-logs'
        })
      ])
    });

    const capability = component.getCapabilities()['cache:redis'];
    expect(capability.authTokenSecretArn).toBeDefined();
    expect(capability.multiAz).toBe(true);
  });

  it('applies manifest overrides for security groups and alarms', () => {
    const { template } = synthesize('commercial', {
      security: {
        create: false,
        securityGroupIds: ['sg-12345678'],
        allowedCidrs: []
      },
      monitoring: {
        enabled: true,
        logDelivery: [
          {
            enabled: true,
            logType: 'engine-log',
            destinationType: 'cloudwatch-logs',
            destinationName: '/aws/elasticache/redis/engine/test-service-test-redis'
          }
        ],
        alarms: {
          cpuUtilization: { enabled: true, threshold: 60, evaluationPeriods: 2, periodMinutes: 5 },
          cacheMisses: { enabled: false, threshold: 0, evaluationPeriods: 1, periodMinutes: 5 },
          evictions: { enabled: false, threshold: 0, evaluationPeriods: 1, periodMinutes: 5 },
          connections: { enabled: true, threshold: 250, evaluationPeriods: 2, periodMinutes: 5 }
        }
      }
    });

    template.hasResourceProperties('AWS::ElastiCache::ReplicationGroup', Match.objectLike({
      SecurityGroupIds: Match.arrayWith(['sg-12345678'])
    }));

    template.resourceCountIs('AWS::CloudWatch::Alarm', 2);
  });
});
